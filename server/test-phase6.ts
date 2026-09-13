#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 6 Integration Tests (Documents)
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
import documentRoutes from "./routes/documents.js";
import { generateBulletinHtml, generatePayrollExcel, generatePayrollCsv } from "./lib/document-generator.js";

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
  if (contentType.includes("text/html") || contentType.includes("text/csv")) {
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

const PORT = 3096;
const WS = "ws-fiduciaire-default";

async function main() {
  // === Start server ===
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/documents", documentRoutes);
  app.get("/api/health", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "error" }); }
  });

  const server = createServer(app);
  await new Promise<void>((r) => server.listen(PORT, () => r()));
  console.log(`\n🧪 Phase 6 Test Server — http://127.0.0.1:${PORT}/\n`);

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
    const c = await post("/clients", { workspaceId: WS, raisonSociale: "Test Docs Corp", matriculeFiscal: "MF-DOCS-001", secteur: "NON_AGRICOLE" }, propToken);
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
        matriculeCnss: "DOCS-001", firstName: "Sami", lastName: "Bouzid",
        baseSalary: 1500, civilStatus: "MARIE", numberOfChildren: 1, isActive: true,
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

  // === Create payroll period + calculate ===
  const testMois = 9, testAnnee = 2026;
  await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: testMois, annee: testAnnee } });

  const periodRes = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: testMois, annee: testAnnee }, propToken);
  const periodId = periodRes.data.id;
  await patch(`/payroll/${WS}/periods/${periodId}/calculate`, {}, propToken);

  const payslipsRes = await get(`/payroll/${WS}/payslips?periodId=${periodId}`, propToken);
  const payslipId = payslipsRes.data?.[0]?.id;

  // ====================================================================
  // TESTS
  // ====================================================================

  // 1. Generate bulletin PDF (HTML)
  let docId: string = "";
  await test("1. Générer bulletin PDF", async () => {
    if (!payslipId) throw new Error("Pas de bulletin");
    const res = await post(`/documents/payslips/${payslipId}/pdf`, { workspaceId: WS }, propToken);
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    docId = res.data.document.id;
    return `${res.data.document.nomFichier}, taille=${res.data.document.tailleOctets}`;
  })();

  // 2. Download bulletin
  await test("2. Télécharger bulletin", async () => {
    if (!payslipId) throw new Error("Pas de bulletin");
    const res = await get(`/documents/payslips/${payslipId}/download?workspaceId=${WS}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (typeof res.data !== "string") throw new Error("Contenu non-texte");
    if (!res.data.includes("BULLETIN DE PAIE")) throw new Error("HTML incomplet");
    return `HTML reçu, ${res.data.length} chars`;
  })();

  // 3. Re-generate → idempotent (200)
  await test("3. Re-générer → déjà existant", async () => {
    if (!payslipId) throw new Error("Pas de bulletin");
    const res = await post(`/documents/payslips/${payslipId}/pdf`, { workspaceId: WS }, propToken);
    if (res.status !== 200) throw new Error(`Attendu 200, reçu ${res.status}`);
    return "Idempotent 200 OK";
  })();

  // 4. Export Excel
  await test("4. Export Excel période", async () => {
    const res = await post(`/documents/periods/${periodId}/excel`, { workspaceId: WS }, propToken);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    return `Excel: ${res.data.document.nomFichier}`;
  })();

  // 5. Export CSV
  await test("5. Export CSV période", async () => {
    const res = await post(`/documents/periods/${periodId}/csv`, { workspaceId: WS }, propToken);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    return `CSV: ${res.data.document.nomFichier}`;
  })();

  // 6. List documents
  await test("6. Lister documents workspace", async () => {
    const res = await get(`/documents/${WS}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    return `${res.data.length} document(s)`;
  })();

  // 7. Filter by type BULLETIN_PDF
  await test("7. Filtrer par type BULLETIN_PDF", async () => {
    const res = await get(`/documents/${WS}?type=BULLETIN_PDF`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const allPdf = res.data.every((d: any) => d.type === "BULLETIN_PDF");
    if (!allPdf) throw new Error("Types mélangés");
    return `${res.data.length} bulletin(s)`;
  })();

  // 8. Detail document
  await test("8. Détail document", async () => {
    if (!docId) throw new Error("Pas de document");
    const res = await get(`/documents/${WS}/${docId}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    return `${res.data.nomFichier}, type=${res.data.type}`;
  })();

  // 9. Bulletin HTML — mandatory mentions check
  await test("9. Bulletin HTML — mentions obligatoires", async () => {
    if (!payslipsRes.data?.[0]) throw new Error("Pas de bulletin");
    const p = payslipsRes.data[0];
    const client = await prisma.clientCompany.findUnique({ where: { id: clientId } });
    const html = generateBulletinHtml(p, { raisonSociale: client!.raisonSociale, matriculeFiscal: client!.matriculeFiscal, matriculeCnss: client!.matriculeCnss });
    const required = ["BULLETIN DE PAIE", client!.raisonSociale, p.matricule, p.nomPrenom, "SALAIRE NET", "CNSS", "IRPP"];
    for (const m of required) {
      if (!html.includes(m)) throw new Error(`Mention "${m}" absente`);
    }
    return `Toutes ${required.length} mentions présentes`;
  })();

  // 10. Export Excel — buffer non-empty
  await test("10. Export Excel — buffer non-vide", async () => {
    const buffer = generatePayrollExcel(payslipsRes.data, "9/2026");
    if (buffer.length === 0) throw new Error("Buffer vide");
    return `${buffer.length} octets`;
  })();

  // 11. Export CSV — structured content
  await test("11. Export CSV — lignes structurées", async () => {
    const csv = generatePayrollCsv(payslipsRes.data);
    const lines = csv.split("\n");
    if (lines.length < 2) throw new Error("CSV trop court");
    const headers = lines[0].split(";");
    if (!headers.includes("Matricule")) throw new Error("Colonne Matricule absente");
    if (!headers.includes("Net à payer")) throw new Error("Colonne Net à payer absente");
    return `${lines.length} lignes, ${headers.length} colonnes`;
  })();

  // 12. No token → 401
  await test("12. Accès refusé sans token", async () => {
    const res = await get(`/documents/${WS}`);
    if (res.status !== 401) throw new Error(`Attendu 401, reçu ${res.status}`);
    return "401 correct";
  })();

  // 13. Download non-existent bulletin → 404
  await test("13. Bulletin non généré → 404", async () => {
    const res = await get(`/documents/payslips/cl_fake_000/download?workspaceId=${WS}`, propToken);
    if (res.status !== 404) throw new Error(`Attendu 404, reçu ${res.status}`);
    return "404 correct";
  })();

  // === Summary ===
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Phase 6 — Résultats: ${passed} ✅ | ${failed} ❌ sur ${results.length} tests`);
  console.log(`${"=".repeat(60)}\n`);

  if (failed > 0) {
    console.log("Échecs:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }

  // Cleanup
  await prisma.documentStorage.deleteMany({ where: { workspaceId: WS, periodePaieId: periodId } });
  await prisma.payrollPeriod.delete({ where: { id: periodId } });

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
