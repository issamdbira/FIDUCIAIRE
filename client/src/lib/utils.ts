import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatage monétaire tunisien strict.
 * Règles métier : 3 décimales (millimes), virgule comme séparateur
 * décimal, espace comme séparateur de milliers, suffixe " DT".
 * Ex: formatMontantDT(1250.5) -> "1 250,500 DT"
 *
 * Utilitaire global unique — à utiliser pour TOUT montant financier affiché
 * dans l'application (calculateurs, fiche de paie, déclarations). Ne pas
 * dupliquer cette logique de formatage ailleurs.
 *
 * QA-001 : Utilise Intl.NumberFormat('fr-TN') pour un formatage fiable
 * et conforme, sans risque de corruption de caractères. L'espace insécable
 * (U+00A0) générée par Intl est remplacée par une espace standard pour
 * éviter tout rendu corrompu dans html2pdf.js ou certains navigateurs.
 */
export function formatMontantDT(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || Number.isNaN(montant)) return "—";

  const negatif = montant < 0;
  const valeurAbsolue = Math.abs(montant);

  // Intl.NumberFormat fr-TN : virgule décimale, espace insécable milliers, 3 décimales
  const brut = new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(valeurAbsolue);

  // Remplacer l'espace insécable (U+00A0) par une espace standard pour
  // éviter les caractères corrompus dans le rendu PDF (html2pdf.js) et
  // certains contextes où \u00A0 s'affiche mal.
  const propre = brut.replace(/\u00A0/g, " ");

  const signe = negatif ? "-" : "";
  return `${signe}${propre} DT`;
}
