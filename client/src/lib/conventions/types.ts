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

// ─── Grille Salariale (référence PDF) ────────────────────────────────
export interface GrilleSalarialeRef {
  tableNum: number;
  applicationDate: string;     // Texte (parfois en arabe)
  note?: string;
  pdfUrl?: string;
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
}

// ─── Primes mensuelles structurées ───────────────────────────────────
export interface PrimeMensuelleStructuree {
  code: string;
  labelFr: string;
  labelAr?: string;
  /** Montants par catégorie d'agent et par année */
  montants: Record<string, Record<string, number>>; // { "EXECUTION": { "2024": 75.012, "2026": 78.762 } }
  description?: string;
}

// ─── Primes annuelles structurées ────────────────────────────────────
export interface PrimeAnnuelleStructuree {
  code: string;
  labelFr: string;
  labelAr?: string;
  description?: string;
  /** Mode de calcul */
  modeCalcul?: string;        // "pourcentage_salaire" | "forfaitaire" | "note_dependante"
}

// ─── Primes sociales structurées ─────────────────────────────────────
export interface PrimeSocialeStructuree {
  code: string;
  labelFr: string;
  labelAr?: string;
  description?: string;
  montant?: number;
}

// ─── Registre des conventions ────────────────────────────────────────
export interface RegistreConventions {
  conventions: ConventionCollective[];
  smigSmag: SmigTable[];
}
