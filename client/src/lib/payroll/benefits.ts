/**
 * BenefitEngine — architecture pour les avantages en nature.
 *
 * RÈGLE ABSOLUE : ce fichier ne contient AUCUNE formule, taux, seuil ou
 * exonération inventés. Le registre `BENEFIT_RULES` est actuellement VIDE.
 * Chaque règle (ex: voiture de fonction, logement de fonction, téléphone...)
 * doit être ajoutée uniquement après validation contre une source officielle
 * écrite (décret n° 1098-2003, note DGELF, ou équivalent) — exactement le
 * même principe que le dossier CNSS Shell PSP : aucune règle sans pièce
 * justificative formelle.
 *
 * Tant qu'un type d'avantage n'a pas de règle validée dans BENEFIT_RULES,
 * il doit être saisi avec traitement = "en_attente_de_regle" (cf. types.ts)
 * et sera automatiquement exclu du calcul par le PayrollEngine, remonté
 * dans `elementsEnAttente` pour que l'utilisateur voie clairement ce qui
 * manque plutôt que d'obtenir un résultat silencieusement faux.
 */

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
 * VOLONTAIREMENT VIDE pour le MVP — voir note en haut de fichier.
 * Ne pas ajouter d'entrée ici sans source officielle écrite citée dans `source`.
 */
export const BENEFIT_RULES: Record<string, BenefitRule> = {
  // Exemple de structure attendue une fois une règle validée :
  // voiture_fonction: {
  //   id: "voiture_fonction",
  //   label: "Voiture de fonction",
  //   donneesRequises: ["valeur_acquisition", "anciennete_vehicule"],
  //   valoriser: (d) => { throw new Error("Règle non implémentée - en attente de validation"); },
  //   tauxSoumisCNSS: 0,
  //   tauxSoumisIRPP: 0,
  //   source: "Décret n° 1098-2003, article X (À CITER PRÉCISÉMENT)",
  // },
};

export function getRuleForBenefitType(id: string): BenefitRule | undefined {
  return BENEFIT_RULES[id];
}

export function isBenefitTypeValidated(id: string): boolean {
  return id in BENEFIT_RULES;
}
