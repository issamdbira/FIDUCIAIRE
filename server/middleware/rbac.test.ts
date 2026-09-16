// =============================================================================
// Tests du middleware RBAC — rôle par workspace relu en base
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock du client Prisma : workspace_members (accès direct) + delegated_access (Phase 10)
vi.mock("../lib/prisma.js", () => ({
  default: {
    workspace_members: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    delegated_access: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
    },
  },
}));

import prisma from "../lib/prisma.js";
import {
  requireWorkspaceRole,
  requireWorkspaceMember,
  requireWorkspaceWriter,
  requireWorkspaceOwner,
  requireAnyWorkspaceOwner,
} from "./rbac.js";

const mockedFindUnique = prisma.workspace_members.findUnique as ReturnType<typeof vi.fn>;
const mockedFindFirst = prisma.workspace_members.findFirst as ReturnType<typeof vi.fn>;
const mockedMembersFindMany = prisma.workspace_members.findMany as ReturnType<typeof vi.fn>;
const mockedDelegationsFindMany = prisma.delegated_access.findMany as ReturnType<typeof vi.fn>;

type FakeReq = {
  params: Record<string, string>;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  user?: { userId: string; email: string; role: string; jti: string };
};
type FakeRes = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };

function makeReq(overrides: Partial<FakeReq> = {}): FakeReq {
  return {
    params: { ws: "ws-1" },
    body: {},
    query: {},
    user: { userId: "user-1", email: "a@b.tn", role: "GESTIONNAIRE", jti: "jti-1" },
    ...overrides,
  };
}
function makeRes(): FakeRes {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

/** Exécute un middleware et retourne { passed, statusCode } */
async function run(mw: ReturnType<typeof requireWorkspaceRole>, req: FakeReq) {
  const res = makeRes();
  const next = vi.fn();
  await mw(req as never, res as never, next as never);
  return { passed: next.mock.calls.length > 0, statusCode: res.status.mock.calls[0]?.[0] as number | undefined, res };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Par défaut : aucune délégation (les tests « accès direct » sont inchangés)
  mockedDelegationsFindMany.mockResolvedValue([]);
  mockedMembersFindMany.mockResolvedValue([]);
});

describe("requireWorkspaceMember — lecture (P+G+L)", () => {
  it("laisse passer un LECTEUR membre", async () => {
    mockedFindUnique.mockResolvedValue({ role: "LECTEUR" });
    const r = await run(requireWorkspaceMember(), makeReq());
    expect(r.passed).toBe(true);
  });
  it("laisse passer un GESTIONNAIRE membre", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    const r = await run(requireWorkspaceMember(), makeReq());
    expect(r.passed).toBe(true);
  });
  it("laisse passer un PROPRIETAIRE membre", async () => {
    mockedFindUnique.mockResolvedValue({ role: "PROPRIETAIRE" });
    const r = await run(requireWorkspaceMember(), makeReq());
    expect(r.passed).toBe(true);
  });
  it("rejette 403 un non-membre", async () => {
    mockedFindUnique.mockResolvedValue(null);
    const r = await run(requireWorkspaceMember(), makeReq());
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });
  it("rejette 401 sans authentification", async () => {
    const r = await run(requireWorkspaceMember(), makeReq({ user: undefined }));
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(401);
  });
});

describe("requireWorkspaceWriter — écriture métier (P+G)", () => {
  it("laisse passer un GESTIONNAIRE membre", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    const r = await run(requireWorkspaceWriter(), makeReq());
    expect(r.passed).toBe(true);
  });
  it("rejette 403 un LECTEUR (lecture seule stricte)", async () => {
    mockedFindUnique.mockResolvedValue({ role: "LECTEUR" });
    const r = await run(requireWorkspaceWriter(), makeReq());
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });
  it("rejette 403 un CLIENT_VIEWER résiduel en base", async () => {
    mockedFindUnique.mockResolvedValue({ role: "CLIENT_VIEWER" });
    const r = await run(requireWorkspaceWriter(), makeReq());
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });
});

describe("requireWorkspaceOwner — actes engageants (P seul)", () => {
  it("laisse passer un PROPRIETAIRE membre", async () => {
    mockedFindUnique.mockResolvedValue({ role: "PROPRIETAIRE" });
    const r = await run(requireWorkspaceOwner(), makeReq());
    expect(r.passed).toBe(true);
  });
  it("rejette 403 un GESTIONNAIRE (clôture, config, membres…)", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    const r = await run(requireWorkspaceOwner(), makeReq());
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });
  it("rejette 403 un LECTEUR", async () => {
    mockedFindUnique.mockResolvedValue({ role: "LECTEUR" });
    const r = await run(requireWorkspaceOwner(), makeReq());
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });
});

