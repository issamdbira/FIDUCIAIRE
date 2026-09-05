import { describe, it, expect, beforeEach } from "vitest";
import { trouverBrutPourNet } from "@/lib/payroll/netToBrut";
import { runPayrollEngine } from "@/lib/payroll/engine";
import { reinitialiserPayrollConfig } from "@/lib/payroll/config";
import type { PayrollInput } from "@/lib/payroll/types";

function makeInputSansMontant(): Omit<PayrollInput, "elements"> {
  return {
    employeur: { nom: "Test SARL", secteur: "non_agricole" },
    salarie: { nom: "Doe", prenom: "John", chefFamille: false, enfants: 0, etudiants: 0, infirmes: 0 },
    periode: { mois: 1, annee: 2025 },
  };
}

describe("trouverBrutPourNet (round-trip)", () => {
  beforeEach(() => {
    reinitialiserPayrollConfig();
  });

  it("trouve le brut correspondant à un net de 800 DT", () => {
    const netSouhaite = 800;
    const { brut, resultat } = trouverBrutPourNet(netSouhaite, makeInputSansMontant());
    // Le net calculé à partir du brut trouvé doit être proche du net souhaité
    expect(resultat.netAPayer).toBeCloseTo(netSouhaite, 1);
    expect(brut).toBeGreaterThan(netSouhaite); // brut > net
  });

  it("round-trip : brut → net → brut retrouve la même valeur", () => {
    const brutOriginal = 1500;
    // 1) Calculer le net pour ce brut
    const resultat1 = runPayrollEngine({
      ...makeInputSansMontant(),
      elements: [{ id: "1", type: "salaire_base", label: "Salaire", montant: brutOriginal, traitement: "standard" }],
    });
    const net = resultat1.netAPayer;
    // 2) Retrouver le brut pour ce net
    const { brut: brutRetrouve } = trouverBrutPourNet(net, makeInputSansMontant());
    expect(brutRetrouve).toBeCloseTo(brutOriginal, 0);
  });

  it("fonctionne pour un petit salaire (net = 400 DT)", () => {
    const netSouhaite = 400;
    const { resultat } = trouverBrutPourNet(netSouhaite, makeInputSansMontant());
    expect(resultat.netAPayer).toBeCloseTo(netSouhaite, 1);
  });

  it("fonctionne pour un salaire élevé (net = 5000 DT)", () => {
    const netSouhaite = 5000;
    const { resultat } = trouverBrutPourNet(netSouhaite, makeInputSansMontant());
    expect(resultat.netAPayer).toBeCloseTo(netSouhaite, 1);
  });
});
