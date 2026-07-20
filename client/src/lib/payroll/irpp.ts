/**
 * Fonctions de calcul IRPP réutilisables — SOURCE UNIQUE pour tout le projet.
 *
 * Barème et déductions repris de l'outil de référence CNSS-DS fourni par
 * l'utilisateur le 19/07/2026 (remplace l'ancien barème dérivé de PaieCNSS.tsx,
 * jugé moins fiable que cette référence).
 *
 * Barème IRPP annuel (tranches marginales) :
 * 0-5000: 0% | 5000-8333: 15% | 8333-12500: 20% | 12500-16666: 25%
 * 16666-25000: 30% | 25000-70000: 35% | >70000: 40%
 *
 * Déduction "frais professionnels" : 10% forfaitaire du revenu net annuel
 * (net après CNSS, avant impôt).
 *
 * Déduction enfants : 150 D/mois par enfant (source CNSS-DS).
 *
 * ⚠️ POINT OUVERT : les déductions "chef de famille", "étudiants sans bourse"
 * et "enfants handicapés" présentes dans l'ancien code (PaieCNSS.tsx/IRPP.tsx)
 * n'apparaissent PAS dans la référence CNSS-DS. Elles sont conservées ici par
 * précaution (ne pas supprimer une règle potentiellement réelle sans preuve
 * du contraire) mais leur montant n'est pas confirmé par la nouvelle source
 * et reste à valider avant mise en production.
 */

export interface TrancheIRPP {
  min: number;
  max: number;
  taux: number;
}

export const BAREME_IRPP: TrancheIRPP[] = [
  { min: 0, max: 5000, taux: 0 },
  { min: 5000, max: 8333, taux: 0.15 },
  { min: 8333, max: 12500, taux: 0.20 },
  { min: 12500, max: 16666, taux: 0.25 },
  { min: 16666, max: 25000, taux: 0.30 },
  { min: 25000, max: 70000, taux: 0.35 },
  { min: 70000, max: Infinity, taux: 0.40 },
];

/** Taux de la déduction forfaitaire "frais professionnels" (source CNSS-DS). */
export const TAUX_FRAIS_PROFESSIONNELS = 0.10;

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

/** Déduction forfaitaire de 10% pour frais professionnels, sur le net annuel avant impôt. */
export function calculerFraisProfessionnels(netAnnuelAvantImpot: number): number {
  return netAnnuelAvantImpot * TAUX_FRAIS_PROFESSIONNELS;
}

export interface SituationFamiliale {
  chefFamille: boolean;
  enfants: number;
  etudiants: number;
  infirmes: number;
  autresDeductionsAnnuelles: number;
}

/**
 * Calcule les déductions mensuelles selon la situation familiale.
 * Déduction enfants : 150 D/mois/enfant (source CNSS-DS, pas de plafond
 * indiqué dans cette source — donc pas de plafond appliqué ici).
 * Les autres catégories (chef de famille, étudiants, infirmes) restent celles
 * de l'ancien code, NON confirmées par la référence CNSS-DS - cf. note en
 * tête de fichier.
 */
export function calculerDeductionsMensuelles(situation: SituationFamiliale): number {
  let deductions = 0;
  if (situation.chefFamille) deductions += 300; // non confirmé par CNSS-DS
  deductions += situation.enfants * 150; // source CNSS-DS : 150 D/mois/enfant, sans plafond
  deductions += Math.min(situation.etudiants, 4) * 1000; // non confirmé par CNSS-DS
  deductions += situation.infirmes * 2000; // non confirmé par CNSS-DS
  deductions += situation.autresDeductionsAnnuelles / 12;
  return deductions;
}
