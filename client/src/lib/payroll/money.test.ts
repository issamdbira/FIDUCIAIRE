// =============================================================================
// Tests — Utilitaires monétaires (Lot 1 : décimales exactes)
// =============================================================================
// Critère roadmap §7 : « Ne laisse jamais apparaître de valeurs telles que
// 12.479999999999999 ». Les cas ci-dessous documentent le piège flottant
// corrigé (demi-arrondis exacts, artefacts éliminés aux bornes).
// =============================================================================
import { describe, it, expect } from "vitest";
import { round2Exact, round3Exact, formatDT } from "./money";

describe("round2Exact — arrondi demi-sup à 2 décimales, sans artefact flottant", () => {
  it("demi-arrondis exacts (le piège Math.round(n*100)/100 est corrigé)", () => {
    // Math.round(1.005 * 100) === 100 → 1.00 (FAUX) ; l'arrondi exact est 1.01
    expect(round2Exact(1.005)).toBe(1.01);
    expect(round2Exact(2.675)).toBe(2.68); // piège classique : 2.6749999…*100 → 267
    expect(round2Exact(12.465)).toBe(12.47);
  });

  it("élimine les artefacts de queue flottante", () => {
    expect(round2Exact(12.479999999999999)).toBe(12.48);
    expect(round2Exact(8.164999999999999)).toBe(8.16); // 8.165 → double le plus proche 8.16499…
    expect(round2Exact(0.1 + 0.2)).toBe(0.3); // 0.30000000000000004 → 0.3
  });

  it("valeurs négatives (retenues) arrondies symétriquement", () => {
    expect(round2Exact(-1.005)).toBe(-1.01);
    expect(round2Exact(-0.1 - 0.2)).toBe(-0.3);
  });

  it("valeurs non finies sécurisées", () => {
    expect(round2Exact(NaN)).toBe(0);
    expect(round2Exact(Infinity)).toBe(0);
  });
});

describe("round3Exact — millimes tunisiens", () => {
  it("trois décimales exactes", () => {
    expect(round3Exact(0.0005)).toBe(0.001);
    expect(round3Exact(12.4795)).toBe(12.48); // 12.4795 → arrondi 12.480
    expect(round3Exact(1234.5675)).toBe(1234.568);
  });
});

describe("formatDT — format monétaire tunisien cohérent", () => {
  const SEP = "\u202f"; // séparateur de milliers fr-TN (espace fine insécable)

  it("2 décimales minimum, millimes si significatives", () => {
    expect(formatDT(1200, { avecSymbole: false })).toBe(`1${SEP}200,00`);
    expect(formatDT(1234.5, { avecSymbole: false })).toBe(`1${SEP}234,50`);
    expect(formatDT(12.478, { avecSymbole: false })).toBe("12,478");
  });

  it("jamais de queue flottante à l'affichage", () => {
    const formate = formatDT(12.479999999999999, { avecSymbole: false });
    expect(formate).not.toContain("999");
    expect(formate).toBe("12,48");
  });

  it("symbole DT par défaut", () => {
    expect(formatDT(10)).toContain("DT");
  });
});
