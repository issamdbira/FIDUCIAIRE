import { describe, it, expect, beforeEach } from "vitest";
import {
  calculerCotisationCNSS,
  getTauxCotisationCNSS,
  getSmigPourAnnee,
  calculerCSSAnnuelle,
  SMIG_48H_PAR_ANNEE,
} from "@/lib/payroll/cnss";
import { reinitialiserPayrollConfig, getPayrollConfig, setPayrollConfig } from "@/lib/payroll/config";

describe("CNSS — calculs", () => {
  beforeEach(() => {
    reinitialiserPayrollConfig();
  });

  describe("getTauxCotisationCNSS", () => {
    it("retourne le taux historique (9.18%) pour les années avant 2025", () => {
      expect(getTauxCotisationCNSS(2024)).toBe(0.0918);
      expect(getTauxCotisationCNSS(2020)).toBe(0.0918);
    });

    it("retourne le taux configurable pour 2025+", () => {
      const config = getPayrollConfig();
      expect(getTauxCotisationCNSS(2025)).toBe(config.cnssSalarialNonAgricole);
    });
  });

  describe("calculerCotisationCNSS", () => {
    it("calcule la cotisation pour un salaire de 1000 DT en 2025", () => {
      const result = calculerCotisationCNSS(1000, 2025);
      const config = getPayrollConfig();
      expect(result).toBeCloseTo(1000 * config.cnssSalarialNonAgricole, 4);
    });

    it("retourne 0 pour un salaire de 0", () => {
      expect(calculerCotisationCNSS(0, 2025)).toBe(0);
    });
  });

  describe("getSmigPourAnnee", () => {
    it("retourne le SMIG 48h correct pour 2025", () => {
      expect(getSmigPourAnnee(2025, 48)).toBe(528.320);
    });

    it("retourne le SMIG 48h correct pour 2026", () => {
      expect(getSmigPourAnnee(2026, 48)).toBe(554.736);
    });

    it("retourne le SMIG 40h correct pour 2026", () => {
      expect(getSmigPourAnnee(2026, 40)).toBe(470.251);
    });

    it("utilise la dernière année connue si l'année est dans le futur", () => {
      const smig2029 = getSmigPourAnnee(2029, 48);
      const dernierSMIG = SMIG_48H_PAR_ANNEE[2028]; // 611.520
      expect(smig2029).toBe(dernierSMIG);
    });

    it("utilise la première année connue si l'année est avant le référentiel", () => {
      const smig2010 = getSmigPourAnnee(2010, 48);
      expect(smig2010).toBeGreaterThan(0);
    });
  });

  describe("calculerCSSAnnuelle", () => {
    it("retourne 0 si CSS est désactivée", () => {
      const config = getPayrollConfig();
      setPayrollConfig({ ...config, cssActive: false });
      expect(calculerCSSAnnuelle(50000)).toBe(0);
    });

    it("retourne 0 si l'assiette est sous le seuil d'exonération", () => {
      const config = getPayrollConfig();
      expect(calculerCSSAnnuelle(config.cssSeuilExonerationAnnuel - 1)).toBe(0);
    });

    it("calcule la CSS au taux configuré au-dessus du seuil", () => {
      const config = getPayrollConfig();
      const assiette = 10000;
      const expected = assiette * config.cssTaux;
      expect(calculerCSSAnnuelle(assiette)).toBeCloseTo(expected, 4);
    });
  });

  describe("Edge cases", () => {
    it("calculerCotisationCNSS retourne 0 pour un salaire négatif", () => {
      expect(calculerCotisationCNSS(-100, 2025)).toBeLessThanOrEqual(0);
    });

    it("getSmigPourAnnee retourne des valeurs cohérentes (croissance)", () => {
      const smig2024 = getSmigPourAnnee(2024, 48);
      const smig2025 = getSmigPourAnnee(2025, 48);
      const smig2026 = getSmigPourAnnee(2026, 48);
      expect(smig2025).toBeGreaterThan(smig2024);
      expect(smig2026).toBeGreaterThan(smig2025);
    });

    it("SMIG 40h est inférieur au SMIG 48h pour la même année", () => {
      expect(getSmigPourAnnee(2026, 40)).toBeLessThan(getSmigPourAnnee(2026, 48));
    });
  });
});
