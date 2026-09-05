/**
 * Fonctions de calcul CNSS réutilisables — SOURCE UNIQUE pour tout le projet.
 * Tous les taux proviennent de getPayrollConfig() (panneau d'administration
 * /admin), plus aucune constante en dur ici pour les valeurs courantes.
 *
 * Historique (avant la mise en place du panneau admin) conservé pour les
 * années passées, non éditable depuis /admin (données historiques figées).
 */

import { getPayrollConfig } from "./config";

const TAUX_COTISATION_CNSS_AVANT_2025 = 0.0918; // historique, non paramétrable

export function getTauxCotisationCNSS(annee: number): number {
  if (annee < 2025) return TAUX_COTISATION_CNSS_AVANT_2025;
  return getPayrollConfig().cnssSalarialNonAgricole;
}

export function calculerCotisationCNSS(salaireBrut: number, annee: number): number {
  return salaireBrut * getTauxCotisationCNSS(annee);
}

/**
 * CSS (Contribution Sociale de Solidarité).
 * Le taux, l'activation et le seuil d'exonération sont pilotés depuis /admin
 * (getPayrollConfig().cssActive / cssTaux / cssSeuilExonerationAnnuel) — la
 * question "la CSS s'applique-t-elle cette année ?" n'est plus tranchée en
 * dur dans le code, elle se configure depuis le panneau d'administration.
 */
export function getTauxCSS(): number {
  const config = getPayrollConfig();
  return config.cssActive ? config.cssTaux : 0;
}

/** `assietteFiscaleAnnuelle` = même base que l'IRPP (après tous abattements). Retourne le montant ANNUEL. */
export function calculerCSSAnnuelle(assietteFiscaleAnnuelle: number): number {
  const config = getPayrollConfig();
  if (!config.cssActive) return 0;
  if (assietteFiscaleAnnuelle <= config.cssSeuilExonerationAnnuel) return 0;
  return assietteFiscaleAnnuelle * config.cssTaux;
}

/**
 * SMIG (Salaire Minimum Interprofessionnel Garanti), régimes 48h et 40h,
 * par année d'entrée en vigueur. Données historiques datées par décret,
 * non éditables depuis /admin (référentiel légal figé).
 * SOURCE : https://www.jurisitetunisie.com/tunisie/index/SMIG.htm
 */
export const SMIG_48H_PAR_ANNEE: Record<number, number> = {
  2015: 338.000,
  2016: 357.136,
  2018: 378.560,
  2019: 403.104,
  2020: 429.312,
  2022: 459.264,
  2024: 491.504,
  2025: 528.320,
  2026: 554.736, // corrigé (était 554.793, non sourcé) — valeur exacte via note administrative datée (barème avantages exclus 2022-2028)
  2027: 582.400,
  2028: 611.520,
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
  2026: 470.251,
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
