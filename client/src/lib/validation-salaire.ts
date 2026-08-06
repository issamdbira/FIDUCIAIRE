/**
 * Validation stricte des saisies de salaire — Sprint 1, Tâche 2.
 *
 * Le système ne doit jamais calculer de valeurs absurdes :
 * - valeurs négatives interdites
 * - zéro interdit (un salaire à 0 D n'a pas de sens)
 * - plafond réaliste à 1 000 000 D
 *
 * Utilitaire global unique — à utiliser sur TOUT champ de saisie de salaire
 * dans l'application. Ne pas dupliquer cette règle ailleurs.
 */

import { z } from "zod";
import { formatMontantDT } from "./utils";

export const MONTANT_SALAIRE_MAX = 1_000_000;

export const montantSalaireSchema = z
  .number({ error: "Veuillez saisir un montant valide." })
  .positive("Le montant doit être supérieur à 0 DT.")
  .max(MONTANT_SALAIRE_MAX, `Le montant semble irréaliste (maximum ${formatMontantDT(MONTANT_SALAIRE_MAX)}).`);

/** Retourne le message d'erreur si le montant est invalide, ou null s'il est valide. */
export function validerMontantSalaire(valeur: number): string | null {
  const resultat = montantSalaireSchema.safeParse(valeur);
  if (resultat.success) return null;
  return resultat.error.issues[0]?.message ?? "Montant invalide.";
}
