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
export const SMIG_40H_2026 = 470.251;
export const SMIG_48H_2026 = 554.793;

// Primes standards mentionnées comme valeurs par défaut dans l'outil CNSS-DS
export const PRIME_TRANSPORT_DEFAUT = 36.112;
export const PRIME_PRESENCE_DEFAUT = 2.080;

export type SecteurCotisation = "non_agricole" | "agricole";

export interface TauxCotisationSecteur {
  salarial: number; // taux CNSS salarié
  patronal: number; // taux CNSS employeur
}

export const TAUX_CNSS_PAR_SECTEUR: Record<SecteurCotisation, TauxCotisationSecteur> = {
  non_agricole: { salarial: 0.0968, patronal: 0.1707 },
  agricole: { salarial: 0.0918, patronal: 0.1657 },
};

// Taux horaire par défaut selon le régime (40h ou 48h/semaine)
export const TAUX_HORAIRE_PAR_REGIME: Record<40 | 48, number> = {
  40: 2.714,
  48: 2.668,
};

// Taux "accident du travail" : variable selon le risque du secteur (0.5% à 4.0%)
export const TAUX_ACCIDENT_TRAVAIL_MIN = 0.005;
export const TAUX_ACCIDENT_TRAVAIL_MAX = 0.04;
