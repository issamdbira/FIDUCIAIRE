/**
 * Types pour les conventions collectives sectorielles tunisiennes
 * Données extraites de paie-tunisie.com
 */

// ─── JORT & Historique ───────────────────────────────────────────────
export interface JortEntry {
  documentType: string;        // "Convention" | "Avenant n°1" | etc.
  signatureDate: string;       // DD/MM/YYYY
  arreteAgrementDate: string;  // DD/MM/YYYY
  jortReference: string;       // "n°48 des 30/07 et 03/08/1976"
  applicationStart: string;    // DD/MM/YYYY
}

// ─── Primes & Indemnités ─────────────────────────────────────────────
export type PrimeFrequency =
  | "Mensuelle"
  | "Annuelle"
  | "Sociale"
  | "Frais employeur"
  | "Exceptionnelle";

export interface PrimeIndemnite {
  frequency: PrimeFrequency;
  name: string;                // Désignation FR
  description: string;         // Description + montants
  /** Montant numérique parsé si disponible (null sinon) */
  montant?: number | null;
  /** Date d'effet si disponible */
  dateEffet?: string | null;
}

// ─── Catégories Salariales ───────────────────────────────────────────
export interface CategorieSalariale {
  categoryNum: number;         // 1, 2, 3...
  labelFr: string;             // "Catégorie 1"
  labelAr: string;             // "صنف 1"
  description?: string;
  /** Montants par année (clé = "2020", "2021", etc.) */
  amounts: Record<string, number>;
  currency: "TND";
}

// ─── Grille Salariale ───────────────────────────────────────────────
export interface GrilleSalarialeRef {
  tableNum: number;
  applicationDate: string;     // Texte (parfois en arabe)
  note?: string;
  pdfUrl?: string;
}

/**
 * Cellule de la grille salariale : intersection échelle × échelon → montant par année
 * Échelle = grade/classification (1-21 pour commerce gros)
 * Échelon = step d'ancienneté dans l'échelle (1-13)
 */
export interface GrilleSalarialeLigne {
  echelle: number;               // Numéro d'échelle (1, 2, 3...)
  echelon: number;               // Numéro d'échelon (1, 2, 3...)
  montants: Record<string, number>; // { "2021": 432.168, "2023": 461.512, ... }
}

/** Règles d'avancement pour la détection échelon depuis ancienneté */
export interface ReglesAvancement {
  /** Période d'avancement en années (ex: 2 = tous les 2 ans) */
  periodeAvancement: number;
  /** Table de correspondance ancienneté → échelon */
  tableAnciennete: { ancienneteMin: number; ancienneteMax: number; echelon: number }[];
}

// ─── Allowance (extrait PDF) ────────────────────────────────────────
export interface Allowance {
  nameFr: string;
  nameAr: string;
  amount: number;
  currency: "TND";
  dateFrom: string;
}

// ─── SMIG/SMAG ──────────────────────────────────────────────────────
export interface SmigEntry {
  regime: string;              // "48h/semaine (Mensuel)" etc.
  year: number;
  amount: number;              // TND
  currency: "TND";
}

export interface SmigTable {
  tableIndex: number;
  title: string;
  titleAr?: string;
  entries: SmigEntry[];
}

// ─── Secteur / Convention ────────────────────────────────────────────
export interface ConventionCollective {
  sectorId: number;
  slug: string;                // "cadre" | "commerce-gros" | etc.
  sectorNameFr: string;
  sectorNameAr: string;
  sourceUrl?: string;

  /** Convention + avenants + dates JORT */
  jortHistory: JortEntry[];

  /** Primes & indemnités par fréquence */
  primesIndemnites: PrimeIndemnite[];

  /** Catégories salariales avec montants */
  categoriesSalariales: CategorieSalariale[];

  /** Références aux grilles salariales (PDF) */
  grillesSalariales: GrilleSalarialeRef[];

  /** Grille salariale détaillée avec montants par échelle/échelon et année */
  grilleDetaillee?: GrilleSalarialeLigne[];

  /** Règles d'avancement (période, table ancienneté→échelon) */
  reglesAvancement?: ReglesAvancement;

  /** Allowances extraites des PDF */
  allowances: Allowance[];

  /** Documents PDF officiels */
  pdfDocuments: { text: string; url: string }[];

  /** Résumé descriptif (FR) */
  resume?: string;

  /** Statut d'implémentation du moteur de paie */
  engineStatus: "complete" | "partial" | "planned";

  /** Catégories d'agents (ex: Exécution, Maîtrise, Cadres) */
  categoriesAgents?: CategorieAgent[];

  /** Primes mensuelles structurées (parsées) */
  primesMensuelles?: PrimeMensuelleStructuree[];

  /** Primes annuelles structurées */
  primesAnnuelles?: PrimeAnnuelleStructuree[];

  /** Primes sociales structurées */
  primesSociales?: PrimeSocialeStructuree[];
}

// ─── Catégories d'agents (Cadre, Exécution, Maîtrise) ───────────────
export interface CategorieAgent {
  code: string;                // "EXECUTION" | "MAITRISE" | "CADRES"
  labelFr: string;
  labelAr: string;
  /** Plage d'échelles pour cette catégorie */
  echelleMin: number;
  echelleMax: number;
}

// ─── Primes mensuelles structurées ───────────────────────────────────
export interface PrimeMensuelleStructuree {
  code: string;
  labelFr: string;
  labelAr?: string;
  /** Montants par catégorie d'agent et par année */
  montants: Record<string, Record<string, number>>; // { "EXECUTION": { "2024": 75.012, "2026": 78.762 } }
  description?: string;
  /** Catégories d'agents concernées (vide = toutes) */
  categoriesConcernees?: string[]; // ["EXECUTION", "MAITRISE"] — si vide, appliquée à toutes
  /** Ancienneté minimum pour y avoir droit (en années) */
  ancienneteMin?: number; // 0 par défaut
  /** Date d'application (ISO) */
  dateApplication?: string; // "2021-01-01"
  /** Active ou désactivée (admin) */
  actif?: boolean; // true par défaut
  /** Mode de calcul spécial (ex: ancienneté-dépendant) */
  modeCalcul?: "forfaitaire" | "anciennete_dependant" | "note_dependant";
  /** Barème ancienneté si modeCalcul = "anciennete_dependant" */
  baremeAnciennete?: { ancienneteMin: number; ancienneteMax: number; montant: number }[];
}

// ─── Primes annuelles structurées ────────────────────────────────────
export interface PrimeAnnuelleStructuree {
  code: string;
  labelFr: string;
  labelAr?: string;
  description?: string;
  /** Mode de calcul */
  modeCalcul?: string;        // "pourcentage_salaire" | "forfaitaire" | "note_dependante"
  /** Catégories d'agents concernées */
  categoriesConcernees?: string[];
  /** Ancienneté minimum */
  ancienneteMin?: number;
  /** Date d'application */
  dateApplication?: string;
  /** Active */
  actif?: boolean;
}

// ─── Primes sociales structurées ─────────────────────────────────────
export interface PrimeSocialeStructuree {
  code: string;
  labelFr: string;
  labelAr?: string;
  description?: string;
  montant?: number;
  /** Catégories d'agents concernées */
  categoriesConcernees?: string[];
  /** Ancienneté minimum */
  ancienneteMin?: number;
  /** Date d'application */
  dateApplication?: string;
  /** Active */
  actif?: boolean;
}

// ─── Registre des conventions ────────────────────────────────────────
export interface RegistreConventions {
  conventions: ConventionCollective[];
  smigSmag: SmigTable[];
}
