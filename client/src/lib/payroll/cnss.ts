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
 * CSS (Contribution Sociale de Solidarité) : 0.5% en 2023-2024-2025.
 * Supprimée à partir de janvier 2026 (loi de finances 2026).
 * SOURCE : https://secu.tn/fr/calculateur-retraite-non-salaries.html
 */
export function getTauxCSS(annee: number): number {
  if (annee >= 2026) return 0;
  return 0.005;
}

export function calculerCSS(salaireImposable: number, annee: number): number {
  return salaireImposable * getTauxCSS(annee);
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
