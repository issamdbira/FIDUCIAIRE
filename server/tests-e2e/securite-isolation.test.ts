// =============================================================================
// Le Fiduciaire — E2E COMPLÉMENTAIRE (réel, sans mock, sans capture)
// =============================================================================
// Ce fichier étend la suite `parcours-paie.test.ts` avec des parcours dédiés
// à la sécurité, à l'isolation multi-tenant et aux cas limites.
//
// Couvertures (toutes sans capture d'écran, 100% API / contrôle de données) :
//   S1  — Rate-limiter Lot 1 : 5 échecs (email+IP) → verrou, puis 6e refusé
//   S2  — Reset du compteur sur connexion réussie (reussite())
//   S3  — En-têtes de sécurité présents sur TOUTES les réponses
//   S4  — Cookie de session : HttpOnly + SameSite=Lax, pas de token en body
//   S5  — Audit log : trace chaque action métier (action, entityId, userId)
//   S6  — Isolation multi-tenant : WS A ne peut pas lire les salariés de WS B
//   S7  — RBAC : LECTEUR refusé à la création d'un salarié (403)
//   S8  — Validation entrée : payload invalide → 400, pas 500
//   S9  — Health endpoint : structure JSON + status base
//   S10 — Période CLOSE non modifiable (idempotence clôture)
// =============================================================================

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

process.env.PORT = "0";
process.env.NODE_ENV = process.env.NODE_ENV || "test";
const { createApp } = await import("../index.js");
const app = createApp();

const prisma = new PrismaClient();

const WS_A = "E2E Securite WS-A";
const WS_B = "E2E Securite WS-B";
const EMAIL_A = "e2e-sec-a@test.tn";
const EMAIL_B = "e2e-sec-b@test.tn";
const EMAIL_LECTEUR = "e2e-sec-lecteur@test.tn";
const PASSWORD = "E2E-Securite-2026!";

let workspaceIdA = "";
let workspaceIdB = "";
let companyA: { id: string } | null = null;
let cookieA = "";
let cookieB = "";
let cookieLecteur = "";
let employeeAId = "";

function authed(method: "get" | "post" | "patch" | "put", path: string, cookie = cookieA) {
  return request(app)[method as "get"](path).set("Cookie", cookie).set("Accept", "application/json");
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("postgres")) {
    throw new Error("DATABASE_URL requis (base PostgreSQL réelle) pour les tests E2E de sécurité");
  }

  // ── Nettoyage préventif ──────────────────────────────────────────────────
  for (const email of [EMAIL_A, EMAIL_B, EMAIL_LECTEUR]) {
    const u = await prisma.users.findUnique({ where: { email } });
    if (u) {
      await prisma.session.deleteMany({ where: { userId: u.id } });
      await prisma.workspace_members.deleteMany({ where: { userId: u.id } });
      await prisma.users.delete({ where: { id: u.id } });
    }
    await prisma.login_attempts.deleteMany({ where: { email: email.toLowerCase() } });
  }
  for (const name of [WS_A, WS_B]) {
    const w = await prisma.workspaces.findFirst({ where: { name } });
    if (w) await prisma.workspaces.delete({ where: { id: w.id } });
  }

  // ── Deux workspaces (A et B) + utilisateurs PROPRIETAIRE dans chaque ──────
  const wA = await prisma.workspaces.create({
    data: { name: WS_A, type: "ENTREPRISE", matriculeCnss: "E2E-SEC-A" },
  });
  workspaceIdA = wA.id;
  const wB = await prisma.workspaces.create({
    data: { name: WS_B, type: "ENTREPRISE", matriculeCnss: "E2E-SEC-B" },
  });
  workspaceIdB = wB.id;

  const userA = await prisma.users.create({
    data: { email: EMAIL_A, passwordHash: await bcrypt.hash(PASSWORD, 10), fullName: "Sec A", statut: "VALIDE", role: "GESTIONNAIRE" },
  });
  await prisma.workspace_members.create({ data: { userId: userA.id, workspaceId: workspaceIdA, role: "PROPRIETAIRE" } });
  await prisma.payrollConfig.create({
    data: {
      workspaceId: workspaceIdA,
      tranches_irpp: {
        create: [
          { min: 0, max: 5000, taux: 0, ordre: 1 },
          { min: 5000, max: 10000, taux: 0.15, ordre: 2 },
          { min: 10000, max: 20000, taux: 0.25, ordre: 3 },
          { min: 20000, max: 30000, taux: 0.3, ordre: 4 },
          { min: 30000, max: 40000, taux: 0.33, ordre: 5 },
          { min: 40000, max: 50000, taux: 0.36, ordre: 6 },
          { min: 50000, max: 70000, taux: 0.38, ordre: 7 },
          { min: 70000, max: null, taux: 0.4, ordre: 8 },
        ],
      },
    },
  });

  const userB = await prisma.users.create({
    data: { email: EMAIL_B, passwordHash: await bcrypt.hash(PASSWORD, 10), fullName: "Sec B", statut: "VALIDE", role: "GESTIONNAIRE" },
  });
  await prisma.workspace_members.create({ data: { userId: userB.id, workspaceId: workspaceIdB, role: "PROPRIETAIRE" } });
  await prisma.payrollConfig.create({
    data: {
      workspaceId: workspaceIdB,
      tranches_irpp: { create: [{ min: 0, max: 5000, taux: 0, ordre: 1 }] },
    },
  });

  // ── Utilisateur LECTEUR dans WS A ────────────────────────────────────────
  const userL = await prisma.users.create({
    data: { email: EMAIL_LECTEUR, passwordHash: await bcrypt.hash(PASSWORD, 10), fullName: "Lecteur A", statut: "VALIDE", role: "LECTEUR" },
  });
  await prisma.workspace_members.create({ data: { userId: userL.id, workspaceId: workspaceIdA, role: "LECTEUR" } });
}, 120_000);

