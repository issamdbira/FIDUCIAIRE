/**
 * BenefitEngine — architecture pour les avantages en nature.
 *
 * RÈGLE ABSOLUE : ce fichier ne contient AUCUNE formule, taux, seuil ou
 * exonération inventés. Chaque règle est ajoutée uniquement après
 * validation contre une source officielle écrite — exactement le même
 * principe que le dossier CNSS Shell PSP : aucune règle sans pièce
 * justificative formelle.
 *
 * Tant qu'un type d'avantage n'a pas de règle validée dans BENEFIT_RULES,
 * il doit être saisi avec traitement = "en_attente_de_regle" (cf. types.ts)
 * et sera automatiquement exclu du calcul par le PayrollEngine, remonté
 * dans `elementsEnAttente` pour que l'utilisateur voie clairement ce qui
 * manque plutôt que d'obtenir un résultat silencieusement faux.
 *
 * MISE À JOUR : 9 points du décret n°2003-1098 (avantages exclus de
 * l'assiette CNSS, plafonnés en multiple/pourcentage du SMIG) sont
 * désormais validés et enregistrés ci-dessous, avec la formule exacte de
 * lib/payroll/avantages-exclus.ts. Les autres avantages (voiture de
 * fonction, logement...) restent non validés — voir la page Référentiel
 * pour le détail de tous les points du décret, y compris ceux sans
 * formule calculable.
 */

import { POINTS_AVANTAGES_SMIG, calculerPlafondUnitaire } from "./avantages-exclus";

export interface BenefitRule {
  /** Identifiant unique, ex: "voiture_fonction" */
  id: string;
  /** Nom affiché */
  label: string;
  /** Données nécessaires pour valoriser l'avantage (ex: ["valeur_vehicule", "usage_prive_pct"]) */
  donneesRequises: string[];
  /** Fonction de valorisation - calcule la valeur monétaire mensuelle de l'avantage */
  valoriser: (donnees: Record<string, number>) => number;
  /** Part de la valeur soumise à cotisation CNSS (0 à 1) */
  tauxSoumisCNSS: number;
  /** Part de la valeur soumise à l'IRPP (0 à 1) */
  tauxSoumisIRPP: number;
  /** Référence réglementaire précise (article, date, source) */
  source: string;
}

/**
 * Registre des règles d'avantages validées.
 * Les 9 entrées "avantage_point_N" sont plafonnées (pas une exonération à
 * taux fixe) — leur calcul exact (part exonérée vs soumise selon le nombre
 * de bénéficiaires et la date) doit passer par `simulerAvantage()` dans
 * avantages-exclus.ts, pas par ce `valoriser()` simplifié. Ce registre sert
 * ici surtout à documenter QUELS points sont validés (source citée), la
 * page /referentiel-avantages-exclus et le générateur de fiche de paie
 * utilisent directement le moteur dédié pour le calcul réel.
 */
export const BENEFIT_RULES: Record<string, BenefitRule> = Object.fromEntries(
  POINTS_AVANTAGES_SMIG.map((point) => [
    `avantage_point_${point.numero}`,
    {
      id: `avantage_point_${point.numero}`,
      label: point.titre,
      donneesRequises: ["nombre", "montantUnitaire", "dateVersement"],
      // Valorisation simplifiée (plafond unitaire à la date du jour) — pour le calcul
      // exact avec le nombre de bénéficiaires et la répartition exonéré/soumis,
      // utiliser simulerAvantage() de avantages-exclus.ts.
      valoriser: () => calculerPlafondUnitaire(point, new Date()),
      tauxSoumisCNSS: 0, // non pertinent ici : la part soumise dépend du dépassement du plafond, pas d'un taux fixe
      tauxSoumisIRPP: 0,
      source: "Décret n° 2003-1098 du 19 mai 2003, point " + point.numero + " — plafonds datés (note administrative CNSS)",
    } satisfies BenefitRule,
  ])
);

export function getRuleForBenefitType(id: string): BenefitRule | undefined {
  return BENEFIT_RULES[id];
}

export function isBenefitTypeValidated(id: string): boolean {
  return id in BENEFIT_RULES;
}
