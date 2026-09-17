// =============================================================================
// Tests de sécurité — Session cookie HttpOnly (Lot 1)
// =============================================================================
// Critères d'acceptation roadmap §4.1 :
//   - aucun token d'accès dans la réponse login (donc jamais en localStorage)
//   - cookie HttpOnly + SameSite=Lax (+ Secure en production)
//   - authentification par cookie
//   - repli Authorization Bearer (clients programmatiques)
//   - déconnexion = révocation serveur + effacement du cookie
//   - requête ultérieure avec l'ancien cookie → 401
// =============================================================================
process.env.VERCEL = "1"; // empêche le listen() à l'import
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("../lib/prisma.js", async () => {
  const { creerFakeLoginAttempts } = await import("./helpers/fake-login-attempts.js");
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
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    delegated_access: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
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
import request from "supertest";

const db = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  users: { findUnique: ReturnType<typeof vi.fn> };
  workspace_members: { findMany: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  login_attempts: import("./helpers/fake-login-attempts.js").FakeLoginAttempts;
};

const app = createApp();

const MOT_DE_PASSE = "MotDePasse123";
const HASH = bcrypt.hashSync(MOT_DE_PASSE, 4);

const UTILISATEUR = {
  id: "u-cookie",
  email: "cookie@fiduciaire.tn",
  fullName: "Test Cookie",
  role: "GESTIONNAIRE",
  statut: "VALIDE",
  passwordHash: HASH,
  workspace_members: [],
};

/** Extrait la valeur du cookie de session depuis l'en-tête Set-Cookie. */
function extraireCookie(res: request.Response): string {
  const entetes = (res.headers["set-cookie"] ?? []) as string[];
  const cookie = entetes.find((c) => c.startsWith("fiduciaire_session="));
  return cookie?.split(";")[0] ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
  db.login_attempts.__reset(); // Lot 3 — isolation des tentatives entre cas
  db.workspace_members.findMany.mockResolvedValue([]);
  db.delegated_access.findMany.mockResolvedValue([]);
  db.auditLog.create.mockResolvedValue({});
  db.session.create.mockResolvedValue({});
});

// ── Login : cookie HttpOnly, aucun jeton exposé ────────────────────────────

describe("POST /api/auth/login — dépôt du cookie de session", () => {
  it("200 : pose un cookie HttpOnly SameSite=Lax et NE renvoie PAS de token", async () => {
    db.users.findUnique.mockResolvedValue(UTILISATEUR);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: UTILISATEUR.email, password: MOT_DE_PASSE });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined(); // critère V1 : zéro jeton côté client
    expect(res.body.user.email).toBe(UTILISATEUR.email);

    const setCookie = (res.headers["set-cookie"] ?? []).join("; ");
    expect(setCookie).toContain("fiduciaire_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    // Session créée côté serveur (révocabilité)
    expect(db.session.create).toHaveBeenCalledTimes(1);
    // Connexion journalisée (audit §4.11)
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "LOGIN", workspaceId: null }) })
    );
  });

  it("401 : identifiants invalides — aucun cookie posé", async () => {
    db.users.findUnique.mockResolvedValue(UTILISATEUR);
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: UTILISATEUR.email, password: "MauvaisMotDePasse" });
    expect(res.status).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

// ── Authentification par cookie ─────────────────────────────────────────────

describe("GET /api/auth/me — authentification par cookie", () => {
  it("200 avec le cookie posé au login", async () => {
    db.users.findUnique.mockResolvedValue(UTILISATEUR);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: UTILISATEUR.email, password: MOT_DE_PASSE });
    const cookie = extraireCookie(login);

    // La session existe en base (jti du jeton)
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: UTILISATEUR.id, expiresAt: new Date(Date.now() + 3600_000) });

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(UTILISATEUR.email);
  });

  it("401 sans aucun credential", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("401 avec un cookie de session révoqué en base", async () => {
    db.users.findUnique.mockResolvedValue(UTILISATEUR);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: UTILISATEUR.email, password: MOT_DE_PASSE });
    const cookie = extraireCookie(login);

    // Session supprimée (révocation)
    db.session.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});

// ── Déconnexion : révocation + effacement du cookie ─────────────────────────

describe("POST /api/auth/logout — révocation serveur + purge du cookie", () => {
  async function sessionActive() {
    db.users.findUnique.mockResolvedValue(UTILISATEUR);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: UTILISATEUR.email, password: MOT_DE_PASSE });
    const cookie = extraireCookie(login);
    db.session.findUnique.mockResolvedValue({ token: "jti", userId: UTILISATEUR.id, expiresAt: new Date(Date.now() + 3600_000) });
    return cookie;
  }

  it("efface le cookie, révoque la session et journalise la déconnexion", async () => {
    const cookie = await sessionActive();

    const res = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(db.session.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "LOGOUT", workspaceId: null }) })
    );

    const setCookie = (res.headers["set-cookie"] ?? []).join("; ");
    expect(setCookie).toContain("fiduciaire_session=;");
  });

  it("l'ancien cookie ne donne plus accès après déconnexion", async () => {
    const cookie = await sessionActive();

    await request(app).post("/api/auth/logout").set("Cookie", cookie);

    // Session révoquée en base
    db.session.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(res.status).toBe(401);
  });
});
