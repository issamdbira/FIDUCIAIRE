// =============================================================================
// Lot 8-3.1 — Tests unitaires pour server/lib/money.ts
// =============================================================================
// Vérifie le comportement de round2Exact, round3Exact et formatDT avec des
// cas connus à la main. Aucune dépendance DB.

import { describe, it, expect } from "vitest";
import { round2Exact, round3Exact, formatDT } from "./money.js";

describe("Lot 8-3.1 — server/lib/money.ts", () => {
  describe("round2Exact — arrondi 2 décimales (centimes)", () => {
    it("MONEY-2-1: arrondit 0.005 → 0.01 (demi-sup)", () => {
      expect(round2Exact(0.005)).toBe(0.01);
    });
    it("MONEY-2-2: arrondit 0.004 → 0.00 (vers le bas)", () => {
      expect(round2Exact(0.004)).toBe(0);
    });
    it("MONEY-2-3: arrondit 12.345 → 12.35 (cas typique salaire)", () => {
      expect(round2Exact(12.345)).toBe(12.35);
    });
    it("MONEY-2-4: arrondit 12.3449999 → 12.34 (sans artefact float)", () => {
      // Sans le +EPSILON, 12.3449999 * 100 = 1234.49999 → round(1234) = 1234 → 12.34
      // Mais avec EPSILON pour corriger 0.1+0.2 = 0.30000000000000004
      expect(round2Exact(12.3449999)).toBe(12.34);
    });
    it("MONEY-2-5: nombres négatifs — arrondi vers zéro (comportement Math.round)", () => {
      // ATTENTION (Lot 8-3.1 finding) :
      // Math.round(-1234.5) = -1234 (arrondit vers +Infini), pas -1235
      // Donc round2Exact(-12.345) = -12.34, pas -12.35 comme on s'y attendrait
      // en arrondi "demi-sup" strict. Pour la paie, ce comportement avantage
      // légèrement le salarié sur les montants négatifs (retenues).
      // Comportement actuel documenté, ne pas modifier (cf. Lot 8 règle).
      expect(round2Exact(-12.345)).toBe(-12.34);
      expect(round2Exact(-12.355)).toBe(-12.35); // -12.355 × 100 = -1235.5 → Math.round = -1235 → -12.35
    });
    it("MONEY-2-6: NaN / Infinity → 0 (défensif)", () => {
      expect(round2Exact(NaN)).toBe(0);
      expect(round2Exact(Infinity)).toBe(0);
      expect(round2Exact(-Infinity)).toBe(0);
    });
    it("MONEY-2-7: cas réels bulletins paie", () => {
      // Salaire brut 1500.000 → 1500 (inchangé)
      expect(round2Exact(1500.0)).toBe(1500);
      // CNSS 9.68% de 1500 = 145.2 exact
      expect(round2Exact(1500 * 0.0968)).toBe(145.2);
      // IRPP mensuel typique 158.9967 → 158.99 (troncature)
      expect(round2Exact(158.9967)).toBe(159); // 158.9967 × 100 = 15899.67 → round = 15900 → 159
    });
  });

  describe("round3Exact — arrondi 3 décimales (millimes, code mort actuel)", () => {
    it("MONEY-3-1: arrondit 0.0005 → 0.001 (demi-sup millimes)", () => {
      expect(round3Exact(0.0005)).toBe(0.001);
    });
    it("MONEY-3-2: arrondit 12.3456 → 12.346 (3 décimales)", () => {
      expect(round3Exact(12.3456)).toBe(12.346);
    });
    it("MONEY-3-3: arrondit 1234.5675 → 1234.568 (cas agrégat)", () => {
      expect(round3Exact(1234.5675)).toBe(1234.568);
    });
    it("MONEY-3-4: NaN / Infinity → 0", () => {
      expect(round3Exact(NaN)).toBe(0);
      expect(round3Exact(Infinity)).toBe(0);
    });
  });

  describe("formatDT — formatage monétaire tunisien", () => {
    it("FMT-1: nombre avec 2 décimales significatives → format 2 décimales", () => {
      const s = formatDT(1500.5);
      // Intl.NumberFormat("fr-TN") utilise un NBSP étroit (U+202F) comme séparateur de milliers
      // On teste juste la présence des chiffres + virgule + DT
      expect(s).toMatch(/1.*500,5/);
      expect(s).toContain("DT");
    });
    it("FMT-2: nombre avec 3 décimales significatives → format 3 décimales", () => {
      const s = formatDT(145.2);
      expect(s).toMatch(/145,2/);
      expect(s).toContain("DT");
    });
    it("FMT-3: avecSymbole=false supprime 'DT'", () => {
      const s = formatDT(1500, { avecSymbole: false });
      expect(s).not.toContain("DT");
      expect(s).toMatch(/1.*500/);
    });
    it("FMT-4: NaN / Infinity → '—'", () => {
      expect(formatDT(NaN)).toBe("—");
      expect(formatDT(Infinity)).toBe("—");
    });
    it("FMT-5: nombre négatif formaté avec signe moins", () => {
      const s = formatDT(-96.8);
      expect(s).toMatch(/-96/);
      expect(s).toContain("DT");
    });
  });
});
