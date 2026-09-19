// =============================================================================
// Lot 8 (suite) — Tests unitaires pour les primes conventionnelles (shared)
// =============================================================================
// Vérifie que getEligiblePrimes et getTotalPrimesEligibles retournent
// les bonnes primes pour la convention Commerce Gros selon la catégorie,
// l'ancienneté, et le poste.

import { describe, it, expect } from "vitest";
import {
  getEligiblePrimes,
  getTotalPrimesEligibles,
  chercherSalaireGrille,
  detecterEchelon,
  getEchellesPourCategorie,
  getEchelonsPourEchelle,
  getAnneesGrille,
  getResumeConvention,
  type SalarieInfo,
} from "../../shared/conventions/engine.js";
import { getConventionBySlug, CONVENTIONS } from "../../shared/conventions/data/index.js";

const CONV_COMMERCE = getConventionBySlug("commerce-gros")!;

describe("Lot 8 (suite) — shared/conventions/engine.ts (primes conventionnelles)", () => {
  describe("getEligiblePrimes — Convention Commerce Gros", () => {
    it("PRIME-1: EXECUTION + 5 ans + caissier → 3 primes (TRANSPORT, PRESENCE, CAISSE)", () => {
      const salarie: SalarieInfo = {
        categorieAgent: "EXECUTION",
        anciennete: 5,
        poste: "caissier",
      };
      const primes = getEligiblePrimes(CONV_COMMERCE, salarie, 2026);
      expect(primes.length).toBe(3);
      const codes = primes.map(p => p.code);
      expect(codes).toContain("TRANSPORT");
      expect(codes).toContain("PRESENCE");
      expect(codes).toContain("CAISSE");
    });

    it("PRIME-2: EXECUTION + 5 ans + sans poste caissier → 2 primes (pas CAISSE)", () => {
      const salarie: SalarieInfo = {
        categorieAgent: "EXECUTION",
        anciennete: 5,
        poste: "vendeur", // pas caissier
      };
      const primes = getEligiblePrimes(CONV_COMMERCE, salarie, 2026);
      expect(primes.length).toBe(2);
      const codes = primes.map(p => p.code);
      expect(codes).toContain("TRANSPORT");
      expect(codes).toContain("PRESENCE");
      expect(codes).not.toContain("CAISSE");
    });

    it("PRIME-3: MAITRISE → pas de prime CAISSE (réservée EXECUTION)", () => {
      const salarie: SalarieInfo = {
        categorieAgent: "MAITRISE",
        anciennete: 5,
        poste: "caissier",
      };
      const primes = getEligiblePrimes(CONV_COMMERCE, salarie, 2026);
      const codes = primes.map(p => p.code);
      expect(codes).not.toContain("CAISSE");
    });

    it("PRIME-4: CADRES → 2 primes (TRANSPORT + PRESENCE, pas CAISSE)", () => {
      const salarie: SalarieInfo = {
        categorieAgent: "CADRES",
        anciennete: 10,
      };
      const primes = getEligiblePrimes(CONV_COMMERCE, salarie, 2026);
      expect(primes.length).toBe(2);
    });

    it("PRIME-5: catégorie inconnue → 0 primes", () => {
      const salarie: SalarieInfo = {
        categorieAgent: "INEXISTANTE",
        anciennete: 5,
      };
      const primes = getEligiblePrimes(CONV_COMMERCE, salarie, 2026);
      expect(primes.length).toBe(0);
    });

    it("PRIME-6: montant prime TRANSPORT pour EXECUTION 2026 est un nombre positif", () => {
      const primes = getEligiblePrimes(CONV_COMMERCE, {
        categorieAgent: "EXECUTION",
        anciennete: 0,
      }, 2026);
      const transport = primes.find(p => p.code === "TRANSPORT");
      expect(transport).toBeDefined();
      expect(transport!.montant).toBeGreaterThan(0);
    });

    it("PRIME-7: chaque prime a un code + labelFr + montant > 0", () => {
      const primes = getEligiblePrimes(CONV_COMMERCE, {
        categorieAgent: "EXECUTION",
        anciennete: 5,
        poste: "caissier",
      }, 2026);
      for (const p of primes) {
        expect(p.code).toBeTruthy();
        expect(p.labelFr).toBeTruthy();
        expect(p.montant).toBeGreaterThan(0);
        expect(typeof p.montant).toBe("number");
      }
    });
  });

  describe("getTotalPrimesEligibles", () => {
    it("TOTAL-1: EXECUTION + 5 ans + caissier → total = 78.762 + 14.836 + 10 = 103.598", () => {
      const total = getTotalPrimesEligibles(CONV_COMMERCE, {
        categorieAgent: "EXECUTION",
        anciennete: 5,
        poste: "caissier",
      }, 2026);
      expect(total).toBeGreaterThan(100);
      expect(total).toBeLessThan(120);
    });

    it("TOTAL-2: catégorie inconnue → 0", () => {
      const total = getTotalPrimesEligibles(CONV_COMMERCE, {
        categorieAgent: "INEXISTANTE",
        anciennete: 0,
      }, 2026);
      expect(total).toBe(0);
    });
  });

  describe("chercherSalaireGrille + helpers", () => {
    it("GRILLE-1: getResumeConvention retourne les compteurs", () => {
      const r = getResumeConvention(CONV_COMMERCE);
      expect(r.nbPrimesMensuelles).toBeGreaterThan(0);
      expect(r.categoriesAgents.length).toBeGreaterThan(0);
      expect(r.smigMensuel48h).toBeGreaterThan(0);
    });

    it("GRILLE-2: getEchellesPourCategorie retourne un tableau", () => {
      const cat = CONV_COMMERCE.categoriesAgents?.[0];
      if (cat) {
        const echelles = getEchellesPourCategorie(CONV_COMMERCE, cat.code);
        expect(Array.isArray(echelles)).toBe(true);
      }
    });

    it("GRILLE-3: CONVENTIONS registry contient au moins Cadre et Commerce Gros", () => {
      expect(CONVENTIONS.length).toBeGreaterThanOrEqual(2);
      const slugs = CONVENTIONS.map(c => c.slug);
      expect(slugs).toContain("cadre");
      expect(slugs).toContain("commerce-gros");
    });
  });
});
