import type { EmployeurCNSS, SalarieCNSS } from "./types";

/**
 * Validation des données CNSS — logique portée verbatim depuis l'outil
 * de référence CNSS-DS (ValidatorCore). Règles de format, pas de taux.
 */
export function validerSalarie(sal: SalarieCNSS): string[] {
  const err: string[] = [];
  if (!sal.matricule || !/^\d{1,8}$/.test(sal.matricule)) err.push("Matricule");
  if (!sal.cle || !/^\d{1,2}$/.test(sal.cle)) err.push("Clé");
  if (!sal.nom) err.push("Nom");
  if (!sal.cin || !/^\d{1,8}$/.test(sal.cin)) err.push("CIN");
  if (!sal.salaire || !/^\d+$/.test(String(sal.salaire))) err.push("Salaire");
  return err;
}

export function validerEmployeur(emp: EmployeurCNSS): string[] {
  const err: string[] = [];
  if (!emp.num || !/^\d{1,8}$/.test(emp.num)) err.push("Num");
  if (!emp.cle || !/^\d{1,2}$/.test(emp.cle)) err.push("Clé");
  if (!emp.code || !/^\d{1,4}$/.test(emp.code)) err.push("Code");
  return err;
}
