// =============================================================================
// Tests de sécurité — Lot 4 : messages de contact (fin du mock)
// =============================================================================
// Critères d'acceptation :
//   - POST /api/contact PUBLIC : validation stricte (bornes, catégories),
//     201 + référence, audit CONTACT_CREATE ;
//   - anti-abus : max 5 messages / heure / IP (comptage en base) → 429 ;
//   - GET /api/contact : 401 sans session, 403 GESTIONNAIRE, 200 PROPRIETAIRE
//     (liste + décompte non lus) ;
//   - PATCH /:id/lu : 400 sans booléen, 404 inconnu, 200 sinon ;
//   - DELETE /:id : 404 inconnu, 204 + audit CONTACT_DELETE sinon.
// =============================================================================
process.env.VERCEL = "1";
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma.js", async () => {
  const { creerFakeLoginAttempts } = await import("./helpers/fake-login-attempts.js");
  const mock = {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    password_resets: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    users: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspace_members: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    delegated_access: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    login_attempts: creerFakeLoginAttempts(),
    contact_messages: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
import request from "supertest";
import type { FakeLoginAttempts } from "./helpers/fake-login-attempts.js";

const db = prisma as unknown as {
  session: { findUnique: ReturnType<typeof vi.fn> };
  users: { findUnique: ReturnType<typeof vi.fn> };
  workspace_members: { findMany: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  login_attempts: FakeLoginAttempts;
  contact_messages: {
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const app = createApp();

function messageValide(overrides: Record<string, unknown> = {}) {
  return {
    nom: "Jean Dupont",
    email: "jean@exemple.tn",
    objet: "Question sur le calcul IRPP",
    categorie: "Question sur un calcul",
    message: "Bonjour, comment se calcule la tranche à 30 % exactement ?",
    ...overrides,
  };
}

function enregistrerSessionProprietaire() {
  db.session.findUnique.mockResolvedValue({
    id: "s1",
    token: "jti-prop",
    userId: "u-prop",
    expiresAt: new Date(Date.now() + 3600_000),
  });
  db.users.findUnique.mockResolvedValue({
    id: "u-prop",
    email: "prop@fiduciaire.tn",
    role: "PROPRIETAIRE",
    statut: "VALIDE",
  });
  return signToken({ userId: "u-prop", email: "prop@fiduciaire.tn", role: "PROPRIETAIRE" }).token;
}

function enregistrerSessionGestionnaire() {
  db.session.findUnique.mockResolvedValue({
    id: "s2",
    token: "jti-gest",
    userId: "u-gest",
    expiresAt: new Date(Date.now() + 3600_000),
  });
  db.users.findUnique.mockResolvedValue({
    id: "u-gest",
    email: "gest@fiduciaire.tn",
    role: "GESTIONNAIRE",
    statut: "VALIDE",
  });
  return signToken({ userId: "u-gest", email: "gest@fiduciaire.tn", role: "GESTIONNAIRE" }).token;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.login_attempts.__reset();
  db.workspace_members.findMany.mockResolvedValue([]);
  db.delegated_access.findMany.mockResolvedValue([]);
  db.auditLog.create.mockResolvedValue({});
  db.session.create.mockResolvedValue({});
  db.session.deleteMany.mockResolvedValue({ count: 0 });
  db.contact_messages.count.mockResolvedValue(0);
  db.contact_messages.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "cm1234567890abcdef",
    ...data,
    createdAt: new Date(),
  }));
});

// ---------------------------------------------------------------------------
// POST /api/contact — envoi public
// ---------------------------------------------------------------------------
describe("Lot 4 — POST /api/contact (public)", () => {
  it("201 : message valide persisté + référence + audit CONTACT_CREATE", async () => {
    const r = await request(app).post("/api/contact").send(messageValide());

    expect(r.status).toBe(201);
    expect(r.body.reference).toBe("CM123456"); // 8 premiers caractères de l'id
    expect(db.contact_messages.create).toHaveBeenCalledTimes(1);
    expect(db.contact_messages.create.mock.calls[0][0].data).toMatchObject({
      nom: "Jean Dupont",
      email: "jean@exemple.tn",
      categorie: "Question sur un calcul",
    });
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "CONTACT_CREATE" }) })
    );
  });

  it("400 : champs invalides rejetés (message court, email invalide, catégorie inconnue)", async () => {
    expect((await request(app).post("/api/contact").send(messageValide({ message: "trop court" }))).status).toBe(400);
    expect((await request(app).post("/api/contact").send(messageValide({ email: "pas-un-email" }))).status).toBe(400);
    expect((await request(app).post("/api/contact").send(messageValide({ categorie: "Hors liste" }))).status).toBe(400);
    expect((await request(app).post("/api/contact").send({})).status).toBe(400);
    expect(db.contact_messages.create).not.toHaveBeenCalled();
  });

  it("429 : au-delà de 5 messages / heure / IP (anti-abus en base)", async () => {
    db.contact_messages.count.mockResolvedValue(5);
    const r = await request(app)
      .post("/api/contact")
      .set("x-vercel-forwarded-for", "203.0.113.50")
      .send(messageValide());
    expect(r.status).toBe(429);
    expect(db.contact_messages.create).not.toHaveBeenCalled();
    // Le comptage porte bien sur l'IP réelle
    expect(db.contact_messages.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ ip: "203.0.113.50" }) })
    );
  });
});

