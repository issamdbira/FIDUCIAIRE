// =============================================================================
// Tests de sécurité — Lot 1 : limitation des tentatives + récupération de compte
// =============================================================================
process.env.VERCEL = "1";
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import crypto from "crypto";

vi.mock("../lib/prisma.js", async () => {
  const { creerFakeLoginAttempts } = await import("./helpers/fake-login-attempts.js");
  const mock = {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    users: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspace_members: { findUnique: vi.fn(), findMany: vi.fn() },
    delegated_access: { findMany: vi.fn() },
    invitations: { findUnique: vi.fn() },
    password_resets: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    login_attempts: creerFakeLoginAttempts(), // Lot 3 — limiteur persisté en base
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
import type { FakeLoginAttempts } from "./helpers/fake-login-attempts.js";

const db = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  users: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  workspace_members: { findMany: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn> };
  password_resets: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  login_attempts: FakeLoginAttempts;
};

const app = createApp();

const MOT_DE_PASSE = "MotDePasse123";
const HASH = bcrypt.hashSync(MOT_DE_PASSE, 4);

function utilisateurValide(email: string) {
  return { id: `u-${email}`, email, fullName: "Test", role: "GESTIONNAIRE", statut: "VALIDE", passwordHash: HASH, workspace_members: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.login_attempts.__reset(); // Lot 3 — isolation des tentatives entre cas
  db.workspace_members.findMany.mockResolvedValue([]);
  db.delegated_access.findMany.mockResolvedValue([]);
  db.auditLog.create.mockResolvedValue({});
  db.session.create.mockResolvedValue({});
});

// ── Limitation des tentatives ───────────────────────────────────────────────

describe("POST /api/auth/login — limitation des tentatives", () => {
  it("429 après 5 échecs, même avec le BON mot de passe (verrou strict)", async () => {
    const email = "bruteforce@fiduciaire.tn";
    db.users.findUnique.mockResolvedValue(utilisateurValide(email));

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "MauvaisMotDePasse" });
      expect(res.status).toBe(401);
    }

    // 6e tentative avec le bon mot de passe → 429 (pas d'oracle de force brute)
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: MOT_DE_PASSE });
    expect(res.status).toBe(429);
    expect(res.body.error).toContain("Trop de tentatives");
  });

  it("les échecs sont journalisés dans l'audit (LOGIN_FAILED)", async () => {
    const email = "audit-echec@fiduciaire.tn";
    db.users.findUnique.mockResolvedValue(null);
    await request(app).post("/api/auth/login").send({ email, password: "x" });
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "LOGIN_FAILED" }) })
    );
  });

  it("une autre adresse email n'est pas affectée (isolation du compteur)", async () => {
    const email = "bloque@fiduciaire.tn";
    db.users.findUnique.mockResolvedValue(utilisateurValide(email));
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/auth/login").send({ email, password: "Faux" });
    }

    const autre = "pas-bloque@fiduciaire.tn";
    db.users.findUnique.mockResolvedValue(utilisateurValide(autre));
    const res = await request(app).post("/api/auth/login").send({ email: autre, password: MOT_DE_PASSE });
    expect(res.status).toBe(200);
  });
});

// ── Récupération de compte — émission du lien (PROPRIETAIRE) ────────────────

describe("POST /api/auth/password-reset/request — émission (P seul)", () => {
  it("401 sans session", async () => {
    const res = await request(app).post("/api/auth/password-reset/request").send({ email: "a@b.tn" });
    expect(res.status).toBe(401);
  });

  it("403 pour un GESTIONNAIRE", async () => {
    db.users.findUnique.mockResolvedValue(utilisateurValide("g@x.tn"));
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: "u-g", expiresAt: new Date(Date.now() + 3600_000) });
    const { token } = signToken({ userId: "u-g", email: "g@x.tn", role: "GESTIONNAIRE" });

    const res = await request(app)
      .post("/api/auth/password-reset/request")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "victime@x.tn" });
    expect(res.status).toBe(403);
  });

  it("201 pour un PROPRIETAIRE : lien copiable + journal", async () => {
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: "u-prop", expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue(utilisateurValide("cible@x.tn"));
    db.password_resets.create.mockResolvedValue({ id: "pr-1", expiresAt: new Date(Date.now() + 86400_000) });
    const { token } = signToken({ userId: "u-prop", email: "prop@x.tn", role: "PROPRIETAIRE" });

    const res = await request(app)
      .post("/api/auth/password-reset/request")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "cible@x.tn" });

    expect(res.status).toBe(201);
    expect(res.body.link).toContain("/reinitialisation?token=");
    expect(res.body.link).not.toContain("undefined");
    // Hash sha256 stocké, jamais le token en clair
    expect(db.password_resets.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "cible@x.tn", tokenHash: expect.any(String) }) })
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "PASSWORD_RESET_REQUEST" }) })
    );
  });

  it("403 : un propriétaire ne peut pas réinitialiser un AUTRE propriétaire", async () => {
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: "u-prop", expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue({ id: "u-prop-2", email: "autre-prop@x.tn", role: "PROPRIETAIRE", statut: "VALIDE" });
    const { token } = signToken({ userId: "u-prop", email: "prop@x.tn", role: "PROPRIETAIRE" });

    const res = await request(app)
      .post("/api/auth/password-reset/request")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "autre-prop@x.tn" });
    expect(res.status).toBe(403);
    expect(db.password_resets.create).not.toHaveBeenCalled();
  });
});

