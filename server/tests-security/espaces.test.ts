// =============================================================================
// Tests Phase 10 — Modèle espaces : création d'espace, délégations, liaison
// =============================================================================
// Scénarios : flux A (cabinet crée l'espace client), flux B (auto-inscription
// publique), codes de liaison, révocation, employé sans entreprise interdit.
// Application Express réelle montée avec Prisma entièrement mocké.
// =============================================================================

process.env.VERCEL = "1"; // empêche le listen() à l'import
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma.js", () => {
  const mock = {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    users: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspace_members: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    workspaces: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    delegated_access: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    invitations: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn(), findMany: vi.fn() },
    clientCompany: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    employees: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    payrollPeriod: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    payrollConfig: { findUnique: vi.fn(), create: vi.fn() },
    tranches_irpp: { createMany: vi.fn(), findMany: vi.fn() },
    conventionCollective: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    regleReglementaire: { findMany: vi.fn(), create: vi.fn() },
    migration_map: { findMany: vi.fn(), create: vi.fn() },
    payslip: { updateMany: vi.fn(), aggregate: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    anomaly: { count: vi.fn() },
    cNSSDeclaration: { count: vi.fn(), findMany: vi.fn() },
    documentStorage: { findMany: vi.fn(), count: vi.fn() },
    attendanceImport: { count: vi.fn(), findMany: vi.fn() },
    attendanceSummary: { updateMany: vi.fn() },
    payrollVariable: { updateMany: vi.fn() },
    contract: { count: vi.fn(), findMany: vi.fn() },
    conventionAdaptation: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    workCalendar: { updateMany: vi.fn() },
    contacts: { updateMany: vi.fn() },
    // $transaction : exécuter le callback avec le mock lui-même comme tx
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mock));
  return { default: mock, prisma: mock, initLog: [], initMode: "none", initError: null };
});

import prisma from "../lib/prisma.js";
import { createApp } from "../index.js";
import { signToken } from "../lib/jwt.js";
import request from "supertest";

const db = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn> };
  users: { findUnique: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  workspace_members: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  workspaces: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  clientCompany: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  employees: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  payrollPeriod: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  payrollConfig: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  tranches_irpp: { createMany: ReturnType<typeof vi.fn> };
  payslip: { aggregate: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn> };
  cNSSDeclaration: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  invitations: { findUnique: ReturnType<typeof vi.fn> };
};

const app = createApp();

const WS_CAB = "ws-cabinet-1";
const WS_ENT = "ws-entreprise-1";

function token(userId: string, role: string) {
  db.session.findUnique.mockResolvedValue({ token: "jti", userId, expiresAt: new Date(Date.now() + 3600_000) });
  db.users.findUnique.mockResolvedValue({ id: userId, email: "t@x.tn", role, statut: "VALIDE" });
  return signToken({ userId, email: "t@x.tn", role }).token;
}

/** Membre direct du workspace avec le rôle donné (résolution RBAC) */
function membreDirect(role: string) {
  db.workspace_members.findUnique.mockResolvedValue(role ? { role } : null);
  db.delegated_access.findMany.mockResolvedValue([]);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.delegated_access.findMany.mockResolvedValue([]);
  db.workspace_members.findMany.mockResolvedValue([]);
  db.payslip.aggregate.mockResolvedValue({ _sum: { salaireBrutEffectif: 0 } });
  db.payslip.count.mockResolvedValue(0);
  db.payslip.groupBy.mockResolvedValue([]);
});

// ── Flux B : /auth/create-space ─────────────────────────────────────────────

describe("Flux B — POST /api/auth/create-space (auto-inscription entreprise)", () => {
  it("400 si un champ requis manque", async () => {
    const res = await request(app)
      .post("/api/auth/create-space")
      .send({ email: "a@b.tn", password: "MotDePasse123" });
    expect(res.status).toBe(400);
  });

  it("400 si mot de passe trop court", async () => {
    const res = await request(app)
      .post("/api/auth/create-space")
      .send({ email: "a@b.tn", password: "court", fullName: "A B", companyName: "Société X" });
    expect(res.status).toBe(400);
  });

  it("409 si l'email existe déjà", async () => {
    db.users.findUnique.mockResolvedValue({ id: "u1" });
    const res = await request(app)
      .post("/api/auth/create-space")
      .send({ email: "a@b.tn", password: "MotDePasse123", fullName: "A B", companyName: "Société X" });
    expect(res.status).toBe(409);
  });

  it("201 : crée utilisateur + espace ENTREPRISE + membership PROPRIETAIRE", async () => {
    db.users.findUnique.mockResolvedValue(null);
    db.users.create.mockResolvedValue({ id: "u9", email: "a@b.tn", fullName: "A B", role: "PROPRIETAIRE", statut: "VALIDE" });
    db.workspaces.create.mockResolvedValue({ id: WS_ENT, name: "Société X", type: "ENTREPRISE" });
    db.payrollConfig.create.mockResolvedValue({ id: "pc-x" });
    db.clientCompany.create.mockResolvedValue({ id: "cc-1", raisonSociale: "Société X" });
    db.session.create.mockResolvedValue({});

    const res = await request(app)
      .post("/api/auth/create-space")
      .send({ email: "a@b.tn", password: "MotDePasse123", fullName: "A B", companyName: "Société X" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    // L'espace créé est de type ENTREPRISE
    expect(db.workspaces.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "ENTREPRISE", name: "Société X" }) })
    );
    // Membership PROPRIETAIRE
    expect(db.workspace_members.create).toHaveBeenCalledWith({
      data: { userId: "u9", workspaceId: WS_ENT, role: "PROPRIETAIRE" },
    });
  });
});