// ---------------------------------------------------------------------------
// GET /api/contact — consultation réservée PROPRIETAIRE
// ---------------------------------------------------------------------------
describe("Lot 4 — GET /api/contact (PROPRIETAIRE seul)", () => {
  it("401 sans session", async () => {
    expect((await request(app).get("/api/contact")).status).toBe(401);
  });

  it("403 pour un GESTIONNAIRE", async () => {
    const token = enregistrerSessionGestionnaire();
    const r = await request(app).get("/api/contact").set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it("200 pour un PROPRIETAIRE : liste + décompte non lus", async () => {
    const token = enregistrerSessionProprietaire();
    db.contact_messages.findMany.mockResolvedValue([
      { id: "cm1", objet: "Bug export", lu: false, createdAt: new Date() },
    ]);
    db.contact_messages.count.mockResolvedValue(3);

    const r = await request(app).get("/api/contact").set("Authorization", `Bearer ${token}`);

    expect(r.status).toBe(200);
    expect(r.body.messages).toHaveLength(1);
    expect(r.body.nonLus).toBe(3);
    expect(db.contact_messages.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" }, take: 200 })
    );
  });

  it("filtre ?nonLus=1 : seuls les non lus", async () => {
    const token = enregistrerSessionProprietaire();
    await request(app).get("/api/contact?nonLus=1").set("Authorization", `Bearer ${token}`);
    expect(db.contact_messages.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lu: false } })
    );
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/contact/:id/lu — marquage
// ---------------------------------------------------------------------------
describe("Lot 4 — PATCH /api/contact/:id/lu", () => {
  it("404 message inconnu, 400 sans booléen, 200 sinon", async () => {
    const token = enregistrerSessionProprietaire();

    db.contact_messages.findUnique.mockResolvedValue(null);
    expect(
      (await request(app).patch("/api/contact/cm-x/lu").set("Authorization", `Bearer ${token}`).send({ lu: true })).status
    ).toBe(404);

    db.contact_messages.findUnique.mockResolvedValue({ id: "cm-x", lu: false });
    db.contact_messages.update.mockResolvedValue({ id: "cm-x", lu: true });
    expect(
      (await request(app).patch("/api/contact/cm-x/lu").set("Authorization", `Bearer ${token}`).send({})).status
    ).toBe(400);

    const r = await request(app)
      .patch("/api/contact/cm-x/lu")
      .set("Authorization", `Bearer ${token}`)
      .send({ lu: true });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ id: "cm-x", lu: true });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/contact/:id — suppression
// ---------------------------------------------------------------------------
describe("Lot 4 — DELETE /api/contact/:id", () => {
  it("404 message inconnu", async () => {
    const token = enregistrerSessionProprietaire();
    db.contact_messages.findUnique.mockResolvedValue(null);
    expect(
      (await request(app).delete("/api/contact/cm-x").set("Authorization", `Bearer ${token}`)).status
    ).toBe(404);
  });

  it("204 + audit CONTACT_DELETE pour un message existant", async () => {
    const token = enregistrerSessionProprietaire();
    db.contact_messages.findUnique.mockResolvedValue({
      id: "cm-x",
      email: "jean@exemple.tn",
      categorie: "Signalement de bug",
    });
    db.contact_messages.delete.mockResolvedValue({});

    const r = await request(app).delete("/api/contact/cm-x").set("Authorization", `Bearer ${token}`);

    expect(r.status).toBe(204);
    expect(db.contact_messages.delete).toHaveBeenCalledWith({ where: { id: "cm-x" } });
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "CONTACT_DELETE" }) })
    );
  });
});
