/**
 * Constantes de paie complémentaires — issues de l'outil de référence
 * CNSS-DS (fourni par l'utilisateur le 19/07/2026).
 *
 * IMPORTANT : seules les constantes NE FAISANT PAS DOUBLON/CONFLIT avec
 * lib/payroll/cnss.ts et lib/payroll/irpp.ts sont reprises ici. Les points
 * de conflit (barème IRPP, frais professionnels 10%, déduction enfants,
 * application de la CSS en 2026) sont volontairement exclus tant qu'ils
 * n'ont pas été tranchés — voir PLAN_MIGRATION_SECU_TN.md.
 */

// SMIG/SMAG 2026 - à confirmer contre une source officielle avant usage en production
import { SMIG_40H_PAR_ANNEE, SMIG_48H_PAR_ANNEE } from "./cnss";

// SMIG 2026 (régime 40h/48h) — valeurs réutilisées depuis la table centralisée cnss.ts,
// ne pas dupliquer ici (source : cnss.ts, à confirmer indépendamment de jurisitetunisie.com)
export const SMIG_40H_2026 = SMIG_40H_PAR_ANNEE[2026];
export const SMIG_48H_2026 = SMIG_48H_PAR_ANNEE[2026];

// Primes standards mentionnées comme valeurs par défaut dans l'outil CNSS-DS
export const PRIME_TRANSPORT_DEFAUT = 36.112;
export const PRIME_PRESENCE_DEFAUT = 2.080;

// Les taux CNSS par secteur (agricole/non-agricole) sont désormais pilotés
// uniquement depuis lib/payroll/config.ts (panneau /admin) — ne pas les
// redéfinir ici pour éviter une double source de vérité.

// Taux horaire par défaut selon le régime (40h ou 48h/semaine)
export const TAUX_HORAIRE_PAR_REGIME: Record<40 | 48, number> = {
  40: 2.714,
  48: 2.668,
};

// Taux "accident du travail" : variable selon le risque du secteur (0.5% à 4.0%)
export const TAUX_ACCIDENT_TRAVAIL_MIN = 0.005;
export const TAUX_ACCIDENT_TRAVAIL_MAX = 0.04;

/**
 * Calcule le montant des heures supplémentaires selon la règle exacte
 * publiée par secu.tn (calculateur-paie-cnss.html, tableau daté 03-03-2025) :
 * - Régime 48h/semaine : toutes les heures sup sont majorées de 75%.
 * - Régime 40h/semaine : les 8 premières heures sup sont majorées de 25%,
 *   les heures suivantes de 50%.
 * Le nombre d'heures saisi est traité comme le total de la période (pas
 * nécessairement hebdomadaire) : la règle par palier de secu.tn est un
 * barème par tranche d'heures, appliqué ici au total saisi.
 */
export function calculerMontantHeuresSupplementaires(heures: number, regime: 40 | 48): number {
  const tauxHoraire = TAUX_HORAIRE_PAR_REGIME[regime];
  if (heures <= 0) return 0;

  if (regime === 48) {
    return heures * tauxHoraire * 1.75;
  }

  // Régime 40h : 8 premières heures à 25%, le reste à 50%
  const heuresA25 = Math.min(heures, 8);
  const heuresA50 = Math.max(heures - 8, 0);
  return heuresA25 * tauxHoraire * 1.25 + heuresA50 * tauxHoraire * 1.5;
}
