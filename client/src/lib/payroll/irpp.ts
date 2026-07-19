/**
 * Fonctions de calcul IRPP réutilisables — SOURCE UNIQUE pour tout le projet.
 * Extrait de PaieCNSS.tsx / IRPP.tsx (formules identiques, ne pas dupliquer).
 *
 * Barème IRPP 2025 — à reconfirmer contre le texte officiel de la loi de
 * finances 2026 s'il l'a modifié (non trouvé dans les sources consultées,
 * cf. PLAN_MIGRATION_SECU_TN.md).
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

export interface SituationFamiliale {
  chefFamille: boolean;
  enfants: number; // max 4
  etudiants: number; // max 4
  infirmes: number;
  autresDeductionsAnnuelles: number;
}

/** Calcule les déductions mensuelles selon la situation familiale. */
export function calculerDeductionsMensuelles(situation: SituationFamiliale): number {
  let deductions = 0;
  if (situation.chefFamille) deductions += 300;
  deductions += Math.min(situation.enfants, 4) * 100;
  deductions += Math.min(situation.etudiants, 4) * 1000;
  deductions += situation.infirmes * 2000;
  deductions += situation.autresDeductionsAnnuelles / 12;
  return deductions;
}
