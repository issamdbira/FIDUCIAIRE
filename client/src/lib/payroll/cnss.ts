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
 * SMIG (régime 48h) par année. Table incomplète (2016-2019 manquants) —
 * cf. PLAN_MIGRATION_SECU_TN.md, à compléter avant mise en production.
 */
export const SMIG_PAR_ANNEE: Record<number, number> = {
  2015: 325.0,
  2020: 372.0,
  2021: 385.0,
  2022: 406.0,
  2023: 441.6,
  2024: 472.6,
  2025: 508.0,
};

export function getSmigPourAnnee(annee: number): number {
  const annees = Object.keys(SMIG_PAR_ANNEE).map(Number).sort((a, b) => a - b);
  let smig = SMIG_PAR_ANNEE[annees[0]];
  for (const a of annees) {
    if (a <= annee) smig = SMIG_PAR_ANNEE[a];
  }
  return smig;
}
