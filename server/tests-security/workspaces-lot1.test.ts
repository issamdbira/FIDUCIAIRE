// =============================================================================
// Tests de sécurité — Lot 1 : propriétaire unique par cabinet (roadmap §4.3)
// =============================================================================
// Le transfert de propriété doit respecter l'index unique partiel
// workspace_members_proprietaire_unique : l'ancien propriétaire est
// RÉTROGRADÉ avant la promotion du nouveau (jamais deux P simultanés).
// =============================================================================
process.env.VERCEL = "1";
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma.js", async () => {
  const { creerFakeLoginAttempts } = await import("./helpers/fake-login-attempts.js");
  const mock = {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    users: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspace_members: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    delegated_access: { findMany: vi.fn() },
    invitations: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    workspaces: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    login_attempts: creerFakeLoginAttempts(), // Lot 3 — limiteur persisté en base
    $transaction: vi.fn(),
  };
  return {
    default: mock,
    prisma: mock,
    initLog: [],
    initMode: "none",
    initError: null,
  };
});

import prisma from "../lib/prisma.js";
import { createApp } from "../index.js";
import { signToken } from "../lib/jwt.js";
import request from "supertest";

const db = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn> };
  users: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  workspace_members: { findUnique: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const app = createApp();
const WS = "ws-principal";

const PROP_ID = "u-prop";
const NOUVEAU_ID = "u-nouveau";

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.login_attempts as import("./helpers/fake-login-attempts.js").FakeLoginAttempts).__reset();
  // Phase 10 : aucune délégation par défaut (accès direct)
  db.delegated_access.findMany.mockResolvedValue([]);
});

