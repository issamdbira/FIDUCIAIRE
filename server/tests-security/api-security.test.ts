// =============================================================================
// Tests de sécurité API — RBAC, isolation workspace, invitations, setup
// =============================================================================
// L'application Express réelle est montée via createApp() avec le client
// Prisma entièrement mocké (aucune base nécessaire). Chaque scénario
// correspond à un critère d'acceptation du plan de correction.
// =============================================================================

process.env.VERCEL = "1"; // empêche le listen() à l'import
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock complet du client Prisma ──────────────────────────────────────────
vi.mock("../lib/prisma.js", () => {
  const mock = {
    session: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspace_members: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    invitations: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    delegated_access: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspaces: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    clientCompany: {
      findFirst: vi.fn(),
    },
    employees: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    payrollPeriod: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    anomaly: {
      count: vi.fn(),
    },
    payslip: {
      updateMany: vi.fn(),
    },
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
import crypto from "crypto";
import request from "supertest";

const db = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn> };
  users: { findUnique: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  workspace_members: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  invitations: { findUnique: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  clientCompany: { findFirst: ReturnType<typeof vi.fn> };
  employees: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  payrollPeriod: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
};

const app = createApp();

// ── Helpers ────────────────────────────────────────────────────────────────

/** Session/utilisateur mockés pour un userId donné */
function authentifier(userId: string, role: string) {
  db.session.findUnique.mockResolvedValue({ token: "jti", userId, expiresAt: new Date(Date.now() + 3600_000) });
  db.users.findUnique.mockResolvedValue({ id: userId, email: "test@fiduciaire.tn", role, statut: "VALIDE" });
  const { token } = signToken({ userId, email: "test@fiduciaire.tn", role });
  return token;
}

/** Rôle du membre dans le workspace (middleware RBAC — relu en base) */
function membreDe(role: string | null) {
  db.workspace_members.findUnique.mockResolvedValue(role ? { role } : null);
}

const WS_A = "ws-alpha";
const WS_B = "ws-beta";

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Phase 10 : par défaut, aucune délégation d'accès (tests directs inchangés)
  db.delegated_access.findMany.mockResolvedValue([]);
});

describe("P0 — /auth/setup verrouillé après installation", () => {
  it("retourne 403 si un PROPRIETAIRE existe déjà (reset par email impossible)", async () => {
    db.users.findFirst.mockResolvedValue({ id: "prop-1", email: "prop@fiduciaire.tn", role: "PROPRIETAIRE" });
    const res = await request(app)
      .post("/api/auth/setup")
      .send({ email: "prop@fiduciaire.tn", password: "NouveauMotDePasse1", fullName: "Attaquant" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("déjà initialisé");
  });

  it("retourne 403 même avec l'email exact du propriétaire (ancienne faille)", async () => {
    db.users.findFirst.mockResolvedValue({ id: "prop-1", email: "victime@fiduciaire.tn", role: "PROPRIETAIRE" });
    const res = await request(app)
      .post("/api/auth/setup")
      .send({ email: "victime@fiduciaire.tn", password: "Pirate12345", fullName: "Pirate" });
    expect(res.status).toBe(403);
    // Aucun mot de passe ne doit être modifié
    expect(db.users.update).not.toHaveBeenCalled();
  });
});

describe("P0 — /auth/register désactivé", () => {
  it("retourne 403 avec le message d'invitation", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "x@y.tn", password: "MotDePasse1", fullName: "X" });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("invitation");
  });
});

