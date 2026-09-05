/**
 * Types pour le générateur de déclarations CNSS (fichiers TXT 122 caractères).
 * Porté depuis l'outil de référence CNSS-DS (HTML fourni par l'utilisateur).
 *
 * SPÉCIFICATION CNSS 2012 — ligne fixe de 122 caractères :
 * N°Employeur(8) + Clé(2) + Code(4) + Trimestre(1) + Année(4) + Page(3) +
 * Ligne(2) + Matricule(8) + Clé(2) + Nom(60) + CIN(8) + Salaire millimes(10)
 * + Zone vierge(10)
 * Nom de fichier : DS<num8><cle2><code4>.<trimestre><année>
 */

export interface EmployeurCNSS {
  num: string;
  cle: string;
  code: string;
  anneeDef: number;
  nom?: string;
  adresse?: string;
  tel?: string;
  email?: string;
}

export interface SalarieCNSS {
  matricule: string;
  cle: string;
  nom: string;
  cin: string;
  salaire: string; // en millimes, chaîne numérique
}

export interface DeclarationCNSS {
  id: string;
  fileName: string;
  trimester: string;
  year: string;
  employees: SalarieCNSS[];
  totalSalary: number;
  errorsList: string[];
  txtPreview: string;
  generatedFilename: string;
}

export interface LigneTXTParsee {
  employeurNum: string;
  employeurCle: string;
  employeurCode: string;
  trimestre: string;
  annee: string;
  page: string;
  ligne: string;
  matricule: string;
  cle: string;
  nom: string;
  cin: string;
  salaireMillimes: string;
  zoneVierge: string;
}

export interface EmployeeTXTResult extends LigneTXTParsee {
  salaireDT: number;
  zoneOk: boolean;
}

export interface TesteurResult {
  fileName: string;
  employees: EmployeeTXTResult[];
  totalSalaries: number;
  totalSalaireDT: number;
  errors: string[];
  valid: boolean;
  error?: string;
}
