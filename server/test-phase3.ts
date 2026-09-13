#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 3 Integration Test (Contrats & Référentiels)
// =============================================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

// Force env vars from .env — never hardcode secrets
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_edPKWSt4Q3Ul@ep-jolly-heart-aymmh63q-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
process.env.JWT_SECRET = process.env.JWT_SECRET || "fiduciaire-dev-test-secret";

import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import configRoutes from "./routes/config.js";
import contractRoutes from "./routes/contracts.js";
import conventionRoutes from "./routes/conventions.js";
import calendarRoutes from "./routes/calendars.js";
import regleRoutes from "./routes/regles.js";

let results = [];

function test(name, fn) {
  return async () => {
    try {
      const result = await fn();
      results.push({ name, status: "PASS", detail: result });
      console.log(`✅ ${name}: ${result}`);
    } catch (e) {
      results.push({ name, status: "FAIL", detail: e.message });
      console.log(`❌ ${name}: ${e.message}`);
    }
  };
}

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function put(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "PUT", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function del(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "DELETE", headers,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function patch(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "PATCH", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const PORT = 3099;
const WS = "ws-fiduciaire-default";

// ---------------------------------------------------------------------------
// Teardown — clean test residual data before running
// ---------------------------------------------------------------------------
async function teardown() {
  // Delete test employees by matricule (children first: contracts → employees)
  const testMatricules = ["CNSS-P3-001", "CNSS-P3-002"];
  const testEmployees = await prisma.employees.findMany({ where: { matriculeCnss: { in: testMatricules } } });
  for (const emp of testEmployees) {
    await prisma.contractVersion.deleteMany({ where: { contract: { employeeId: emp.id } } });
    await prisma.contract.deleteMany({ where: { employeeId: emp.id } });
  }
  await prisma.employees.deleteMany({ where: { matriculeCnss: { in: testMatricules } } });

  // Delete test conventions by code
  const testConvCodes = ["CC-51", "CC-SYS"];
  await prisma.conventionAdaptation.deleteMany({ where: { convention_collective: { code: { in: testConvCodes } } } });
  await prisma.conventionGrilleSalariale.deleteMany({ where: { convention_collective: { code: { in: testConvCodes } } } });
  await prisma.conventionArticle.deleteMany({ where: { convention_collective: { code: { in: testConvCodes } } } });
  await prisma.conventionCollective.deleteMany({ where: { workspaceId: WS, code: { in: testConvCodes } } });

  // Delete test règles by code
  const testRegleCodes = ["CNSS_SALARIAL_NA", "CSS_TAUX"];
  await prisma.regleReglementaire.deleteMany({ where: { workspaceId: WS, code: { in: testRegleCodes } } });

  // Delete test calendars and client
  const testClient = await prisma.clientCompany.findFirst({ where: { matriculeFiscal: "MF-P3-TEST" } });
  if (testClient) {
    await prisma.workCalendarDay.deleteMany({ where: { work_calendar: { clientCompanyId: testClient.id } } });
    await prisma.workCalendar.deleteMany({ where: { clientCompanyId: testClient.id } });
    await prisma.clientCompany.delete({ where: { id: testClient.id } });
  }
}

async function main() {
  // === Start server ===
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/config", configRoutes);
  app.use("/api/contracts", contractRoutes);
  app.use("/api/conventions", conventionRoutes);
  app.use("/api/calendars", calendarRoutes);
  app.use("/api/regles", regleRoutes);
  app.get("/api/health", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "error" }); }
  });

  const server = createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`🚀 Test server on port ${PORT}\n`);

  // === Teardown — clean residual data ===
  await teardown();

  console.log("═══════════════════════════════════════════════════");
  console.log("  Le Fiduciaire — Tests Phase 3 : Contrats & Réf.");
  console.log("═══════════════════════════════════════════════════\n");

  // --- Login propriétaire ---
  let propToken;
  await test("login propriétaire", async () => {
    const r = await post("/auth/login", {
      email: "proprietaire@lefiduciaire.tn",
      password: "ChangezMoi2026!Prop",
    });
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    propToken = r.data.token;
    return `token obtenu`;
  })();

  // --- Login gestionnaire ---
  let gestToken;
  await test("login gestionnaire", async () => {
    const r = await post("/auth/login", {
      email: "gestionnaire@lefiduciaire.tn",
      password: "ChangezMoi2026!Gest",
    });
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    gestToken = r.data.token;
    return `token obtenu`;
  })();

  // ====== PRÉREQUIS : Créer un client + employé ======
  let companyId, employeeId;
  await test("prérequis — créer client", async () => {
    const r = await post("/clients", {
      workspaceId: WS,
      raisonSociale: "Société Test Phase 3 SARL",
      matriculeFiscal: "MF-P3-TEST",
      secteur: "INDUSTRIEL",
      ville: "Tunis",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    companyId = r.data.company.id;
    return `company=${r.data.company.raisonSociale}`;
  })();

  await test("prérequis — créer employé", async () => {
    const employee = await prisma.employees.create({
      data: {
        workspaceId: WS,
        clientCompanyId: companyId,
        matriculeCnss: "CNSS-P3-001",
        firstName: "Mohamed",
        lastName: "Bouazizi",
        baseSalary: 2500.0,
        civilStatus: "MARIE",
        numberOfChildren: 2,
        isActive: true,
        hiredAt: new Date("2024-01-15"),
      },
    });
    employeeId = employee.id;
    return `employé=${employee.firstName} ${employee.lastName}`;
  })();

  // ====== 1. CONVENTIONS COLLECTIVES ======

  let conventionId;
  await test("POST /conventions — créer convention", async () => {
    const r = await post("/conventions", {
      workspaceId: WS,
      code: "CC-51",
      nom: "Convention Commerce et Distribution",
      secteur: "COMMERCIAL",
      organisme: "Ministère du Travail",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    conventionId = r.data.id;
    return `code=${r.data.code}, nom=${r.data.nom}`;
  })();

  await test("GET /conventions/:ws — lister", async () => {
    const r = await get(`/conventions/${WS}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.length} convention(s)`;
  })();

  await test("GET /conventions/:ws/:id — détail", async () => {
    const r = await get(`/conventions/${WS}/${conventionId}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.nom}, ${r.data.articles.length} articles, ${r.data.grille_salaires.length} entrées grille`;
  })();

  // --- Ajouter un article ---
  await test("POST /conventions/:ws/:id/articles — ajouter article", async () => {
    const r = await post(`/conventions/${WS}/${conventionId}/articles`, {
      numero: "1",
      titre: "Champ d'application",
      contenu: "La présente convention s'applique à l'ensemble des salariés des entreprises de commerce et de distribution.",
      ordre: 1,
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `article n°${r.data.numero}: ${r.data.titre}`;
  })();

  // --- Ajouter une entrée grille salariale ---
  await test("POST /conventions/:ws/:id/grille — ajouter grille", async () => {
    const r = await post(`/conventions/${WS}/${conventionId}/grille`, {
      coefficient: "200",
      echelon: "1",
      salaireMinimum: 1500.0,
      dateEffet: "2026-01-01",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `coeff=${r.data.coefficient}, échelon=${r.data.echelon}, min=${r.data.salaireMinimum} DT`;
  })();

  // --- Créer adaptation client ---
  await test("POST /conventions/:ws/:id/adaptations — adaptation client", async () => {
    const r = await post(`/conventions/${WS}/${conventionId}/adaptations`, {
      clientCompanyId: companyId,
      articleNumero: "1",
      adaptationDescription: "Extension du champ aux employés de stockage",
      valeurOriginale: "commerce et distribution",
      valeurAdaptee: "commerce, distribution et logistique",
      dateEffet: "2026-03-01",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `adaptation pour client=${r.data.clientCompanyId}`;
  })();

  // --- Convention système protégée ---
  let systemConvId;
  await test("POST /conventions — convention système", async () => {
    const r = await post("/conventions", {
      workspaceId: WS,
      code: "CC-SYS",
      nom: "Convention Système (protégée)",
      secteur: "NON_AGRICOLE",
      isSystem: true,
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    systemConvId = r.data.id;
    return `isSystem=${r.data.isSystem}`;
  })();

  await test("DELETE convention système → 403", async () => {
    const r = await del(`/conventions/${WS}/${systemConvId}`, propToken);
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement 403`;
  })();

  // ====== 2. CONTRATS DE TRAVAIL ======

  let contractId;
  await test("POST /contracts — créer contrat CDI + version initiale", async () => {
    const r = await post("/contracts", {
      employeeId,
      workspaceId: WS,
      type: "CDI",
      poste: "Chef de production",
      conventionCollectiveId: conventionId,
      dateDebut: "2024-01-15",
      periodeEssai: 90,
      salaireBrut: 2500.0,
      salaireBrutAnnuel: 30000.0,
      coefficient: "200",
      echelon: "1",
      heuresHebdomadaires: 48,
      heuresMensuelles: 208,
      motifChangement: "creation",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    contractId = r.data.contract.id;
    return `type=${r.data.contract.type}, poste=${r.data.contract.poste}, salaire=${r.data.version.salaireBrut}`;
  })();

  await test("GET /contracts/:ws — lister contrats", async () => {
    const r = await get(`/contracts/${WS}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.length} contrat(s)`;
  })();

  await test("GET /contracts/:ws/:id — détail + versions", async () => {
    const r = await get(`/contracts/${WS}/${contractId}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.type}, ${r.data.versions.length} version(s), salaire actuel=${r.data.versions[0]?.salaireBrut}`;
  })();

  // --- Ajouter une version (augmentation) ---
  await test("POST /contracts/:ws/:id/versions — augmentation", async () => {
    const r = await post(`/contracts/${WS}/${contractId}/versions`, {
      salaireBrut: 2800.0,
      salaireBrutAnnuel: 33600.0,
      coefficient: "220",
      echelon: "2",
      motifChangement: "augmentation",
      dateEffet: "2025-01-01",
      note: "Augmentation annuelle 2025",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `nouveau salaire=${r.data.salaireBrut}, motif=${r.data.motifChangement}`;
  })();

  // --- Ajouter une autre version (promotion) ---
  await test("POST /contracts/:ws/:id/versions — promotion", async () => {
    const r = await post(`/contracts/${WS}/${contractId}/versions`, {
      salaireBrut: 3200.0,
      salaireBrutAnnuel: 38400.0,
      coefficient: "250",
      echelon: "1",
      motifChangement: "promotion",
      dateEffet: "2025-07-01",
      note: "Promotion au poste de directeur adjoint",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `nouveau salaire=${r.data.salaireBrut}`;
  })();

  // --- Vérifier l'historique des versions ---
  await test("GET /contracts/:ws/:id — 3 versions dans l'historique", async () => {
    const r = await get(`/contracts/${WS}/${contractId}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    if (r.data.versions.length !== 3) throw new Error(`${r.data.versions.length} versions (attendu 3)`);
    return `3 versions: ${r.data.versions.map(v => `${v.salaireBrut} DT`).join(' → ')}`;
  })();

  // --- Suspendre un contrat ---
  await test("PATCH /contracts/:ws/:id/suspendre", async () => {
    const r = await patch(`/contracts/${WS}/${contractId}/suspendre`, {}, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `statut=${r.data.statut}`;
  })();

  // --- Résilier un contrat ---
  await test("PATCH /contracts/:ws/:id/resilier", async () => {
    const r = await patch(`/contracts/${WS}/${contractId}/resilier`, {
      motifRupture: "Démission volontaire",
      dateRupture: "2025-12-31",
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `statut=${r.data.statut}, motif=${r.data.motifRupture}`;
  })();

  // ====== 3. CALENDRIERS DE TRAVAIL ======

  let calendarId;
  await test("POST /calendars — créer calendrier 48h", async () => {
    const r = await post("/calendars", {
      clientCompanyId: companyId,
      workspaceId: WS,
      nom: "Standard industriel 48h",
      heuresHebdomadaires: 48,
      joursMoisStandard: 26,
      heuresMoisStandard: 208,
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    calendarId = r.data.id;
    return `${r.data.nom}, ${r.data.jours.length} jours, hebdo=${r.data.heuresHebdomadaires}h`;
  })();

  await test("GET /calendars/:ws/:id — détail + jours", async () => {
    const r = await get(`/calendars/${WS}/${calendarId}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const joursOuvres = r.data.jours.filter(j => j.estOuvre).length;
    return `${r.data.nom}, ${joursOuvres} jours ouvrés sur ${r.data.jours.length}`;
  })();

  // --- Créer calendrier 40h (administratif) ---
  await test("POST /calendars — calendrier 40h administratif", async () => {
    const r = await post("/calendars", {
      clientCompanyId: companyId,
      workspaceId: WS,
      nom: "Administratif 40h",
      heuresHebdomadaires: 40,
      joursMoisStandard: 22,
      heuresMoisStandard: 173.33,
      jours: [
        { jour: "LUNDI", estOuvre: true, heuresTravail: 8 },
        { jour: "MARDI", estOuvre: true, heuresTravail: 8 },
        { jour: "MERCREDI", estOuvre: true, heuresTravail: 8 },
        { jour: "JEUDI", estOuvre: true, heuresTravail: 8 },
        { jour: "VENDREDI", estOuvre: true, heuresTravail: 8 },
        { jour: "SAMEDI", estOuvre: false, heuresTravail: 0 },
        { jour: "DIMANCHE", estOuvre: false, heuresTravail: 0 },
      ],
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `${r.data.nom}, hebdo=${r.data.heuresHebdomadaires}h`;
  })();

  // --- Modifier les jours du calendrier ---
  await test("PUT /calendars/:ws/:id/days — demi-journée samedi", async () => {
    const r = await put(`/calendars/${WS}/${calendarId}/days`, {
      jours: [
        { jour: "SAMEDI", estOuvre: true, heuresTravail: 4 },
      ],
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const samedi = r.data.jours.find(j => j.jour === "SAMEDI");
    return `samedi: ouvré=${samedi.estOuvre}, heures=${samedi.heuresTravail}, total=${r.data.heuresHebdomadaires}h`;
  })();

  // ====== 4. RÈGLES RÉGLEMENTAIRES ======

  let regleCnssId;
  await test("POST /regles — créer règle CNSS versionnée", async () => {
    const r = await post("/regles", {
      workspaceId: WS,
      code: "CNSS_SALARIAL_NA",
      categorie: "CNSS",
      description: "Taux CNSS salarial secteur non agricole",
      valeur: 0.0968,
      unite: "%",
      dateDebut: "2024-01-01",
      source: "cnss.tn",
      reference: "Art. 32 CNSS",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    regleCnssId = r.data.id;
    return `code=${r.data.code}, valeur=${r.data.valeur}, cat=${r.data.categorie}`;
  })();

  // --- Ajouter une nouvelle version (changement de taux) ---
  await test("POST /regles — nouvelle version CNSS (taux modifié)", async () => {
    const r = await post("/regles", {
      workspaceId: WS,
      code: "CNSS_SALARIAL_NA",
      categorie: "CNSS",
      description: "Taux CNSS salarial secteur non agricole (révisé)",
      valeur: 0.10,
      unite: "%",
      dateDebut: "2026-01-01",
      source: "cnss.tn",
      reference: "Art. 32 CNSS - LF 2026",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `nouvelle version: valeur=${r.data.valeur} à partir du ${r.data.dateDebut}`;
  })();

  // --- Clore l'ancienne version ---
  await test("PUT /regles/:ws/:id — clôturer ancienne version", async () => {
    const r = await put(`/regles/${WS}/${regleCnssId}`, {
      dateFin: "2025-12-31",
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `dateFin=${r.data.dateFin}`;
  })();

  // --- Règle active à une date ---
  await test("GET /regles/:ws/active/:code — règle active en 2026", async () => {
    const r = await get(`/regles/${WS}/active/CNSS_SALARIAL_NA?date=2026-06-01`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    if (r.data.valeur !== 0.10) throw new Error(`attendu 0.10, obtenu ${r.data.valeur}`);
    return `valeur active=${r.data.valeur} (version 2026)`;
  })();

  await test("GET /regles/:ws/active/:code — règle active en 2024", async () => {
    const r = await get(`/regles/${WS}/active/CNSS_SALARIAL_NA?date=2024-06-01`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    if (r.data.valeur !== 0.0968) throw new Error(`attendu 0.0968, obtenu ${r.data.valeur}`);
    return `valeur active=${r.data.valeur} (version 2024)`;
  })();

  // --- Règle système protégée ---
  let systemRegleId;
  await test("POST /regles — règle système (protégée)", async () => {
    const r = await post("/regles", {
      workspaceId: WS,
      code: "CSS_TAUX",
      categorie: "CSS",
      description: "Taux Contribution de Solidarité Sociale",
      valeur: 0,
      unite: "%",
      dateDebut: "2026-01-01",
      source: "Loi finances 2026",
      reference: "Art. 23 LF 2026",
      isSystem: true,
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    systemRegleId = r.data.id;
    return `isSystem=${r.data.isSystem}`;
  })();

  await test("DELETE règle système → 403", async () => {
    const r = await del(`/regles/${WS}/${systemRegleId}`, propToken);
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement 403`;
  })();

  // --- Lister règles par catégorie ---
  await test("GET /regles/:ws?categorie=CNSS", async () => {
    const r = await get(`/regles/${WS}?categorie=CNSS`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.length} règle(s) CNSS`;
  })();

  // ====== 5. SÉCURITÉ ======

  await test("gestionnaire ne peut pas supprimer convention système", async () => {
    const r = await del(`/conventions/${WS}/${systemConvId}`, gestToken);
    // Doit être 403 (soit par requireRole PROPRIETAIRE, soit par isSystem check)
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement 403`;
  })();

  await test("gestionnaire ne peut pas supprimer règle système", async () => {
    const r = await del(`/regles/${WS}/${systemRegleId}`, gestToken);
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement 403`;
  })();

  await test("sans token → 401 sur contrats", async () => {
    const r = await get(`/contracts/${WS}`);
    if (r.status !== 401) throw new Error(`attendu 401, obtenu ${r.status}`);
    return `correctement 401`;
  })();

  await test("sans token → 401 sur règles", async () => {
    const r = await get(`/regles/${WS}`);
    if (r.status !== 401) throw new Error(`attendu 401, obtenu ${r.status}`);
    return `correctement 401`;
  })();

  // ====== 6. TYPES EXTENSIBLES ======

  // Créer un deuxième employé pour tester CDD
  let employee2Id;
  await test("prérequis — employé CDD", async () => {
    const employee = await prisma.employees.create({
      data: {
        workspaceId: WS,
        clientCompanyId: companyId,
        matriculeCnss: "CNSS-P3-002",
        firstName: "Salma",
        lastName: "Mansouri",
        baseSalary: 1800.0,
        civilStatus: "CELIBATAIRE",
        numberOfChildren: 0,
        isActive: true,
        hiredAt: new Date("2025-03-01"),
      },
    });
    employee2Id = employee.id;
    return `employé=${employee.firstName}`;
  })();

  await test("POST /contracts — CDD saisonnier", async () => {
    const r = await post("/contracts", {
      employeeId: employee2Id,
      workspaceId: WS,
      type: "CDD",
      poste: "Employé saisonnier",
      dateDebut: "2025-06-01",
      dateFin: "2025-09-30",
      periodeEssai: 15,
      salaireBrut: 1800.0,
      motifChangement: "creation",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    return `type=${r.data.contract.type}, dateFin=${r.data.contract.dateFin}`;
  })();

  // Filtrer par type
  await test("GET /contracts/:ws?type=CDI — filtrer par type", async () => {
    const r = await get(`/contracts/${WS}?type=CDI`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const allCdi = r.data.every(c => c.type === "CDI");
    if (!allCdi) throw new Error("certains ne sont pas CDI");
    return `${r.data.length} contrat(s) CDI`;
  })();

  // === Résumé ===
  console.log("\n═══════════════════════════════════════════════════");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`  Résultat: ${passed} PASS / ${failed} FAIL / ${results.length} total`);
  console.log("═══════════════════════════════════════════════════");

  server.close();
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
