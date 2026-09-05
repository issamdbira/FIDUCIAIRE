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

  it("calcule les champs avantages exclus quand un avantage exclus est déclaré via elements", () => {
    // Déclare un avantage exclus (point 1 du décret) via le champ isAvantageExclus/codeAvantage
    const input = makeInput({
      elements: [
        { id: "1", type: "salaire_base", label: "Salaire de base", montant: 1000, traitement: "standard" },
        {
          id: "2", type: "avantage", label: "Prime rentrée scolaire", montant: 80,
          traitement: "exonere_total", isAvantageExclus: true, codeAvantage: "1",
        },
      ],
    });
    const result = runPayrollEngine(input);
    // L'avantage exclus doit être traité par le moteur
    expect(result.avantagesTotal).toBeGreaterThan(0);
    expect(result.avantagesExoneresIndividuels).toBeGreaterThan(0);
  });

  it("produit avantagesReintegresArticle3 > 0 quand l'exonération dépasse le plafond global 5%", () => {
    // Salaire 1000 DT + avantage exclus important → l'exonération peut dépasser 5% du brut
    const input = makeInput({
      elements: [
        { id: "1", type: "salaire_base", label: "Salaire de base", montant: 1000, traitement: "standard" },
        {
          id: "2", type: "avantage", label: "Prime rentrée scolaire", montant: 80,
          traitement: "exonere_total", isAvantageExclus: true, codeAvantage: "1",
        },
      ],
    });
    const result = runPayrollEngine(input);
    // Le plafond global 5% = 5% × 1000 = 50 DT
    // L'exonération individuelle du point 1 = min(80, plafondSMIG) = 80 (car plafondSMIG ~166 DT en 2025)
    // 80 > 50 → reintegreArticle3 = 80 - 50 = 30
    expect(result.avantagesReintegresArticle3).toBeGreaterThan(0);
  });

  it("renvoie avantagesTotal = 0 quand aucun avantage exclus n'est déclaré", () => {
    const result = runPayrollEngine(makeInput());
    expect(result.avantagesTotal).toBe(0);
    expect(result.avantagesExoneresIndividuels).toBe(0);
    expect(result.avantagesReintegresIndividuels).toBe(0);
    expect(result.avantagesReintegresArticle3).toBe(0);
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

  it("calcule correctement avec chef de famille et enfants", () => {
    const input = makeInput({
      salarie: { nom: "Doe", prenom: "John", chefFamille: true, enfants: 3, etudiants: 0, infirmes: 0 },
    });
    const result = runPayrollEngine(input);
    expect(result.deductionsFamilialesMensuelles).toBeGreaterThan(0);
    // Plus de déductions → IRPP plus bas → net plus élevé
    const resultCelibataire = runPayrollEngine(makeInput());
    expect(result.irppMensuel).toBeLessThanOrEqual(resultCelibataire.irppMensuel);
  });

  it("gère un salaire de 0 sans erreur", () => {
    const input = makeInput({
      elements: [
        { id: "1", type: "salaire_base", label: "Salaire", montant: 0, traitement: "standard" },
      ],
    });
    const result = runPayrollEngine(input);
    expect(result.totalRemunerationBrute).toBe(0);
    expect(result.cotisationCNSS).toBe(0);
    expect(result.netAPayer).toBe(0);
  });
});
