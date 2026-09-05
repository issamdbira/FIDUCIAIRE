import { describe, it, expect } from "vitest";
import {
  POINTS_AVANTAGES_SMIG,
  POINTS_AVANTAGES_QUALITATIFS,
  TOUS_LES_POINTS,
  getPointAvantageSMIG,
  getPointAvantageQualitatif,
  getPointAvantage,
  calculerPlafondUnitaire,
  simulerAvantage,
  verifierCap5Pct,
  calculerTotalAvantagesSoumisAuCap,
} from "@/lib/payroll/avantages-exclus";

describe("Avantages exclus — Décret 2003-1098", () => {
  describe("Registre des points", () => {
    it("contient 9 points SMIG", () => {
      expect(POINTS_AVANTAGES_SMIG).toHaveLength(9);
    });

    it("contient 15 points qualitatifs", () => {
      expect(POINTS_AVANTAGES_QUALITATIFS).toHaveLength(15);
    });

    it("TOUS_LES_POINTS contient 24 points couvrant 1-24 sans doublon", () => {
      expect(TOUS_LES_POINTS).toHaveLength(24);
      const numeros = TOUS_LES_POINTS.map((p) => p.numero);
      expect(numeros).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
    });
  });

  describe("getPointAvantageSMIG / Qualitatif / getPointAvantage", () => {
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

    it("getPointAvantage trouve n'importe quel point", () => {
      expect(getPointAvantage(1)).toBeDefined();
      expect(getPointAvantage(9)).toBeDefined();
      expect(getPointAvantage(99)).toBeUndefined();
    });
  });

  describe("horsPlafond5pct", () => {
    it("les points 16, 17, 18, 19, 23, 24 sont hors plafond 5%", () => {
      for (const n of [16, 17, 18, 19, 23, 24]) {
        const p = getPointAvantageQualitatif(n);
        expect(p?.horsPlafond5pct).toBe(true);
      }
    });

    it("les points qualitatifs soumis au plafond ne sont pas marqués horsPlafond5pct", () => {
      for (const n of [3, 6, 9, 10, 11, 12, 15, 21, 22]) {
        const p = getPointAvantageQualitatif(n);
        expect(p?.horsPlafond5pct).toBe(false);
      }
    });
  });

  describe("calculerPlafondUnitaire", () => {
    it("calcule le plafond pour le point 1 (30% SMIG mensuel) en 2026", () => {
      const point = getPointAvantageSMIG(1)!;
      const plafond = calculerPlafondUnitaire(point, new Date("2026-06-01"));
      expect(plafond).toBeCloseTo(166.421, 1);
    });

    it("calcule le plafond pour le point 13 (3x SMIG horaire) en 2026", () => {
      const point = getPointAvantageSMIG(13)!;
      const plafond = calculerPlafondUnitaire(point, new Date("2026-06-01"));
      expect(plafond).toBeCloseTo(8.001, 1);
    });
  });

  describe("simulerAvantage", () => {
    it("exonère entièrement si le montant est sous le plafond", () => {
      const point = getPointAvantageSMIG(1)!;
      const result = simulerAvantage(point, new Date("2026-06-01"), 1, 100, 0);
      expect(result.montantTotal).toBe(100);
      expect(result.montantExonere).toBe(100);
      expect(result.montantSoumis).toBe(0);
    });

    it("soumet l'excédent si le montant dépasse le plafond", () => {
      const point = getPointAvantageSMIG(1)!;
      const result = simulerAvantage(point, new Date("2026-06-01"), 1, 200, 0);
      expect(result.montantTotal).toBe(200);
      expect(result.montantExonere).toBe(result.plafondTotal);
      expect(result.montantSoumis).toBeGreaterThan(0);
    });
  });

  describe("verifierCap5Pct", () => {
    it("autorise les avantages sous 5% de la masse salariale", () => {
      const result = verifierCap5Pct(30, 1000); // 5% = 50 → 30 < 50 → OK
      expect(result.respecte).toBe(true);
      expect(result.depassement).toBe(0);
    });

    it("détecte un dépassement au-dessus de 5%", () => {
      const result = verifierCap5Pct(80, 1000); // 5% = 50 → 80 > 50 → dépassement 30
      expect(result.respecte).toBe(false);
      expect(result.depassement).toBe(30);
      expect(result.plafond5pct).toBe(50);
    });

    it("retourne les montants corrects", () => {
      const result = verifierCap5Pct(60, 2000); // 5% = 100 → 60 < 100 → OK
      expect(result.plafond5pct).toBe(100);
      expect(result.totalAvantagesSoumis).toBe(60);
      expect(result.depassement).toBe(0);
    });
  });

  describe("calculerTotalAvantagesSoumisAuCap", () => {
    it("exclut les points hors plafond du calcul", () => {
      const avantageParPoint = new Map<number, number>();
      avantageParPoint.set(1, 30);
      avantageParPoint.set(16, 500); // hors plafond → ignoré
      const total = calculerTotalAvantagesSoumisAuCap(avantageParPoint);
      expect(total).toBe(30);
    });

    it("inclut tous les points soumis au plafond", () => {
      const avantageParPoint = new Map<number, number>();
      avantageParPoint.set(1, 50);
      avantageParPoint.set(13, 20);
      avantageParPoint.set(14, 10);
      const total = calculerTotalAvantagesSoumisAuCap(avantageParPoint);
      expect(total).toBe(80);
    });

    it("ignore les points hors plafond (16, 17, 18, 19, 23, 24)", () => {
      const avantageParPoint = new Map<number, number>();
      avantageParPoint.set(16, 200);
      avantageParPoint.set(17, 150);
      avantageParPoint.set(18, 100);
      avantageParPoint.set(19, 50);
      avantageParPoint.set(23, 300);
      avantageParPoint.set(24, 400);
      const total = calculerTotalAvantagesSoumisAuCap(avantageParPoint);
      expect(total).toBe(0);
    });
  });
});
