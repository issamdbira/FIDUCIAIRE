// =============================================================================
// Tests de sécurité — Lot 2 : purge automatique des expirations + IP réelle
// =============================================================================
// Critères d'acceptation :
//   - purge des sessions ET des tokens de réinitialisation expirés ;
//   - porte temporelle : au plus UNE purge par heure (test d'horodatage) ;
//   - force = true outrepasse la porte (scripts d'exploitation) ;
//   - purge en échec ne bloque JAMAIS l'authentification ;
//   - requireAuth déclenche la purge (première requête = porte ouverte) ;
//   - login : l'audit enregistre l'IP du client réel (x-vercel-forwarded-for,
//     x-real-ip), jamais l'IP du proxy interne.
// =============================================================================
process.env.VERCEL = "1";
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("../lib/prisma.js", async () => {
  const { creerFakeLoginAttempts } = await import("./helpers/fake-login-attempts.js");
  const mock = {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    users: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspace_members: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    delegated_access: { findMany: vi.fn() },
    password_resets: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
    login_attempts: creerFakeLoginAttempts(), // Lot 3 — purge des tentatives
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
import {
  purgeExpirations,
  purgeExpirationsSilencieuse,
  __reinitialiserPourTests,
} from "../lib/session-cleanup.js";
import { createApp } from "../index.js";
import request from "supertest";

const db = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  users: { findUnique: ReturnType<typeof vi.fn> };
  workspace_members: { findMany: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn> };
  password_resets: { deleteMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  login_attempts: import("./helpers/fake-login-attempts.js").FakeLoginAttempts;
};

const app = createApp();
const HASH = bcrypt.hashSync("MotDePasse123", 4);

beforeEach(() => {
  vi.clearAllMocks();
  __reinitialiserPourTests();
  db.login_attempts.__reset();
  db.workspace_members.findMany.mockResolvedValue([]);
  db.delegated_access.findMany.mockResolvedValue([]);
  db.auditLog.create.mockResolvedValue({});
  db.session.create.mockResolvedValue({});
  db.session.deleteMany.mockResolvedValue({ count: 0 });
  db.password_resets.deleteMany.mockResolvedValue({ count: 0 });
});

// ---------------------------------------------------------------------------
// Purge — sémantique
// ---------------------------------------------------------------------------
describe("Lot 2 — purgeExpirations", () => {
  it("supprime les sessions, tokens et tentatives STRICTEMENT expirés (where < borne)", async () => {
    db.session.deleteMany.mockResolvedValue({ count: 3 });
    db.password_resets.deleteMany.mockResolvedValue({ count: 2 });

    const r = await purgeExpirations(true);

    expect(r).toEqual({ sessions: 3, resets: 2, tentatives: 0 });
    const borne = db.session.deleteMany.mock.calls[0][0].where.expiresAt.lt;
    expect(borne).toBeInstanceOf(Date);
    expect(borne.getTime()).toBeLessThanOrEqual(Date.now());
    expect(db.password_resets.deleteMany.mock.calls[0][0].where.expiresAt.lt.getTime())
      .toBeLessThanOrEqual(Date.now());
  });

  it("Lot 3 — purge les tentatives de connexion de plus de 2 h", async () => {
    // 2 échecs anciens (3 h) + 1 échec récent — seuls les anciens partent
    for (let i = 0; i < 2; i++) {
      await db.login_attempts.create({ data: { email: "vieux@test.tn", ip: `ip-v-${i}` } });
    }
    await db.login_attempts.create({ data: { email: "recent@test.tn", ip: "ip-r" } });
    for (const l of db.login_attempts.__lignes()) {
      if (l.email === "vieux@test.tn") l.createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    }

    const r = await purgeExpirations(true);

    expect(r.tentatives).toBe(2);
    expect(db.login_attempts.__lignes().map((l) => l.email)).toEqual(["recent@test.tn"]);
  });

  it("porte temporelle : la seconde purge dans l'heure est un no-op", async () => {
    await purgeExpirations(true); // ouvre la porte
    expect(db.session.deleteMany).toHaveBeenCalledTimes(1);

    const r = await purgeExpirations();
    expect(r).toEqual({ sessions: 0, resets: 0, tentatives: 0 });
    expect(db.session.deleteMany).toHaveBeenCalledTimes(1); // PAS de 2e appel
  });

  it("force = true outrepasse la porte", async () => {
    await purgeExpirations(true);
    await purgeExpirations(true);
    expect(db.session.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("purgeExpirationsSilencieuse avale les erreurs (jamais bloquante)", async () => {
    db.session.deleteMany.mockRejectedValue(new Error("boom DB"));
    const r = await expect(purgeExpirationsSilencieuse()).resolves.toEqual({ sessions: 0, resets: 0, tentatives: 0 });
    expect(r).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Intégration — requireAuth déclenche la purge (porte ouverte au 1er passage)
// ---------------------------------------------------------------------------
describe("Lot 2 — requireAuth déclenche la purge opportuniste", () => {
  it("une requête authentifiée purge les expirations une fois (porte ensuite fermée)", async () => {
    const { signToken } = await import("../lib/jwt.js");
    const jti = "jti-purge-1";
    const { token } = signToken({ userId: "u1", email: "a@t.tn", role: "GESTIONNAIRE" });
    db.session.findUnique.mockResolvedValue({ id: "s1", token: jti, userId: "u1", expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue({ id: "u1", email: "a@t.tn", role: "GESTIONNAIRE", statut: "VALIDE" });

    // Extraire le jti réel du jeton signé (le token signé encapsule le jti)
    const { verifyToken } = await import("../lib/jwt.js");
    const payload = verifyToken(token);
    db.session.findUnique.mockResolvedValue({ id: "s1", token: payload?.jti, userId: "u1", expiresAt: new Date(Date.now() + 3600_000) });

    const r1 = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(r1.status).toBe(200);
    expect(db.session.deleteMany).toHaveBeenCalledTimes(1); // purge exécutée

    const r2 = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(r2.status).toBe(200);
    expect(db.session.deleteMany).toHaveBeenCalledTimes(1); // porte fermée : pas de 2e purge
  });

  it("une purge en échec ne bloque PAS l'authentification", async () => {
    const { signToken } = await import("../lib/jwt.js");
    const { token } = signToken({ userId: "u1", email: "a@t.tn", role: "GESTIONNAIRE" });
    const { verifyToken } = await import("../lib/jwt.js");
    const payload = verifyToken(token);
    db.session.findUnique.mockResolvedValue({ id: "s1", token: payload?.jti, userId: "u1", expiresAt: new Date(Date.now() + 3600_000) });
    db.users.findUnique.mockResolvedValue({ id: "u1", email: "a@t.tn", role: "GESTIONNAIRE", statut: "VALIDE" });
    db.session.deleteMany.mockRejectedValue(new Error(" purge impossible"));

    const r = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(200); // authentifié malgré l'échec de purge
  });
});

// ---------------------------------------------------------------------------
// IP client réelle (Lot 2 — correctif proxy Vercel)
// ---------------------------------------------------------------------------
describe("Lot 2 — IP client réelle derrière le proxy", () => {
  function utilisateurValide(email: string) {
    return {
      id: `u-${email}`, email, fullName: "Test", role: "GESTIONNAIRE",
      statut: "VALIDE", passwordHash: bcrypt.hashSync("MotDePasse123", 4),
      workspace_members: [],
    };
  }

  it("x-vercel-forwarded-for (plateforme, non forgé) devient l'IP auditée", async () => {
    db.users.findUnique.mockResolvedValue(utilisateurValide("ip1@test.tn"));

    const r = await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "203.0.113.7")
      .send({ email: "ip1@test.tn", password: "MAUVAIS" });

    expect(r.status).toBe(401);
    expect(db.auditLog.create).toHaveBeenCalled();
    const appel = db.auditLog.create.mock.calls.find(
      (c: unknown[]) => (c[0] as { data?: { action?: string } }).data?.action === "LOGIN_FAILED"
    );
    expect(appel).toBeTruthy();
    expect((appel![0] as { data?: { ipAddress?: string } }).data?.ipAddress).toBe("203.0.113.7");
  });

  it("x-real-ip sert de repli, priorité à x-vercel-forwarded-for", async () => {
    db.users.findUnique.mockResolvedValue(utilisateurValide("ip2@test.tn"));

    const r = await request(app)
      .post("/api/auth/login")
      .set("x-real-ip", "198.51.100.9")
      .send({ email: "ip2@test.tn", password: "MAUVAIS" });

    expect(r.status).toBe(401);
    const appel = db.auditLog.create.mock.calls.find(
      (c: unknown[]) => (c[0] as { data?: { action?: string } }).data?.action === "LOGIN_FAILED"
    );
    expect((appel![0] as { data?: { ipAddress?: string } }).data?.ipAddress).toBe("198.51.100.9");

    // Les deux présents → x-vercel-forwarded-for gagne
    db.users.findUnique.mockResolvedValue(utilisateurValide("ip3@test.tn"));
    await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "203.0.113.1")
      .set("x-real-ip", "198.51.100.9")
      .send({ email: "ip3@test.tn", password: "MAUVAIS" });
    const appel2 = db.auditLog.create.mock.calls.find(
      (c: unknown[]) =>
        (c[0] as { data?: { action?: string; entityId?: string } }).data?.action === "LOGIN_FAILED" &&
        (c[0] as { data?: { entityId?: string } }).data?.entityId === "ip3@test.tn"
    );
    expect((appel2![0] as { data?: { ipAddress?: string } }).data?.ipAddress).toBe("203.0.113.1");
  });

  it("sans en-tête plateforme (local), l'IP du socket est conservée", async () => {
    db.users.findUnique.mockResolvedValue(utilisateurValide("ip4@test.tn"));

    const r = await request(app)
      .post("/api/auth/login")
      .send({ email: "ip4@test.tn", password: "MAUVAIS" });

    expect(r.status).toBe(401);
    const appel = db.auditLog.create.mock.calls.find(
      (c: unknown[]) => (c[0] as { data?: { action?: string } }).data?.action === "LOGIN_FAILED"
    );
    const ip = (appel![0] as { data?: { ipAddress?: string } }).data?.ipAddress;
    expect(ip).toBeTruthy(); // IP locale (127.0.0.1 / ::ffff:127.0.0.1)
    expect(String(ip)).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
  });
});
