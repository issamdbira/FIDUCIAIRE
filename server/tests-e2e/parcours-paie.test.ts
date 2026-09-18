// =============================================================================
// Le Fiduciaire — Test E2E RÉEL du parcours métier complet (Lot 6)
// =============================================================================
// Ce fichier répond à l'injonction du plan de correction : « Ajouter des
// tests E2E réels (base dédiée, pas de mock Prisma) couvrant salarié →
// contrat → pointage → calcul → validation → clôture → bulletin → CNSS ».
//
// ⚠️ Il n'est PAS exécuté par `npx vitest run` (suite unitaire, Prisma mocké).
// Il requiert une VRAIE base PostgreSQL :
//   DATABASE_URL=postgresql://... npx vitest run --config vitest.e2e.config.ts
//
// Régressions couvertes (issues de la réévaluation réelle) :
//   P0-1  — le sélecteur employé du formulaire contrat alimenté par
//           GET /api/employees/:ws?activeOnly=true (l'ancien code lisait
//           client.employees, jamais renvoyé par /clients/:ws)
//   P0-2  — l'audit ATTENDANCE_IMPORT porte un entityId (plus de NULL)
//   P0-3  — génération du fichier CNSS ne doit plus 500 (stockage /tmp + base)
//   P1-4  — la clôture fonctionne avec le rôle WORKSPACE (l'utilisateur de
//           test a un rôle global GESTIONNAIRE mais PROPRIETAIRE dans l'espace)
//   P1-7  — le bulletin reste téléchargeable via contenuBase64 en base
// =============================================================================

import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

// Le serveur réel (Express + Prisma réel — AUCUN mock)
process.env.PORT = "0"; // port aléatoire : pas de conflit
process.env.NODE_ENV = process.env.NODE_ENV || "test";
const { createApp } = await import("../index.js");
const app = createApp();

const prisma = new PrismaClient();

// ── Données du banc de test (préfixe E2E, supprimées en afterAll) ─────────
const WS_NAME = "E2E Parcours SARL";
const EMAIL = "e2e-parcours@test.tn";
const PASSWORD = "E2E-Parcours-2026!";
const MATRICULE = "E2E-900001";

let workspaceId = "";
let cookie = "";
let company: { id: string } | null = null;
let employeeId = "";
let contractId = "";
let importId = "";
let periodId = "";
let payslipId = "";
let octobreId = "";

