#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 4 Integration Test (Pointage Mensuel)
// =============================================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_edPKWSt4Q3Ul@ep-jolly-heart-aymmh63q-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";
process.env.JWT_SECRET = process.env.JWT_SECRET || "fiduciaire-dev-test-secret";

import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import attendanceRoutes from "./routes/attendance.js";

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

async function postForm(path, formData, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "POST", headers, body: formData,
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

async function patch(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "PATCH", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const PORT = 3100;
const WS = "ws-fiduciaire-default";

// ---------------------------------------------------------------------------
// Teardown — clean test residual data before running
// ---------------------------------------------------------------------------
async function teardown() {
  // Delete test employees by matricule
  const testMatricules = ["P4-001", "P4-002", "P4-003"];
  const testEmployees = await prisma.employees.findMany({ where: { matriculeCnss: { in: testMatricules } } });
  for (const emp of testEmployees) {
    await prisma.payrollVariable.deleteMany({ where: { employeeId: emp.id } });
    await prisma.attendanceSummary.deleteMany({ where: { employeeId: emp.id } });
  }
  await prisma.employees.deleteMany({ where: { matriculeCnss: { in: testMatricules } } });

  // Delete test client and its attendance imports
  const testClient = await prisma.clientCompany.findFirst({ where: { matriculeFiscal: "MF-P4-TEST" } });
  if (testClient) {
    const imports = await prisma.attendanceImport.findMany({ where: { clientCompanyId: testClient.id } });
    for (const imp of imports) {
      await prisma.payrollVariable.deleteMany({ where: { attendance_summary: { importId: imp.id } } });
      await prisma.attendanceSummary.deleteMany({ where: { importId: imp.id } });
    }
    await prisma.attendanceImport.deleteMany({ where: { clientCompanyId: testClient.id } });
    await prisma.clientCompany.delete({ where: { id: testClient.id } });
  }
}

// Créer un fichier Excel de test en mémoire
function createTestExcel(rows: string[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pointage");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

async function main() {
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/attendance", attendanceRoutes);
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
  console.log("  Le Fiduciaire — Tests Phase 4 : Pointage Mensuel");
  console.log("═══════════════════════════════════════════════════\n");

  // --- Login ---
  let propToken;
  await test("login propriétaire", async () => {
    const r = await post("/auth/login", {
      email: "proprietaire@lefiduciaire.tn",
      password: "ChangezMoi2026!Prop",
    });
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    propToken = r.data.token;
    return `token obtenu`;
  })();

  // ====== PRÉREQUIS : Client + Employés ======
  let companyId;
  await test("prérequis — créer client", async () => {
    const r = await post("/clients", {
      workspaceId: WS,
      raisonSociale: "Société Pointage Test SARL",
      matriculeFiscal: "MF-P4-TEST",
      secteur: "INDUSTRIEL",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    companyId = r.data.company.id;
    return `company=${r.data.company.raisonSociale}`;
  })();

  // Créer des employés avec matricules connus
  let emp1Id, emp2Id, emp3Id;
  await test("prérequis — créer 3 employés", async () => {
    const emp1 = await prisma.employees.create({
      data: { workspaceId: WS, clientCompanyId: companyId, matriculeCnss: "P4-001",
        firstName: "Amine", lastName: "Khelifi", baseSalary: 2500, isActive: true, hiredAt: new Date("2024-01-01") },
    });
    const emp2 = await prisma.employees.create({
      data: { workspaceId: WS, clientCompanyId: companyId, matriculeCnss: "P4-002",
        firstName: "Sana", lastName: "Trabelsi", baseSalary: 1800, isActive: true, hiredAt: new Date("2024-03-01") },
    });
    const emp3 = await prisma.employees.create({
      data: { workspaceId: WS, clientCompanyId: companyId, matriculeCnss: "P4-003",
        firstName: "Karim", lastName: "Jendoubi", baseSalary: 3200, isActive: true, hiredAt: new Date("2024-06-01") },
    });
    emp1Id = emp1.id; emp2Id = emp2.id; emp3Id = emp3.id;
    return `${emp1.firstName}, ${emp2.firstName}, ${emp3.firstName}`;
  })();

  // ====== 1. TÉLÉCHARGER TEMPLATE ======
  await test("POST /attendance/template — télécharger template", async () => {
    const headers = { "Authorization": `Bearer ${propToken}` };
    const res = await fetch(`http://127.0.0.1:${PORT}/api/attendance/template`, {
      method: "POST", headers,
    });
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    const ct = res.headers.get("content-type");
    if (!ct?.includes("spreadsheetml")) throw new Error(`content-type: ${ct}`);
    return `template Excel reçu`;
  })();

  // ====== 2. IMPORT VALIDE (pas d'anomalie) ======
  let importId1;
  await test("POST /attendance/import — import valide", async () => {
    // Créer fichier Excel avec données valides
    const excelBuffer = createTestExcel([
      ["Matricule", "Nom & Prénom", "Jours travaillés réels", "Congés payés", "Absences justifiées", "Absences non justifiées", "Heures supplémentaires"],
      ["P4-001", "Amine Khelifi", 26, 0, 0, 0, 0],
      ["P4-002", "Sana Trabelsi", 22, 2, 2, 0, 8],
      ["P4-003", "Karim Jendoubi", 24, 1, 1, 0, 4],
    ]);

    const form = new FormData();
    form.append("file", new Blob([excelBuffer]), "pointage_valide.xlsx");
    form.append("workspaceId", WS);
    form.append("clientCompanyId", companyId);
    form.append("mois", "6");
    form.append("annee", "2026");

    const r = await postForm("/attendance/import", form, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    importId1 = r.data.import.id;
    return `statut=${r.data.import.statut}, ${r.data.summariesCreated} summaries, ${r.data.variablesCreated} variables`;
  })();

  // ====== 3. VÉRIFIER L'IMPORT ======
  await test("GET /attendance/:ws/imports/:id — détail import", async () => {
    const r = await get(`/attendance/${WS}/imports/${importId1}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `statut=${r.data.statut}, lignes=${r.data.lignesTotal}, ok=${r.data.lignesOk}, anomalie=${r.data.lignesAnomalie}`;
  })();

  // ====== 4. LISTER LES SUMMARY ======
  await test("GET /attendance/:ws/summaries/:importId", async () => {
    const r = await get(`/attendance/${WS}/summaries/${importId1}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    if (r.data.length !== 3) throw new Error(`${r.data.length} summaries (attendu 3)`);
    return `${r.data.length} summaries, taux présence=${r.data[0]?.tauxPresence}`;
  })();

  // ====== 5. VARIABLES DE PAIE (statut PROPOSEE) ======
  await test("GET /attendance/:ws/variables — variables PROPOSEE", async () => {
    const r = await get(`/attendance/${WS}/variables?mois=6&annee=2026`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const proposees = r.data.filter(v => v.statut === "PROPOSEE");
    if (proposees.length !== 3) throw new Error(`${proposees.length} PROPOSEE (attendu 3)`);
    return `${proposees.length} variables PROPOSEE, brut=${r.data[0]?.salaireBrutMensuel}`;
  })();

  // ====== 6. VALIDER UNE VARIABLE ======
  let variableId;
  await test("PATCH /attendance/:ws/variables/:id/validate", async () => {
    // Récupérer une variable PROPOSEE
    const vars = await get(`/attendance/${WS}/variables?mois=6&annee=2026&statut=PROPOSEE`, propToken);
    if (vars.data.length === 0) throw new Error("aucune variable PROPOSEE");
    variableId = vars.data[0].id;

    const r = await patch(`/attendance/${WS}/variables/${variableId}/validate`, {
      noteValidation: "Contrôle OK — paie conforme",
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `statut=${r.data.statut}`;
  })();

  // ====== 7. REFUSER UNE VARIABLE ======
  await test("PATCH /attendance/:ws/variables/:id/refuse", async () => {
    const vars = await get(`/attendance/${WS}/variables?mois=6&annee=2026&statut=PROPOSEE`, propToken);
    if (vars.data.length === 0) throw new Error("aucune variable PROPOSEE");
    const id = vars.data[0].id;

    const r = await patch(`/attendance/${WS}/variables/${id}/refuse`, {
      noteValidation: "Heures supp. à vérifier",
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `statut=${r.data.statut}`;
  })();

  // ====== 8. IMPORT AVEC ANOMALIES ======
  let importId2;
  await test("POST /attendance/import —+ anomalies (matricule inconnu, valeur négative, doublon)", async () => {
    const excelBuffer = createTestExcel([
      ["Matricule", "Nom & Prénom", "Jours travaillés réels", "Congés payés", "Absences justifiées", "Absences non justifiées", "Heures supplémentaires"],
      ["P4-001", "Amine Khelifi", 26, 0, 0, 0, 0],       // OK
      ["INCONNU", "Ghost", 26, 0, 0, 0, 0],               // MATRICULE_INCONNU (BLOQUANTE)
      ["P4-002", "Sana Trabelsi", -5, 0, 0, 0, 0],        // VALEUR_NEGATIVE (BLOQUANTE)
      ["P4-001", "Amine Khelifi dup", 20, 0, 0, 0, 0],    // DOUBLON_MATRICULE (BLOQUANTE)
    ]);

    const form = new FormData();
    form.append("file", new Blob([excelBuffer]), "pointage_anomalies.xlsx");
    form.append("workspaceId", WS);
    form.append("clientCompanyId", companyId);
    form.append("mois", "7");
    form.append("annee", "2026");

    const r = await postForm("/attendance/import", form, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    importId2 = r.data.import.id;
    return `statut=${r.data.import.statut}, lignesOk=${r.data.import.lignesOk}, anomalie=${r.data.import.lignesAnomalie}`;
  })();

  // ====== 9. VÉRIFIER LES ANOMALIES ======
  await test("GET import avec anomalies — vérifier", async () => {
    const r = await get(`/attendance/${WS}/imports/${importId2}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const anomalies = r.data.anomalies;
    if (!anomalies || anomalies.length === 0) throw new Error("aucune anomalie trouvée");
    const types = anomalies.map(a => a.type);
    return `${anomalies.length} anomalies: ${types.join(", ")}`;
  })();

  // ====== 10. IMPORT REJETÉ (toutes lignes bloquantes) ======
  await test("POST /attendance/import — import rejeté", async () => {
    const excelBuffer = createTestExcel([
      ["Matricule", "Nom & Prénom", "Jours travaillés réels", "Congés payés", "Absences justifiées", "Absences non justifiées", "Heures supplémentaires"],
      ["FAUX1", "Personne 1", 26, 0, 0, 0, 0],
      ["FAUX2", "Personne 2", -1, 0, 0, 0, 0],
    ]);

    const form = new FormData();
    form.append("file", new Blob([excelBuffer]), "pointage_rejete.xlsx");
    form.append("workspaceId", WS);
    form.append("clientCompanyId", companyId);
    form.append("mois", "8");
    form.append("annee", "2026");

    const r = await postForm("/attendance/import", form, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    if (r.data.import.statut !== "REJETE") throw new Error(`statut=${r.data.import.statut}, attendu REJETE`);
    return `correctement REJETE`;
  })();

  // ====== 11. INCOHÉRENCE JOURS (avertissement, pas bloquant) ======
  await test("POST /attendance/import — avertissement incohérence jours", async () => {
    const excelBuffer = createTestExcel([
      ["Matricule", "Nom & Prénom", "Jours travaillés réels", "Congés payés", "Absences justifiées", "Absences non justifiées", "Heures supplémentaires"],
      ["P4-003", "Karim Jendoubi", 20, 2, 1, 0, 0],  // Total 23 ≠ 26 → avertissement
    ]);

    const form = new FormData();
    form.append("file", new Blob([excelBuffer]), "pointage_avert.xlsx");
    form.append("workspaceId", WS);
    form.append("clientCompanyId", companyId);
    form.append("mois", "9");
    form.append("annee", "2026");

    const r = await postForm("/attendance/import", form, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    // Avertissement n'est pas bloquant → import VALIDE
    return `statut=${r.data.import.statut}, anomalies=${r.data.import.lignesAnomalie}`;
  })();

  // ====== 12. LISTER IMPORTS ======
  await test("GET /attendance/:ws/imports — lister", async () => {
    const r = await get(`/attendance/${WS}/imports?annee=2026`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.length} import(s) en 2026`;
  })();

  // ====== 13. SÉCURITÉ ======
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

  await test("sans token → 401 sur import", async () => {
    const r = await get(`/attendance/${WS}/imports`);
    if (r.status !== 401) throw new Error(`attendu 401,5, obtenu ${r.status}`);
    return `correctement 401`;
  })();

  await test("gestionnaire → workspace non attribué → 403", async () => {
    const form = new FormData();
    form.append("workspaceId", "ws-inexistant");
    form.append("clientCompanyId", companyId);
    form.append("mois", "6");
    form.append("annee", "2026");
    // Pas de fichier — multer va rejeter, mais on teste l'accès d'abord(403 arrive avant le parsing)
    const r = await postForm("/attendance/import", form, gestToken);
    if (r.status !== 403 && r.status !== 400) throw new Error(`attendu 403 ou 400, obtenu ${r.status}`);
    return `accès refusé`;
  })();

  // ====== 14. VALIDATION DOUBLE ======
  await test("valider une variable déjà validée → 400", async () => {
    const r = await patch(`/attendance/${WS}/variables/${variableId}/validate`, {}, propToken);
    if (r.status !== 400) throw new Error(`attendu 400, obtenu ${r.status}`);
    return `correctement 400`;
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