describe("Rôle relu en base — rétrogradage immédiat", () => {
  it("un PROPRIETAIRE du JWT rétrogradé LECTEUR en base est refusé immédiatement", async () => {
    // Le JWT (7 jours) dit PROPRIETAIRE, la base (fraîche) dit LECTEUR
    mockedFindUnique.mockResolvedValue({ role: "LECTEUR" });
    const req = makeReq({ user: { userId: "user-1", email: "a@b.tn", role: "PROPRIETAIRE", jti: "jti-1" } });
    const r = await run(requireWorkspaceOwner(), req);
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
    // La lecture s'est bien faite sur userId + workspaceId de la requête
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: "user-1", workspaceId: "ws-1" } },
    });
  });
});

describe("Extraction du workspaceId", () => {
  it("lit :workspaceId (params)", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    await run(requireWorkspaceWriter(), makeReq({ params: { workspaceId: "ws-param" } }));
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: "user-1", workspaceId: "ws-param" } },
    });
  });
  it("lit :ws (params)", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    await run(requireWorkspaceWriter(), makeReq({ params: { ws: "ws-alt" } }));
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: "user-1", workspaceId: "ws-alt" } },
    });
  });
  it("lit body.workspaceId (POST)", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    await run(requireWorkspaceWriter(), makeReq({ params: {}, body: { workspaceId: "ws-body" } }));
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: "user-1", workspaceId: "ws-body" } },
    });
  });
  it("lit query.workspaceId (GET download)", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    await run(requireWorkspaceWriter(), makeReq({ params: {}, query: { workspaceId: "ws-query" } }));
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: "user-1", workspaceId: "ws-query" } },
    });
  });
  it("rejette 400 si aucun workspaceId trouvable", async () => {
    const r = await run(requireWorkspaceWriter(), makeReq({ params: {} }));
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(400);
  });
});

describe("requireAnyWorkspaceOwner — routes transversales (dashboard cabinet)", () => {
  it("laisse passer un propriétaire d'au moins un workspace", async () => {
    mockedFindFirst.mockResolvedValue({ role: "PROPRIETAIRE" });
    const r = await run(requireAnyWorkspaceOwner as never, makeReq({ params: {} }));
    expect(r.passed).toBe(true);
  });
  it("rejette 403 un utilisateur qui n'est propriétaire nulle part", async () => {
    mockedFindFirst.mockResolvedValue(null);
    const r = await run(requireAnyWorkspaceOwner as never, makeReq({ params: {} }));
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });
});

describe("req.membership injecté pour les handlers", () => {
  it("expose le membership frais après passage", async () => {
    mockedFindUnique.mockResolvedValue({ role: "GESTIONNAIRE" });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();
    await requireWorkspaceWriter()(req as never, res as never, next as never);
    expect(req).toHaveProperty("membership");
    expect((req as unknown as { membership: { role: string; workspaceId: string } }).membership).toEqual({
      userId: "user-1",
      workspaceId: "ws-1",
      role: "GESTIONNAIRE",
      via: "DIRECT",
      cabinetWorkspaceId: undefined,
    });
  });
});

// ── Phase 10 : accès délégué (cabinet → espace Entreprise) ─────────────────

describe("resolveWorkspaceAccess — accès délégué (Phase 10)", () => {
  it("via DELEGATED : membre du cabinet → rôle du cabinet dans l'espace cible", async () => {
    mockedFindUnique
      .mockResolvedValueOnce(null) // pas de membership direct dans l'espace cible
      .mockResolvedValueOnce({ role: "GESTIONNAIRE" }); // membership dans le cabinet
    mockedDelegationsFindMany.mockResolvedValue([{ cabinetWorkspaceId: "ws-cabinet" }]);
    const r = await run(requireWorkspaceMember(), makeReq());
    expect(r.passed).toBe(true);
    expect(r.statusCode).toBeUndefined();
  });

  it("liaison REVOKED/PENDING → aucun accès (403)", async () => {
    mockedFindUnique.mockResolvedValue(null); // pas de membership direct
    mockedDelegationsFindMany.mockResolvedValue([]); // aucune délégation ACTIVE
    const r = await run(requireWorkspaceMember(), makeReq());
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });

  it("précédence : le membership direct gagne sur la délégation", async () => {
    mockedFindUnique.mockResolvedValue({ role: "LECTEUR" }); // direct LECTEUR
    mockedDelegationsFindMany.mockResolvedValue([{ cabinetWorkspaceId: "ws-cabinet" }]);
    // LECTEUR direct + délégation GESTIONNAIRE → écriture refusée (rôle direct)
    const r = await run(requireWorkspaceWriter(), makeReq());
    expect(r.passed).toBe(false);
    expect(r.statusCode).toBe(403);
  });
});
