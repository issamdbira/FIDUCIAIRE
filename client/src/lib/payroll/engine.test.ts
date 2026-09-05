import { describe, it, expect, beforeEach } from "vitest";
import { runPayrollEngine } from "@/lib/payroll/engine";
import { getPayrollConfig, reinitialiserPayrollConfig, setPayrollConfig, CONFIG_PAR_DEFAUT } from "@/lib/payroll/config";
import type { PayrollInput } from "@/lib/payroll/types";

// ─── Helpers ────────────────────────────────────────────────────────

function makeInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    employeur: { nom: "Test SARL", secteur: "non_agricole" },
    salarie: { nom: "Doe", prenom: "John", chefFamille: false, enfants: 0, etudiants: 0, infirmes: 0 },
    periode: { mois: 1, annee: 2025 },
    elements: [
      { id: "1", type: "salaire_base", label: "Salaire de base", montant: 1000, traitement: "standard" },
    ],
    ...overrides,
  };
}

// ─── Tests runPayrollEngine ──────────────────────────────────────────

describe("runPayrollEngine", () => {
  beforeEach(() => {
    reinitialiserPayrollConfig();
  });

  it("calcule le net à payer pour un salaire standard (1000 DT)", () => {
    const result = runPayrollEngine(makeInput());
    expect(result.totalRemunerationBrute).toBe(1000);
    expect(result.baseCNSS).toBe(1000);
    expect(result.netAPayer).toBeGreaterThan(0);
    expect(result.netAPayer).toBeLessThan(1000); // cotisations + IRPP déduits
    expect(result.cotisationCNSS).toBeGreaterThan(0);
    expect(result.irppMensuel).toBeGreaterThanOrEqual(0);
  });

  it("exclut les éléments en_attente_de_regle du calcul", () => {
    const input = makeInput({
      elements: [
        { id: "1", type: "salaire_base", label: "Salaire", montant: 800, traitement: "standard" },
        { id: "2", type: "avantage", label: "Avantage X", montant: 200, traitement: "en_attente_de_regle" },
      ],
    });
    const result = runPayrollEngine(input);
    expect(result.totalRemunerationBrute).toBe(800);
    expect(result.elementsEnAttente).toHaveLength(1);
    expect(result.elementsEnAttente[0].label).toBe("Avantage X");
  });

  it("traite les éléments exonere_total (0% base CNSS/IRPP)", () => {
    const input = makeInput({
      elements: [
        { id: "1", type: "salaire_base", label: "Salaire", montant: 1000, traitement: "standard" },
        { id: "2", type: "prime", label: "Prime exonérée", montant: 300, traitement: "exonere_total" },
      ],
    });
    const result = runPayrollEngine(input);
    expect(result.totalRemunerationBrute).toBe(1300);
    // baseCNSS ne compte que l'élément standard (1000), pas l'exonéré
    expect(result.baseCNSS).toBe(1000);
  });

  it("gère le secteur agricole avec taux spécifique", () => {
    const input = makeInput({
      employeur: { nom: "Ferme Test", secteur: "agricole" },
    });
    const result = runPayrollEngine(input);
    const config = getPayrollConfig();
    const expectedCNSS = 1000 * config.cnssSalarialAgricole;
    expect(result.cotisationCNSS).toBeCloseTo(expectedCNSS, 2);
  });

  it("applique le plafond global 5% des avantages exclus (art. 3)", () => {
    // Salaire 1000 DT/mois → 5% = 50 DT
    // Avantages déclarés : point 1 (rentrée scolaire) = 80 DT → dépassement de 30 DT
    const input = makeInput({
      avantagesExclus: [
        { numero: 1, montant: 80 },
      ],
    });
    const result = runPayrollEngine(input);
    expect(result.plafondGlobalAvantages).toBeDefined();
    expect(result.plafondGlobalAvantages!.plafondAutorise).toBe(50); // 5% × 1000
    expect(result.plafondGlobalAvantages!.depassement).toBe(30); // 80 - 50
    expect(result.plafondGlobalAvantages!.montantReintegre).toBe(30);
    // La base CNSS est augmentée du dépassement
    expect(result.baseCNSS).toBe(1030); // 1000 + 30
  });

  it("ne réintègre pas les points hors plafond 5% (16, 17, 18, 19, 23, 24)", () => {
    const input = makeInput({
      avantagesExclus: [
        { numero: 16, montant: 200 }, // hors plafond → ne compte pas
        { numero: 18, montant: 150 }, // hors plafond → ne compte pas
      ],
    });
    const result = runPayrollEngine(input);
    expect(result.plafondGlobalAvantages).toBeDefined();
    expect(result.plafondGlobalAvantages!.totalAvantagesSoumisAuCap).toBe(0);
    expect(result.plafondGlobalAvantages!.depassement).toBe(0);
    expect(result.baseCNSS).toBe(1000); // pas de réintégration
  });

  it("produit des montants arrondis à 2 décimales", () => {
    const input = makeInput({
      elements: [
        { id: "1", type: "salaire_base", label: "Salaire", montant: 999.999, traitement: "standard" },
      ],
    });
    const result = runPayrollEngine(input);
    // Tous les montants du résultat doivent être arrondis à 2 décimales
    const check2Decimals = (n: number) => expect(n).toBeCloseTo(Math.round(n * 100) / 100, 10);
    check2Decimals(result.totalRemunerationBrute);
    check2Decimals(result.baseCNSS);
    check2Decimals(result.cotisationCNSS);
    check2Decimals(result.netAPayer);
    check2Decimals(result.irppMensuel);
  });
});