// NB : PAS async — on renvoie le Test supertest (thenable) pour pouvoir
// enchaîner .send()/.field()/.attach() avant l'await.
function authed(method: "get" | "post" | "patch" | "put", path: string) {
  return request(app)[method](path).set("Cookie", cookie).set("Accept", "application/json");
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith("postgres")) {
    throw new Error("DATABASE_URL requis (base PostgreSQL réelle) pour les tests E2E");
  }

  // ── Nettoyage idempotent d'un éventuel précédent run ────────────────────
  const oldUser = await prisma.users.findUnique({ where: { email: EMAIL } });
  if (oldUser) {
    await prisma.session.deleteMany({ where: { userId: oldUser.id } });
    await prisma.workspace_members.deleteMany({ where: { userId: oldUser.id } });
    await prisma.users.delete({ where: { id: oldUser.id } });
  }
  const oldWs = await prisma.workspaces.findFirst({ where: { name: WS_NAME } });
  if (oldWs) {
    await prisma.workspaces.delete({ where: { id: oldWs.id } }); // cascade config/règles
  }

  // ── Espace ENTREPRISE + utilisateur (rôle GLOBAL GESTIONNAIRE, rôle
  //    workspace PROPRIETAIRE — c'est exactement le cas qui déclenchait le
  //    403 de clôture P1-4 quand la route vérifiait req.user.role) ─────────
  const ws = await prisma.workspaces.create({
    data: { name: WS_NAME, type: "ENTREPRISE", matriculeCnss: "E2E-PARC-1" },
  });
  workspaceId = ws.id;
  const user = await prisma.users.create({
    data: {
      email: EMAIL,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      fullName: "E2E Parcours",
      statut: "VALIDE",
      role: "GESTIONNAIRE", // rôle global ≠ rôle workspace (régression P1-4)
    },
  });
  await prisma.workspace_members.create({
    data: { userId: user.id, workspaceId, role: "PROPRIETAIRE" },
  });
  await prisma.payrollConfig.create({
    data: {
      workspaceId,
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
}, 120_000);

afterAll(async () => {
  // ── Nettoyage complet du banc (ordre FK-safe) ───────────────────────────
  if (workspaceId) {
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
    await prisma.contract.deleteMany({ where: { workspaceId } }); // versions en cascade
    await prisma.employees.deleteMany({ where: { workspaceId } });
    if (company) await prisma.establishment.deleteMany({ where: { clientCompanyId: company.id } });
    await prisma.clientCompany.deleteMany({ where: { workspaceId } });
    await prisma.payrollConfig.deleteMany({ where: { workspaceId } });
    await prisma.auditLog.deleteMany({ where: { workspaceId } });
    await prisma.workspaces.delete({ where: { id: workspaceId } });
  }
  const u = await prisma.users.findUnique({ where: { email: EMAIL } });
  if (u) {
    await prisma.session.deleteMany({ where: { userId: u.id } });
    await prisma.workspace_members.deleteMany({ where: { userId: u.id } });
    await prisma.users.delete({ where: { id: u.id } });
  }
  await prisma.$disconnect();
}, 120_000);

// ─────────────────────────────────────────────────────────────────────────────

describe("Parcours métier E2E — Entreprise (réel, sans mock)", () => {

  test("1. Login propriétaire d'espace", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"] as string[];
    expect(setCookie?.some((c) => c.startsWith("fiduciaire_session="))).toBe(true);
    cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  });

  test("2. Création de l'entreprise (société)", async () => {
    const res = await authed("post", "/api/clients").send({
      workspaceId,
      raisonSociale: WS_NAME,
      matriculeFiscal: "E2E-MF-1",
      matriculeCnss: "E2E-CNSS-1",
      secteur: "NON_AGRICOLE",
    });
    expect(res.status).toBe(201);
    company = { id: res.body.company.id };
  });

  test("3. Création d'un salarié", async () => {
    const res = await authed("post", "/api/employees").send({
      workspaceId,
      clientCompanyId: company!.id,
      matriculeCnss: MATRICULE,
      firstName: "Ali",
      lastName: "BenE2E",
      baseSalary: 1500,
      civilStatus: "CELIBATAIRE",
      numberOfChildren: 0,
      hiredAt: "2026-01-05",
    });
    expect(res.status).toBe(201);
    employeeId = res.body.id;
  });

  // ── RÉGRESSION P0-1 : l'API que le formulaire contrat appelle désormais ──
  test("4. [P0-1] La liste salariés activeOnly alimente le sélecteur contrat", async () => {
    const res = await authed("get", `/api/employees/${workspaceId}?activeOnly=true`);
    expect(res.status).toBe(200);
    const list = res.body as Array<{ id: string; firstName: string; lastName: string; matriculeCnss?: string }>;
    const found = list.find((e) => e.id === employeeId);
    expect(found).toBeDefined();
    expect(found!.firstName).toBe("Ali");
    expect(found!.lastName).toBe("BenE2E");
    expect(found!.matriculeCnss).toBe(MATRICULE);
  });

  test("5. [P0-1] Création du contrat via les vraies routes (impasse d'origine)", async () => {
    const res = await authed("post", "/api/contracts").send({
      workspaceId,
      employeeId,
      type: "CDI",
      poste: "Comptable",
      dateDebut: "2026-01-05",
      salaireBrut: 1500,
      heuresHebdomadaires: 48,
      heuresMensuelles: 208,
    });
    expect(res.status).toBe(201);
    contractId = res.body.contract.id;
    expect(res.body.version.salaireBrut).toBe(1500);
  });

  test("6. Import du pointage (fichier XLSX réel via multipart)", async () => {
    // Fichier Excel construit comme un vrai export client
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Matricule", "Nom & Prénom", "Jours travaillés réels", "Congés payés", "Absences justifiées", "Absences non justifiées", "Heures supplémentaires"],
      [MATRICULE, "Ali BenE2E", 22, 0, 0, 0, 8],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Pointage");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const res = await request(app)
      .post("/api/attendance/import")
      .set("Cookie", cookie)
      .field("workspaceId", workspaceId)
      .field("clientCompanyId", company!.id)
      .field("mois", "9")
      .field("annee", "2026")
      .attach("file", buffer, "pointage-septembre.xlsx");

    expect(res.status).toBe(201);
    importId = res.body.import.id;
    expect(res.body.summariesCreated).toBe(1);
    expect(res.body.variablesCreated).toBeGreaterThanOrEqual(0);
  });

  // ── Exigence TPE : saisie manuelle (sans fichier) — Lot 6 ────────────────
  test("6b. Saisie manuelle du pointage (mois suivant, sans fichier)", async () => {
    const res = await authed("post", `/api/attendance/${workspaceId}/manual`).send({
      clientCompanyId: company!.id,
      mois: 10,
      annee: 2026,
      lignes: [
        {
          matricule: MATRICULE,
          nomPrenom: "Ali BenE2E",
          joursTravaillesReels: 21,
          congesPayes: 1,
          absencesJustifiees: 0,
          absencesNonJustifiees: 0,
          heuresSupplementaires: 4,
        },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.import.statut).toBe("VALIDE");
    expect(res.body.import.nomFichier).toBe("saisie-manuelle");
    expect(res.body.summariesCreated).toBe(1);
    expect(res.body.message).toContain("1 ligne");

    // P1-6 (réévaluation) : 21 jours réels + 1 congé payé = 22 jours
    // rémunérés sur 22 comptés → taux de présence 100%. Les congés payés
    // sont RÉMUNÉRÉS (règle tunisienne) — l'ancienne formule renvoyait
    // 21/22 = 95.45% et amputait le salaire.
    const summaries = await authed("get", `/api/attendance/${workspaceId}/summaries/${res.body.import.id}`);
    expect(summaries.status).toBe(200);
    expect((summaries.body as Array<{ tauxPresence: number }>).length).toBe(1);
    expect((summaries.body as Array<{ tauxPresence: number }>)[0].tauxPresence).toBe(1);
  });

  test("6c. Saisie manuelle idempotente — remplace la précédente (même période)", async () => {
    const res = await authed("post", `/api/attendance/${workspaceId}/manual`).send({
      clientCompanyId: company!.id,
      mois: 10,
      annee: 2026,
      lignes: [
        {
          matricule: MATRICULE,
          nomPrenom: "Ali BenE2E",
          joursTravaillesReels: 22,
          congesPayes: 0,
          absencesJustifiees: 0,
          absencesNonJustifiees: 0,
          heuresSupplementaires: 0,
        },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.summariesCreated).toBe(1);

    // Une SEULE saisie manuelle pour octobre subsiste (l'ancienne partie en cascade)
    const list = await authed("get", `/api/attendance/${workspaceId}/imports`);
    expect(list.status).toBe(200);
    const manuelsOctobre = (list.body as Array<{ nomFichier: string; mois: number }>)
      .filter((i) => i.nomFichier === "saisie-manuelle" && i.mois === 10);
    expect(manuelsOctobre.length).toBe(1);
  });

  test("7. Ouverture de la période de paie", async () => {
    const res = await authed("post", "/api/payroll/periods").send({
      workspaceId,
      clientCompanyId: company!.id,
      mois: 9,
      annee: 2026,
    });
    expect(res.status).toBe(201);
    periodId = res.body.id;
  });

  test("8. Calcul de la paie — le résultat métier est vérifié (P1-1)", async () => {
    const res = await authed("patch", `/api/payroll/${workspaceId}/periods/${periodId}/calculate`);
    expect(res.status).toBe(200);
    // Le moteur doit réellement produire un bulletin — c'est ce que le toast
    // vérifie désormais côté UI (l'ancien faux succès est couvert ici).
    expect(res.body.result.errors).toEqual([]);
    expect(res.body.result.bulletinsCreated).toBe(1);
    expect(res.body.result.anomaliesCreated).toBe(0);
  });

  test("9. Validation de la période", async () => {
    const res = await authed("patch", `/api/payroll/${workspaceId}/periods/${periodId}/validate`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("VALIDATED");
  });

  // ── RÉGRESSION P1-4 : rôle global GESTIONNAIRE + workspace PROPRIETAIRE ──
  test("10. [P1-4] Clôture autorisée par le rôle workspace (plus de 403)", async () => {
    const res = await authed("patch", `/api/payroll/${workspaceId}/periods/${periodId}/close`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("CLOSED");
  });

  test("11. Le bulletin existe et est cohérent", async () => {
    const res = await authed("get", `/api/payroll/${workspaceId}/payslips?periodId=${periodId}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    payslipId = res.body[0].id;
    expect(res.body[0].salaireBrutEffectif).toBeGreaterThan(0);
    expect(res.body[0].salaireNet).toBeGreaterThan(0);
    expect(res.body[0].heuresSupplementaires).toBe(8);
  });

  test("12. [P1-7] Génération + téléchargement du bulletin (contenu en base)", async () => {
    const gen = await authed("post", `/api/documents/payslips/${payslipId}/pdf`).send({ workspaceId });
    expect(gen.status).toBe(201);
    // Le contenu est stocké durablement en base (colonne contenuBase64)
    expect(gen.body.document.contenuBase64).toBeTruthy();

    const dl = await authed("get", `/api/documents/payslips/${payslipId}/download?workspaceId=${workspaceId}`);
    expect(dl.status).toBe(200);
    expect(dl.text.length).toBeGreaterThan(500);
  });

  test("13. Déclaration CNSS — création depuis la période clôturée", async () => {
    const res = await authed("post", "/api/cnss/declarations").send({
      workspaceId,
      clientCompanyId: company!.id,
      annee: 2026,
      numeroTrimestre: 3,
    });
    expect(res.status).toBe(201);
    expect(res.body.declaration.nombreSalaries).toBe(1);
  });

  test("14. Contrôle de la déclaration", async () => {
    // récupérer l'id (la création répond la déclaration complète)
    const list = await authed("get", `/api/cnss/${workspaceId}/declarations`);
    const decl = (list.body as Array<{ id: string; statut: string }>).find((d) => d.statut === "BROUILLON");
    expect(decl).toBeDefined();
    const res = await authed("patch", `/api/cnss/${workspaceId}/declarations/${decl!.id}/controler`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe("CONTROLEE");
  });

  // ── RÉGRESSION P0-3 : la génération ne doit plus échouer (500) ────────────
  test("15. [P0-3] Génération du fichier CNSS — plus d'erreur interne", async () => {
    const list = await authed("get", `/api/cnss/${workspaceId}/declarations`);
    const decl = (list.body as Array<{ id: string; statut: string }>).find((d) => d.statut === "CONTROLEE");
    expect(decl).toBeDefined();
    const res = await authed("patch", `/api/cnss/${workspaceId}/declarations/${decl!.id}/generer`);
    expect(res.status).toBe(200);
    expect(res.body.declaration.statut).toBe("GENEREE");
    expect(res.body.document.contenuBase64).toBeTruthy();
    expect(typeof res.body.filename).toBe("string");
  });

  test("16. [P0-3/P1-7] Téléchargement du fichier CNSS depuis la base", async () => {
    const list = await authed("get", `/api/cnss/${workspaceId}/declarations`);
    const decl = (list.body as Array<{ id: string; statut: string }>).find((d) => d.statut === "GENEREE");
    expect(decl).toBeDefined();
    const res = await authed("get", `/api/cnss/declarations/${decl!.id}/download?workspaceId=${workspaceId}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain("EN-TETE");
    expect(res.text).toContain(MATRICULE);
    expect(res.text).toContain("TOTAUX");
  });

  test("17. L'audit ATTENDANCE_IMPORT porte bien un entityId (P0-2)", async () => {
    const res = await authed("get", `/api/payroll/${workspaceId}/audit?limit=200`);
    expect(res.status).toBe(200);
    const entries = (res.body.data as Array<{ action: string; entityId?: string | null }>)
      .filter((l) => l.action === "ATTENDANCE_IMPORT");
    expect(entries.length).toBeGreaterThanOrEqual(1);
    for (const e of entries) {
      expect(e.entityId).toBeTruthy(); // l'ancien undefined → NULL crashait le dashboard
    }
  });

  // ── RÉGRESSION 6-F : les conventions ne sont PLUS orphelines — la grille
  //    salariale est contrôlée au calcul (AVERTISSEMENT, non bloquant) ──────
  test("18. [6-F] Convention collective → contrôle de grille au calcul", async () => {
    // 1) Convention + grille (minimum 5000 DT pour coefficient 100, échelon 1)
    const conv = await authed("post", "/api/conventions").send({
      workspaceId,
      code: "E2E-CONV",
      nom: "Convention E2E Test",
      secteur: "NON_AGRICOLE",
    });
    expect(conv.status).toBe(201);
    const conventionId = conv.body.id as string;

    const grille = await authed("post", `/api/conventions/${workspaceId}/${conventionId}/grille`).send({
      coefficient: "100",
      echelon: "1",
      salaireMinimum: 5000,
      dateEffet: "2026-01-01",
    });
    expect(grille.status).toBe(201);

    // 2) Nouvelle version de contrat SOUS le minimum, rattachée à la
    //    convention — dateEffet ≤ date du calcul (le moteur retient la
    //    dernière version en vigueur À LA DATE DE CALCUL, pas celle du mois)
    const version = await authed("post", `/api/contracts/${workspaceId}/${contractId}/versions`).send({
      salaireBrut: 1500, // < 5000
      coefficient: "100",
      echelon: "1",
      conventionCollectiveId: conventionId,
      motifChangement: "test_convention",
      dateEffet: "2026-09-10",
    });
    expect(version.status).toBe(201);

    // 3) Période d'octobre + calcul
    const periode = await authed("post", "/api/payroll/periods").send({
      workspaceId,
      clientCompanyId: company!.id,
      mois: 10,
      annee: 2026,
    });
    expect(periode.status).toBe(201);
    octobreId = periode.body.id as string;

    const calc = await authed("patch", `/api/payroll/${workspaceId}/periods/${octobreId}/calculate`);
    expect(calc.status).toBe(200);
    expect(calc.body.period.statut).toBe("CALCULATED"); // AVERTISSEMENT ≠ bloquant

    // 4) L'anomalie SALAIRE_SOUS_GRILLE existe, avec un message exploitable
    const anomalles = await authed("get", `/api/payroll/${workspaceId}/anomalies?periodId=${octobreId}`);
    expect(anomalles.status).toBe(200);
    const list = anomalles.body as Array<{ code: string; niveau: string; message: string }>;
    const sousGrille = list.find((a) => a.code === "SALAIRE_SOUS_GRILLE");
    expect(sousGrille).toBeDefined();
    expect(sousGrille!.niveau).toBe("AVERTISSEMENT");
    expect(sousGrille!.message).toContain("5000.000 DT");
    expect(sousGrille!.message).toContain("E2E-CONV");

    // 5) La validation reste possible (l'avertissement ne bloque pas)
    const validate = await authed("patch", `/api/payroll/${workspaceId}/periods/${octobreId}/validate`);
    expect(validate.status).toBe(200);
  });

  test("19. [7-A] Rapport groupé — génération, durabilité base, téléchargement", async () => {
    // La route existait depuis la Phase 8 mais AUCUNE interface ne l'appelait
    // (orpheline), le contenu n'était pas persisté en base (cassée en
    // serverless) et il n'existait aucune route de téléchargement.
    const gen = await authed("post", `/api/reports/periods/${octobreId}/grouped-pdf`).send({ workspaceId });
    expect(gen.status).toBe(201);
    expect(gen.body.document.type).toBe("RAPPORT_GROUPE");
    expect(gen.body.document.contenuBase64).toBeTruthy(); // durabilité serverless
    expect(gen.body.nombreBulletins).toBeGreaterThanOrEqual(1);
    const reportId = gen.body.document.id as string;

    // Idempotence : un second appel renvoie le document existant (pas de doublon)
    const gen2 = await authed("post", `/api/reports/periods/${octobreId}/grouped-pdf`).send({ workspaceId });
    expect(gen2.status).toBe(200);
    expect(gen2.body.document.id).toBe(reportId);

    // Le rapport apparaît dans la liste documents (type RAPPORT_GROUPE)
    const docs = await authed("get", `/api/documents/${workspaceId}?type=RAPPORT_GROUPE`);
    expect(docs.status).toBe(200);
    const rapports = docs.body as Array<{ id: string; type: string }>;
    expect(rapports.some((d) => d.id === reportId)).toBe(true);

    // Téléchargement : contenu servi depuis la base (peu importe le disque)
    const dl = await authed("get", `/api/reports/${workspaceId}/${reportId}/download`);
    expect(dl.status).toBe(200);
    expect(dl.headers["content-type"]).toContain("text/html");
    const html = dl.text;
    expect(html).toContain("RAPPORT GROUPÉ");
    expect(html).toContain("Octobre 2026");
    expect(html).toContain("Nombre de bulletins");
  });

  test("20. [7-B] Période complémentaire — création, calcul réel, bulletin lisible", async () => {
    // La route existait depuis la Phase 8 mais AUCUNE interface ne la
    // proposait, et le moteur ne savait pas calculer un mois virtuel (109) :
    // jours ouvrés, pointage et dates lisaient le mois brut.
    // 1) Création depuis la période Septembre clôturée (test 10)
    const comp = await authed("post", `/api/payroll/periods/${periodId}/complementary`)
      .send({ workspaceId, motifComplement: "Rappel de prime", note: "E2E" });
    expect(comp.status).toBe(201);
    expect(comp.body.complementaryPeriod.isComplementary).toBe(true);
    expect(comp.body.complementaryPeriod.mois).toBe(109); // mois virtuel = 9 + 100
    expect(comp.body.complementaryPeriod.statut).toBe("OPEN");
    expect(comp.body.complementaryPeriod.motifComplement).toBe("Rappel de prime");
    const compId = comp.body.complementaryPeriod.id as string;

    // 2) Doublon refusé (409)
    const comp2 = await authed("post", `/api/payroll/periods/${periodId}/complementary`)
      .send({ workspaceId, motifComplement: "Autre" });
    expect(comp2.status).toBe(409);

    // 3) Calcul : le moteur raisonne sur le mois RÉEL — pointage de
    //    Septembre et jours ouvrés retrouvés (l'ancien code cherchait le
    //    mois 109 et ne trouvait rien → 0 bulletin)
    const calc = await authed("patch", `/api/payroll/${workspaceId}/periods/${compId}/calculate`);
    expect(calc.status).toBe(200);
    expect(calc.body.result.errors).toEqual([]);
    expect(calc.body.result.bulletinsCreated).toBe(1);

    // 4) Bulletin complémentaire : mois virtuel conservé pour traçabilité
    const slips = await authed("get", `/api/payroll/${workspaceId}/payslips?periodId=${compId}`);
    expect(slips.status).toBe(200);
    const compSlips = slips.body as Array<{ id: string; mois: number; annee: number }>;
    expect(compSlips.length).toBe(1);
    expect(compSlips[0].mois).toBe(109);

    // 5) Le bulletin généré affiche le mois RÉEL + la nature complémentaire
    //    (fin des « undefined 2026 » de l'ancien affichage)
    const gen = await authed("post", `/api/documents/payslips/${compSlips[0].id}/pdf`).send({ workspaceId });
    expect(gen.status).toBe(201);
    const dl = await authed("get", `/api/documents/payslips/${compSlips[0].id}/download?workspaceId=${workspaceId}`);
    expect(dl.status).toBe(200);
    expect(dl.text).toContain("Septembre 2026");
    expect(dl.text).toContain("Complémentaire");
    expect(dl.text).not.toContain("undefined");
  });
});
