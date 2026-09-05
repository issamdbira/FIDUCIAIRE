import type { EmployeeTXTResult, LigneTXTParsee, TesteurResult } from "./types";

/**
 * Parsing et validation de fichiers TXT CNSS (122 caractères/ligne).
 * Logique portée verbatim depuis l'outil de référence CNSS-DS.
 */

export function parserLigneTXT(line: string): LigneTXTParsee | null {
  if (line.length !== 122) return null;
  return {
    employeurNum: line.substring(0, 8),
    employeurCle: line.substring(8, 10),
    employeurCode: line.substring(10, 14),
    trimestre: line.substring(14, 15),
    annee: line.substring(15, 19),
    page: line.substring(19, 22),
    ligne: line.substring(22, 24),
    matricule: line.substring(24, 32),
    cle: line.substring(32, 34),
    nom: line.substring(34, 94).trim(),
    cin: line.substring(94, 102),
    salaireMillimes: line.substring(102, 112),
    zoneVierge: line.substring(112, 122),
  };
}

/** Analyse le contenu textuel d'un fichier TXT CNSS (lignes déjà séparées). */
export function analyserContenuTXT(fileName: string, content: string): TesteurResult {
  const allLines = content.split(/\r?\n/);
  const lines = allLines.filter((l) => l.length > 0);
  const employees: EmployeeTXTResult[] = [];
  const errors: string[] = [];
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    if (line.length !== 122) {
      errors.push(`Ligne ${lineNum}: longueur ${line.length} au lieu de 122`);
      continue;
    }
    const parsed = parserLigneTXT(line);
    if (parsed) {
      const salaireDT = parseInt(parsed.salaireMillimes || "0", 10) / 1000;
      const zoneOk = /^[0-9\s]{10}$/.test(parsed.zoneVierge);
      employees.push({ ...parsed, salaireDT, zoneOk });
    }
  }

  const totalSalaries = employees.length;
  const totalSalaireDT = employees.reduce((s, e) => s + e.salaireDT, 0);

  return { fileName, employees, totalSalaries, totalSalaireDT, errors, valid: totalSalaries > 0 };
}

/** Lit un fichier TXT (encodage windows-1252, comme la déclaration CNSS) puis l'analyse. */
export function testerFichierTXT(file: File): Promise<TesteurResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(analyserContenuTXT(file.name, content));
    };
    reader.onerror = () => resolve({ fileName: file.name, employees: [], totalSalaries: 0, totalSalaireDT: 0, errors: [], valid: false, error: "Erreur de lecture" });
    reader.readAsText(file, "windows-1252");
  });
}