describe("POST /api/workspaces/:ws/transfer — ordre rétrogradation/promotion", () => {
  function sessionProprietaire() {
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: PROP_ID, expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue({ id: PROP_ID, email: "prop@x.tn", role: "PROPRIETAIRE", statut: "VALIDE" });
    // requireWorkspaceRole relit le rôle en base
    db.workspace_members.findUnique.mockResolvedValue({ role: "PROPRIETAIRE", userId: PROP_ID, workspaceId: WS });
    const { token } = signToken({ userId: PROP_ID, email: "prop@x.tn", role: "PROPRIETAIRE" });
    return token;
  }

  it("200 : l'ancien propriétaire est rétrogradé AVANT la promotion (ordre CTE/transaction)", async () => {
    const token = sessionProprietaire();

    // La cible existe en base (membre GESTIONNAIRE)
    db.workspace_members.findUnique.mockImplementation(({ where }: { where: { userId_workspaceId: { userId: string } } }) => {
      const uid = where.userId_workspaceId.userId;
      if (uid === PROP_ID) return Promise.resolve({ role: "PROPRIETAIRE", userId: uid, workspaceId: WS });
      if (uid === NOUVEAU_ID) return Promise.resolve({ role: "GESTIONNAIRE", userId: uid, workspaceId: WS });
      return Promise.resolve(null);
    });

    // Transaction : simule l'exécution séquentielle des updates et capture l'ordre
    const ordreAppels: Array<{ userId: string; role: string }> = [];
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        workspace_members: {
          update: ({ where, data }: { where: { userId_workspaceId: { userId: string } }; data: { role: string } }) => {
            ordreAppels.push({ userId: where.userId_workspaceId.userId, role: data.role });
            return Promise.resolve({});
          },
        },
        users: { update: () => Promise.resolve({}) },
      };
      return await fn(tx);
    });

    const res = await request(app)
      .post(`/api/workspaces/${WS}/transfer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newOwnerId: NOUVEAU_ID });

    expect(res.status).toBe(200);

    // Ordre exigé par l'index unique : démotion (P→G) PUIS promotion (G→P)
    const updatesMembership = ordreAppels.filter((u) => u.role === "PROPRIETAIRE" || u.role === "GESTIONNAIRE");
    expect(updatesMembership.length).toBe(2);
    expect(updatesMembership[0]).toEqual({ userId: PROP_ID, role: "GESTIONNAIRE" }); // rétrogradation d'abord
    expect(updatesMembership[1]).toEqual({ userId: NOUVEAU_ID, role: "PROPRIETAIRE" }); // promotion ensuite

    // Journal de transfert (ancien + nouveau)
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "OWNERSHIP_TRANSFER", entityId: NOUVEAU_ID }),
      })
    );
  });

  it("400 : transfert à soi-même refusé", async () => {
    const token = sessionProprietaire();
    const res = await request(app)
      .post(`/api/workspaces/${WS}/transfer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newOwnerId: PROP_ID });
    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("404 : le nouveau propriétaire doit déjà être membre", async () => {
    const token = sessionProprietaire();
    // l'appelant reste PROPRIETAIRE, la cible est absente
    db.workspace_members.findUnique.mockImplementation(({ where }: { where: { userId_workspaceId: { userId: string } } }) => {
      const uid = where.userId_workspaceId.userId;
      if (uid === PROP_ID) return Promise.resolve({ role: "PROPRIETAIRE", userId: uid, workspaceId: WS });
      return Promise.resolve(null); // cible absente
    });
    const res = await request(app)
      .post(`/api/workspaces/${WS}/transfer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newOwnerId: NOUVEAU_ID });
    expect(res.status).toBe(404);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("403 : un GESTIONNAIRE ne peut pas transférer la propriété", async () => {
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: "u-g", expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue({ id: "u-g", email: "g@x.tn", role: "GESTIONNAIRE", statut: "VALIDE" });
    db.workspace_members.findUnique.mockResolvedValue({ role: "GESTIONNAIRE", userId: "u-g", workspaceId: WS });
    const { token } = signToken({ userId: "u-g", email: "g@x.tn", role: "GESTIONNAIRE" });

    const res = await request(app)
      .post(`/api/workspaces/${WS}/transfer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newOwnerId: NOUVEAU_ID });
    expect(res.status).toBe(403);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

// ── Gardes existantes confirmées (defense in depth) ─────────────────────────

describe("Gardes du dernier propriétaire (routes membres)", () => {
  it("PATCH : impossible de modifier le rôle du propriétaire", async () => {
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: PROP_ID, expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue({ id: PROP_ID, email: "prop@x.tn", role: "PROPRIETAIRE", statut: "VALIDE" });
    db.workspace_members.findUnique.mockImplementation(({ where }: { where: { userId_workspaceId: { userId: string } } }) => {
      const uid = where.userId_workspaceId.userId;
      if (uid === PROP_ID) return Promise.resolve({ role: "PROPRIETAIRE", userId: uid, workspaceId: WS });
      return Promise.resolve({ role: "GESTIONNAIRE", userId: uid, workspaceId: WS });
    });
    const { token } = signToken({ userId: PROP_ID, email: "prop@x.tn", role: "PROPRIETAIRE" });

    const res = await request(app)
      .patch(`/api/workspaces/${WS}/members/${NOUVEAU_ID}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "PROPRIETAIRE" });

    // le rôle P est refusé par la validation (la propriété passe par /transfer)
    expect([400]).toContain(res.status);
    expect(db.workspace_members.update).not.toHaveBeenCalled();
  });

  it("DELETE : impossible de retirer le propriétaire (dernier propriétaire protégé)", async () => {
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: PROP_ID, expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue({ id: PROP_ID, email: "prop@x.tn", role: "PROPRIETAIRE", statut: "VALIDE" });
    db.workspace_members.findUnique.mockImplementation(({ where }: { where: { userId_workspaceId: { userId: string } } }) => {
      const uid = where.userId_workspaceId.userId;
      if (uid === PROP_ID) return Promise.resolve({ role: "PROPRIETAIRE", userId: uid, workspaceId: WS });
      return Promise.resolve(null); // cible : seul le propriétaire existe
    });
    const { token } = signToken({ userId: PROP_ID, email: "prop@x.tn", role: "PROPRIETAIRE" });

    // cibler un autre « propriétaire » (membre P) → refus de retrait
    db.workspace_members.findUnique.mockResolvedValue({ role: "PROPRIETAIRE", userId: NOUVEAU_ID, workspaceId: WS });
    const res = await request(app)
      .delete(`/api/workspaces/${WS}/members/${NOUVEAU_ID}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("transférez");
    expect(db.workspace_members.delete).not.toHaveBeenCalled();
  });
});
