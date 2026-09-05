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
 *
 * Sprint 3 — Décret 2003-1098 : les avantages exclus (isAvantageExclus)
 * sont traités avec plafond individuel par point puis contrôle global 5%.
 */

import { calculerCotisationCNSS, calculerCSSAnnuelle } from "./cnss";
import { calculerDeductionsAnnuelles, calculerFraisProfessionnels, calculerIRPPAnnuel } from "./irpp";
import { getPayrollConfig } from "./config";
import { calculerPlafondUnitaire, getPointAvantageSMIG } from "./avantages-exclus";
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

/**
 * Calcule le plafond légal d'un avantage exclu pour l'année de paie.
 * Retourne 0 si le point n'est pas identifiable ou si le code est invalide.
 */
function getPlafondAvantageExclus(
  codeAvantage: string,
  annee: number
): number {
  const numero = parseInt(codeAvantage, 10);
  if (isNaN(numero)) return 0;
  const point = getPointAvantageSMIG(numero);
  if (!point) return 0;
  const dateRef = new Date(annee, 6, 1); // milieu d'année pour obtenir le SMIG en vigueur
  return calculerPlafondUnitaire(point, dateRef);
}

export function runPayrollEngine(input: PayrollInput): PayrollResult {
  const { employeur, salarie, periode, elements, autresDeductionsFiscalesAnnuelles = 0, avantagesExclus } = input;

  // ═══════════════════════════════════════════════════════════════════
  // Étape 3.1 — Initialisation des accumulateurs Décret 2003-1098
  // ═══════════════════════════════════════════════════════════════════
  let totalAvantagesBruts = 0;
  let totalExonereIndividuel = 0;
  let totalReintegreIndividuel = 0;

  const elementsCalculables = elements.filter(estCalculable).map(documenterElement);
  const elementsEnAttente = elements.filter((e) => !estCalculable(e)).map(documenterElement);

  // ═══════════════════════════════════════════════════════════════════
  // Étape 3.2 — Traitement individuel des avantages exclus
  // ═══════════════════════════════════════════════════════════════════
  for (const element of elementsCalculables) {
    if (element.isAvantageExclus && element.codeAvantage) {
      const plafondLegal = getPlafondAvantageExclus(element.codeAvantage, periode.annee);
      const montantElement = element.montant;

      const partExoneree = Math.min(montantElement, plafondLegal);
      const partSoumise = montantElement - partExoneree;

      totalAvantagesBruts += montantElement;
      totalExonereIndividuel += partExoneree;
      totalReintegreIndividuel += partSoumise;

      // Documenter le traitement de cet avantage exclus
      element.inclusBaseCNSS = partSoumise > 0;
      element.inclusBaseFiscale = partSoumise > 0;
      element.regleAppliquee =
        `Décret 2003-1098 point ${element.codeAvantage} : plafond ${round2(plafondLegal)} DT, exonéré ${round2(partExoneree)} DT, réintégré ${round2(partSoumise)} DT`;
    }
  }

  const totalRemunerationBrute = elementsCalculables.reduce((sum, e) => sum + e.montant, 0);

  // ═══════════════════════════════════════════════════════════════════
  // Étape 3.3 — Contrôle global de l'Article 3 (règle des 5%)
  // ═══════════════════════════════════════════════════════════════════
  const plafondGlobalArticle3 = round2(totalRemunerationBrute * 0.05);
  const exonereeDefinitive = Math.min(totalExonereIndividuel, plafondGlobalArticle3);
  const reintegreArticle3 = totalExonereIndividuel - exonereeDefinitive;

  // Base CNSS standard (hors avantages exclus — leur part exonérée est exclue par défaut)
  let baseCNSS = elementsCalculables.reduce((sum, e) => {
    // Les avantages exclus ont un traitement partSoumisCNSS à 0 car traités séparément
    return sum + partSoumiseCNSS(e);
  }, 0);

  // ═══════════════════════════════════════════════════════════════════
  // Étape 3.4 — Réintégration dans l'assiette sociale
  // ═══════════════════════════════════════════════════════════════════
  baseCNSS = baseCNSS + totalReintegreIndividuel + reintegreArticle3;

  const config = getPayrollConfig();
  // Secteur agricole : taux spécifique piloté par /admin. Non-agricole (défaut) :
  // taux standard, dépendant de l'année (cf. cnss.ts) sauf override admin.
  const cotisationCNSS =
    employeur.secteur === "agricole"
      ? baseCNSS * config.cnssSalarialAgricole
      : calculerCotisationCNSS(baseCNSS, periode.annee);
  const tauxPatronal = employeur.secteur === "agricole" ? config.cnssPatronalAgricole : config.cnssPatronalNonAgricole;
  const cotisationPatronale = baseCNSS * tauxPatronal;

  // Base fiscale mensuelle = rémunération brute - cotisation CNSS
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
  const assietteFiscaleAnnuelle = Math.max(netAnnuelAvantImpot - deductionsAnnuelles, 0);
  const irppMensuel = calculerIRPPAnnuel(netAnnuelAvantImpot, deductionsAnnuelles) / 12;

  const css = calculerCSSAnnuelle(assietteFiscaleAnnuelle) / 12;

  // "Autres retenues" = éléments de type retenue/absence déjà inclus (montant négatif)
  // dans totalRemunerationBrute ; on les isole ici pour l'affichage détaillé.
  const totalAutresRetenues = elementsCalculables
    .filter((e) => e.type === "retenue" || e.type === "absence")
    .reduce((sum, e) => sum + Math.abs(e.montant), 0);

  const netAPayer = totalRemunerationBrute - cotisationCNSS - irppMensuel - css;

  // ═══════════════════════════════════════════════════════════════════
  // Étape 3.5 — Mapping du retour
  // ═══════════════════════════════════════════════════════════════════
  return {
    elements: elementsCalculables,
    totalRemunerationBrute: round2(totalRemunerationBrute),
    baseCNSS: round2(baseCNSS),
    cotisationCNSS: round2(cotisationCNSS),
    cotisationPatronale: round2(cotisationPatronale),
    baseFiscaleMensuelle: round2(baseFiscaleMensuelle),
    fraisProfessionnelsMensuel: round2(fraisProfessionnelsAnnuels / 12),
    deductionsFamilialesMensuelles: round2(deductionsAnnuellesFamiliales / 12),
    assietteImposableNetteMensuelle: round2(assietteFiscaleAnnuelle / 12),
    irppMensuel: round2(irppMensuel),
    css: round2(css),
    totalAutresRetenues: round2(totalAutresRetenues),
    netAPayer: round2(netAPayer),
    elementsEnAttente,
    avantagesTotal: round2(totalAvantagesBruts),
    avantagesExoneresIndividuels: round2(totalExonereIndividuel),
    avantagesReintegresIndividuels: round2(totalReintegreIndividuel),
    avantagesReintegresArticle3: round2(reintegreArticle3),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
