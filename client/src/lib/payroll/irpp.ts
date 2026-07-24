/**
 * Fonctions de calcul IRPP réutilisables — SOURCE UNIQUE pour tout le projet.
 *
 * CORRIGÉ le 19/07/2026 après vérification directe de la page officielle
 * secu.tn/fr/calculateur-irpp-tunisie.html (barème daté "1-1-2025", avec
 * exemples chiffrés vérifiables). Cette vérification a révélé que le barème
 * et les déductions précédemment repris de l'outil CNSS-DS étaient erronés
 * sur plusieurs points — corrigés ici pour correspondre à secu.tn.
 *
 * Barème IRPP 2025 (secu.tn, en vigueur depuis le 1-1-2025) :
 * 0-5000: 0% | 5000-10000: 15% | 10000-20000: 25% | 20000-30000: 30%
 * 30000-40000: 33% | 40000-50000: 36% | 50000-70000: 38% | >70000: 40%
 *
 * Frais professionnels (salariés actifs) : 10% du salaire imposable,
 * PLAFONNÉ à 2000 D/an (secu.tn : "sans dépasser 2000 D"). Pour les
 * retraités le taux est différent (25%, sans plafond) — non implémenté ici,
 * hors périmètre des calculateurs salariés actuels.
 *
 * Déductions familiales (secu.tn) :
 * - Chef de famille : 300 D/an
 * - Enfants (<20 ans) : 100 D/an/enfant, dans la limite des 4 premiers enfants
 * - Étudiants sans bourse (<25 ans) : 1000 D/an/enfant (même groupe des 4)
 * - Enfants handicapés : 2000 D/an/enfant, sans limite d'âge ni de nombre
 * - Parents à charge (5% du salaire imposable/parent, max 450D/parent) :
 *   NON implémenté — secu.tn précise que cette déduction n'est calculée qu'au
 *   moment de la déclaration annuelle à la recette des finances, pas lors de
 *   la retenue à la source mensuelle par l'employeur (hors périmètre de nos
 *   calculateurs de paie mensuelle).
 */

export interface TrancheIRPP {
  min: number;
  max: number;
  taux: number;
}

export const BAREME_IRPP: TrancheIRPP[] = [
  { min: 0, max: 5000, taux: 0 },
  { min: 5000, max: 10000, taux: 0.15 },
  { min: 10000, max: 20000, taux: 0.25 },
  { min: 20000, max: 30000, taux: 0.30 },
  { min: 30000, max: 40000, taux: 0.33 },
  { min: 40000, max: 50000, taux: 0.36 },
  { min: 50000, max: 70000, taux: 0.38 },
  { min: 70000, max: Infinity, taux: 0.40 },
];

export const TAUX_FRAIS_PROFESSIONNELS = 0.10;
export const PLAFOND_FRAIS_PROFESSIONNELS_ANNUEL = 2000;

/** Calcule l'IRPP annuel sur une assiette annuelle après déductions. */
export function calculerIRPPAnnuel(assietteAnnuelle: number, deductionsAnnuelles: number): number {
  const assietteFiscale = assietteAnnuelle - deductionsAnnuelles;
  if (assietteFiscale <= 0) return 0;

  let irpp = 0;
  for (const tranche of BAREME_IRPP) {
    if (assietteFiscale > tranche.min) {
      const montantTranche = Math.min(assietteFiscale, tranche.max) - tranche.min;
      irpp += montantTranche * tranche.taux;
    }
  }
  return Math.round(irpp * 100) / 100;
}

/**
 * Déduction forfaitaire "frais professionnels" pour salariés actifs :
 * 10% du salaire imposable ANNUEL, plafonnée à 2000 D/an (secu.tn).
 */
export function calculerFraisProfessionnels(salaireImposableAnnuel: number): number {
  return Math.min(salaireImposableAnnuel * TAUX_FRAIS_PROFESSIONNELS, PLAFOND_FRAIS_PROFESSIONNELS_ANNUEL);
}

export interface SituationFamiliale {
  chefFamille: boolean;
  enfants: number;
  etudiants: number;
  infirmes: number;
  autresDeductionsAnnuelles: number;
}

/**
 * Calcule les déductions familiales ANNUELLES selon secu.tn.
 * Enfants + étudiants sans bourse partagent la même limite de 4 (secu.tn :
 * "dans la limite des 4 premiers enfants"), les enfants handicapés n'ont
 * pas de plafond.
 */
export function calculerDeductionsAnnuelles(situation: SituationFamiliale): number {
  let deductions = 0;
  if (situation.chefFamille) deductions += 300;

  const nombrePlafonne = Math.min(situation.enfants + situation.etudiants, 4);
  const partEnfants = situation.enfants + situation.etudiants > 0
    ? Math.min(situation.enfants, nombrePlafonne)
    : 0;
  const partEtudiants = nombrePlafonne - partEnfants;

  deductions += partEnfants * 100;
  deductions += partEtudiants * 1000;
  deductions += situation.infirmes * 2000; // sans plafond (secu.tn)
  deductions += situation.autresDeductionsAnnuelles;
  return deductions;
}
