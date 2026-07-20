import type { EmployeurCNSS, SalarieCNSS } from "./types";

/**
 * Génération des fichiers de déclaration CNSS (format fixe 122 caractères).
 * Logique portée verbatim depuis l'outil de référence CNSS-DS (GeneratorCore).
 * Spécification CNSS 2012 — voir types.ts pour le détail des zones.
 */

export function padLeft(v: string | number, l: number): string {
  return String(v).padStart(l, "0").slice(-l);
}

export function padRight(v: string, l: number): string {
  return String(v).padEnd(l, " ").slice(0, l);
}

export function genererLigne(
  emp: EmployeurCNSS,
  sal: SalarieCNSS,
  t: string | number,
  year: string | number,
  page: number,
  ligne: number
): string {
  return (
    padLeft(emp.num, 8) +
    padLeft(emp.cle, 2) +
    padLeft(emp.code, 4) +
    padLeft(t, 1) +
    padLeft(year, 4) +
    padLeft(page, 3) +
    padLeft(ligne, 2) +
    padLeft(sal.matricule, 8) +
    padLeft(sal.cle, 2) +
    padRight(sal.nom.toUpperCase(), 60) +
    padLeft(sal.cin, 8) +
    padLeft(sal.salaire, 10) +
    "0".repeat(10)
  );
}

export function genererFichier(
  emp: EmployeurCNSS,
  employees: SalarieCNSS[],
  t: string | number,
  year: string | number
): string[] {
  return employees.map((sal, idx) => {
    const pg = Math.floor(idx / 12) + 1;
    const ln = (idx % 12) + 1;
    return genererLigne(emp, sal, t, year, pg, ln);
  });
}

export function construireNomFichier(emp: EmployeurCNSS, t: string | number, year: string | number): string {
  return `DS${padLeft(emp.num, 8)}${padLeft(emp.cle, 2)}${padLeft(emp.code, 4)}.${t}${year}`;
}

export function telechargerTexte(content: string, filename: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=windows-1252" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
