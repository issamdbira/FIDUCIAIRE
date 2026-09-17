// =============================================================================
// Tests de sécurité — Lot 2 : verrou PAR COMPTE (toutes IP confondues)
// =============================================================================
// Critères d'acceptation :
//   - 20 échecs sur 1 h pour un même email, quelle que soit l'origine →
//     verrou du compte 30 min (même le bon mot de passe est refusé) ;
//   - le niveau 1 (5 échecs / 15 min par IP) reste actif inchangé ;
//   - une IP tournante ne contourne PAS le niveau 2 ;
//   - la réussite purge les DEUX niveaux ;
//   - message 429 distinct pour le verrou de compte ;
//   - l'audit LOGIN_FAILED trace echecsCompte et le déclenchement du verrou.
// =============================================================================
process.env.VERCEL = "1";
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("../lib/prisma.js", () => {
  const mock = {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    users: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspace_members: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    delegated_access: { findMany: vi.fn() },
    password_resets: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    auditLog: { create: vi.fn() },
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
  enregistrerEchec,
  estBloque,
  estBloqueCompte,
  etatCompte,
  reussite,
  __reinitialiserPourTests,
} from "../lib/rate-limiter.js";
import { createApp } from "../index.js";
import request from "supertest";

const db = prisma as unknown as {
  users: { findUnique: ReturnType<typeof vi.fn> };
  workspace_members: { findMany: ReturnType<typeof vi.fn> };
  delegated_access: { findMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  session: { create: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  password_resets: { deleteMany: ReturnType<typeof vi.fn> };
};

const app = createApp();
const MOT_DE_PASSE = "MotDePasse123";
const HASH = bcrypt.hashSync(MOT_DE_PASSE, 4);

function utilisateurValide(email: string) {
  return {
    id: `u-${email}`, email, fullName: "Test", role: "GESTIONNAIRE",
    statut: "VALIDE", passwordHash: HASH, workspace_members: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  __reinitialiserPourTests();
  db.workspace_members.findMany.mockResolvedValue([]);
  db.delegated_access.findMany.mockResolvedValue([]);
  db.auditLog.create.mockResolvedValue({});
  db.session.create.mockResolvedValue({});
  db.session.deleteMany.mockResolvedValue({ count: 0 });
  db.password_resets.deleteMany.mockResolvedValue({ count: 0 });
});

// ---------------------------------------------------------------------------
// Unitaire — sémantique du double niveau
// ---------------------------------------------------------------------------
describe("Lot 2 — rate limiter niveau 2 (verrou par compte)", () => {
  it("20 échecs toutes IP confondues → verrou du compte, 30 min", () => {
    const email = "cible@test.tn";
    // 5 IP x 4 échecs : aucune n'atteint le seuil niveau 1 (5), la SOMME
    // atteint exactement le seuil niveau 2 (20)
    const ips = ["1.1.1.1", "2.2.2.2", "3.3.3.3", "4.4.4.4", "5.5.5.5"];

    let dernierEtat;
    for (let i = 0; i < 20; i++) {
      dernierEtat = enregistrerEchec(email, ips[i % ips.length]);
    }

    expect(dernierEtat!.echecsCompte).toBe(20);
    expect(dernierEtat!.verrouCompteMin).toBe(30); // déclenché sur le 20e
    expect(estBloqueCompte(email)).toBe(true);
    // Aucune IP individuelle n'a atteint le seuil du niveau 1 (5/IP)
    for (const ip of ips) {
      expect(estBloque(email, ip)).toBe(false);
    }
  });

  it("le verrou compte refuse TOUTE origine, même sans historique", () => {
    const email = "cible2@test.tn";
    for (let i = 0; i < 20; i++) enregistrerEchec(email, `ip-${i}`);
    // Une IP neuve, jamais vue : bloquée quand même (niveau compte)
    expect(estBloque(email, "9.9.9.9")).toBe(false); // niveau 1 : cette IP est propre
    expect(estBloqueCompte(email)).toBe(true); // niveau 2 : le compte est verrouillé
  });

  it("la réussite purge les DEUX niveaux", () => {
    const email = "cible3@test.tn";
    for (let i = 0; i < 20; i++) enregistrerEchec(email, `ip-${i}`);
    expect(estBloqueCompte(email)).toBe(true);

    reussite(email);
    expect(estBloqueCompte(email)).toBe(false);
    expect(etatCompte(email).echecs).toBe(0);
  });

  it("sous le seuil : le niveau 2 ne se déclenche pas", () => {
    const email = "cible4@test.tn";
    for (let i = 0; i < 19; i++) enregistrerEchec(email, `ip-${i}`);
    expect(estBloqueCompte(email)).toBe(false);
    expect(etatCompte(email).echecs).toBe(19);
  });
});

// ---------------------------------------------------------------------------
// Intégration — la route login consulte le niveau compte
// ---------------------------------------------------------------------------
describe("Lot 2 — login applique le verrou par compte", () => {
  it("compte pré-verrouillé (20 échecs IP tournantes) → 429 message distinct, mot de passe correct refusé", async () => {
    const email = "verrouille@test.tn";
    for (let i = 0; i < 20; i++) enregistrerEchec(email, `ip-${i}`);

    db.users.findUnique.mockResolvedValue(utilisateurValide(email));

    const r = await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "203.0.113.99") // IP neuve — propre au niveau 1
      .send({ email, password: MOT_DE_PASSE }); // BON mot de passe

    expect(r.status).toBe(429);
    expect(r.body.error).toMatch(/Compte temporairement verrouillé.*30 minutes/);
  });

  it("audit LOGIN_FAILED trace echecsCompte et le déclenchement (20e échec)", async () => {
    const email = "audit-lot2@test.tn";
    db.users.findUnique.mockResolvedValue(utilisateurValide(email));

    // 19 échecs via la lib (IP tournantes) puis le 20e PAR LA ROUTE
    for (let i = 0; i < 19; i++) enregistrerEchec(email, `ip-${i}`);
    await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "203.0.113.100")
      .send({ email, password: "MAUVAIS" });

    const appel = db.auditLog.create.mock.calls.find(
      (c: unknown[]) => (c[0] as { data?: { action?: string } }).data?.action === "LOGIN_FAILED"
    );
    expect(appel).toBeTruthy();
    const details = JSON.parse((appel![0] as { data?: { details?: string } }).data!.details!);
    expect(details.echecsCompte).toBe(20);
    expect(details.verrouCompteMin).toBe(30);
    expect(details.raison).toBe("mot_de_passe");
  });

  it("niveau 1 inchangé : 5 échecs depuis une même IP → 429 « quelques minutes »", async () => {
    const email = "niveau1@test.tn";
    db.users.findUnique.mockResolvedValue(utilisateurValide(email));

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/login")
        .set("x-vercel-forwarded-for", "203.0.113.5")
        .send({ email, password: "MAUVAIS" });
    }

    const r = await request(app)
      .post("/api/auth/login")
      .set("x-vercel-forwarded-for", "203.0.113.5")
      .send({ email, password: MOT_DE_PASSE });

    expect(r.status).toBe(429);
    expect(r.body.error).toMatch(/Trop de tentatives.*quelques minutes/);
    // Le compte lui-même n'est PAS verrouillé (seulement 5 échecs < 20)
    expect(estBloqueCompte(email)).toBe(false);
  });
});
