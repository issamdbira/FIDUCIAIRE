// =============================================================================
// Le Fiduciaire — IRPP engine property-based tests (fast-check)
// =============================================================================
// These tests complement the example-based `irpp.test.ts` with mathematical
// invariants that must hold for ANY random input. A failing property-based
// test is far more powerful than an example-based test: it generates hundreds
// of inputs and reports the minimal failing case.
//
// Invariants verified:
//   P1. Non-negativity        — IRPP >= 0 for any non-negative assiette
//   P2. Monotonicity          — higher assiette → higher (or equal) IRPP
//   P3. Upper bound           — IRPP <= assiette × max marginal rate (40%)
//   P4. Deductions reduce IRPP — adding deductions never increases IRPP
//   P5. Continuity at tranche boundaries — no jump (left limit = right limit)
//   P6. Rounding to 2 decimals — IRPP always has ≤ 2 decimal places
//   P7. Deductions family monotonicity — more children → more (or equal) deductions
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import {
  calculerIRPPAnnuel,
  calculerDeductionsAnnuelles,
  type SituationFamiliale,
} from "@/lib/payroll/irpp";
import {
  reinitialiserPayrollConfig,
  getPayrollConfig,
} from "@/lib/payroll/config";

// Sanity bounds for property-based tests — we don't test astronomical incomes
// (above 10 million DT/year) because the regulatory engine isn't specified
// there and floating-point precision would dominate.
const MAX_ASSIETTE = 1_000_000;
const MAX_DEDUCTIONS = 50_000;

