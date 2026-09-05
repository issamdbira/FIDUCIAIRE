import { describe, it, expect } from "vitest";
import {
  POINTS_AVANTAGES_SMIG,
  POINTS_AVANTAGES_QUALITATIF,
  getPointAvantageSMIG,
  getPointAvantageQualitatif,
  estPointDuDecret,
  estHorsPlafond5pct,
  calculerPlafondUnitaire,
  simulerAvantage,
  controlerPlafondGlobal5pct,
  traiterAvantageDeclare,
} from "@/lib/payroll/avantages-exclus";

describe("Avantages exclus — Décret 2003-1098", () => {
  describe("Registre des points", () => {
    it("contient 9 points SMIG", () => {
      expect(POINTS_AVANTAGES_SMIG).toHaveLength(9);
    });

    it("contient 15 points qualitatifs", () => {
      expect(POINTS_AVANTAGES_QUALITATIF).toHaveLength(15);
    });

    it("les 24 points couvrent les numéros 1-24 sans doublon", () => {
      const numerosSMIG = POINTS_AVANTAGES_SMIG.map((p) => p.numero);
      const numerosQual = POINTS_AVANTAGES_QUALITATIF.map((p) => p.numero);
      const all = [...numerosSMIG, ...numerosQual].sort((a, b) => a - b);
      expect(all).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    });

    it("estPointDuDecret retourne true pour tous les numéros 1-24", () => {
      for (let i = 1; i <= 24; i++) {
        expect(estPointDuDecret(i)).toBe(true);
      }
    });
  });

  describe("getPointAvantageSMIG / Qualitatif", () => {
    it("trouve le point 1 (SMIG)", () => {
      const p = getPointAvantageSMIG(1);
      expect(p).toBeDefined();
      expect(p!.titre).toContain("rentrée scolaire");
    });

    it("retourne undefined pour un point qualitatif via getPointAvantageSMIG", () => {
      expect(getPointAvantageSMIG(3)).toBeUndefined();
    });

    it("trouve le point 9 (qualitatif)", () => {
      const p = getPointAvantageQualitatif(9);
      expect(p).toBeDefined();
      expect(p!.titre).toContain("malheureux");
    });
  });

  describe("estHorsPlafond5pct", () => {
    it("les points 16, 17, 18, 19, 23, 24 sont hors plafond", () => {
      for (const n of [16, 17, 18, 19, 23, 24]) {
        expect(estHorsPlafond5pct(n)).toBe(true);
      }
    });

    it("les autres points sont soumis au plafond", () => {
      for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 21, 22]) {
        expect(estHorsPlafond5pct(n)).toBe(false);
      }
    });
  });

  describe("calculerPlafondUnitaire", () => {
    it("calcule le plafond pour le point 1 (30% SMIG mensuel) en 2026", () => {
      const point = getPointAvantageSMIG(1)!;
      const plafond = calculerPlafondUnitaire(point, new Date("2026-06-01"));
      // SMIG 48h 2026 = 554.736 → 30% = 166.421 (arrondi à 3 décimales)
      expect(plafond).toBeCloseTo(166.421, 1);
    });

    it("calcule le plafond pour le point 13 (3x SMIG horaire) en 2026", () => {
      const point = getPointAvantageSMIG(13)!;
      const plafond = calculerPlafondUnitaire(point, new Date("2026-06-01"));
      // SMIG horaire = 554.736 / (48*52/12) = 554.736 / 208 ≈ 2.667
      // 3 × 2.667 ≈ 8.001
      expect(plafond).toBeCloseTo(8.001, 1);
    });
  });

  describe("simulerAvantage", () => {
    it("exonère entièrement si le montant est sous le plafond", () => {
      const point = getPointAvantageSMIG(1)!;
      // 1 enfant, montant 100 DT (sous le plafond de ~166 DT)
      const result = simulerAvantage(point, new Date("2026-06-01"), 1, 100, 0);
      expect(result.montantTotal).toBe(100);
      expect(result.montantExonere).toBe(100);
      expect(result.montantSoumis).toBe(0);
    });

    it("soumet l'excédent si le montant dépasse le plafond", () => {
      const point = getPointAvantageSMIG(1)!;
      // 1 enfant, montant 200 DT (au-dessus du plafond de ~166 DT)
      const result = simulerAvantage(point, new Date("2026-06->01"), 1, 200, 0);
      expect(result.montantTotal).toBe(200);
      expect(result.montantExonere).toBe(result.plafondTotal);
      expect(result.montantSoumis).toBeGreaterThan(0);
    });
  });

  describe("controlerPlafondGlobal5pct", () => {
    it("autorise les avantages sous 5% de la masse salariale", () => {
      const result = controlerPlafondGlobal5pct(
        [{ numero: 1, montant: 30 }],
        1000 // 5% = 50 → 30 < 50 → OK
      );
      expect(result.depassement).toBe(0);
      expect(result.montantReintegre).toBe(0);
    });

    it("détecte un dépassement au-dessus de 5%", () => {
      const result = controlerPlafondGlobal5pct(
        [{ numero: 1, montant: 80 }],
        1000 // 5% = 50 → 80 > 50 → dépassement de 30
      );
      expect(result.depassement).toBe(30);
      expect(result.montantReintegre).toBe(30);
    });

    it("exclut les points hors plafond du calcul", () => {
      const result = controlerPlafondGlobal5pct(
        [
          { numero: 1, montant: 30 },
          { numero: 16, montant: 500 }, // hors plaf/ond → ignoré
        ],
        1000
      );
      expect(result.totalAvantagesSoumisAuCap).toBe(30); // seul le point 1 compte
      expect(result.depassement).toBe(0); // 30 < 50
    });
  });

  describe("traiterAvantageDeclare", () => {
    it("identifie un point SMIG (point 1)", () => {
      const result = traiterAvantageDeclare({ numero: 1, montant: 100 });
      expect(result.type).toBe("smig");
      expect(result.valide).toBe(true);
      expect(result.titre).toContain("rentrée");
      expect(result.horsPlafond5pct).toBe(false);
      expect(result.montantDeclare).toBe(100);
    });

    it("identifie un point qualitatif (point 10)", () => {
      const result = traiterAvantageDeclare({ numero: 10, montant: 50 });
      expect(result.type).toBe("qualitatif");
      expect(result.valide).toBe(true);
      expect(result.condition).toBeDefined();
      expect(result.horsPlafond5pct).toBe(false);
    });

    it("identifie un point qualitatif hors plafond 5% (point 16)", () => {
      const result = traiterAvantageDeclare({ numero: 16, montant: 200 });
      expect(result.type).toBe("qualitatif");
      expect(result.horsPlafond5pct).toBe(true);
    });

    it("marque un numéro inconnu comme invalide", () => {
      const result = traiterAvantageDeclare({ numero: 99, montant: 100 });
      expect(result.type).toBe("inconnu");
      expect(result.valide).toBe(false);
      expect(result.titre).toBeUndefined();
    });

    it("fonctionne pour tous les 24 points du décret", () => {
      for (let i = 1; i <= 24; i++) {
        const result = traiterAvantageDeclare({ numero: i, montant: 0 });
        expect(result.valide).toBe(true);
        expect(result.type).not.toBe("inconnu");
      }
    });
  });
});
