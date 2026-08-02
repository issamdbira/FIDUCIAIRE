/**
 * Fonctions de calcul CNSS réutilisables — SOURCE UNIQUE pour tout le projet.
 * Ne pas dupliquer ces constantes/fonctions ailleurs (PaieCNSS, PayrollEngine,
 * futur générateur de fiche de paie doivent tous importer d'ici).
 *
 * SOURCE : https://secu.tn/fr/calculateur-retraite-cnss.html
 * (taux 9.68% depuis 2025, 9.18% avant)
 */

export const TAUX_COTISATION_CNSS_2025 = 0.0968;
export const TAUX_COTISATION_CNSS_AVANT_2025 = 0.0918;

export function getTauxCotisationCNSS(annee: number): number {
  return annee >= 2025 ? TAUX_COTISATION_CNSS_2025 : TAUX_COTISATION_CNSS_AVANT_2025;
}

export function calculerCotisationCNSS(salaireBrut: number, annee: number): number {
  return salaireBrut * getTauxCotisationCNSS(annee);
}

/**
 * CSS (Contribution Sociale de Solidarité) : 0.5% en 2023-2024-2025 (1% les
 * autres années depuis 2018). Supprimée à partir de janvier 2026 (loi de
 * finances 2026). SOURCE : https://secu.tn/fr/calculateur-retraite-non-salaries.html
 *
 * CORRIGÉ le 19/07/2026 : la CSS se calcule sur la MÊME assiette annuelle que
 * l'IRPP (après frais professionnels et déductions familiales), pas sur le
 * salaire imposable brut avant abattements. Exonérée si cette assiette est
 * inférieure ou égale à 5000 D/an. Confirmé par vérification croisée
 * indépendante (calculateur tiers : "CSS calculée sur la même base annuelle
 * que l'IRPP, si cette base dépasse le seuil d'exonération de 5000 D/an").
 */
/**
 * CSS (Contribution Sociale de Solidarité) : 0.5% pour les personnes
 * physiques soumises au barème IRPP, de 2023 à 2026 inclus (taux normal 1%
 * hors mesure exceptionnelle). Exonération totale si le revenu net annuel
 * imposable (après déductions) ne dépasse pas 5000 D/an.
 *
 * CORRIGÉ le 19/07/2026 (deuxième correction) : la CSS N'A PAS été supprimée
 * en 2026 — l'affirmation précédente ("supprimée à partir de janvier 2026",
 * sourcée sur une page secu.tn) était fausse ou mal interprétée. La loi de
 * finances 2026 (loi n°2025-17 du 12/12/2025, article 87, commentée par la
 * note commune DGELF N°01-2026) **prolonge** la mesure exceptionnelle de
 * réduction à 0,5% pour toute l'année 2026. Confirmé par de multiples
 * sources datées et convergentes (presse économique + note commune
 * officielle de la Direction Générale des Études et de la Législation
 * Fiscale) le 19/07/2026, suite à un écart constaté avec un outil de calcul
 * tiers qui appliquait toujours la CSS en 2026.
 *
 * SOURCE : https://secu.tn/fr/calculateur-retraite-non-salaries.html (taux),
 * note commune DGELF N°01-2026 (prolongation 2026), loi n°2025-17 art. 87.
 */
export function getTauxCSS(annee: number): number {
  if (annee >= 2023 && annee <= 2026) return 0.005;
  return 0; // avant 2023 et après 2026 : à revérifier si l'année change (mesure non pérenne, votée annuellement)
}

const SEUIL_EXONERATION_CSS_ANNUEL = 5000;

/** `assietteFiscaleAnnuelle` = même base que l'IRPP (après tous abattements). Retourne le montant ANNUEL. */
export function calculerCSSAnnuelle(assietteFiscaleAnnuelle: number, annee: number): number {
  if (assietteFiscaleAnnuelle <= SEUIL_EXONERATION_CSS_ANNUEL) return 0;
  return assietteFiscaleAnnuelle * getTauxCSS(annee);
}

/**
 * SMIG (Salaire Minimum Interprofessionnel Garanti), régimes 48h et 40h,
 * par année d'entrée en vigueur.
 *
 * CORRIGÉ le 19/07/2026 : la table précédente contenait des valeurs
 * approximées (non sourcées) qui ne correspondaient à aucun décret réel.
 * Remplacée par les valeurs officielles exactes, datées par décret :
 * SOURCE : https://www.jurisitetunisie.com/tunisie/index/SMIG.htm
 * (table 2000-2025, réf. décrets gouvernementaux cités)
 *
 * L'année indiquée est celle où le nouveau montant devient applicable
 * (mois exact parfois en cours d'année - simplification à l'année civile
 * pour les besoins du calculateur retraite/actualisation).
 */
export const SMIG_48H_PAR_ANNEE: Record<number, number> = {
  2015: 338.000, // 1-mai-15, décret 2015-1762
  2016: 357.136, // 1-août-16, décret 2017-668
  2018: 378.560, // 1-mai-18, décret 2018-672
  2019: 403.104, // 1-mai-19, décret 2019-454
  2020: 429.312, // 1-oct-20, décret 2020-1069
  2022: 459.264, // 1-oct-22, décret 2022-769
  2024: 491.504, // 1-mai-24, décret 2024-419
  2025: 528.320, // 1-janv-25, décret 2024-419
  2026: 554.793, // à confirmer indépendamment (non listé sur jurisitetunisie au 19/07/2026)
};

export const SMIG_40H_PAR_ANNEE: Record<number, number> = {
  2015: 289.639,
  2016: 305.586,
  2018: 323.439,
  2019: 343.892,
  2020: 365.732,
  2022: 390.692,
  2024: 417.558,
  2025: 448.238,
  2026: 470.251, // à confirmer indépendamment (non listé sur jurisitetunisie au 19/07/2026)
};

export function getSmigPourAnnee(annee: number, regime: 40 | 48 = 48): number {
  const table = regime === 48 ? SMIG_48H_PAR_ANNEE : SMIG_40H_PAR_ANNEE;
  const annees = Object.keys(table).map(Number).sort((a, b) => a - b);
  let smig = table[annees[0]];
  for (const a of annees) {
    if (a <= annee) smig = table[a];
  }
  return smig;
}
