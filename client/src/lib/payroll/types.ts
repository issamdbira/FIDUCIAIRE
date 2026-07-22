/**
 * Types du moteur de paie — indépendants de React.
 * Voir PROMPT MAÎTRE — architecture couche 2.
 */

export type PayrollItemType =
  | "salaire_base"
  | "prime"
  | "indemnite"
  | "absence"
  | "retenue"
  | "avantage"
  | "autre";

/**
 * Traitement social/fiscal d'un élément. Pour le MVP, seuls les traitements
 * "standard" (soumis intégralement à CNSS + IRPP) sont validés par une source
 * (secu.tn). Tout élément dont le traitement n'est pas "standard" doit avoir
 * une règle explicite documentée — sinon il reste "en_attente_de_regle".
 */
export type TraitementElement = "standard" | "exonere_partiel" | "exonere_total" | "en_attente_de_regle";

export interface PayrollItem {
  id: string;
  type: PayrollItemType;
  label: string;
  montant: number; // valeur mensuelle en Dinars. Négatif pour une retenue/absence.
  traitement: TraitementElement;
  // Si traitement = "en_attente_de_regle", ce champ documente ce qui manque
  // (ex: "règle du décret 1098-2003 non sourcée pour ce type d'avantage")
  noteReglementaire?: string;
  // Champs de traçabilité, remplis par le PayrollEngine dans le résultat
  // (cf. section 9 du prompt de finalisation : détail technique du traitement)
  inclusDansBrut?: boolean;
  inclusBaseCNSS?: boolean;
  inclusBaseFiscale?: boolean;
  regleAppliquee?: string;
  reference?: string;
}

export interface Employeur {
  nom: string;
  logoDataUrl?: string; // image encodée en base64 (data URL), pas de stockage serveur pour le MVP
  adresse?: string;
  telephone?: string;
  email?: string;
  matriculeCNSS?: string;
  // Secteur d'activité, détermine le taux CNSS applicable (cf. constantes-complementaires.ts)
  secteur?: "non_agricole" | "agricole";
}

export interface Salarie {
  nom: string;
  prenom: string;
  matricule?: string;
  dateEmbauche?: string;
  chefFamille: boolean;
  enfants: number;
  etudiants: number;
  infirmes: number;
  // Mode de paiement (affiché sur la fiche de paie, pas de traitement fiscal)
  modePaiement?: "espece" | "virement";
  banque?: string;
  rib?: string;
}

export interface PeriodePaie {
  mois: number; // 1-12
  annee: number;
}

export interface PayrollInput {
  employeur: Employeur;
  salarie: Salarie;
  periode: PeriodePaie;
  elements: PayrollItem[];
  autresDeductionsFiscalesAnnuelles?: number; // ex: intérêts de crédit logement
}

export interface PayrollResult {
  elements: PayrollItem[];
  totalRemunerationBrute: number;
  baseCNSS: number;
  cotisationCNSS: number;
  cotisationPatronale: number; // informative, à la charge de l'employeur (n'affecte pas le net)
  baseFiscaleMensuelle: number;
  irppMensuel: number;
  css: number;
  totalAutresRetenues: number;
  netAPayer: number;
  // Éléments dont le traitement n'a pas pu être appliqué faute de règle validée
  elementsEnAttente: PayrollItem[];
}