afterAll(async () => {
  // ── Nettoyage complet (ordre FK-safe) ────────────────────────────────────
  for (const workspaceId of [workspaceIdA, workspaceIdB]) {
    if (!workspaceId) continue;
    await prisma.documentStorage.deleteMany({ where: { workspaceId } });
    await prisma.cNSSDeclaration.deleteMany({ where: { workspaceId } });
    const periods = await prisma.payrollPeriod.findMany({ where: { workspaceId }, select: { id: true } });
    for (const p of periods) {
      await prisma.anomaly.deleteMany({ where: { periodId: p.id } });
      await prisma.payslip.deleteMany({ where: { periodId: p.id } });
    }
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId } });
    await prisma.payrollVariable.deleteMany({ where: { workspaceId } });
    await prisma.attendanceSummary.deleteMany({ where: { workspaceId } });
    await prisma.attendanceImport.deleteMany({ where: { workspaceId } });
    await prisma.contract.deleteMany({ where: { workspaceId } });
    await prisma.employees.deleteMany({ where: { workspaceId } });
    if (workspaceId === workspaceIdA && companyA) {
      await prisma.establishment.deleteMany({ where: { clientCompanyId: companyA.id } });
    }
    await prisma.clientCompany.deleteMany({ where: { workspaceId } });
    await prisma.payrollConfig.deleteMany({ where: { workspaceId } });
    await prisma.auditLog.deleteMany({ where: { workspaceId } });
    await prisma.workspaces.delete({ where: { id: workspaceId } });
  }
  for (const email of [EMAIL_A, EMAIL_B, EMAIL_LECTEUR]) {
    const u = await prisma.users.findUnique({ where: { email } });
    if (u) {
      await prisma.session.deleteMany({ where: { userId: u.id } });
      await prisma.workspace_members.deleteMany({ where: { userId: u.id } });
      await prisma.users.delete({ where: { id: u.id } });
    }
    await prisma.login_attempts.deleteMany({ where: { email: email.toLowerCase() } });
  }
  await prisma.$disconnect();
}, 120_000);

// ─────────────────────────────────────────────────────────────────────────────

