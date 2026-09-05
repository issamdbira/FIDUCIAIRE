import { describe, it, expect, beforeEach } from "vitest";
import {
  calculerIRPPAnnuel,
  calculerFraisProfessionnels,
  calculerFraisProfessionnelsRetraites,
  calculerDeductionsAnnuelles,
} from "@/lib/payroll/irpp";
import { reinitialiserPayrollConfig, getPayrollConfig, setPayrollConfig } from "@/lib/payroll/config";

describe("IRPP — calculs", () => {
  beforeEach(() => {
    reinitialiserPayrollConfig();
  });

  describe("calculerIRPPAnnuel", () => {
    it("retourne 0 pour une assiette fiscale nulle ou négative", () => {
      expect(calculerIRPPAnnuel(0, 0)).toBe(0);
      expect(calculerIRPPAnnuel(5000, 6000)).toBe(0); // deductions > assiette
    });

    it("retourne 0 dans la première tranche (0–5000 DT/an)", () => {
      expect(calculerIRPPAnnuel(5000, 0)).toBe(0);
      expect(calculerIRPPAnnuel(3000, 0)).toBe(0);
    });

    it("calcule l'IRPP pour un revenu de 15 000 DT/an (tranche 15%)", () => {
      // Assiette = 15000, deductions = 0
      // Tranche 0-5000 : 0%
      // Tranche 5000-10000 : 15% × 5000 = 750
      // Tranche 10000-15000 : 25% × 5000 = 1250
      // Total = 750 + 1250 = 2000
      const irpp = calculerIRPPAnnuel(15000, 0);
      expect(irpp).toBe(2000);
    });

    it("applique les déductions avant le calcul du barème", () => {
      const irppSansDeduction = calculerIRPPAnnuel(15000, 0);
      const irppAvecDeduction = calculerIRPPAnnuel(15000, 5000);
      expect(irppAvecDeduction).toBeLessThan(irppSansDeduction);
    });

    it("calcule l'IRPP pour la tranche maximale (40%)", () => {
      // Assiette très élevée, doit atteindre la tranche à 40%
      const irpp = calculerIRPPAnnuel(100000, 0);
      expect(irpp).toBeGreaterThan(0);
      // Vérifier que le taux marginal est bien 40% pour la dernière tranche
      const config = getPayrollConfig();
      const derniereTranche = config.baremeIRPP[config.baremeIRPP.length - 1];
      expect(derniereTranche.taux).toBe(0.40);
    });
  });

  describe("calculerFraisProfessionnels", () => {
    it("calcule 10% du salaire plafonné à 2000 DT/an", () => {
      const config = getPayrollConfig();
      // Salaire 10000/an → 10% = 1000 < 2000 → 1000
      expect(calculerFraisProfessionnels(10000)).toBe(1000);
      // Salaire 30000/an → 10% = 3000 > 2000 → plafonné à 2000
      expect(calculerFraisProfessionnels(30000)).toBe(config.fraisProPlafondActifsAnnuel);
    });
  });

  describe("calculerFraisProfessionnelsRetraites", () => {
    it("calcule 25% sans plafond", () => {
      const config = getPayrollConfig();
      const pension = 20000;
      expect(calculerFraisProfessionnelsRetraites(pension)).toBe(pension * config.fraisProTauxRetraites);
    });
  });

  describe("calculerDeductionsAnnuelles", () => {
    it("retourne 0 pour un célibataire sans enfants", () => {
      expect(calculerDeductionsAnnuelles({
        chefFamille: false, enfants: 0, etudiants: 0, infirmes: 0, autresDeductionsAnnuelles: 0,
      })).toBe(0);
    });

    it("ajoute la déduction chef de famille", () => {
      const config = getPayrollConfig();
      const result = calculerDeductionsAnnuelles({
        chefFamille: true, enfants: 0, etudiants: 0, infirmes: 0, autresDeductionsAnnuelles: 0,
      });
      expect(result).toBe(config.deductionChefFamille);
    });

    it("plafonne le nombre d'enfants + étudiants", () => {
      const config = getPayrollConfig();
      const result = calculerDeductionsAnnuelles({
        chefFamille: false, enfants: 6, etudiants: 2, infirmes: 0, autresDeductionsAnnuelles: 0,
      });
      // Plafond = 4, donc seuls 4 enfants sont comptés
      const expected = 4 * config.deductionEnfant;
      expect(result).toBe(expected);
    });

    it("les enfants infirmes n'ont pas de plafond", () => {
      const config = getPayrollConfig();
      const result = calculerDeductionsAnnuelles({
        chefFamille: false, enfants: 0, etudiants: 0, infirmes: 5, autresDeductionsAnnuelles: 0,
      });
      expect(result).toBe(5 * config.deductionInfirme);
    });
  });

  describe("Edge cases", () => {
    it("IRPP est monotone : assiette plus élevée → IRPP plus élevé", () => {
      const irpp1 = calculerIRPPAnnuel(10000, 0);
      const irpp2 = calculerIRPPAnnuel(20000, 0);
      const irpp3 = calculerIRPPAnnuel(50000, 0);
      expect(irpp2).toBeGreaterThan(irpp1);
      expect(irpp3).toBeGreaterThan(irpp2);
    });

    it("frais professionnels sont nuls pour un revenu nul", () => {
      expect(calculerFraisProfessionnels(0)).toBe(0);
    });

    it("autres déductions annuelles sont ajoutées", () => {
      const sansAutres = calculerDeductionsAnnuelles({
        chefFamille: true, enfants: 0, etudiants: 0, infirmes: 0, autresDeductionsAnnuelles: 0,
      });
      const avecAutres = calculerDeductionsAnnuelles({
        chefFamille: true, enfants: 0, etudiants: 0, infirmes: 0, autresDeductionsAnnuelles: 1000,
      });
      expect(avecAutres - sansAutres).toBe(1000);
    });
  });
});
