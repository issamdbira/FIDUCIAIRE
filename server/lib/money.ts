// =============================================================================
// Le Fiduciaire — Utilitaires monétaires (serveur) (Lot 1 — décimales exactes)
// =============================================================================
// Miroir exact de client/src/lib/payroll/money.ts — mêmes conventions :
// arrondi EXACT aux bornes de publication/persistance (jamais de float brut
// du type 12.479999999999999 en base), centimes par défaut, millimes en
// interne lorsque le calcul l'exige, format fr-TN à l'affichage.
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
 * 2 décimales minimum, 3 (millimes) si significatives.
 */
export function formatDT(n: number, options?: { avecSymbole?: boolean }): string {
  if (!Number.isFinite(n)) return "—";
  const formate = new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(n);
  return options?.avecSymbole === false ? formate : `${formate} DT`;
}