// ── Flux A : le cabinet crée l'espace d'un client ──────────────────────────

describe("Flux A — POST /api/workspaces/:ws/client-spaces", () => {
  it("403 pour un GESTIONNAIRE du cabinet (P seul)", async () => {
    const t = token("gest-1", "GESTIONNAIRE");
    membreDirect("GESTIONNAIRE");
    const res = await request(app)
      .post(`/api/workspaces/${WS_CAB}/client-spaces`)
      .set("Authorization", `Bearer ${t}`)
      .send({ raisonSociale: "Client SARL" });
    expect(res.status).toBe(403);
  });

  it("400 si l'espace actif n'est pas un CABINET", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.workspaces.findUnique.mockResolvedValue({ id: WS_ENT, name: "Société X", type: "ENTREPRISE" });
    const res = await request(app)
      .post(`/api/workspaces/${WS_ENT}/client-spaces`)
      .set("Authorization", `Bearer ${t}`)
      .send({ raisonSociale: "Client SARL" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Cabinet");
  });

  it("400 si raisonSociale absente", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.workspaces.findUnique.mockResolvedValue({ id: WS_CAB, name: "Cabinet ABC", type: "CABINET" });
    const res = await request(app)
      .post(`/api/workspaces/${WS_CAB}/client-spaces`)
      .set("Authorization", `Bearer ${t}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("201 : crée l'espace ENTREPRISE + fiche société + délégation ACTIVE", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.workspaces.findUnique.mockResolvedValue({ id: WS_CAB, name: "Cabinet ABC", type: "CABINET", archivedAt: null });
    db.payrollConfig.findUnique.mockResolvedValue({ id: "pc-1", workspaceId: WS_CAB, cnssSalarialNonAgricole: 0.0968 });
    db.tranches_irpp.findMany.mockResolvedValue([
      { payrollConfigId: "pc-1", min: 0, max: 5000, taux: 0, ordre: 1 },
    ]);
    db.workspaces.create.mockResolvedValue({ id: "ws-nouveau", name: "Client SARL", type: "ENTREPRISE" });
    db.payrollConfig.create.mockResolvedValue({ id: "pc-2" });
    db.clientCompany.create.mockResolvedValue({ id: "cc-9", raisonSociale: "Client SARL" });
    db.delegated_access.create.mockResolvedValue({ id: "da-1" });

    const res = await request(app)
      .post(`/api/workspaces/${WS_CAB}/client-spaces`)
      .set("Authorization", `Bearer ${t}`)
      .send({ raisonSociale: "Client SARL", matriculeFiscal: "MF-1" });

    expect(res.status).toBe(201);
    expect(db.workspaces.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "ENTREPRISE", name: "Client SARL" }) })
    );
    // La délégation ACTIVE est créée dans la même transaction
    expect(db.delegated_access.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cabinetWorkspaceId: WS_CAB,
        targetWorkspaceId: "ws-nouveau",
        statut: "ACTIVE",
      }),
    });
  });
});

// ── Codes de liaison (entreprise → cabinet) ────────────────────────────────

describe("Codes de liaison — POST/GET/DELETE /api/workspaces/:ws/liaison-codes", () => {
  it("400 : un CABINET ne peut pas générer de code", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.workspaces.findUnique.mockResolvedValue({ id: WS_CAB, type: "CABINET", archivedAt: null });
    const res = await request(app)
      .post(`/api/workspaces/${WS_CAB}/liaison-codes`)
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(400);
  });

  it("201 : une ENTREPRISE génère un code PENDING avec expiration", async () => {
    const t = token("prop-ent", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.workspaces.findUnique.mockResolvedValue({ id: WS_ENT, type: "ENTREPRISE", archivedAt: null });
    db.delegated_access.create.mockResolvedValue({ id: "da-2", code: "ABCD1234" });

    const res = await request(app)
      .post(`/api/workspaces/${WS_ENT}/liaison-codes`)
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(201);
    expect(res.body.code).toBeTruthy();
    expect(db.delegated_access.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ targetWorkspaceId: WS_ENT, statut: "PENDING" }),
    });
  });
});

// ── Liaison par code (cabinet) ──────────────────────────────────────────────

describe("Liaison — POST /api/workspaces/:ws/delegations/link", () => {
  it("404 : code inconnu", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.delegated_access.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post(`/api/workspaces/${WS_CAB}/delegations/link`)
      .set("Authorization", `Bearer ${t}`)
      .send({ code: "INCONNU" });
    expect(res.status).toBe(404);
  });

  it("410 : code expiré", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.delegated_access.findFirst.mockResolvedValue({
      id: "da-3", code: "EXPIRE01", statut: "PENDING",
      targetWorkspaceId: WS_ENT, expiresAt: new Date(Date.now() - 1000),
    });
    const res = await request(app)
      .post(`/api/workspaces/${WS_CAB}/delegations/link`)
      .set("Authorization", `Bearer ${t}`)
      .send({ code: "EXPIRE01" });
    expect(res.status).toBe(410);
  });

  it("200 : code valide → liaison ACTIVE (code effacé)", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.delegated_access.findFirst
      .mockResolvedValueOnce({ // le code PENDING
        id: "da-4", code: "BONCODE1", statut: "PENDING",
        targetWorkspaceId: WS_ENT, expiresAt: new Date(Date.now() + 3600_000),
      })
      .mockResolvedValueOnce(null); // aucune ligne existante (cabinet, cible)
    db.workspaces.findUnique.mockResolvedValue({ id: WS_ENT, name: "Société X", archivedAt: null });
    db.delegated_access.update.mockResolvedValue({});

    const res = await request(app)
      .post(`/api/workspaces/${WS_CAB}/delegations/link`)
      .set("Authorization", `Bearer ${t}`)
      .send({ code: "boncode1" }); // minuscules → normalisé

    expect(res.status).toBe(200);
    expect(db.delegated_access.update).toHaveBeenCalledWith({
      where: { id: "da-4" },
      data: expect.objectContaining({ cabinetWorkspaceId: WS_CAB, statut: "ACTIVE", code: null }),
    });
  });
});

// ── Révocation d'un accès délégué ───────────────────────────────────────────

describe("Révocation — DELETE /api/workspaces/:ws/delegations/:id", () => {
  it("200 : accès ACTIVE → REVOKED (effectif immédiatement)", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.delegated_access.findFirst.mockResolvedValue({
      id: "da-5", statut: "ACTIVE", cabinetWorkspaceId: WS_CAB, targetWorkspaceId: WS_ENT,
    });
    db.delegated_access.update.mockResolvedValue({});

    const res = await request(app)
      .delete(`/api/workspaces/${WS_CAB}/delegations/da-5`)
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(db.delegated_access.update).toHaveBeenCalledWith({
      where: { id: "da-5" },
      data: expect.objectContaining({ statut: "REVOKED" }),
    });
  });

  it("404 : accès d'un autre cabinet", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    db.delegated_access.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .delete(`/api/workspaces/${WS_CAB}/delegations/inconnu`)
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(404);
  });
});

// ── Employés : rattachement société obligatoire (décision n° 3) ────────────

describe("Employés — POST /api/employees sans entreprise → 400", () => {
  it("refuse la création d'un salarié orphelin (cabinet)", async () => {
    const t = token("gest-1", "GESTIONNAIRE");
    membreDirect("GESTIONNAIRE");
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${t}`)
      .send({ workspaceId: WS_CAB, matriculeCnss: "12345678", firstName: "A", lastName: "B", baseSalary: 1000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("clientCompanyId requis");
  });
});

// ── Dashboard cabinet scopé (anti-fuite) ────────────────────────────────────

describe("Dashboard cabinet — scopé au cabinet actif (Phase 10)", () => {
  it("agrège SEULEMENT le cabinet :ws et ses dossiers délégués", async () => {
    const t = token("prop-1", "PROPRIETAIRE");
    membreDirect("PROPRIETAIRE");
    // Une délégation ACTIVE vers WS_ENT
    db.delegated_access.findMany.mockResolvedValue([{ cabinetWorkspaceId: WS_CAB, targetWorkspaceId: WS_ENT }]);
    db.clientCompany.count.mockResolvedValue(2);
    db.clientCompany.findMany.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
    db.payrollPeriod.findMany.mockResolvedValue([]);
    db.cNSSDeclaration.count.mockResolvedValue(0);
    db.cNSSDeclaration.findMany.mockResolvedValue([]);
    db.auditLog.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get(`/api/dashboard/cabinet/${WS_CAB}`)
      .set("Authorization", `Bearer ${t}`);

    expect(res.status).toBe(200);
    // totalWorkspaces = nombre de DOSSIERS délégués, pas tous les espaces
    expect(res.body.totalWorkspaces).toBe(1);
    // Les requêtes sont filtrées par workspaceId in [cabinet, dossier]
    expect(db.clientCompany.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ workspaceId: { in: [WS_CAB, WS_ENT] } }) })
    );
  });

  it("403 pour un LECTEUR (P seul)", async () => {
    const t = token("lecteur-1", "LECTEUR");
    membreDirect("LECTEUR");
    const res = await request(app)
      .get(`/api/dashboard/cabinet/${WS_CAB}`)
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(403);
  });
});
