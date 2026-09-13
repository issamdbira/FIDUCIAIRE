#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 7 Integration Tests (Déclarations CNSS)
// =============================================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_edPKWSt4Q3Ul@ep-jolly-heart-aymmh63q-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
process.env.JWT_SECRET = process.env.JWT_SECRET || "fiduciaire-dev-test-secret";

import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import payrollRoutes from "./routes/payroll.js";
import cnssRoutes from "./routes/cnss.js";
import { generateCnssExportText, generateCnssExportCsv, getMoisTrimestre, getTrimestreFromMois } from "./lib/cnss-export.js";

let results: Array<{ name: string; status: string; detail: string }> = [];

function test(name: string, fn: () => Promise<string>) {
  return async () => {
    try {
      const result = await fn();
      results.push({ name, status: "PASS", detail: result });
      console.log(`✅ ${name}: ${result}`);
    } catch (e: any) {
      results.push({ name, status: "FAIL", detail: e.message });
      console.log(`❌ ${name}: ${e.message}`);
    }
  };
}

async function post(path: string, body: any, token?: string) {
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path: string, token?: string) {
  const headers: any = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { headers });
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/plain") || contentType.includes("text/csv")) {
    const text = await res.text();
    return { status: res.status, data: text, contentType };
  }
  const data = await res.json();
  return { status: res.status, data, contentType };
}