// ── Récupération de compte — validation et confirmation (public) ────────────

describe("Flux public de réinitialisation", () => {
  const tokenClair = "t".repeat(64);
  const tokenHash = crypto.createHash("sha256").update(tokenClair).digest("hex");

  function resetValide(overrides: Record<string, unknown> = {}) {
    return {
      id: "pr-1",
      email: "cible@x.tn",
      tokenHash,
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: null,
      ...overrides,
    };
  }

  it("GET : 200 avec l'email pour un token valide", async () => {
    db.password_resets.findUnique.mockResolvedValue(resetValide());
    db.users.findUnique.mockResolvedValue(utilisateurValide("cible@x.tn"));
    const res = await request(app).get(`/api/auth/password-reset/${tokenClair}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("cible@x.tn");
  });

  it("GET : 404 token inconnu, 410 expiré, 410 déjà utilisé", async () => {
    db.password_resets.findUnique.mockResolvedValue(null);
    expect((await request(app).get(`/api/auth/password-reset/${"x".repeat(64)}`)).status).toBe(404);

    db.password_resets.findUnique.mockResolvedValue(resetValide({ expiresAt: new Date(Date.now() - 1000) }));
    expect((await request(app).get(`/api/auth/password-reset/${tokenClair}`)).status).toBe(410);

    db.password_resets.findUnique.mockResolvedValue(resetValide({ usedAt: new Date() }));
    expect((await request(app).get(`/api/auth/password-reset/${tokenClair}`)).status).toBe(410);
  });

  it("POST confirm : mot de passe changé (bcrypt), sessions révoquées, usage unique, audit", async () => {
    db.password_resets.findUnique.mockResolvedValue(resetValide());
    db.users.findUnique.mockResolvedValue(utilisateurValide("cible@x.tn"));
    db.users.update.mockResolvedValue({});
    db.password_resets.update.mockResolvedValue({});
    db.session.deleteMany.mockResolvedValue(3);

    const res = await request(app)
      .post("/api/auth/password-reset/confirm")
      .send({ token: tokenClair, newPassword: "NouveauMotDePasse123" });

    expect(res.status).toBe(200);
    // Mot de passe hashé en bcrypt (pas de stockage en clair)
    expect(db.users.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u-cible@x.tn" },
        data: expect.objectContaining({ passwordHash: expect.stringMatching(/^\$2[aby]\$/) }),
      })
    );
    // TOUTES les sessions du compte révoquées
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "u-cible@x.tn" } });
    // Marqué utilisé
    expect(db.password_resets.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pr-1" }, data: expect.objectContaining({ usedAt: expect.any(Date) }) })
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "PASSWORD_RESET_CONFIRM" }) })
    );
  });

  it("POST confirm : rejeu du même token → 410", async () => {
    db.password_resets.findUnique.mockResolvedValue(resetValide({ usedAt: new Date() }));
    const res = await request(app)
      .post("/api/auth/password-reset/confirm")
      .send({ token: tokenClair, newPassword: "NouveauMotDePasse123" });
    expect(res.status).toBe(410);
    expect(db.users.update).not.toHaveBeenCalled();
  });

  it("POST confirm : mot de passe trop court → 400", async () => {
    const res = await request(app)
      .post("/api/auth/password-reset/confirm")
      .send({ token: tokenClair, newPassword: "court" });
    expect(res.status).toBe(400);
  });
});
