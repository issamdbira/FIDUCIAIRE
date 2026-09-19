// =============================================================================
// Lot 8-3.1 — Tests unitaires pour server/lib/payroll-engine.ts (calculatePayroll)
// =============================================================================
// Vérifie le moteur de paie SIMPLE avec des cas à la main. Aucune DB — la
// fonction calculatePayroll est PURE (sans Prisma, sans I/O).
//
// Cas couverts :
//   - Salaire brut négatif → anomalie BLOQUANTE
//   - Taux de présence 100% → brut effectif = brut contractuel
//   - Taux de présence 50% → brut effectif = brut × 0.5
//   - Congés payés RÉMUNÉRÉS (P1-6)
//   - CNSS 9.68% (non agricole)
//   - CNSS 6.99% (agricole)
//   - IRPP barème progressif 8 tranches
//   - Déduction chef de famille (300 DT/an → 25 DT/mois)
//   - Plafond CNSS 6000 DT

import { describe, it, expect } from "vitest";
import { calculatePayroll, type PayrollInput } from "./payroll-engine.js";

// Config paie standard 2026 (LOI DE FINANCES 2026)
const CONFIG_2026 = {
  cnssSalarialNonAgricole: 0.0968,
  cnssPatronalNonAgricole: 0.1707,
  cnssSalarialAgricole: 0.0699,
  cnssPatronalAgricole: 0.1248,
  cssActive: false, // supprimée LF 2026
  cssTaux: 0,
  cssSeuilExonerationAnnuel: 0,
  fraisProTauxActifs: 0.10,
  fraisProPlafondActifsAnnuel: 2000,
  fraisProTauxRetraites: 0.25,
  deductionChefFamille: 300,
  deductionEnfant: 100,
  deductionEtudiant: 100,
  plafondNombreEnfantsEtudiants: 4,
  deductionInfirme: 200,
  parentsEnChargeActif: false,
  parentsEnChargeTaux: 0.05,
  parentsEnChargePlafondParAnnuel: 450,
  secteur: "NON_AGRICOLE",
};

const BAREME_IRPP_2026 = [
  { min: 0, max: 5000, taux: 0, ordre: 1 },
  { min: 5000, max: 10000, taux: 0.15, ordre: 2 },
  { min: 10000, max: 20000, taux: 0.25, ordre: 3 },
  { min: 20000, max: 30000, taux: 0.30, ordre: 4 },
  { min: 30000, max: 40000, taux: 0.33, ordre: 5 },
  { min: 40000, max: 50000, taux: 0.36, ordre: 6 },
  { min: 50000, max: 70000, taux: 0.38, ordre: 7 },
  { min: 70000, max: null, taux: 0.40, ordre: 8 },
];

function makeInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    employee: {
      id: "emp-1",
      firstName: "Test",
      lastName: "Employee",
      matriculeCnss: "12345678",
      civilStatus: "CELIBATAIRE",
      numberOfChildren: 0,
      baseSalary: 1500,
      clientCompanyId: "client-1",
    },
    contractVersion: {
      id: "ver-1",
      salaireBrut: 1500,
      heuresHebdomadaires: 48,
      heuresMensuelles: 208,
      coefficient: null,
      echelon: null,
    },
    attendance: {
      joursTravaillesReels: 22,
      congesPayes: 0,
      absencesJustifiees: 0,
      absencesNonJustifiees: 0,
      heuresSupplementaires: 0,
      joursOuvresTotal: 22,
      tauxPresence: 1.0,
    },
    payrollConfig: CONFIG_2026,
    tranchesIrpp: BAREME_IRPP_2026,
    clientSecteur: "NON_AGRICOLE",
    joursOuvresMois: 22,
    ...overrides,
  };
}

