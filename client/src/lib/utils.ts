import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatage monétaire tunisien strict.
 * Règles métier : 3 décimales (millimes), virgule comme séparateur
 * décimal, espace insécable comme séparateur de milliers, suffixe " DT".
 * Ex: formatMontantDT(1250.5) -> "1 250,500 DT"
 *
 * Utilitaire global unique — à utiliser pour TOUT montant financier affiché
 * dans l'application (calculateurs, fiche de paie, déclarations). Ne pas
 * dupliquer cette logique de formatage ailleurs.
 */
export function formatMontantDT(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || Number.isNaN(montant)) return "—";

  const negatif = montant < 0;
  const valeurAbsolue = Math.abs(montant);

  // 3 décimales fixes (millimes)
  const [partieEntiere, partieDecimale] = valeurAbsolue.toFixed(3).split(".");

  // Séparateur de milliers : espace insécable
  const partieEntiereFormatee = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");

  const signe = negatif ? "-" : "";
  return `${signe}${partieEntiereFormatee},${partieDecimale}\u00A0DT`;
}
