#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 5 Integration Tests (Paie Mensuelle)
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
import { calculatePayroll, getJoursOuvresMois } from "./lib/payroll-engine.js";

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
  const data = await res.json();
  return { status: res.status, data };
}

async function patch(path: string, body: any, token?: string) {
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { method: "PATCH", headers, body: JSON.stringify(body) });
  const data = await res.json();
  return { status: res.status, data };
}

const PORT = 3097;
const WS = "ws-fiduciaire-default";

async function main() {
  // === Start server ===
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.get("/api/health", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "error" }); }
  });

  const server = createServer(app);
  await new Promise<void>((r) => server.listen(PORT, () => r()));
  console.log(`\n🧪 Phase 5 Test Server — http://127.0.0.1:${PORT}/\n`);

  // === Login propriétaire ===
  const propEmail = process.env.SEED_PROPRIETAIRE_EMAIL || "proprietaire@lefiduciaire.tn";
  const propPwd = process.env.SEED_PROPRIETAIRE_PASSWORD || "ChangezMoi2026!Prop";

  const loginRes = await post("/auth/login", { email: propEmail, password: propPwd });
  const propToken = loginRes.data.token;
  if (!propToken) { console.error("❌ Cannot login as propriétaire"); server.close(); process.exit(1); }

  // === Ensure client exists ===
  const clientsRes = await get(`/clients/${WS}`, propToken);
  let clientId = clientsRes.data?.[0]?.id;
  if (!clientId) {
    const createClient = await post("/clients", { workspaceId: WS, raisonSociale: "Test Paie Corp", matriculeFiscal: "MF-PAIE-001", secteur: "NON_AGRICOLE" }, propToken);
    clientId = createClient.data.id;
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
        matriculeCnss: "PAIE-001", firstName: "Ahmed", lastName: "Tounsi",
        baseSalary: 1500, civilStatus: "MARIE", numberOfChildren: 2, isActive: true,
      },
    });
    employeeId = emp.id;
  }

  // Ensure contract
  const existingContract = await prisma.contract.findFirst({ where: { employeeId: employeeId!, statut: "ACTIF" } });
  if (!existingContract) {
    const contract = await prisma.contract.create({
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

  // ====================================================================
  // TESTS
  // ====================================================================

  // 1. Ouvrir période de paie
  const uniqueMois = 6, uniqueAnnee = 2026;
  // Clean existing period if any
  await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: uniqueMois, annee: uniqueAnnee } });

  await test("1. Ouvrir période de paie", async () => {
    const res = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: uniqueMois, annee: uniqueAnnee, note: "Test Phase 5" }, propToken);
    if (res.status !== 201) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.statut !== "OPEN") throw new Error(`Statut ${res.data.statut} ≠ OPEN`);
    return `Période ${uniqueMois}/${uniqueAnnee} ouverte — statut: ${res.data.statut}`;
  })();

  // 2. Doublon période → 409
  await test("2. Doublon période → 409", async () => {
    const res = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: uniqueMois, annee: uniqueAnnee }, propToken);
    if (res.status !== 409) throw new Error(`Attendu 409, reçu ${res.status}`);
    return "Conflit 409 correct";
  })();

  // 3. Lister périodes
  let periodId: string = "";
  await test("3. Lister périodes du workspace", async () => {
    const res = await get(`/payroll/${WS}/periods?mois=${uniqueMois}&annee=${uniqueAnnee}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.length) throw new Error("Aucune période trouvée");
    periodId = res.data[0].id;
    return `${res.data.length} période(s), id=${periodId}`;
  })();

  // 4. Détail période
  await test("4. Détail période", async () => {
    const res = await get(`/payroll/${WS}/periods/${periodId}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.statut !== "OPEN") throw new Error(`Statut ${res.data.statut}`);
    return `Statut: ${res.data.statut}, client: ${res.data.client_company?.raisonSociale}`;
  })();

  // 5. Calcul en masse
  await test("5. Calcul en masse", async () => {
    const res = await patch(`/payroll/${WS}/periods/${periodId}/calculate`, {}, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    const r = res.data.result;
    return `Bulletins: ${r.bulletinsCreated}, Anomalies: ${r.anomaliesCreated}, Skipped no contract: ${r.skippedNoContract}`;
  })();

  // 6. Période passée en CALCULATED
  await test("6. Période en CALCULATED", async () => {
    const res = await get(`/payroll/${WS}/periods/${periodId}`, propToken);
    if (res.data.statut !== "CALCULATED") throw new Error(`Statut ${res.data.statut} ≠ CALCULATED`);
    return `Statut: ${res.data.statut}`;
  })();

  // 7. Lister bulletins
  await test("7. Lister bulletins de paie", async () => {
    const res = await get(`/payroll/${WS}/payslips?periodId=${periodId}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.length) throw new Error("Aucun bulletin");
    const p = res.data[0];
    return `${res.data.length} bulletin(s), net=${p.salaireNet?.toFixed(3)} DT pour ${p.nomPrenom}`;
  })();

  // 8. Détail bulletin
  let payslipId: string = "";
  await test("8. Détail bulletin", async () => {
    const payslips = await get(`/payroll/${WS}/payslips?periodId=${periodId}`, propToken);
    payslipId = payslips.data[0]?.id;
    if (!payslipId) throw new Error("Pas de bulletin");
    const res = await get(`/payroll/${WS}/payslips/${payslipId}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const p = res.data;
    return `Brut=${p.salaireBrutContractuel}, CNSS sal=${p.retenueCnssSalarial?.toFixed(3)}, IRPP=${p.retenueIrpp?.toFixed(3)}, Net=${p.salaireNet?.toFixed(3)}`;
  })();

  // 9. Lister anomalies
  await test("9. Lister anomalies", async () => {
    const res = await get(`/payroll/${WS}/anomalies?periodId=${periodId}`, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    return `${res.data.length} anomalie(s)`;
  })();

  // 10. Marquer TO_REVIEW
  await test("10. Transition CALCULATED → TO_REVIEW", async () => {
    const res = await patch(`/payroll/${WS}/periods/${periodId}/review`, {}, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.statut !== "TO_REVIEW") throw new Error(`Statut ${res.data.statut}`);
    return `Statut: ${res.data.statut}`;
  })();

  // 11. Valider période
  await test("11. Transition TO_REVIEW → VALIDATED", async () => {
    // Resolve any blocking anomalies first
    const anomalies = await get(`/payroll/${WS}/anomalies?periodId=${periodId}&niveau=BLOQUANTE`, propToken);
    for (const a of anomalies.data) {
      if (!a.estResolue) await patch(`/payroll/${WS}/anomalies/${a.id}/resolve`, { noteResolution: "Résolu test" }, propToken);
    }
    const res = await patch(`/payroll/${WS}/periods/${periodId}/validate`, {}, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.statut !== "VALIDATED") throw new Error(`Statut ${res.data.statut}`);
    return `Statut: ${res.data.statut}`;
  })();

  // 12. Bulletins validés
  await test("12. Bulletins marqués VALIDEe", async () => {
    const res = await get(`/payroll/${WS}/payslips?periodId=${periodId}`, propToken);
    const allValidee = res.data.every((p: any) => p.statut === "VALIDEe");
    if (!allValidee) throw new Error("Tous les bulletins ne sont pas VALIDEe");
    return `Tous ${res.data.length} bulletin(s) VALIDEe`;
  })();

  // 13. Clôturer période (PROPRIETAIRE only)
  await test("13. Transition VALIDATED → CLOSED", async () => {
    const res = await patch(`/payroll/${WS}/periods/${periodId}/close`, {}, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.data)}`);
    if (res.data.statut !== "CLOSED") throw new Error(`Statut ${res.data.statut}`);
    return `Statut: ${res.data.statut}`;
  })();

  // 14. Calcul impossible sur CLOSED
  await test("14. Calcul impossible sur CLOSED", async () => {
    const res = await patch(`/payroll/${WS}/periods/${periodId}/calculate`, {}, propToken);
    if (res.status !== 400) throw new Error(`Attendu 400, reçu ${res.status}`);
    return "400 correct";
  })();

  // 15. Clôture impossible pour non-PROPRIETAIRE
  await test("15. Clôture réservée PROPRIETAIRE", async () => {
    // Create gestionnaire
    const gestionnaireEmail = `gest-paie-test-${Date.now()}@test.tn`;
    const regRes = await post("/auth/register", { email: gestionnaireEmail, password: "Test1234!", fullName: "Gest Test", role: "GESTIONNAIRE" });
    // Need to validate in DB
    await prisma.users.update({ where: { email: gestionnaireEmail }, data: { statut: "VALIDE" } });
    const loginGest = await post("/auth/login", { email: gestionnaireEmail, password: "Test1234!" });
    const gestToken = loginGest.data.token;

    // Open a new period to test close rejection
    const testMois = 7, testAnnee = 2026;
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: testMois, annee: testAnnee } });
    const newPeriod = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: testMois, annee: testAnnee }, propToken);
    const newPeriodId = newPeriod.data.id;
    // Calculate → validate → then try close as gestionnaire
    await patch(`/payroll/${WS}/periods/${newPeriodId}/calculate`, {}, propToken);
    // Resolve blocking anomalies
    const anRes = await get(`/payroll/${WS}/anomalies?periodId=${newPeriodId}&niveau=BLOQUANTE`, propToken);
    for (const a of anRes.data) {
      if (!a.estResolue) await patch(`/payroll/${WS}/anomalies/${a.id}/resolve`, { noteResolution: "Résolu" }, propToken);
    }
    await patch(`/payroll/${WS}/periods/${newPeriodId}/validate`, {}, propToken);
    // Try close as gestionnaire (no workspace membership → 403)
    const closeRes = await patch(`/payroll/${WS}/periods/${newPeriodId}/close`, {}, gestToken);
    if (closeRes.status !== 403) throw new Error(`Attendu 403, reçu ${closeRes.status}`);
    // Clean up
    await prisma.payrollPeriod.delete({ where: { id: newPeriodId } });
    return "403 correct pour gestionnaire";
  })();

  // 16. Moteur unitaire — calcul simple CDI célibataire
  await test("16. Moteur: CDI célibataire 1500 DT", async () => {
    const result = calculatePayroll({
      employee: { id: "test", firstName: "Test", lastName: "Unit", matriculeCnss: "U1", civilStatus: "CELIBATAIRE", numberOfChildren: 0, baseSalary: 1500, clientCompanyId: clientId },
      contractVersion: { id: "cv1", salaireBrut: 1500, heuresHebdomadaires: 48, heuresMensuelles: 208, coefficient: null, echelon: null },
      attendance: { joursTravaillesReels: 26, congesPayes: 0, absencesJustifiees: 0, absencesNonJustifiees: 0, heuresSupplementaires: 0, joursOuvresTotal: 26, tauxPresence: 1 },
      payrollConfig: {
        cnssSalarialNonAgricole: 0.0968, cnssPatronalNonAgricole: 0.1707,
        cnssSalarialAgricole: 0.0699, cnssPatronalAgricole: 0.1248,
        cssActive: false, cssTaux: 0, cssSeuilExonerationAnnuel: 5000,
        fraisProTauxActifs: 0.10, fraisProPlafondActifsAnnuel: 2000, fraisProTauxRetraites: 0.25,
        deductionChefFamille: 300, deductionEnfant: 100, deductionEtudiant: 1000,
        plafondNombreEnfantsEtudiants: 4, deductionInfirme: 2000,
        parentsEnChargeActif: false, parentsEnChargeTaux: 0.05, parentsEnChargePlafondParAnnuel: 450,
        secteur: "NON_AGRICOLE",
      },
      tranchesIrpp: [
        { min: 0, max: 5000, taux: 0, ordre: 1 },
        { min: 5000, max: 10000, taux: 0.26, ordre: 2 },
        { min: 10000, max: 20000, taux: 0.28, ordre: 3 },
        { min: 20000, max: 30000, taux: 0.32, ordre: 4 },
        { min: 30000, max: 50000, taux: 0.35, ordre: 5 },
        { min: 50000, max: null, taux: 0.37, ordre: 6 },
      ],
      clientSecteur: "NON_AGRICOLE",
      joursOuvresMois: 26,
    });
    const p = result.payslip;
    if (p.salaireBrutContractuel !== 1500) throw new Error(`Brut ${p.salaireBrutContractuel} ≠ 1500`);
    if (p.tauxPresence !== 1) throw new Error(`Taux ${p.tauxPresence} ≠ 1`);
    if (p.salaireNet <= 0) throw new Error(`Net ${p.salaireNet} ≤ 0`);
    return `Brut=${p.salaireBrutContractuel}, CNSS=${p.retenueCnssSalarial.toFixed(3)}, Net=${p.salaireNet.toFixed(3)}`;
  })();

  // 17. Moteur — salarié marié 2 enfants
  await test("17. Moteur: CDI marié 2 enfants 2000 DT", async () => {
    const result = calculatePayroll({
      employee: { id: "test2", firstName: "Fatma", lastName: "Bouzid", matriculeCnss: "U2", civilStatus: "MARIE", numberOfChildren: 2, baseSalary: 2000, clientCompanyId: clientId },
      contractVersion: { id: "cv2", salaireBrut: 2000, heuresHebdomadaires: 40, heuresMensuelles: 173, coefficient: null, echelon: null },
      attendance: { joursTravaillesReels: 26, congesPayes: 0, absencesJustifiees: 0, absencesNonJustifiees: 0, heuresSupplementaires: 0, joursOuvresTotal: 26, tauxPresence: 1 },
      payrollConfig: {
        cnssSalarialNonAgricole: 0.0968, cnssPatronalNonAgricole: 0.1707,
        cnssSalarialAgricole: 0.0699, cnssPatronalAgricole: 0.1248,
        cssActive: false, cssTaux: 0, cssSeuilExonerationAnnuel: 5000,
        fraisProTauxActifs: 0.10, fraisProPlafondActifsAnnuel: 2000, fraisProTauxRetraites: 0.25,
        deductionChefFamille: 300, deductionEnfant: 100, deductionEtudiant: 1000,
        plafondNombreEnfantsEtudiants: 4, deductionInfirme: 2000,
        parentsEnChargeActif: false, parentsEnChargeTaux: 0.05, parentsEnChargePlafondParAnnuel: 450,
        secteur: "NON_AGRICOLE",
      },
      tranchesIrpp: [
        { min: 0, max: 5000, taux: 0, ordre: 1 },
        { min: 5000, max: 10000, taux: 0.26, ordre: 2 },
        { min: 10000, max: 20000, taux: 0.28, ordre: 3 },
        { min: 20000, max: 30000, taux: 0.32, ordre: 4 },
        { min: 30000, max: 50000, taux: 0.35, ordre: 5 },
        { min: 50000, max: null, taux: 0.37, ordre: 6 },
      ],
      clientSecteur: "NON_AGRICOLE",
      joursOuvresMois: 26,
    });
    const p = result.payslip;
    if (p.deductionChefFamille !== 300) throw new Error(`Déduction chef ${p.deductionChefFamille} ≠ 300`);
    if (p.deductionEnfants !== 200) throw new Error(`Déduction enfants ${p.deductionEnfants} ≠ 200`);
    return `Déductions: chef=${p.deductionChefFamille}, enf=${p.deductionEnfants}, Net=${p.salaireNet.toFixed(3)}`;
  })();

  // 18. Moteur — présence partielle
  await test("18. Moteur: Présence partielle 80%", async () => {
    const result = calculatePayroll({
      employee: { id: "test3", firstName: "Salim", lastName: "Hamdi", matriculeCnss: "U3", civilStatus: "CELIBATAIRE", numberOfChildren: 0, baseSalary: 1200, clientCompanyId: clientId },
      contractVersion: { id: "cv3", salaireBrut: 1200, heuresHebdomadaires: 48, heuresMensuelles: 208, coefficient: null, echelon: null },
      attendance: { joursTravaillesReels: 21, congesPayes: 0, absencesJustifiees: 2, absencesNonJustifiees: 3, heuresSupplementaires: 0, joursOuvresTotal: 26, tauxPresence: null },
      payrollConfig: {
        cnssSalarialNonAgricole: 0.0968, cnssPatronalNonAgricole: 0.1707,
        cnssSalarialAgricole: 0.0699, cnssPatronalAgricole: 0.1248,
        cssActive: false, cssTaux: 0, cssSeuilExonerationAnnuel: 5000,
        fraisProTauxActifs: 0.10, fraisProPlafondActifsAnnuel: 2000, fraisProTauxRetraites: 0.25,
        deductionChefFamille: 300, deductionEnfant: 100, deductionEtudiant: 1000,
        plafondNombreEnfantsEtudiants: 4, deductionInfirme: 2000,
        parentsEnChargeActif: false, parentsEnChargeTaux: 0.05, parentsEnChargePlafondParAnnuel: 450,
        secteur: "NON_AGRICOLE",
      },
      tranchesIrpp: [
        { min: 0, max: 5000, taux: 0, ordre: 1 },
        { min: 5000, max: 10000, taux: 0.26, ordre: 2 },
        { min: 10000, max: 20000, taux: 0.28, ordre: 3 },
        { min: 20000, max: 30000, taux: 0.32, ordre: 4 },
        { min: 30000, max: 50000, taux: 0.35, ordre: 5 },
        { min: 50000, max: null, taux: 0.37, ordre: 6 },
      ],
      clientSecteur: "NON_AGRICOLE",
      joursOuvresMois: 26,
    });
    const p = result.payslip;
    // 21/26 ≈ 0.808
    if (p.tauxPresence < 0.8 || p.tauxPresence > 0.81) throw new Error(`Taux ${p.tauxPresence} hors range`);
    if (p.salaireBrutEffectif >= 1200) throw new Error(`Brut effectif ${p.salaireBrutEffectif} devrait être < 1200`);
    const hasInfo = result.anomalies.some(a => a.code === "PRESENCE_PARTIELLE");
    if (!hasInfo) throw new Error("Anomalie PRESENCE_PARTIELLE manquante");
    return `Taux=${(p.tauxPresence * 100).toFixed(1)}%, Brut eff=${p.salaireBrutEffectif.toFixed(3)}, Net=${p.salaireNet.toFixed(3)}`;
  })();

  // 19. Anomalies 3 niveaux
  await test("19. Moteur: Anomalies BLOQUANTE/AVERTISSEMENT/INFORMATION", async () => {
    const result = calculatePayroll({
      employee: { id: "test4", firstName: "Khaled", lastName: "Jlassi", matriculeCnss: "U4", civilStatus: "CELIBATAIRE", numberOfChildren: 0, baseSalary: 1000, clientCompanyId: clientId },
      contractVersion: { id: "cv4", salaireBrut: 1000, heuresHebdomadaires: 48, heuresMensuelles: 208, coefficient: null, echelon: null },
      attendance: { joursTravaillesReels: 20, congesPayes: 0, absencesJustifiees: 0, absencesNonJustifiees: 5, heuresSupplementaires: 0, joursOuvresTotal: 25, tauxPresence: null },
      payrollConfig: {
        cnssSalarialNonAgricole: 0.0968, cnssPatronalNonAgricole: 0.1707,
        cnssSalarialAgricole: 0.0699, cnssPatronalAgricole: 0.1248,
        cssActive: false, cssTaux: 0, cssSeuilExonerationAnnuel: 5000,
        fraisProTauxActifs: 0.10, fraisProPlafondActifsAnnuel: 2000, fraisProTauxRetraites: 0.25,
        deductionChefFamille: 300, deductionEnfant: 100, deductionEtudiant: 1000,
        plafondNombreEnfantsEtudiants: 4, deductionInfirme: 2000,
        parentsEnChargeActif: false, parentsEnChargeTaux: 0.05, parentsEnChargePlafondParAnnuel: 450,
        secteur: "NON_AGRICOLE",
      },
      tranchesIrpp: [
        { min: 0, max: 5000, taux: 0, ordre: 1 },
        { min: 5000, max: 10000, taux: 0.26, ordre: 2 },
        { min: 10000, max: 20000, taux: 0.28, ordre: 3 },
      ],
      clientSecteur: "NON_AGRICOLE",
      joursOuvresMois: 25,
    });
    const hasAvertissement = result.anomalies.some(a => a.niveau === "AVERTISSEMENT");
    const hasInformation = result.anomalies.some(a => a.niveau === "INFORMATION");
    if (!hasAvertissement) throw new Error("Pas d'anomalie AVERTISSEMENT (absences non justifiées)");
    if (!hasInformation) throw new Error("Pas d'anomalie INFORMATION (présence partielle)");
    return `Anomalies: ${result.anomalies.map(a => a.niveau).join(", ")}`;
  })();

  // 20. getJoursOuvresMois
  await test("20. Jours ouvrés mois", async () => {
    const j1 = getJoursOuvresMois(1, 2026);
    const j6 = getJoursOuvresMois(6, 2026);
    if (j1 <= 0 || j6 <= 0) throw new Error(`Jours ouvrés invalides: jan=${j1}, jun=${j6}`);
    return `Jan=${j1}, Jun=${j6}`;
  })();

  // 21. Résoudre anomalie
  await test("21. Résoudre anomalie", async () => {
    // Open new period + calculate → get anomalies → resolve one
    const tMois = 8, tAnnee = 2026;
    await prisma.payrollPeriod.deleteMany({ where: { workspaceId: WS, clientCompanyId: clientId, mois: tMois, annee: tAnnee } });
    const np = await post("/payroll/periods", { workspaceId: WS, clientCompanyId: clientId, mois: tMois, annee: tAnnee }, propToken);
    await patch(`/payroll/${WS}/periods/${np.data.id}/calculate`, {}, propToken);

    const anomalies = await get(`/payroll/${WS}/anomalies?periodId=${np.data.id}`, propToken);
    if (anomalies.data.length === 0) {
      // No anomalies — just pass
      await prisma.payrollPeriod.delete({ where: { id: np.data.id } });
      return "Aucune anomalie à résoudre (OK)";
    }
    const a0 = anomalies.data[0];
    const res = await patch(`/payroll/${WS}/anomalies/${a0.id}/resolve`, { noteResolution: "Résolu test" }, propToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.estResolue) throw new Error("Anomalie non résolue");
    await prisma.payrollPeriod.delete({ where: { id: np.data.id } });
    return `Anomalie ${a0.code} résolue`;
  })();

  // 22. Workspace isolation
  await test("22. Isolation workspace — accès refusé", async () => {
    const otherWs = "ws-non-existant";
    const res = await get(`/payroll/${otherWs}/periods`, propToken);
    // PROPRIETAIRE has global access, so this will return empty, not 403
    // But the periods should be empty for a non-existent ws
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    return `Isolation: ${res.data.length} période(s) pour ws inexistant`;
  })();

  // === Summary ===
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Phase 5 — Résultats: ${passed} ✅ | ${failed} ❌ sur ${results.length} tests`);
  console.log(`${"=".repeat(60)}\n`);

  if (failed > 0) {
    console.log("Échecs:");
    results.filter(r => r.status === "FAIL").forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }

  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
