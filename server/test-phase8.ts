#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 8 Integration Tests (Professionnalisation)
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
import reportRoutes from "./routes/reports.js";

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
  if (contentType.includes("text/html") || contentType.includes("text/plain")) {
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

const PORT = 3094;
const WS = "ws-fiduciaire-default";

async function main() {
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/cnss", cnssRoutes);
  app.use("/api/reports", reportRoutes);
  app.get("/api/health", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "error" }); }
  });

  const server = createServer(app);
  await new Promise<void>((r) => server.listen(PORT, () => r()));
  console.log(`\n🧪 Phase 8 Test Server — http://127.0.0.1:${PORT}/\n`);

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
    const c = await post("/clients", { workspaceId: WS, raisonSociale: "Test Phase8 Corp", matriculeFiscal: "MF-P8-001", matriculeCnss: "CNSS-P8-001", secteur: "NON_AGRICOLE" }, propToken);
    clientId = c.data.id;
  }

  // === Ensure employee + contract ===
  let employeeId: string | null = null;
  const existingEmp = await prisma.employees.findFirst({ where: { workspaceId: WS, clientCompanyId: clientId, isActive: true } });
  if (existingEmp) {
    employeeId = existingEmp.id;
  } else {
    const emp = await prisma.employees.create({
      data: {
        workspaceId: WS, clientCompanyId: clientId,
        matriculeCnss: "P8-001", firstName: "Sami", lastName: "Hamdi",
        baseSalary: 1500, civilStatus: "MARIE", numberOfChildren: 1, isActive: true,
      },
    });
    employeeId = emp.id;
  }

  const existingContract = await prisma.contract.findFirst({ where: { employeeId: employeeId!, statut: "ACTIF" } });
  if (!existingContract) {
    await prisma.contract.create({
      data: {
        employeeId: employeeId!, workspaceId: WS,
        type: "CDI", statut: "ACTIF", poste: "Comptable",
        dateDebut: new Date("2025-01-01"),
        versions: {
          create: {
            salaireBrut: 1500, motifChangement: "embauche", dateEffet: new Date("2025-01-01"),
            heuresHebdomadaires: 48, heuresMensuelles: 208,
          },
        },
      },
    });
  }

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

  // === TEARDOWN: Clean Phase 8 data ===
  const testMois = 10, testAnnee = 2026;
  await prisma.documentStorage.deleteMany({ where: { workspaceId: WS, type: "RAPPORT_GROUPE" } });
  await prisma.auditLog.deleteMany({ where: { workspaceId: WS, action: { in: ["PERIOD_CLOSE", "PERIOD_VALIDATE", "COMPLEMENTARY_CREATE", "RAPPORT_GROUPE_GENERATE", "CNSS_GENERATE"] } } });
  // Clean complementary periods
  const compPeriods = await prisma.payrollPeriod.findMany({ where: { workspaceId: WS, clientCompanyId: clientId, isComplementary: true } });
  for (const cp of compPeriods) {
    await prisma.payslip.deleteMany({ where: { periodId: cp.id } });
    await prisma.anomaly.deleteMany({ where: { periodId: cp.id } });
  }
  await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, isComplementary: true } });
  // Clean main period
  await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: testMois, annee: testAnnee } });

  // === Create validated period for tests ===
  const periodRes = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: testMois, annee: testAnnee }, propToken);
  if (periodRes.status !== 201) { console.error(`❌ Cannot create period: ${JSON.stringify(periodRes.data)}`); server.close(); process.exit(1); }
  const periodId = periodRes.data.id;

  await patch(`/payroll/${WS}/periods/${periodId}/calculate`, {}, propToken);

  // Resolve anomalies
  const anomalies = await get(`/payroll/${WS}/anomalies?periodId=${periodId}&niveau=BLOQUANTE`, propToken);
  for (const a of anomalies.data) {
    if (!a.estResolue) await patch(`/payroll/${WS}/anomalies/${a.id}/resolve`, { noteResolution: "Résolu test" }, propToken);
  }

  await patch(`/payroll/${WS}/periods/${periodId}/validate`, {}, propToken);
  await patch(`/payroll/${WS}/periods/${periodId}/close`, {}, propToken);

  // ====================================================================
  // TESTS
  // ====================================================================

  // 1. Audit log created on period close
  await test("1. Audit log — PERIOD_CLOSE", async () => {
    const logs = await get(`/payroll/${WS}/audit?action=PERIOD_CLOSE`, propToken);
    if (logs.status !== 200) throw new Error(`Status ${logs.status}`);
    const auditData = logs.data.data || logs.data;
    const closeLogs = auditData.filter((l: any) => l.action === "PERIOD_CLOSE" && l.entityId === periodId);
    if (!closeLogs.length) throw new Error("Aucun audit log PERIOD_CLOSE");
    return `${closeLogs.length} log(s) PERIOD_CLOSE`;
  })();

  // 2. Audit log created on period validate
  await test("2. Audit log — PERIOD_VALIDATE", async () => {
    const logs = await get(`/payroll/${WS}/audit?action=PERIOD_VALIDATE`, propToken);
    if (logs.status !== 200) throw new Error(`Status ${logs.status}`);
    const auditData = logs.data.data || logs.data;
    const valLogs = auditData.filter((l: any) => l.action === "PERIOD_VALIDATE" && l.entityId === periodId);
    if (!valLogs.length) throw new Error("Aucun audit log PERIOD_VALIDATE");
    return `${valLogs.length} log(s) PERIOD_VALIDATE`;
  })();

  // 3. Create complementary payroll
  let compPeriodId: string = "";
  await test("3. Créer paie complémentaire", async () => {
    const res = await post(`/payroll/periods/${periodId}/complementary`, { workspaceId: WS, motifComplement: "Régularisation salaire", note: "Oubli prime" }, propToken);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    compPeriodId = res.data.complementaryPeriod.id;
    const cp = res.data.complementaryPeriod;
    if (!cp.isComplementary) throw new Error("isComplementary ≠ true");
    if (cp.parentPeriodId !== periodId) throw new Error("parentPeriodId incorrect");
    return `Période complémentaire créée, isComplementary=${cp.isComplementary}, motif=${cp.motifComplement}`;
  })();

  // 4. Complementary requires CLOSED parent
  await test("4. Complémentaire refusée si parent non clôturée", async () => {
    // Create a non-closed period to test
    const testMois2 = 11;
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: testMois2, annee: testAnnee } });
    const openPeriod = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: testMois2, annee: testAnnee }, propToken);
    const res = await post(`/payroll/periods/${openPeriod.data.id}/complementary`, { workspaceId: WS, motifComplement: "Test" }, propToken);
    if (res.status !== 400) throw new Error(`Attendu 400, reçu ${res.status}`);
    // Cleanup
    await prisma.payrollPeriod.delete({ where: { id: openPeriod.data.id } });
    return "400 correct";
  })();

  // 5. Duplicate complementary → 409
  await test("5. Doublon complémentaire → 409", async () => {
    const res = await post(`/payroll/periods/${periodId}/complementary`, { workspaceId: WS, motifComplement: "Autre motif" }, propToken);
    if (res.status !== 409) throw new Error(`Attendu 409, reçu ${res.status}`);
    return "409 correct";
  })();

  // 6. Audit log for complementary creation
  await test("6. Audit log — COMPLEMENTARY_CREATE", async () => {
    const logs = await get(`/payroll/${WS}/audit?action=COMPLEMENTARY_CREATE`, propToken);
    if (logs.status !== 200) throw new Error(`Status ${logs.status}`);
    const auditData = logs.data.data || logs.data;
    const compLogs = auditData.filter((l: any) => l.action === "COMPLEMENTARY_CREATE");
    if (!compLogs.length) throw new Error("Aucun audit log COMPLEMENTARY_CREATE");
    return `${compLogs.length} log(s)`;
  })();

  // 7. Generate grouped report (PDF HTML)
  let rapportDocId: string = "";
  await test("7. Générer rapport groupé", async () => {
    const res = await post(`/reports/periods/${periodId}/grouped-pdf`, { workspaceId: WS }, propToken);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    rapportDocId = res.data.document.id;
    return `Rapport: ${res.data.document.nomFichier}, ${res.data.nombreBulletins} bulletin(s)`;
  })();

  // 8. Re-generate grouped report → idempotent
  await test("8. Re-générer rapport → déjà existant", async () => {
    const res = await post(`/reports/periods/${periodId}/grouped-pdf`, { workspaceId: WS }, propToken);
    if (res.status !== 200) throw new Error(`Attendu 200, reçu ${res.status}`);
    return "Idempotent 200 OK";
  })();

  // 9. List reports
  await test("9. Lister rapports", async () => {
    const res = await get(`/reports/${WS}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.length) throw new Error("Aucun rapport");
    return `${res.data.length} rapport(s)`;
  })();

  // 10. Detail report
  await test("10. Détail rapport", async () => {
    if (!rapportDocId) throw new Error("Pas de rapport");
    const res = await get(`/reports/${WS}/${rapportDocId}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    return `${res.data.nomFichier}, type=${res.data.type}`;
  })();

  // 11. Audit log for rapport generation
  await test("11. Audit log — RAPPORT_GROUPE_GENERATE", async () => {
    const logs = await get(`/payroll/${WS}/audit?action=RAPPORT_GROUPE_GENERATE`, propToken);
    if (logs.status !== 200) throw new Error(`Status ${logs.status}`);
    const auditData = logs.data.data || logs.data;
    const rLogs = auditData.filter((l: any) => l.action === "RAPPORT_GROUPE_GENERATE");
    if (!rLogs.length) throw new Error("Aucun audit log RAPPORT_GROUPE_GENERATE");
    return `${rLogs.length} log(s)`;
  })();

  // 12. Audit logs — PROPRIETAIRE only
  await test("12. Audit logs — PROPRIETAIRE only", async () => {
    // Login as gestionnaire
    const gestEmail = process.env.SEED_GESTIONNAIRE_EMAIL || "gestionnaire@lefiduciaire.tn";
    const gestPwd = process.env.SEED_GESTIONNAIRE_PASSWORD || "ChangezMoi2026!Gest";
    const gestLogin = await post("/auth/login", { email: gestEmail, password: gestPwd });
    if (!gestLogin.data.token) throw new Error("Cannot login as gestionnaire");
    const res = await get(`/payroll/${WS}/audit`, gestLogin.data.token);
    if (res.status !== 403) throw new Error(`Attendu 403, reçu ${res.status}`);
    return "403 correct pour gestionnaire";
  })();

  // 13. isComplementary field on period
  await test("13. isComplementary field vérifié", async () => {
    const mainPeriod = await get(`/payroll/${WS}/periods/${periodId}`, propToken);
    if (mainPeriod.data.isComplementary !== false) throw new Error(`isComplementary devrait être false, reçu ${mainPeriod.data.isComplementary}`);
    const compPeriod = await prisma.payrollPeriod.findUnique({ where: { id: compPeriodId } });
    if (!compPeriod?.isComplementary) throw new Error("Complémentaire isComplementary ≠ true");
    return `Main=false, Comp=true`;
  })();

  // 14. Audit log detail structure
  await test("14. Audit log — structure détaillée", async () => {
    const logs = await get(`/payroll/${WS}/audit?action=PERIOD_CLOSE`, propToken);
    const auditData = logs.data.data || logs.data;
    const log = auditData[0];
    if (!log.id || !log.workspaceId || !log.userId || !log.action || !log.entity || !log.entityId || !log.createdAt) {
      throw new Error("Champs manquants dans audit log");
    }
    return `id, ws, user, action, entity, entityId, createdAt OK`;
  })();

  // 15. No token → 401 for audit
  await test("15. Accès refusé sans token (audit)", async () => {
    const res = await get(`/payroll/${WS}/audit`);
    if (res.status !== 401) throw new Error(`Attendu 401, reçu ${res.status}`);
    return "401 correct";
  })();

  // === Summary ===
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Phase 8 — Résultats: ${passed} ✅ | ${failed} ❌ sur ${results.length} tests`);
  console.log(`${"=".repeat(60)}\n`);

  if (failed > 0) {
    console.log("Échecs:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }

  // === TEARDOWN ===
  try {
    await prisma.documentStorage.deleteMany({ where: { workspaceId: WS, type: "RAPPORT_GROUPE" } });
    await prisma.auditLog.deleteMany({ where: { workspaceId: WS } });
    // Delete complementary periods
    const cps = await prisma.payrollPeriod.findMany({ where: { workspaceId: WS, clientCompanyId: clientId, isComplementary: true } });
    for (const cp of cps) {
      await prisma.payslip.deleteMany({ where: { periodId: cp.id } });
      await prisma.anomaly.deleteMany({ where: { periodId: cp.id } });
    }
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, isComplementary: true } });
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: testMois, annee: testAnnee } });
    console.log("🧹 Teardown OK");
  } catch (teardownErr) {
    console.error("⚠️ Teardown error!:", teardownErr);
  }

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
