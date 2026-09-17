// =============================================================================
// Le Fiduciaire — Utilitaires monétaires (Lot 1 — décimales exactes)
// =============================================================================
// Roadmap §7 : « remplacer les nombres flottants tels que 12.479999999999999
// par un type décimal exact et un formatage monétaire tunisien cohérent ».
//
// Conventions V1 (documentées, reproductibles) :
//   - calculs internes en float (IEEE754) MAIS arrondi EXACT aux bornes :
//     chaque montant publié/persisté est arrondi au centime (2 décimales,
//     cohérent avec le moteur client et les tests documentés) ;
//   - l'arrondi demi-sup est corrigé du piège flottant via Number.EPSILON
//     (Math.round(1.005*100) === 100 ≠ arrondiExact(1.005) === 101) ;
//   - le dinar tunisien comptant 3 millimes, formatDT affiche de 2 à 3
//     décimales selon la significance, séparateurs fr-TN (1 234,567).
// =============================================================================

/** Arrondi EXACT demi-sup à 2 décimales (centimes) — sans artefact flottant. */
export function round2Exact(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON * Math.sign(n)) * 100) / 100;
}

/** Arrondi EXACT demi-sup à 3 décimales (millimes) — sans artefact flottant. */
export function round3Exact(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON * Math.sign(n)) * 1000) / 1000;
}

/**
 * Format monétaire tunisien cohérent : « 1 234,567 DT ».
 * 2 décimales minimum, 3 (millimes) si significatives — jamais de queue
 * flottante du type 12.479999999999999.
 */
export function formatDT(n: number, options?: { avecSymbole?: boolean }): string {
  if (!Number.isFinite(n)) return "—";
  const formate = new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(n);
  return options?.avecSymbole === false ? formate : `${formate} DT`;
}