describe("Lot 8-3.1 — server/lib/payroll-engine.ts (calculatePayroll, PURE)", () => {
  // ── Cas de base : salaire 1500 DT, célibataire, présence 100% ──────────
  it("PAYROLL-1: célibataire 1500 DT présence 100% — calcule CNSS + IRPP + net", () => {
    const result = calculatePayroll(makeInput());
    const { payslip, anomalies } = result;

    expect(anomalies).toEqual([]);
    expect(payslip.salaireBrutContractuel).toBe(1500);
    expect(payslip.tauxPresence).toBe(1);
    expect(payslip.salaireBrutEffectif).toBe(1500);
    // CNSS = 1500 × 0.0968 = 145.2
    expect(payslip.retenueCnssSalarial).toBe(145.2);
    expect(payslip.retenueCnssPatronal).toBe(256.05); // 1500 × 0.1707 = 256.05
    // CSS = 0 (supprimée LF 2026)
    expect(payslip.retenueCss).toBe(0);
    // Base imposable = brut effectif (CNSS est une retenue, pas une déduction de base)
    expect(payslip.baseImposable).toBe(1500);
    // Frais pro = 1500 × 0.10 = 150 (sous plafond mensuel 166.67)
    expect(payslip.fraisProfessionnels).toBe(150);
    // Net imposable avant déduc = 1500 - 145.2 - 150 = 1204.8
    expect(payslip.netImposableAvantDeductions).toBe(1204.8);
    // Pas de déductions familiales (célibataire sans enfants) — stockées comme montants ANNUELS
    expect(payslip.deductionChefFamille).toBe(0);
    expect(payslip.deductionEnfants).toBe(0);
    expect(payslip.totalDeductionsFamiliales).toBe(0);
    // Base IRPP mensuel = 1204.8
    expect(payslip.baseIrpp).toBe(1204.8);
    // IRPP annuel sur assiette 1204.8 × 12 = 14457.6
    // Tranches: 5000×0% + 5000×15% + 4457.6×25% = 0 + 750 + 1114.4 = 1864.4
    // IRPP mensuel = 1864.4 / 12 = 155.3666... → round2Exact = 155.37
    expect(payslip.retenueIrpp).toBeCloseTo(155.37, 1);
    // Net à payer = 1500 - 145.2 - 155.37 = 1199.43
    expect(payslip.salaireNet).toBeGreaterThan(1198);
    expect(payslip.salaireNet).toBeLessThan(1201);
  });

  // ── Salaire brut négatif → anomalie BLOQUANTE ──────────────────────────
  it("PAYROLL-2: salaire brut négatif → anomalie BLOQUANTE", () => {
    const result = calculatePayroll(makeInput({
      contractVersion: { id: "v-1", salaireBrut: -500, heuresHebdomadaires: 48, heuresMensuelles: 208, coefficient: null, echelon: null },
    }));
    expect(result.anomalies.some(a => a.code === "SALAIRE_BRUT_NEGATIF" && a.niveau === "BLOQUANTE")).toBe(true);
  });

  // ── Présence 50% → brut effectif réduit de moitié ─────────────────────
  it("PAYROLL-3: taux présence 0.5 → brut effectif = brut × 0.5", () => {
    const result = calculatePayroll(makeInput({
      attendance: {
        joursTravaillesReels: 11, congesPayes: 0, absencesJustifiees: 0, absencesNonJustifiees: 11,
        heuresSupplementaires: 0, joursOuvresTotal: 22, tauxPresence: 0.5,
      },
    }));
    expect(result.payslip.tauxPresence).toBe(0.5);
    expect(result.payslip.salaireBrutEffectif).toBe(750); // 1500 × 0.5
    // Anomalie pour absences non justifiées
    expect(result.anomalies.some(a => a.code === "ABSENCES_NON_JUSTIFIEES")).toBe(true);
  });

  // ── Congés payés RÉMUNÉRÉS (P1-6) — ne réduisent pas le brut ───────────
  it("PAYROLL-4 (P1-6): 5 jours congés payés → brut NON réduit", () => {
    const result = calculatePayroll(makeInput({
      attendance: {
        joursTravaillesReels: 17, congesPayes: 5, absencesJustifiees: 0, absencesNonJustifiees: 0,
        heuresSupplementaires: 0, joursOuvresTotal: 22, tauxPresence: null, // force le calcul
      },
    }));
    // tauxPresence = (17 + 5) / 22 = 22/22 = 1.0 — congés payés au numérateur
    expect(result.payslip.tauxPresence).toBe(1);
    expect(result.payslip.salaireBrutEffectif).toBe(1500);
  });

  // ── CNSS secteur agricole : 6.99% au lieu de 9.68% ────────────────────
  it("PAYROLL-5: secteur AGRICOLE → CNSS 6.99% salarial", () => {
    const result = calculatePayroll(makeInput({
      clientSecteur: "AGRICOLE",
    }));
    // CNSS agricole = 1500 × 0.0699 = 104.85
    expect(result.payslip.retenueCnssSalarial).toBe(104.85);
    expect(result.payslip.retenueCnssPatronal).toBe(187.2); // 1500 × 0.1248
  });

  // ── Plafond CNSS 6000 DT — brut au-dessus du plafond ──────────────────
  it("PAYROLL-6: brut 8000 DT → CNSS calculée sur plafond 6000 (non agricole)", () => {
    const result = calculatePayroll(makeInput({
      contractVersion: { id: "v-1", salaireBrut: 8000, heuresHebdomadaires: 48, heuresMensuelles: 208, coefficient: null, echelon: null },
    }));
    // CNSS = min(8000, 6000) × 0.0968 = 580.8
    expect(result.payslip.retenueCnssSalarial).toBe(580.8);
  });

  // ── Marié → déduction chef de famille ANNUELLE 300 DT (stocké annuel) ───
  it("PAYROLL-7: marié → déduction chef de famille 300 DT (annuel, stocké tel quel)", () => {
    const result = calculatePayroll(makeInput({
      employee: { id: "emp-1", firstName: "T", lastName: "E", matriculeCnss: "12345678", civilStatus: "MARIE", numberOfChildren: 0, baseSalary: 1500, clientCompanyId: "c1" },
    }));
    // Le moteur stocke la déduction ANNUELLE (config.deductionChefFamille = 300)
    // — la division par 12 se fait implicitement dans le calcul IRPP
    expect(result.payslip.deductionChefFamille).toBe(300);
  });

  // ── 4 enfants → déduction 4 × 100 = 400 DT annuel ────────────────────
  it("PAYROLL-8: 4 enfants → déduction 4 × 100 = 400 DT annuel", () => {
    const result = calculatePayroll(makeInput({
      employee: { id: "emp-1", firstName: "T", lastName: "E", matriculeCnss: "12345678", civilStatus: "MARIE", numberOfChildren: 4, baseSalary: 1500, clientCompanyId: "c1" },
    }));
    expect(result.payslip.deductionChefFamille).toBe(300); // marié
    expect(result.payslip.deductionEnfants).toBe(400); // 4 × 100
  });

  // ── 6 enfants (plafond 4) → déduction plafonnée à 4 × 100 = 400 ──────
  it("PAYROLL-9: 6 enfants (plafond 4) → déduction plafonnée à 4 enfants", () => {
    const result = calculatePayroll(makeInput({
      employee: { id: "emp-1", firstName: "T", lastName: "E", matriculeCnss: "12345678", civilStatus: "MARIE", numberOfChildren: 6, baseSalary: 1500, clientCompanyId: "c1" },
    }));
    // 4 enfants seulement sont déductibles → 400 annuel
    expect(result.payslip.deductionEnfants).toBe(400);
  });

  // ── Heures supplémentaires — majoration 1.25 pour ≤ 8h, 1.5 au-delà ───
  it("PAYROLL-10: 4 heures supplémentaires → majoration 1.25", () => {
    const result = calculatePayroll(makeInput({
      attendance: {
        joursTravaillesReels: 22, congesPayes: 0, absencesJustifiees: 0, absencesNonJustifiees: 0,
        heuresSupplementaires: 4, joursOuvresTotal: 22, tauxPresence: 1.0,
      },
    }));
    // tauxHoraire = 1500 / 208 = 7.211...
    // HS = 4 × 7.211 × 1.25 = 36.06
    expect(result.payslip.montantHeuresSup).toBeCloseTo(36.06, 1);
    expect(result.payslip.heuresSupplementaires).toBe(4);
  });

  // ── SMIG floor — vérifier que le net n'est pas négatif ─────────────────
  it("PAYROLL-11: brut au SMIG 554.736 DT → net à payer >= 0", () => {
    const result = calculatePayroll(makeInput({
      contractVersion: { id: "v-1", salaireBrut: 554.736, heuresHebdomadaires: 48, heuresMensuelles: 208, coefficient: null, echelon: null },
    }));
    expect(result.payslip.salaireNet).toBeGreaterThanOrEqual(0);
  });
});