describe("Invitations — cycle de vie", () => {
  const tokenValide = "tok".repeat(20);
  const hashValide = crypto.createHash("sha256").update(tokenValide).digest("hex");

  it("404 pour un token inconnu", async () => {
    db.invitations.findUnique.mockResolvedValue(null);
    const res = await request(app).get(`/api/auth/invitation/${"a".repeat(64)}`);
    expect(res.status).toBe(404);
  });

  it("410 pour une invitation expirée", async () => {
    db.invitations.findUnique.mockResolvedValue({
      id: "inv-1", workspaceId: WS_A, email: "invite@x.tn", role: "GESTIONNAIRE",
      tokenHash: "h", expiresAt: new Date(Date.now() - 1000), usedAt: null,
      workspaces: { id: WS_A, name: "Cabinet A" },
    });
    const res = await request(app).get(`/api/auth/invitation/${"b".repeat(64)}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toContain("expiré");
  });

  it("410 pour une invitation déjà utilisée (usage unique)", async () => {
    db.invitations.findUnique.mockResolvedValue({
      id: "inv-1", workspaceId: WS_A, email: "invite@x.tn", role: "LECTEUR",
      tokenHash: "h", expiresAt: new Date(Date.now() + 3600_000), usedAt: new Date(),
      workspaces: { id: WS_A, name: "Cabinet A" },
    });
    const res = await request(app).get(`/api/auth/invitation/${"c".repeat(64)}`);
    expect(res.status).toBe(410);
    expect(res.body.error).toContain("utilisée");
  });

  it("acceptation : crée l'utilisateur VALIDE + LE MEMBERSHIP + la session", async () => {
    db.invitations.findUnique.mockResolvedValue({
      id: "inv-2", workspaceId: WS_A, email: "nouveau@x.tn", role: "GESTIONNAIRE",
      tokenHash: hashValide, expiresAt: new Date(Date.now() + 3600_000), usedAt: null,
      workspaces: { id: WS_A, name: "Cabinet A" },
    });
    db.users.findUnique.mockResolvedValue(null); // pas de compte existant
    db.users.create.mockResolvedValue({
      id: "user-9", email: "nouveau@x.tn", fullName: "Nouveau", role: "GESTIONNAIRE", statut: "VALIDE",
    });
    db.workspace_members.findUnique.mockResolvedValue(null); // pas encore membre
    db.workspace_members.create.mockResolvedValue({ userId: "user-9", workspaceId: WS_A, role: "GESTIONNAIRE" });
    db.workspace_members.findMany.mockResolvedValue([
      { workspaces: { id: WS_A, name: "Cabinet A" }, role: "GESTIONNAIRE" },
    ]);

    const res = await request(app)
      .post(`/api/auth/invitation/${tokenValide}/accept`)
      .send({ password: "MotDePasse123", fullName: "Nouveau Utilisateur" });

    expect(res.status).toBe(200);
    expect(res.body.user.statut).toBe("VALIDE");
    expect(res.body.user.workspaces).toHaveLength(1);
    // Le membership a bien été créé (le gap historique)
    expect(db.workspace_members.create).toHaveBeenCalledWith({
      data: { userId: "user-9", workspaceId: WS_A, role: "GESTIONNAIRE" },
    });
    // L'invitation est marquée utilisée
    expect(prisma.invitations.update).toHaveBeenCalled();
  });

  it("acceptation sur compte existant : mot de passe actuel erroné → 401", async () => {
    db.invitations.findUnique.mockResolvedValue({
      id: "inv-3", workspaceId: WS_A, email: "existant@x.tn", role: "LECTEUR",
      tokenHash: hashValide, expiresAt: new Date(Date.now() + 3600_000), usedAt: null,
      workspaces: { id: WS_A, name: "Cabinet A" },
    });
    // bcrypt.compare échouera avec un hash factice
    db.users.findUnique.mockResolvedValue({
      id: "user-8", email: "existant@x.tn", fullName: "Existant",
      passwordHash: "$2a$12$invalidhashinvalidhashinvalidhashinvalidhashinvalidha", role: "LECTEUR", statut: "VALIDE",
    });

    const res = await request(app)
      .post(`/api/auth/invitation/${tokenValide}/accept`)
      .send({ currentPassword: "MauvaisMotDePasse" });

    expect(res.status).toBe(401);
    // Aucun membership créé
    expect(db.workspace_members.create).not.toHaveBeenCalled();
  });
});

describe("RBAC — matrice par rôle du workspace", () => {
  it("LECTEUR → POST /api/employees = 403 (lecture seule stricte)", async () => {
    const token = authentifier("lecteur-1", "LECTEUR");
    membreDe("LECTEUR");
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId: WS_A, matriculeCnss: "123", firstName: "A", lastName: "B", baseSalary: 1000 });
    expect(res.status).toBe(403);
  });

  it("GESTIONNAIRE → clôturer une période = 403 (acte réservé au propriétaire)", async () => {
    const token = authentifier("gest-1", "GESTIONNAIRE");
    membreDe("GESTIONNAIRE");
    const res = await request(app)
      .patch(`/api/payroll/${WS_A}/periods/period-1/close`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("GESTIONNAIRE → valider une période = autorisé (P+G)", async () => {
    const token = authentifier("gest-1", "GESTIONNAIRE");
    membreDe("GESTIONNAIRE");
    // findUnique est la méthode utilisée par la route validate
    db.payrollPeriod.findUnique.mockResolvedValue({
      id: "period-1", workspaceId: WS_A, statut: "CALCULATED", validatedBy: null, mois: 9, annee: 2026,
    });
    (prisma as unknown as { anomaly: { count: ReturnType<typeof vi.fn> } }).anomaly.count.mockResolvedValue(0);
    (prisma as unknown as { payslip: { updateMany: ReturnType<typeof vi.fn> } }).payslip.updateMany.mockResolvedValue({ count: 5 });
    db.payrollPeriod.update.mockResolvedValue({ id: "period-1", statut: "VALIDATED" });
    const res = await request(app)
      .patch(`/api/payroll/${WS_A}/periods/period-1/validate`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("LECTEUR → écrire la configuration = 403", async () => {
    const token = authentifier("lecteur-1", "LECTEUR");
    membreDe("LECTEUR");
    const put = await request(app)
      .put(`/api/config/${WS_A}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ cnssSalarialNonAgricole: 0.0968 });
    expect(put.status).toBe(403);
  });

  it("GESTIONNAIRE → écrire la configuration = 403 (P seul)", async () => {
    const token = authentifier("gest-1", "GESTIONNAIRE");
    membreDe("GESTIONNAIRE");
    const put = await request(app)
      .put(`/api/config/${WS_A}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ cnssSalarialNonAgricole: 0.0968 });
    expect(put.status).toBe(403);
  });

  it("GESTIONNAIRE → gérer les membres = 403 (P seul)", async () => {
    const token = authentifier("gest-1", "GESTIONNAIRE");
    membreDe("GESTIONNAIRE");
    const res = await request(app)
      .get(`/api/workspaces/${WS_A}/members`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe("Isolation inter-workspace (IDOR)", () => {
  it("membre du ws A → lister les périodes du ws B = 403", async () => {
    const token = authentifier("user-a", "GESTIONNAIRE");
    db.workspace_members.findUnique.mockImplementation(async ({ where }: { where: { userId_workspaceId: { workspaceId: string } } }) =>
      where.userId_workspaceId.workspaceId === WS_A ? { role: "GESTIONNAIRE" } : null);
    const res = await request(app)
      .get(`/api/payroll/${WS_B}/periods`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("PROPRIETAIRE global mais NON membre du ws B → 403 (rôles PAR workspace)", async () => {
    const token = authentifier("prop-a", "PROPRIETAIRE");
    db.workspace_members.findUnique.mockImplementation(async ({ where }: { where: { userId_workspaceId: { workspaceId: string } } }) =>
      where.userId_workspaceId.workspaceId === WS_A ? { role: "PROPRIETAIRE" } : null);
    const res = await request(app)
      .get(`/api/clients/${WS_B}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe("Rétrogradage immédiat (rôle relu en base)", () => {
  it("un PROPRIETAIRE du JWT rétrogradé LECTEUR en base est refusé sur une écriture", async () => {
    const token = authentifier("prop-demoted", "PROPRIETAIRE"); // JWT encore PROPRIETAIRE
    membreDe("LECTEUR"); // mais la base (fraîche) dit LECTEUR
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId: WS_A, matriculeCnss: "123", firstName: "A", lastName: "B", baseSalary: 1000 });
    expect(res.status).toBe(403);
  });
});

describe("Archivage client bloquant", () => {
  it("ouvrir une période de paie pour un client ARCHIVED → 409", async () => {
    const token = authentifier("gest-1", "GESTIONNAIRE");
    membreDe("GESTIONNAIRE");
    db.clientCompany.findFirst.mockResolvedValue({ id: "cli-1", workspaceId: WS_A, statut: "ARCHIVED" });
    const res = await request(app)
      .post("/api/payroll/periods")
      .set("Authorization", `Bearer ${token}`)
      .send({ workspaceId: WS_A, clientCompanyId: "cli-1", mois: 9, annee: 2026 });
    expect(res.status).toBe(409);
    expect(res.body.error).toContain("archivé");
  });
});