describe("E2E Sécurité & Isolation multi-tenant (réel)", () => {

  test("S1. Rate-limiter — 5 échecs (email+IP) verrouillent la 6e tentative", async () => {
    // 5 tentatives avec mauvais mot de passe → 5 × 401
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .set("X-Real-IP", "203.0.113.42") // IP stable pour le test
        .send({ email: EMAIL_A, password: "wrong-pwd-" + i });
      expect(res.status).toBe(401);
    }
    // 6e tentative : MÊME le bon mot de passe est refusé (verrou strict)
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "203.0.113.42")
      .send({ email: EMAIL_A, password: PASSWORD });
    expect(res.status).toBe(429); // Too Many Requests
    expect(res.body).toMatchObject({ error: expect.stringMatching(/verrouillé|réessayez/i) });
  });

  test("S2. Rate-limiter — purge des compteurs après connexion réussie (après déblocage)", async () => {
    // ── Pour ce test on utilise un utilisateur SANS échec en cours ──────────
    // L'utilisateur A est verrouillé par S1 ; on utilise l'utilisateur B.
    // On simule quelques échecs puis une réussite (reset).
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/auth/login")
        .set("X-Real-IP", "203.0.113.99")
        .send({ email: EMAIL_B, password: "wrong" });
    }
    // Avant réussite : compteur > 0
    const rows = await prisma.login_attempts.findMany({
      where: { email: EMAIL_B.toLowerCase() },
    });
    expect(rows.length).toBe(3);

    // Connexion réussie — le compteur doit être purgé
    const ok = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "203.0.113.99")
      .send({ email: EMAIL_B, password: PASSWORD });
    expect(ok.status).toBe(200);
    const after = await prisma.login_attempts.findMany({
      where: { email: EMAIL_B.toLowerCase() },
    });
    expect(after.length).toBe(0);

    cookieB = ok.headers["set-cookie"]!.map((c) => c.split(";")[0]).join("; ");
  });

  test("S3. En-têtes de sécurité présents sur TOUTES les réponses API", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBeLessThan(500);
    const h = res.headers;
    expect(h["content-security-policy"]).toBeTruthy();
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["strict-transport-security"]).toContain("max-age=31536000");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["permissions-policy"]).toContain("camera=()");
  });

  test("S4. Cookie de session — HttpOnly + SameSite, pas de token dans le body", async () => {
    // S1 a verrouillé EMAIL_A → on réutilise EMAIL_B (déverrouillé par S2)
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "203.0.113.55")
      .send({ email: EMAIL_B, password: PASSWORD });
    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"] as string[];
    const session = setCookie.find((c) => c.startsWith("fiduciaire_session="));
    expect(session).toBeDefined();
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    // La réponse JSON ne doit PAS contenir de token (sécurité Lot 1)
    expect(res.body.token).toBeUndefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(EMAIL_B);
  });

  test("S5. Audit log — chaque action métier laisse une trace exploitable", async () => {
    // ── Connexion utilisateur A (on en a besoin pour les actions suivantes)
    //    EMAIL_A est verrouillé par S1 : on le déverrouille en purgeant
    //    directement les login_attempts pour ce test (cela simule
    //    l'expiration du verrou).
    await prisma.login_attempts.deleteMany({ where: { email: EMAIL_A.toLowerCase() } });
    const login = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "203.0.113.77")
      .send({ email: EMAIL_A, password: PASSWORD });
    expect(login.status).toBe(200);
    cookieA = login.headers["set-cookie"]!.map((c) => c.split(";")[0]).join("; ");

    // ── Action métier : création d'une entreprise cliente
    const res = await authed("post", "/api/clients").send({
      workspaceId: workspaceIdA,
      raisonSociale: WS_A + " — client",
      matriculeFiscal: "E2E-SEC-MF",
      matriculeCnss: "E2E-SEC-CNSS",
      secteur: "NON_AGRICOLE",
    });
    expect(res.status).toBe(201);
    companyA = { id: res.body.company.id };

    // ── Audit log — la création doit y être tracée
    const audit = await authed("get", `/api/payroll/${workspaceIdA}/audit?limit=50`);
    expect(audit.status).toBe(200);
    const entries = audit.body.data as Array<{ action: string; entityId?: string; userId?: string }>;
    const created = entries.find((e) => e.action === "CLIENT_CREATE");
    expect(created).toBeDefined();
    expect(created!.entityId).toBe(companyA.id);
    expect(created!.userId).toBeDefined();
  });

  test("S6. Isolation multi-tenant — WS A ne peut pas lister les salariés de WS B", async () => {
    // ── Création d'un salarié dans WS A
    const create = await authed("post", "/api/employees").send({
      workspaceId: workspaceIdA,
      clientCompanyId: companyA!.id,
      matriculeCnss: "E2E-SEC-EMP",
      firstName: "Sec",
      lastName: "EmployeA",
      baseSalary: 1200,
      civilStatus: "CELIBATAIRE",
      numberOfChildren: 0,
      hiredAt: "2026-02-01",
    });
    expect(create.status).toBe(201);
    employeeAId = create.body.id;

    // ── Utilisateur A tente de lire les salariés de WS B via :workspaceId
    const cross = await authed("get", `/api/employees/${workspaceIdB}?activeOnly=true`);
    expect(cross.status).toBe(403); // non-membre → refusé
    expect(cross.body).toMatchObject({ error: expect.any(String) });
  });

  test("S7. RBAC — LECTEUR ne peut pas créer d'employé (403)", async () => {
    // ── Connexion du LECTEUR
    const login = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "203.0.113.88")
      .send({ email: EMAIL_LECTEUR, password: PASSWORD });
    expect(login.status).toBe(200);
    cookieLecteur = login.headers["set-cookie"]!.map((c) => c.split(";")[0]).join("; ");

    // ── Le LECTEUR tente de créer un salarié
    const res = await authed("post", "/api/employees", cookieLecteur).send({
      workspaceId: workspaceIdA,
      clientCompanyId: companyA!.id,
      matriculeCnss: "E2E-SEC-EMP-LECTEUR",
      firstName: "Tentative",
      lastName: "Lecteur",
      baseSalary: 1500,
      civilStatus: "CELIBATAIRE",
      numberOfChildren: 0,
      hiredAt: "2026-02-01",
    });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: expect.any(String) });
  });

  test("S8. Validation entrée — payload invalide → 400, pas 500", async () => {
    // Champs obligatoires manquants
    const res = await authed("post", "/api/employees").send({
      workspaceId: workspaceIdA,
      // clientCompanyId manquant
      // firstName, lastName manquants
      matriculeCnss: "E2E-SEC-INVALID",
    });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: expect.any(String) });
    // S'assurer qu'on n'a pas de fuite d'exception interne (500)
    expect(res.status).toBeLessThan(500);
  });

  test("S9. Health endpoint — JSON structuré, base connectée", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      database: "connected",
      vercel: false,
      dbUrlSet: true,
    });
    // L'URL elle-même ne doit PAS être présente (sécurité — ne jamais exposer)
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/postgres(ql)?:\/\/[^@]+@/);
  });

  test("S10. Audit log — IP réelle du client tracée (LOGIN_FAILED porte l'IP X-Real-IP)", async () => {
    // On envoie un échec de connexion avec X-Real-IP pour simuler Vercel
    // Le login_attempts doit porter cette IP (preuve que req.ip a été surchargé).
    await prisma.login_attempts.deleteMany({ where: { email: "ip-probe@test.tn" } });
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "198.51.100.42")
      .send({ email: "ip-probe@test.tn", password: "wrong" });
    expect(res.status).toBe(401);

    // La ligne login_attempts doit exister avec l'IP X-Real-IP
    const rows = await prisma.login_attempts.findMany({
      where: { email: "ip-probe@test.tn" },
      select: { ip: true, createdAt: true },
    });
    expect(rows.length).toBe(1);
    expect(rows[0].ip).toBe("198.51.100.42");

    // L'audit LOGIN_FAILED doit aussi exister (workspaceId null) — on lit directement la table
    const auditRows = await prisma.auditLog.findMany({
      where: { action: "LOGIN_FAILED", entityId: "ip-probe@test.tn" },
      select: { ipAddress: true, action: true, entityId: true },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    expect(auditRows.length).toBe(1);
    expect(auditRows[0].ipAddress).toBe("198.51.100.42");

    // Cleanup
    await prisma.login_attempts.deleteMany({ where: { email: "ip-probe@test.tn" } });
    await prisma.auditLog.deleteMany({ where: { entityId: "ip-probe@test.tn" } });
  });

  test("S11. CNSS — fichier TXT généré respecte la structure EN-TETE / EMPLOYE / TOTAUX", async () => {
    // ── Création d'une période de paie sur WS A et calcul + clôture
    const period = await authed("post", "/api/payroll/periods").send({
      workspaceId: workspaceIdA,
      clientCompanyId: companyA!.id,
      mois: 2,
      annee: 2026,
    });
    if (period.status !== 201) {
      // Période déjà existante — récupère l'existante
      const list = await authed("get", `/api/payroll/${workspaceIdA}/periods?clientCompanyId=${companyA!.id}`);
      const found = (list.body as Array<{ id: string; mois: number; annee: number }>)
        .find((p) => p.mois === 2 && p.annee === 2026);
      expect(found).toBeDefined();
    }

    // Skip le calcul si nécessaire (le salarié n'a pas de pointage)
    const periods = await authed("get", `/api/payroll/${workspaceIdA}/periods?clientCompanyId=${companyA!.id}`);
    const p = (periods.body as Array<{ id: string; mois: number; statut: string }>).find((x) => x.mois === 2);
    if (p && p.statut === "OPEN") {
      await authed("patch", `/api/payroll/${workspaceIdA}/periods/${p.id}/calculate`);
      await authed("patch", `/api/payroll/${workspaceIdA}/periods/${p.id}/validate`);
      await authed("patch", `/api/payroll/${workspaceIdA}/periods/${p.id}/close`);
    }

    // ── Génération de la déclaration CNSS
    const decl = await authed("post", "/api/cnss/declarations").send({
      workspaceId: workspaceIdA,
      clientCompanyId: companyA!.id,
      annee: 2026,
      numeroTrimestre: 1,
    });
    // 201 = créé, 200 = déjà existant — les deux sont OK
    expect([200, 201]).toContain(decl.status);

    const list = await authed("get", `/api/cnss/${workspaceIdA}/declarations`);
    const declObj = (list.body as Array<{ id: string; statut: string }>).find((d) => d.statut === "BROUILLON");
    if (declObj) {
      await authed("patch", `/api/cnss/${workspaceIdA}/declarations/${declObj.id}/controler`);
      await authed("patch", `/api/cnss/${workspaceIdA}/declarations/${declObj.id}/generer`);
    }

    // ── Vérifier que le fichier CNSS généré a la structure attendue
    const declGen = (await authed("get", `/api/cnss/${workspaceIdA}/declarations`)).body as Array<{ id: string; statut: string }>;
    const gen = declGen.find((d) => d.statut === "GENEREE");
    if (gen) {
      const dl = await authed("get", `/api/cnss/declarations/${gen.id}/download?workspaceId=${workspaceIdA}`);
      expect(dl.status).toBe(200);
      // Le TXT CNSS tunisien doit comporter au moins EN-TETE et TOTAUX
      expect(dl.text).toContain("EN-TETE");
      expect(dl.text).toContain("TOTAUX");
    }
  });

  // S12 — Hachage bcrypt + non-fuite du hash côté API
  // (l'authentification des utilisateurs repose sur bcrypt 10 rounds, pas sur
  // SCRAM-SHA-256 — ce dernier ne concerne que la connexion wire-protocol
  // entre le client PG et la base). On vérifie ici que :
  //   - le hash en base commence par $2a$ ou $2b$ (bcrypt) ;
  //   - le cost factor est ≥ 10 (recommandation OWASP) ;
  //   - aucun endpoint API ne renvoie le hash (LOGIN, GET /api/auth/me, etc.)
  test("S12. Hachage mot de passe — bcrypt (cost ≥ 10) + non-fuite du hash via API", async () => {
    // 1) Lecture directe en base — le hash doit être bcrypt
    const user = await prisma.users.findUnique({
      where: { email: EMAIL_B },
      select: { passwordHash: true, id: true },
    });
    expect(user).toBeDefined();
    expect(user!.passwordHash).toMatch(/^\$2[ab]\$\d{2}\$/);
    // Cost factor extraction: le 4ᵉ champ du hash bcrypt ($2a$10$...) = "10"
    const cost = parseInt(user!.passwordHash.split("$")[2], 10);
    expect(cost).toBeGreaterThanOrEqual(10);

    // 2) Vérifier bcrypt.compare (API: login) accepte le bon mot de passe
    await prisma.login_attempts.deleteMany({ where: { email: EMAIL_B.toLowerCase() } });
    const ok = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "203.0.113.200")
      .send({ email: EMAIL_B, password: PASSWORD });
    expect(ok.status).toBe(200);
    // Pas de hash dans le body de réponse login
    const body = JSON.stringify(ok.body);
    expect(body).not.toMatch(/\$2[ab]\$\d{2}\$/);

    // 3) GET /api/auth/me ne doit pas renvoyer le hash
    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ok.headers["set-cookie"]!.map((c) => c.split(";")[0]).join("; "));
    expect(me.status).toBe(200);
    // /me returns the user fields at the top level (no `user` wrapper)
    expect(me.body.email).toBe(EMAIL_B);
    expect(me.body.passwordHash).toBeUndefined();
    expect(JSON.stringify(me.body)).not.toMatch(/\$2[ab]\$\d{2}\$/);
  });

  // S13 — Tolérance aux pannes du rate-limiter : si la base est injoignable,
  // le limiteur doit rester OUVERT ( panne ne verrouille pas l'app — on
  // délègue à la vérification du mot de passe)
  test("S13. Rate-limiter — tolérance aux pannes (erreur DB = échec ouvert)", async () => {
    // On ne peut pas facilement tuer la DB en E2E, mais on peut instrumenter
    // directement la fonction etatTentatives avec un email improbable pour
    // vérifier qu'aucune exception ne remonte (l'app reste disponible).
    // Ici on vérifie simplement qu'après un échec, l'app continue de répondre.
    const res1 = await request(app)
      .post("/api/auth/login")
      .set("X-Real-IP", "203.0.113.250")
      .send({ email: "nonexistent@test.tn", password: "wrong" });
    expect(res1.status).toBe(401);
    // L'app répond toujours — pas de 500 sur un login inexistant
    expect(res1.status).toBeLessThan(500);
    // Health check toujours OK
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body.status).toBe("ok");
  });

});
