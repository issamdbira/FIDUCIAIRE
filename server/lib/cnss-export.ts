// =============================================================================
// Le Fiduciaire — Export CNSS (Phase 7)
// Génération du fichier de déclaration CNSS trimestrielle
// Format texte structuré pour soumission CNSS Tunisie
// =============================================================================

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CnssEmployeeLine {
  matriculeCnss: string;
  nom: string;
  prenom: string;
  salaireBrutMois1: number;
  salaireBrutMois2: number;
  salaireBrutMois3: number;
  cotisationSalariale: number;
  cotisationPatronale: number;
  nombreJoursMois1: number;
  nombreJoursMois2: number;
  nombreJoursMois3: number;
}

interface CnssDeclarationData {
  matriculeEmployeur: string;
  raisonSociale: string;
  trimestre: string;       // ex: "2026-Q3"
  annee: number;
  numeroTrimestre: number;
  nombreSalaries: number;
  totalSalaires: number;
  totalCotisationsSalariales: number;
  totalCotisationsPatronales: number;
  employees: CnssEmployeeLine[];
}

// ---------------------------------------------------------------------------
// Génération fichier texte CNSS
// Format : lignes séparées par saut de ligne, champs par pipe |
// Ligne 1 : en-tête employeur
// Lignes 2..N : détail salarié
// Dernière ligne : totaux
// ---------------------------------------------------------------------------

export function generateCnssExportText(data: CnssDeclarationData): string {
  const lines: string[] = [];
  const sep = "|";

  // En-tête employeur
  lines.push([
    "EN-TETE",
    data.matriculeEmployeur,
    data.raisonSociale,
    data.trimestre,
    data.annee.toString(),
    data.numeroTrimestre.toString(),
    data.nombreSalaries.toString(),
  ].join(sep));

  // Lignes salariés
  const fmt = (n: number) => n.toFixed(3);
  for (const emp of data.employees) {
    lines.push([
      "SALARIE",
      emp.matriculeCnss,
      emp.nom,
      emp.prenom,
      fmt(emp.salaireBrutMois1),
      fmt(emp.salaireBrutMois2),
      fmt(emp.salaireBrutMois3),
      fmt(emp.cotisationSalariale),
      fmt(emp.cotisationPatronale),
      emp.nombreJoursMois1.toString(),
      emp.nombreJoursMois2.toString(),
      emp.nombreJoursMois3.toString(),
    ].join(sep));
  }

  // Ligne totaux
  lines.push([
    "TOTAUX",
    data.nombreSalaries.toString(),
    fmt(data.totalSalaires),
    fmt(data.totalCotisationsSalariales),
    fmt(data.totalCotisationsPatronales),
  ].join(sep));

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Génération fichier CSV CNSS (alternative)
// ---------------------------------------------------------------------------

export function generateCnssExportCsv(data: CnssDeclarationData): string {
  const sep = ";";
  const lines: string[] = [];

  // En-tête
  lines.push([
    "Matricule CNSS", "Nom", "Prénom",
    "Salaire Brut M1", "Salaire Brut M2", "Salaire Brut M3",
    "Cotisation Salariale", "Cotisation Patronale",
    "Jours M1", "Jours M2", "Jours M3",
  ].join(sep));

  // Lignes salariés
  const fmt = (n: number) => n.toFixed(3);
  for (const emp of data.employees) {
    lines.push([
      emp.matriculeCnss, emp.nom, emp.prenom,
      fmt(emp.salaireBrutMois1), fmt(emp.salaireBrutMois2), fmt(emp.salaireBrutMois3),
      fmt(emp.cotisationSalariale), fmt(emp.cotisationPatronale),
      emp.nombreJoursMois1.toString(), emp.nombreJoursMois2.toString(), emp.nombreJoursMois3.toString(),
    ].join(sep));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Stockage fichier
// P0-3 : sur Vercel (Lambda), le filesystem est read-only sauf /tmp — même
// règle que document-generator.ts ; l'ancien code écrivait dans cwd()/storage
// → 500 « Erreur interne » systématique en production.
// ---------------------------------------------------------------------------

const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH ||
  (process.env.VERCEL === "1" ? "/tmp/storage" : path.resolve(process.cwd(), "storage"));

export function storeCnssFile(filename: string, content: string): string {
  if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  const filePath = path.join(STORAGE_ROOT, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

export function readCnssFile(cheminStockage: string): string {
  return fs.readFileSync(cheminStockage, "utf-8");
}

export function cnssFileExists(cheminStockage: string): boolean {
  return fs.existsSync(cheminStockage);
}

// ---------------------------------------------------------------------------
// Utilitaire — mois d'un trimestre
// ---------------------------------------------------------------------------

export function getMoisTrimestre(numeroTrimestre: number): number[] {
  switch (numeroTrimestre) {
    case 1: return [1, 2, 3];
    case 2: return [4, 5, 6];
    case 3: return [7, 8, 9];
    case 4: return [10, 11, 12];
    default: throw new Error(`Trimestre invalide: ${numeroTrimestre}`);
  }
}

export function getTrimestreFromMois(mois: number): number {
  if (mois <= 3) return 1;
  if (mois <= 6) return 2;
  if (mois <= 9) return 3;
  return 4;
}
