import { runPayrollEngine } from "./engine";
import type { PayrollInput } from "./types";

/**
 * Calcule le salaire brut correspondant à un net souhaité, par recherche
 * dichotomique sur le moteur central (runPayrollEngine).
 *
 * On ne suppose PAS de formule inverse fermée : l'IRPP est un barème
 * progressif avec plusieurs déductions (frais professionnels 10%,
 * déductions familiales), donc net(brut) n'est pas simplement inversible
 * algébriquement. On réutilise le même moteur que Brut→Net pour garantir
 * une cohérence totale entre les deux sens de calcul.
 */
export function trouverBrutPourNet(
  netSouhaite: number,
  inputSansMontant: Omit<PayrollInput, "elements">,
  maxIterations = 60,
  tolerance = 0.005
): { brut: number; resultat: ReturnType<typeof runPayrollEngine> } {
  let bas = 0;
  let haut = Math.max(netSouhaite * 2, 100000); // large borne haute de sécurité

  const calculerNetPourBrut = (brut: number) => {
    const resultat = runPayrollEngine({
      ...inputSansMontant,
      elements: [{ id: "brut-test", type: "salaire_base", label: "Salaire de base", montant: brut, traitement: "standard" }],
    });
    return resultat;
  };

  let dernierResultat = calculerNetPourBrut(haut);
  // Sécurité : si même la borne haute ne suffit pas, on l'agrandit
  while (dernierResultat.netAPayer < netSouhaite && haut < 10_000_000) {
    haut *= 2;
    dernierResultat = calculerNetPourBrut(haut);
  }

  for (let i = 0; i < maxIterations; i++) {
    const milieu = (bas + haut) / 2;
    dernierResultat = calculerNetPourBrut(milieu);
    if (Math.abs(dernierResultat.netAPayer - netSouhaite) < tolerance) {
      return { brut: Math.round(milieu * 100) / 100, resultat: dernierResultat };
    }
    if (dernierResultat.netAPayer < netSouhaite) {
      bas = milieu;
    } else {
      haut = milieu;
    }
  }

  const brutFinal = (bas + haut) / 2;
  return { brut: Math.round(brutFinal * 100) / 100, resultat: calculerNetPourBrut(brutFinal) };
}
