import { describe, it, expect } from "vitest";
import { validerSalarie, validerEmployeur } from "@/lib/cnss-declarations/validator";
import type { SalarieCNSS, EmployeurCNSS } from "@/lib/cnss-declarations/types";

describe("CNSS Declarations Validator", () => {
  describe("validerSalarie", () => {
    it("accepte un salarié valide", () => {
      const sal: SalarieCNSS = {
        matricule: "12345678",
        cle: "01",
        nom: "Ben Ahmed",
        cin: "12345678",
        salaire: "5000000",
      };
      expect(validerSalarie(sal)).toHaveLength(0);
    });

    it("rejette un matricule invalide (non numérique)", () => {
      const sal: SalarieCNSS = {
        matricule: "ABC",
        cle: "01",
        nom: "Test",
        cin: "12345678",
        salaire: "5000000",
      };
      const errors = validerSalarie(sal);
      expect(errors).toContain("Matricule");
    });

    it("rejette un matricule trop long (>8 chiffres)", () => {
      const sal: SalarieCNSS = {
        matricule: "123456789",
        cle: "01",
        nom: "Test",
        cin: "12345678",
        salaire: "5000000",
      };
      const errors = validerSalarie(sal);
      expect(errors).toContain("Matricule");
    });

    it("rejette une clé invalide", () => {
      const sal: SalarieCNSS = {
        matricule: "12345678",
        cle: "ABC",
        nom: "Test",
        cin: "12345678",
        salaire: "5000000",
      };
      const errors = validerSalarie(sal);
      expect(errors).toContain("Clé");
    });

    it("rejette un nom vide", () => {
      const sal: SalarieCNSS = {
        matricule: "12345678",
        cle: "01",
        nom: "",
        cin: "12345678",
        salaire: "5000000",
      };
      const errors = validerSalarie(sal);
      expect(errors).toContain("Nom");
    });

    it("rejette un CIN invalide", () => {
      const sal: SalarieCNSS = {
        matricule: "12345678",
        cle: "01",
        nom: "Test",
        cin: "ABCD",
        salaire: "5000000",
      };
      const errors = validerSalarie(sal);
      expect(errors).toContain("CIN");
    });

    it("rejette un salaire non numérique", () => {
      const sal: SalarieCNSS = {
        matricule: "12345678",
        cle: "01",
        nom: "Test",
        cin: "12345678",
        salaire: "5000.5",
      };
      const errors = validerSalarie(sal);
      expect(errors).toContain("Salaire");
    });

    it("cumule plusieurs erreurs simultanées", () => {
      const sal: SalarieCNSS = {
        matricule: "",
        cle: "",
        nom: "",
        cin: "",
        salaire: "",
      };
      const errors = validerSalarie(sal);
      expect(errors).toContain("Matricule");
      expect(errors).toContain("Clé");
      expect(errors).toContain("Nom");
      expect(errors).toContain("CIN");
      expect(errors).toContain("Salaire");
    });
  });

  describe("validerEmployeur", () => {
    it("accepte un employeur valide", () => {
      const emp: EmployeurCNSS = {
        num: "12345678",
        cle: "01",
        code: "1234",
        anneeDef: 2025,
      };
      expect(validerEmployeur(emp)).toHaveLength(0);
    });

    it("rejette un numéro employeur invalide", () => {
      const emp: EmployeurCNSS = {
        num: "ABC",
        cle: "01",
        code: "1234",
        anneeDef: 2025,
      };
      expect(validerEmployeur(emp)).toContain("Num");
    });

    it("rejette une clé invalide", () => {
      const emp: EmployeurCNSS = {
        num: "12345678",
        cle: "999",
        code: "1234",
        anneeDef: 2025,
      };
      expect(validerEmployeur(emp)).toContain("Clé");
    });

    it("rejette un code trop long (>4 chiffres)", () => {
      const emp: EmployeurCNSS = {
        num: "12345678",
        cle: "01",
        code: "12345",
        anneeDef: 2025,
      };
      expect(validerEmployeur(emp)).toContain("Code");
    });

    it("accepte un numéro court (1-8 chiffres)", () => {
      const emp: EmployeurCNSS = {
        num: "1",
        cle: "1",
        code: "1",
        anneeDef: 2025,
      };
      expect(validerEmployeur(emp)).toHaveLength(0);
    });
  });
});