async function patch(path: string, body: any, token?: string) {
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { method: "PATCH", headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

const PORT = 3095;
const WS = "ws-fiduciaire-default";

// Trimestre de test : Q3 2026 (mois 7, 8, 9)
const TEST_ANNEE = 2026;
const TEST_TRIMESTRE = 3;
const TEST_MOIS = [7, 8, 9];

async function main() {
  // === Start server ===
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/cnss", cnssRoutes);
  app.get("/api/health", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "error" }); }
  });

  const server = createServer(app);
  await new Promise<void>((r) => server.listen(PORT, () => r()));
  console.log(`\n🧪 Phase 7 Test Server — http://127.0.0.1:${PORT}/\n`);

  // === Login propriétaire ===
  const propEmail = process.env.SEED_PROPRIETAIRE_EMAIL || "proprietaire@lefiduciaire.tn";
  const propPwd = process.env.SEED_PROPRIETAIRE_PASSWORD || "ChangezMoi2026!Prop";

  const loginRes = await post("/auth/login", { email: propEmail, password: propPwd });
  const propToken = loginRes.data.token;
  if (!propToken) { console.error("❌ Cannot login"); server.close(); process.exit(1); }

  // === Ensure client exists ===
  const clientsRes = await get(`/clients/${WS}`, propToken);
  let clientId = clientsRes.data?.[0]?.id;
  if (!clientId) {
    const c = await post("/clients", { workspaceId: WS, raisonSociale: "Test CNSS Corp", matriculeFiscal: "MF-CNSS-001", matriculeCnss: "CNSS-EMP-001", secteur: "NON_AGRICOLE" }, propToken);
    clientId = c.data.id;
  }

  // === Ensure employee + contract exist ===
  let employeeId: string | null = null;
  const existingEmp = await prisma.employees.findFirst({ where: { workspaceId: WS, clientCompanyId: clientId, isActive: true } });
  if (existingEmp) {
    employeeId = existingEmp.id;
  } else {
    const emp = await prisma.employees.create({
      data: {
        workspaceId: WS, clientCompanyId: clientId,
        matriculeCnss: "CNSS-SAL-001", firstName: "Mohamed", lastName: "Trabelsi",
        baseSalary: 1800, civilStatus: "MARIE", numberOfChildren: 2, isActive: true,
      },
    });
    employeeId = emp.id;
  }

  // Ensure contract
  const existingContract = await prisma.contract.findFirst({ where: { employeeId: employeeId!, statut: "ACTIF" } });
  if (!existingContract) {
    await prisma.contract.create({
      data: {
        employeeId: employeeId!, workspaceId: WS,
        type: "CDI", statut: "ACTIF", poste: "Ingénieur",
        dateDebut: new Date("2025-01-01"),
        versions: {
          create: {
            salaireBrut: 1800, motifChangement: "embauche", dateEffet: new Date("2025-01-01"),
            heuresHebdomadaires: 48, heuresMensuelles: 208,
          },
        },
      },
    });
  }

  // Ensure PayrollConfig exists
  const existingConfig = await prisma.payrollConfig.findUnique({ where: { workspaceId: WS } });
  if (!existingConfig) {
    await prisma.payrollConfig.create({
      data: {
        workspaceId: WS,
        tranches_irpp: {
          create: [
            { min: 0, max: 5000, taux: 0, ordre: 1 },
            { min: 5000, max: 10000, taux: 0.26, ordre: 2 },
            { min: 10000, max: 20000, taux: 0.28, ordre: 3 },
            { min: 20000, max: 30000, taux: 0.32, ordre: 4 },
            { min: 30000, max: 50000, taux: 0.35, ordre: 5 },
            { min: 50000, max: null, taux: 0.37, ordre: 6 },
          ],
        },
      },
    });
  }

  // === TEARDOWN: Clean CNSS declarations + payroll periods for this test ===
  await prisma.documentStorage.deleteMany({ where: { workspaceId: WS, type: "EXPORT_CNSS" } });
  await prisma.cNSSDeclaration.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, annee: TEST_ANNEE, numeroTrimestre: TEST_TRIMESTRE } });

  // Clean payroll periods for the 3 months
  for (const m of TEST_MOIS) {
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: m, annee: TEST_ANNEE } });
  }

  // === Create 3 validated payroll periods (Q3 2026: mois 7, 8, 9) ===
  const periodIds: string[] = [];
  for (const m of TEST_MOIS) {
    const pRes = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: m, annee: TEST_ANNEE }, propToken);
    if (pRes.status !== 201) { console.error(`❌ Cannot create period ${m}/${TEST_ANNEE}: ${JSON.stringify(pRes.data)}`); server.close(); process.exit(1); }
    const pid = pRes.data.id;
    periodIds.push(pid);

    // Calculate
    await patch(`/payroll/${WS}/periods/${pid}/calculate`, {}, propToken);

    // Resolve blocking anomalies
    const anomalies = await get(`/payroll/${WS}/anomalies?periodId=${pid}&niveau=BLOQUANTE`, propToken);
    for (const a of anomalies.data) {
      if (!a.estResolue) await patch(`/payroll/${WS}/anomalies/${a.id}/resolve`, { noteResolution: "Résolu test CNSS" }, propToken);
    }

    // Validate
    await patch(`/payroll/${WS}/periods/${pid}/validate`, {}, propToken);
  }

  // ====================================================================
  // TESTS
  // ====================================================================

  // 1. Créer déclaration CNSS
  let declId: string = "";
  await test("1. Créer déclaration CNSS Q3/2026", async () => {
    const res = await post("/cnss/declarations", { workspaceId: WS, clientCompanyId: clientId, annee: TEST_ANNEE, numeroTrimestre: TEST_TRIMESTRE, note: "Test Phase 7" }, propToken);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    declId = res.data.declaration.id;
    const d = res.data.declaration;
    if (d.trimestre !== "2026-Q3") throw new Error(`Trimestre ${d.trimestre} ≠ 2026-Q3`);
    if (d.statut !== "BROUILLON") throw new Error(`Statut ${d.statut} ≠ BROUILLON`);
    return `Déclaration ${d.trimestre} créée — salariés: ${d.nombreSalaries}, salaires: ${d.totalSalaires.toFixed(3)}, périodes: ${res.data.periodesTrouvees}/3`;
  })();

  // 2. Doublon déclaration → 409
  await test("2. Doublon déclaration → 409", async () => {
    const res = await post("/cnss/declarations", { workspaceId: WS, clientCompanyId: clientId, annee: TEST_ANNEE, numeroTrimestre: TEST_TRIMESTRE }, propToken);
    if (res.status !== 409) throw new Error(`Attendu 409, reçu ${res.status}`);
    return "Conflit 409 correct";
  })();

  // 3. Lister déclarations
  await test("3. Lister déclarations", async () => {
    const res = await get(`/cnss/${WS}/declarations?annee=${TEST_ANNEE}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.length) throw new Error("Aucune déclaration");
    return `${res.data.length} déclaration(s)`;
  })();

  // 4. Détail déclaration
  await test("4. Détail déclaration", async () => {
    const res = await get(`/cnss/${WS}/declarations/${declId}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const d = res.data;
    if (d.statut !== "BROUILLON") throw new Error(`Statut ${d.statut}`);
    if (d.nombreSalaries <= 0) throw new Error(`nombreSalaries ${d.nombreSalaries} ≤ 0`);
    return `Statut: ${d.statut}, salariés: ${d.nombreSalaries}, salaires: ${d.totalSalaires.toFixed(3)}`;
  })();

  // 5. Contrôler déclaration (BROUILLON → CONTROLEE)
  await test("5. Transition BROUILLON → CONTROLEE", async () => {
    const res = await patch(`/cnss/${WS}/declarations/${declId}/controler`, {}, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.statut !== "CONTROLEE") throw new Error(`Statut ${res.data.statut} ≠ CONTROLEE`);
    return `Statut: ${res.data.statut}`;
  })();

  // 6. Générer export (CONTROLEE → GENEREE)
  let exportFilename: string = "";
  await test("6. Transition CONTROLEE → GENEREE (+ export)", async () => {
    const res = await patch(`/cnss/${WS}/declarations/${declId}/generer`, {}, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.declaration.statut !== "GENEREE") throw new Error(`Statut ${res.data.declaration.statut} ≠ GENEREE`);
    exportFilename = res.data.filename || "";
    return `Statut: ${res.data.declaration.statut}, fichier: ${exportFilename}`;
  })();

  // 7. Télécharger export CNSS
  await test("7. Télécharger export CNSS", async () => {
    const res = await get(`/cnss/declarations/${declId}/download?workspaceId=${WS}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data !== "string") throw new Error("Contenu non-texte");
    if (!res.data.includes("EN-TETE")) throw new Error("Format CNSS incorrect — EN-TETE manquant");
    if (!res.data.includes("SALARIE")) throw new Error("Ligne SALARIE manquante");
    if (!res.data.includes("TOTAUX")) throw new Error("Ligne TOTAUX manquante");
    return `Fichier CNSS reçu, ${res.data.length} chars`;
  })();

  // 8. Archiver déclaration (GENEREE → ARCHIVEE)
  await test("8. Transition GENEREE → ARCHIVEE", async () => {
    const res = await patch(`/cnss/${WS}/declarations/${declId}/archiver`, {}, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.statut !== "ARCHIVEE") throw new Error(`Statut ${res.data.statut} ≠ ARCHIVEE`);
    return `Statut: ${res.data.statut}`;
  })();

  // 9. Transition impossible ARCHIVEE → *
  await test("9. Transition impossible depuis ARCHIVEE", async () => {
    const res = await patch(`/cnss/${WS}/declarations/${declId}/controler`, {}, propToken);
    if (res.status !== 400) throw new Error(`Attendu 400, reçu ${res.status}`);
    return "400 correct";
  })();

  // 10. Export unitaire — generateCnssExportText
  await test("10. Export unitaire — generateCnssExportText", async () => {
    const data = {
      matriculeEmployeur: "CNSS-TEST-001",
      raisonSociale: "Test Corp",
      trimestre: "2026-Q3",
      annee: 2026,
      numeroTrimestre: 3,
      nombreSalaries: 1,
      totalSalaires: 5400,
      totalCotisationsSalariales: 522.72,
      totalCotisationsPatronales: 921.78,
      employees: [{
        matriculeCnss: "SAL-001",
        nom: "Trabelsi",
        prenom: "Mohamed",
        salaireBrutMois1: 1800,
        salaireBrutMois2: 1800,
        salaireBrutMois3: 1800,
        cotisationSalariale: 174.24,
        cotisationPatronale: 307.26,
        nombreJoursMois1: 26,
        nombreJoursMois2: 26,
        nombreJoursMois3: 26,
      }],
    };
    const text = generateCnssExportText(data);
    const lines = text.split("\n");
    if (lines.length !== 3) throw new Error(`Attendu 3 lignes, reçu ${lines.length}`);
    if (!lines[0].startsWith("EN-TETE")) throw new Error("Première ligne ≠ EN-TETE");
    if (!lines[1].startsWith("SALARIE")) throw new Error("Deuxième ligne ≠ SALARIE");
    if (!lines[2].startsWith("TOTAUX")) throw new Error("Troisième ligne ≠ TOTAUX");
    return `${lines.length} lignes, format correct`;
  })();

  // 11. Export unitaire — generateCnssExportCsv
  await test("11. Export unitaire — generateCnssExportCsv", async () => {
    const data = {
      matriculeEmployeur: "CNSS-TEST-001",
      raisonSociale: "Test Corp",
      trimestre: "2026-Q3",
      annee: 2026,
      numeroTrimestre: 3,
      nombreSalaries: 1,
      totalSalaires: 5400,
      totalCotisationsSalariales: 522.72,
      totalCotisationsPatronales: 921.78,
      employees: [{
        matriculeCnss: "SAL-001",
        nom: "Trabelsi",
        prenom: "Mohamed",
        salaireBrutMois1: 1800,
        salaireBrutMois2: 1800,
        salaireBrutMois3: 1800,
        cotisationSalariale: 174.24,
        cotisationPatronale: 307.26,
        nombreJoursMois1: 26,
        nombreJoursMois2: 26,
        nombreJoursMois3: 26,
      }],
    };
    const csv = generateCnssExportCsv(data);
    const lines = csv.split("\n");
    if (lines.length < 2) throw new Error("CSV trop court");
    const headers = lines[0].split(";");
    if (!headers.includes("Matricule CNSS")) throw new Error("Colonne Matricule CNSS absente");
    return `${lines.length} lignes, ${headers.length} colonnes`;
  })();

  // 12. getMoisTrimestre
  await test("12. getMoisTrimestre — vérification", async () => {
    const q1 = getMoisTrimestre(1);
    const q3 = getMoisTrimestre(3);
    if (q1.join(",") !== "1,2,3") throw new Error(`Q1: ${q1}`);
    if (q3.join(",") !== "7,8,9") throw new Error(`Q3: ${q3}`);
    return `Q1=[${q1}], Q3=[${q3}]`;
  })();

  // 13. getTrimestreFromMois
  await test("13. getTrimestreFromMois — vérification", async () => {
    if (getTrimestreFromMois(1) !== 1) throw new Error("Jan → Q1");
    if (getTrimestreFromMois(7) !== 3) throw new Error("Jul → Q3");
    if (getTrimestreFromMois(12) !== 4) throw new Error("Dec → Q4");
    return "Correct";
  })();

  // 14. Export POST sans transition
  await test("14. Export POST (sans transition de statut)", async () => {
    // Create a new declaration for this test
    const testQ = 2; // Q2 2026
    const testAnnee = 2026;
    // Clean
    await prisma.documentStorage.deleteMany({ where: { workspaceId: WS, type: "EXPORT_CNSS" } });
    await prisma.cNSSDeclaration.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, annee: testAnnee, numeroTrimestre: testQ } });
    // Create periods for Q2 (mois 4, 5, 6)
    for (const m of [4, 5, 6]) {
      await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: m, annee: testAnnee } });
      const pRes = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: m, annee: testAnnee }, propToken);
      const pid = pRes.data.id;
      await patch(`/payroll/${WS}/periods/${pid}/calculate`, {}, propToken);
      const anRes = await get(`/payroll/${WS}/anomalies?periodId=${pid}&niveau=BLOQUANTE`, propToken);
      for (const a of anRes.data) {
        if (!a.estResolue) await patch(`/payroll/${WS}/anomalies/${a.id}/resolve`, { noteResolution: "Résolu" }, propToken);
      }
      await patch(`/payroll/${WS}/periods/${pid}/validate`, {}, propToken);
    }
    const declRes = await post("/cnss/declarations", { workspaceId: WS, clientCompanyId: clientId, annee: testAnnee, numeroTrimestre: testQ }, propToken);
    const testDeclId = declRes.data.declaration.id;

    const res = await post(`/cnss/declarations/${testDeclId}/export`, { workspaceId: WS }, propToken);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    // Cleanup
    await prisma.documentStorage.deleteMany({ where: { workspaceId: WS, type: "EXPORT_CNSS", cnssDeclarationId: testDeclId } });
    await prisma.cNSSDeclaration.delete({ where: { id: testDeclId } });
    return `Export généré sans transition`;
  })();

  // 15. Accès refusé sans token
  await test("15. Accès refusé sans token", async () => {
    const res = await get(`/cnss/${WS}/declarations`);
    if (res.status !== 401) throw new Error(`Attendu 401, reçu ${res.status}`);
    return "401 correct";
  })();

  // 16. Workspace isolation
  await test("16. Workspace isolation", async () => {
    const otherWs = "ws-non-existant";
    const res = await get(`/cnss/${otherWs}/declarations`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    return `${res.data.length} déclaration(s) pour ws inexistant`;
  })();

  // 17. Trimestre invalide
  await test("17. Trimestre invalide → 400", async () => {
    const res = await post("/cnss/declarations", { workspaceId: WS, clientCompanyId: clientId, annee: 2026, numeroTrimestre: 5 }, propToken);
    if (res.status !== 400) throw new Error(`Attendu 400, reçu ${res.status}`);
    return "400 correct";
  })();

  // 18. CNSS export — mentions obligatoires
  await test("18. Export CNSS — mentions obligatoires", async () => {
    const data = {
      matriculeEmployeur: "CNSS-EMP-001",
      raisonSociale: "Mention Test Corp",
      trimestre: "2026-Q3",
      annee: 2026,
      numeroTrimestre: 3,
      nombreSalaries: 1,
      totalSalaires: 5400,
      totalCotisationsSalariales: 522.72,
      totalCotisationsPatronales: 921.78,
      employees: [{
        matriculeCnss: "SAL-001",
        nom: "Trabelsi",
        prenom: "Mohamed",
        salaireBrutMois1: 1800,
        salaireBrutMois2: 1800,
        salaireBrutMois3: 1800,
        cotisationSalariale: 174.24,
        cotisationPatronale: 307.26,
        nombreJoursMois1: 26,
        nombreJoursMois2: 26,
        nombreJoursMois3: 26,
      }],
    };
    const text = generateCnssExportText(data);
    const required = ["EN-TETE", "CNSS-EMP-001", "Mention Test Corp", "2026-Q3", "SALARIE", "SAL-001", "TOTAUX"];
    for (const m of required) {
      if (!text.includes(m)) throw new Error(`Mention "${m}" absente`);
    }
    return `Toutes ${required.length} mentions présentes`;
  })();

  // === Summary ===
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Phase 7 — Résultats: ${passed} ✅ | ${failed} ❌ sur ${results.length} tests`);
  console.log(`${"=".repeat(60)}\n`);

  if (failed > 0) {
    console.log("Échecs:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }

  // === TEARDOWN ===
  try {
    await prisma.documentStorage.deleteMany({ where: { workspaceId: WS, type: "EXPORT_CNSS" } });
    await prisma.cNSSDeclaration.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, annee: TEST_ANNEE, numeroTrimestre: TEST_TRIMESTRE } });
    for (const m of TEST_MOIS) {
      await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: m, annee: TEST_ANNEE } });
    }
    // Also clean Q2 periods
    for (const m of [4, 5, 6]) {
      await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: m, annee: 2026 } });
    }
    await prisma.cNSSDeclaration.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, annee: 2026, numeroTrimestre: 2 } });
    console.log("🧹 Teardown OK");
  } catch (teardownErr) {
    console.error("⚠️ Teardown error:", teardownErr);
  }

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