describe("IRPP — property-based invariants (fast-check)", () => {
  beforeEach(() => {
    reinitialiserPayrollConfig();
  });

  // ── P1 — Non-negativity ──────────────────────────────────────────────────
  it("P1. IRPP ≥ 0 pour toute assiette ≥ 0", () => {
    fc.assert(
      fc.property(
        fc.record({
          assiette: fc.float({ min: 0, max: MAX_ASSIETTE, noNaN: true }),
          deductions: fc.float({ min: 0, max: MAX_DEDUCTIONS, noNaN: true }),
        }),
        ({ assiette, deductions }) => {
          const irpp = calculerIRPPAnnuel(assiette, deductions);
          return irpp >= 0;
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── P2 — Monotonicity: higher assiette → higher IRPP ─────────────────────
  it("P2. IRPP est monotone croissant en l'assiette", () => {
    fc.assert(
      fc.property(
        fc.record({
          a1: fc.float({ min: 0, max: MAX_ASSIETTE, noNaN: true }),
          a2: fc.float({ min: 0, max: MAX_ASSIETTE, noNaN: true }),
          deductions: fc.float({ min: 0, max: MAX_DEDUCTIONS, noNaN: true }),
        }),
        ({ a1, a2, deductions }) => {
          // Skip cases where the difference is too small (floating point noise)
          if (Math.abs(a2 - a1) < 1) return true;
          const irpp1 = calculerIRPPAnnuel(a1, deductions);
          const irpp2 = calculerIRPPAnnuel(a2, deductions);
          if (a2 > a1) return irpp2 >= irpp1 - 0.01; // tolerance for rounding
          return irpp1 >= irpp2 - 0.01;
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── P3 — Upper bound: IRPP never exceeds assiette × max rate ─────────────
  it("P3. IRPP ≤ assiette × taux marginal maximum (40%)", () => {
    const config = getPayrollConfig();
    const tauxMax = Math.max(...config.baremeIRPP.map((t) => t.taux));
    expect(tauxMax).toBeGreaterThan(0); // sanity
    fc.assert(
      fc.property(
        fc.record({
          assiette: fc.float({ min: 0, max: MAX_ASSIETTE, noNaN: true }),
          deductions: fc.float({ min: 0, max: MAX_DEDUCTIONS, noNaN: true }),
        }),
        ({ assiette, deductions }) => {
          const irpp = calculerIRPPAnnuel(assiette, deductions);
          // The effective IRPP cannot exceed assiette × max rate
          return irpp <= assiette * tauxMax + 0.01;
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── P4 — Deductions never increase IRPP ─────────────────────────────────
  it("P4. Ajouter des déductions ne JAMAIS augmenter l'IRPP", () => {
    fc.assert(
      fc.property(
        fc.record({
          assiette: fc.float({ min: 0, max: MAX_ASSIETTE, noNaN: true }),
          d1: fc.float({ min: 0, max: MAX_DEDUCTIONS, noNaN: true }),
          d2: fc.float({ min: 0, max: MAX_DEDUCTIONS, noNaN: true }),
        }),
        ({ assiette, d1, d2 }) => {
          // Force d2 > d1
          if (d2 <= d1) return true;
          const irpp1 = calculerIRPPAnnuel(assiette, d1);
          const irpp2 = calculerIRPPAnnuel(assiette, d2);
          return irpp2 <= irpp1 + 0.01;
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── P5 — Continuity at tranche boundaries ────────────────────────────────
  // For each tranche boundary B, computing IRPP at B-ε and B+ε should give
  // results differing by less than (B × taux_de_la_tranche_supérieure × 0.0001)
  it("P5. Continuité aux frontières de tranches (pas de saut)", () => {
    const config = getPayrollConfig();
    const boundaries = config.baremeIRPP
      .filter((t) => t.max !== null && t.max !== undefined)
      .map((t) => t.max as number);
    expect(boundaries.length).toBeGreaterThan(0);
    for (const B of boundaries) {
      const eps = 0.01; // 10 millimes
      const irppJustBelow = calculerIRPPAnnuel(B - eps, 0);
      const irppJustAbove = calculerIRPPAnnuel(B + eps, 0);
      // The difference should be approximately 2 × eps × taux_above (very small)
      // Just assert the gap is small in absolute terms
      expect(Math.abs(irppJustAbove - irppJustBelow)).toBeLessThan(1); // < 1 DT
    }
  });

  // ── P6 — Rounding: IRPP always has ≤ 2 decimal places ──────────────────
  it("P6. IRPP arrondi à 2 décimales (pas de précision flottante résiduelle)", () => {
    fc.assert(
      fc.property(
        fc.record({
          assiette: fc.float({ min: 0, max: MAX_ASSIETTE, noNaN: true }),
          deductions: fc.float({ min: 0, max: MAX_DEDUCTIONS, noNaN: true }),
        }),
        ({ assiette, deductions }) => {
          const irpp = calculerIRPPAnnuel(assiette, deductions);
          // irpp × 100 must be an integer (within floating-point tolerance)
          const scaled = irpp * 100;
          return Math.abs(scaled - Math.round(scaled)) < 0.001;
        }
      ),
      { numRuns: 500 }
    );
  });

  // ── P7 — Family deductions monotonicity: more children → more deductions ─
  it("P7. Déductions familiales croissent avec le nombre d'enfants (avant plafond)", () => {
    const config = getPayrollConfig();
    const plafond = config.plafondNombreEnfantsEtudiants;
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: plafond - 1 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 2 }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (enfantsAvant, chefFamille, infirmes, autres) => {
          const s1: SituationFamiliale = {
            chefFamille, enfants: enfantsAvant, etudiants: 0, infirmes, autresDeductionsAnnuelles: autres,
          };
          const s2: SituationFamiliale = {
            chefFamille, enfants: enfantsAvant + 1, etudiants: 0, infirmes, autresDeductionsAnnuelles: autres,
          };
          // Adding a child (still under plafond) MUST increase (or keep equal) deductions
          return calculerDeductionsAnnuelles(s2) >= calculerDeductionsAnnuelles(s1);
        }
      ),
      { numRuns: 200 }
    );
  });

  // ── P8 — Plafond effectif: above the children+students cap, more children
  //         does NOT change deductions ────────────────────────────────────────
  it("P8. Au-delà du plafond, ajouter un enfant ne change PAS les déductions", () => {
    const config = getPayrollConfig();
    const plafond = config.plafondNombreEnfantsEtudiants;
    fc.assert(
      fc.property(
        fc.integer({ min: plafond + 1, max: plafond + 5 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 2 }),
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (enfants, chefFamille, infirmes, autres) => {
          const s1: SituationFamiliale = {
            chefFamille, enfants, etudiants: 0, infirmes, autresDeductionsAnnuelles: autres,
          };
          const s2: SituationFamiliale = {
            chefFamille, enfants: enfants + 1, etudiants: 0, infirmes, autresDeductionsAnnuelles: autres,
          };
          return calculerDeductionsAnnuelles(s1) === calculerDeductionsAnnuelles(s2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
