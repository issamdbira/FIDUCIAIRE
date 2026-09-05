/**
 * Fonctions de calcul IRPP réutilisables — SOURCE UNIQUE pour tout le projet.
 * Barème, frais professionnels et déductions proviennent de getPayrollConfig()
 * (panneau d'administration /admin) — plus aucune valeur en dur ici.
 */

import { getPayrollConfig } from "./config";

/** Calcule l'IRPP annuel sur une assiette annuelle après déductions. */
export function calculerIRPPAnnuel(assietteAnnuelle: number, deductionsAnnuelles: number): number {
  const assietteFiscale = assietteAnnuelle - deductionsAnnuelles;
  if (assietteFiscale <= 0) return 0;

  const bareme = getPayrollConfig().baremeIRPP;
  let irpp = 0;
  for (const tranche of bareme) {
    const max = tranche.max ?? Infinity;
    if (assietteFiscale > tranche.min) {
      const montantTranche = Math.min(assietteFiscale, max) - tranche.min;
      irpp += montantTranche * tranche.taux;
    }
  }
  return Math.round(irpp * 100) / 100;
}

/**
 * Frais professionnels pour salariés ACTIFS : taux configurable (défaut 10%),
 * plafonné (défaut 2000 D/an).
 */
export function calculerFraisProfessionnels(salaireImposableAnnuel: number): number {
  const config = getPayrollConfig();
  return Math.min(salaireImposableAnnuel * config.fraisProTauxActifs, config.fraisProPlafondActifsAnnuel);
}

/**
 * Frais professionnels pour RETRAITÉS : taux configurable (défaut 25%),
 * SANS plafond (loi de finances 2026 : augmentation progressive prévue :
 * 30% en 2027, 40% en 2028, 50% en 2029 — le taux applicable pour l'année
 * en cours doit être ajusté depuis /admin, il n'est pas déduit automatiquement
 * de l'année ici pour éviter d'inventer un calendrier non confirmé).
 */
export function calculerFraisProfessionnelsRetraites(pensionImposableAnnuelle: number): number {
  const config = getPayrollConfig();
  return pensionImposableAnnuelle * config.fraisProTauxRetraites;
}

export interface SituationFamiliale {
  chefFamille: boolean;
  enfants: number;
  etudiants: number;
  infirmes: number;
  parentsACharge?: number; // 0 à 2, uniquement pertinent en déclaration annuelle
  autresDeductionsAnnuelles: number;
}

/**
 * Calcule les déductions familiales ANNUELLES. Enfants + étudiants sans
 * bourse partagent le même plafond (configurable, défaut 4), les enfants
 * handicapés n'ont pas de plafond. Les parents à charge ne sont ajoutés que
 * si `parentsEnChargeActif` est activé dans la config (déclaration annuelle
 * uniquement, pas à la retenue à la source mensuelle par défaut).
 */
export function calculerDeductionsAnnuelles(situation: SituationFamiliale, assietteAnnuellePourParents?: number): number {
  const config = getPayrollConfig();
  let deductions = 0;
  if (situation.chefFamille) deductions += config.deductionChefFamille;

  const nombrePlafonne = Math.min(situation.enfants + situation.etudiants, config.plafondNombreEnfantsEtudiants);
  const partEnfants = situation.enfants + situation.etudiants > 0
    ? Math.min(situation.enfants, nombrePlafonne)
    : 0;
  const partEtudiants = nombrePlafonne - partEnfants;

  deductions += partEnfants * config.deductionEnfant;
  deductions += partEtudiants * config.deductionEtudiant;
  deductions += situation.infirmes * config.deductionInfirme;

  if (config.parentsEnChargeActif && situation.parentsACharge && assietteAnnuellePourParents) {
    const parents = Math.min(situation.parentsACharge, 2);
    const parAssiette = assietteAnnuellePourParents * config.parentsEnChargeTaux;
    const parParent = Math.min(parAssiette, config.parentsEnChargePlafondParAnnuel);
    deductions += parParent * parents;
  }

  deductions += situation.autresDeductionsAnnuelles;
  return deductions;
}
