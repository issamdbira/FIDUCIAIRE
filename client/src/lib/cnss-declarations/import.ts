import Papa from "papaparse";
import * as XLSX from "xlsx";
import { construireNomFichier, genererFichier } from "./generator";
import { validerSalarie } from "./validator";
import type { DeclarationCNSS, EmployeurCNSS, SalarieCNSS } from "./types";

/**
 * Import CSV/Excel de salariés pour une déclaration CNSS.
 * Le nom de fichier doit contenir le trimestre et l'année : ex. "paie-1-2026.csv".
 * Logique portée depuis l'outil de référence CNSS-DS.
 */

export function extraireTrimestreAnnee(fileName: string): { trimester: string; year: string } | null {
  const m = fileName.match(/(\d{1,2})-(\d{4})\.(csv|xlsx|xls)$/i);
  return m ? { trimester: m[1], year: m[2] } : null;
}

function completerZeros(v: string | undefined, size: number): string {
  const c = String(v || "").replace(/[^0-9]/g, "");
  if (!c) return "".padStart(size, "0");
  return c.padStart(size, "0").slice(-size);
}

export function normaliserLigneCSV(row: string[]): SalarieCNSS {
  const rawMat = (row[0] || "").trim();
  const rawCle = (row[1] || "").trim();
  const rawNom = (row[2] || "").trim();
  const rawCin = (row[3] || "").trim();
  const rawSal = (row[4] || "").trim();
  return {
    matricule: completerZeros(rawMat, 8),
    cle: completerZeros(rawCle, 2),
    nom: (rawNom.toUpperCase().trim().replace(/\s+/g, " ") || "SANS NOM").slice(0, 60),
    cin: completerZeros(rawCin, 8),
    salaire: completerZeros(rawSal, 10),
  };
}

interface ResultatImport {
  declaration?: DeclarationCNSS;
  error?: string;
}

function construireDeclaration(fileName: string, trimester: string, year: string, employees: SalarieCNSS[]): ResultatImport {
  if (employees.length === 0) {
    return { error: `Aucun salarié dans ${fileName}` };
  }
  return {
    declaration: {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      fileName,
      trimester,
      year,
      employees,
      totalSalary: employees.reduce((s, e) => s + (parseInt(e.salaire, 10) || 0), 0),
      errorsList: [],
      txtPreview: "",
      generatedFilename: "",
    },
  };
}

export function importerCSV(file: File): Promise<ResultatImport> {
  return new Promise((resolve) => {
    const periode = extraireTrimestreAnnee(file.name);
    if (!periode) {
      resolve({ error: `Nom de fichier invalide (attendu: nom-T-ANNEE.csv) : ${file.name}` });
      return;
    }
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        let rows = results.data;
        if (rows.length > 0 && rows[0].some((c) => /matricule|nom|cin|salaire/i.test(String(c)))) {
          rows = rows.slice(1);
        }
        const employees: SalarieCNSS[] = [];
        rows.forEach((row) => {
          const norm = normaliserLigneCSV(row);
          if (norm.matricule && norm.cle && norm.nom && norm.salaire) employees.push(norm);
        });
        resolve(construireDeclaration(file.name, periode.trimester, periode.year, employees));
      },
      error: (err) => resolve({ error: `Erreur ${file.name}: ${err.message}` }),
    });
  });
}

export function importerExcel(file: File): Promise<ResultatImport> {
  return new Promise((resolve) => {
    const periode = extraireTrimestreAnnee(file.name);
    if (!periode) {
      resolve({ error: `Nom de fichier invalide (attendu: nom-T-ANNEE.xlsx) : ${file.name}` });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      const employees: SalarieCNSS[] = [];
      rows.slice(1).forEach((row) => {
        const norm = normaliserLigneCSV(row);
        employees.push(norm);
      });
      resolve(construireDeclaration(file.name, periode.trimester, periode.year, employees));
    };
    reader.readAsArrayBuffer(file);
  });
}

/** Régénère l'aperçu TXT et la validation d'une déclaration (après import ou modification). */
export function regenererApercu(emp: EmployeurCNSS, decl: DeclarationCNSS): DeclarationCNSS {
  const txtPreview = genererFichier(emp, decl.employees, decl.trimester, decl.year).join("\n");
  const generatedFilename = construireNomFichier(emp, decl.trimester, decl.year);
  const errorsList: string[] = [];
  decl.employees.forEach((e, idx) => {
    const err = validerSalarie(e);
    if (err.length) errorsList.push(`Ligne ${idx + 1} (${e.nom}): ${err.join(", ")}`);
  });
  return { ...decl, txtPreview, generatedFilename, errorsList };
}
