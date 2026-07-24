/**
 * PayrollEngine — moteur central de traitement de paie.
 * Indépendant de React. Reçoit un PayrollInput, retourne un PayrollResult.
 *
 * Logique : Éléments → Brut → Base CNSS → Cotisations → Base fiscale → IRPP
 * → Autres retenues → Net à payer.
 *
 * RÈGLE ABSOLUE : les éléments dont le traitement CNSS/fiscal n'est pas
 * "standard" et n'a pas de règle validée (traitement = "en_attente_de_regle")
 * sont exclus du calcul et remontés séparément dans `elementsEnAttente`.
 * On n'invente jamais de règle par défaut pour ces éléments.
 */

import { calculerCotisationCNSS, calculerCSS } from "./cnss";
import { calculerDeductionsAnnuelles, calculerFraisProfessionnels, calculerIRPPAnnuel } from "./irpp";
import { TAUX_CNSS_PAR_SECTEUR } from "./constantes-complementaires";
import type { PayrollInput, PayrollItem, PayrollResult } from "./types";

function estCalculable(item: PayrollItem): boolean {
  return item.traitement !== "en_attente_de_regle";
}

/**
 * Détermine la part d'un élément soumise à la base CNSS.
 * Pour le MVP : "standard" = 100% soumis, "exonere_total" = 0%,
 * "exonere_partiel" nécessite une règle spécifique (non implémentée sans
 * source) donc traité comme "en_attente_de_regle" en amont.
 */
function partSoumiseCNSS(item: PayrollItem): number {
  if (item.traitement === "standard") return item.montant;
  if (item.traitement === "exonere_total") return 0;
  return 0; // exonere_partiel sans règle validée : ne devrait pas arriver ici
}

/**
 * Documente la règle appliquée à un élément pour l'affichage du détail
 * technique (section 9 du prompt de finalisation).
 */
function documenterElement(item: PayrollItem): PayrollItem {
  if (item.traitement === "en_attente_de_regle") {
    return {
      ...item,
      inclusDansBrut: false,
      inclusBaseCNSS: false,
      inclusBaseFiscale: false,
      regleAppliquee: "aucune (en attente de validation)",
    };
  }
  const inclusCNSS = item.traitement === "standard";
  return {
    ...item,
    inclusDansBrut: true,
    inclusBaseCNSS: inclusCNSS,
    inclusBaseFiscale: inclusCNSS, // MVP : même base que CNSS pour les éléments standard
    regleAppliquee:
      item.traitement === "standard"
        ? "règle standard : 100% soumis CNSS et IRPP"
        : "exonération totale CNSS/IRPP",
  };
}

export function runPayrollEngine(input: PayrollInput): PayrollResult {
  const { employeur, salarie, periode, elements, autresDeductionsFiscalesAnnuelles = 0 } = input;

  const elementsCalculables = elements.filter(estCalculable).map(documenterElement);
  const elementsEnAttente = elements.filter((e) => !estCalculable(e)).map(documenterElement);

  const totalRemunerationBrute = elementsCalculables.reduce((sum, e) => sum + e.montant, 0);

  const baseCNSS = elementsCalculables.reduce((sum, e) => sum + partSoumiseCNSS(e), 0);
  // Secteur agricole : taux spécifique (source CNSS-DS). Non-agricole (défaut) :
  // taux standard, dépendant de l'année (cf. cnss.ts).
  const cotisationCNSS =
    employeur.secteur === "agricole"
      ? baseCNSS * TAUX_CNSS_PAR_SECTEUR.agricole.salarial
      : calculerCotisationCNSS(baseCNSS, periode.annee);
  const tauxPatronal =
    employeur.secteur === "agricole" ? TAUX_CNSS_PAR_SECTEUR.agricole.patronal : TAUX_CNSS_PAR_SECTEUR.non_agricole.patronal;
  const cotisationPatronale = baseCNSS * tauxPatronal;

  // Base fiscale mensuelle = rémunération brute - cotisation CNSS (les éléments
  // exonérés totalement d'IRPP ne sont pas encore gérés séparément - MVP : même
  // base que CNSS pour les éléments standard)
  const baseFiscaleMensuelle = totalRemunerationBrute - cotisationCNSS;

  const deductionsAnnuellesFamiliales = calculerDeductionsAnnuelles({
    chefFamille: salarie.chefFamille,
    enfants: salarie.enfants,
    etudiants: salarie.etudiants,
    infirmes: salarie.infirmes,
    autresDeductionsAnnuelles: autresDeductionsFiscalesAnnuelles,
  });

  const netAnnuelAvantImpot = baseFiscaleMensuelle * 12;
  const fraisProfessionnelsAnnuels = calculerFraisProfessionnels(netAnnuelAvantImpot);
  const deductionsAnnuelles = deductionsAnnuellesFamiliales + fraisProfessionnelsAnnuels;
  const irppMensuel = calculerIRPPAnnuel(netAnnuelAvantImpot, deductionsAnnuelles) / 12;

  const css = calculerCSS(baseFiscaleMensuelle, periode.annee);

  // "Autres retenues" = éléments de type retenue/absence déjà inclus (montant négatif)
  // dans totalRemunerationBrute ; on les isole ici pour l'affichage détaillé.
  const totalAutresRetenues = elementsCalculables
    .filter((e) => e.type === "retenue" || e.type === "absence")
    .reduce((sum, e) => sum + Math.abs(e.montant), 0);

  const netAPayer = totalRemunerationBrute - cotisationCNSS - irppMensuel - css;

  return {
    elements: elementsCalculables,
    totalRemunerationBrute: round2(totalRemunerationBrute),
    baseCNSS: round2(baseCNSS),
    cotisationCNSS: round2(cotisationCNSS),
    cotisationPatronale: round2(cotisationPatronale),
    baseFiscaleMensuelle: round2(baseFiscaleMensuelle),
    irppMensuel: round2(irppMensuel),
    css: round2(css),
    totalAutresRetenues: round2(totalAutresRetenues),
    netAPayer: round2(netAPayer),
    elementsEnAttente,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
