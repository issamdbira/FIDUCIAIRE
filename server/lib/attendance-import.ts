// =============================================================================
// Le Fiduciaire — Import Pointage (Excel/CSV) avec validation & anomalies
// Phase 4 — Pointage Mensuel
// =============================================================================

import * as XLSX from "xlsx";
import prisma from "../lib/prisma.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AttendanceRow {
  ligne: number;                 // N° de ligne dans le fichier (pour rapport)
  matricule: string;             // Matricule CNSS
  nomPrenom: string;             // Nom & prénom
  joursTravaillesReels: number;  // Jours travaillés réels
  congesPayes: number;           // Congés payés
  absencesJustifiees: number;   // Absences justifiées
  absencesNonJustifiees: number; // Absences non justifiées
  heuresSupplementaires: number; // Heures supplémentaires
}

export interface Anomalie {
  ligne: number;
  matricule: string;
  type: AnomalieType;
  message: string;
  severity: "BLOQUANTE" | "AVERTISSEMENT";
}

export type AnomalieType =
  | "MATRICULE_VIDE"
  | "MATRICULE_INCONNU"
  | "VALEUR_NEGATIVE"
  | "VALEUR_NON_NUMERIQUE"
  | "INCOHERENCE_JOURS"
  | "DOUBLON_MATRICULE"
  | "EMPLOYE_INACTIF"
  | "JOURS_EXCESSIFS";

export interface ImportResult {
  rows: AttendanceRow[];
  anomalies: Anomalie[];
  lignesTotal: number;
  lignesOk: number;
  lignesAnomalie: number;
  hasBloquantes: boolean;
}

// ---------------------------------------------------------------------------
// Colonnes attendues (insensible à la casse, avec variantes)
// ---------------------------------------------------------------------------

const COLUMN_MAPPINGS: Record<string, string[]> = {
  matricule: ["matricule", "matricule cnss", "matricule_cnss", "cnss", "n° matricule", "n°matricule"],
  nomPrenom: ["nom & prénom", "nom et prenom", "nom_prenom", "nom prénom", "nom", "name"],
  joursTravaillesReels: ["jours travaillés réels", "jours travaillés", "jours_travailles", "jt", "jours réels", "travaillés", "jours reels"],
  congesPayes: ["congés payés", "conges payes", "cp", "congés", "conges"],
  absencesJustifiees: ["absences justifiées", "absences justifiees", "aj", "abs. justifiées", "abs justifiées"],
  absencesNonJustifiees: ["absences non justifiées", "absences non justifiees", "anj", "abs. non justifiées", "abs non justifiées"],
  heuresSupplementaires: ["heures supplémentaires", "heures supplementaires", "hs", "h supp", "heures supp", "heures sup"],
};

// ---------------------------------------------------------------------------
// Normalisation de nom de colonne
// P1-2 : les CSV « UTF-8 » d'Excel/LibreOffice arrivaient décodés en latin1
// (« jours travaillés réels » → « jours travaillÃ©s rÃ©els ») → colonne
// requise introuvable → import rejeté. Trois parades cumulées :
//   1) codepage: 65001 au XLSX.read + retrait du BOM ;
//   2) réparation du mojibake (latin1 → utf8) sur l'en-tête ;
//   3) comparaison INSENSIBLE AUX ACCENTS des deux côtés.
// ---------------------------------------------------------------------------

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeColumnName(col: string): string {
  let c = col
    .replace(/\uFEFF/g, "") // BOM UTF-8
    .trim()
    .toLowerCase()
    .replace(/[_\-./\\]/g, " ")
    .replace(/\s+/g, " ");
  // Mojibake UTF-8 lu en latin1 (Ã©, Ã¨, Ã…) — réparable par réencodage
  if (/Ã|Â/.test(c)) {
    try {
      const fixed = Buffer.from(c, "latin1").toString("utf8");
      if (!fixed.includes("\uFFFD") && fixed !== c) c = fixed;
    } catch {
      // Buffer indisponible — la normalisation accents suffira souvent
    }
  }
  return stripAccents(c);
}

function mapColumn(header: string): string | null {
  const normalized = normalizeColumnName(header);
  for (const [field, variants] of Object.entries(COLUMN_MAPPINGS)) {
    if (variants.some((v) => normalizeColumnName(v) === normalized)) return field;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parse un buffer Excel/CSV en lignes structurées
// ---------------------------------------------------------------------------

export function parseFile(buffer: Buffer, filename: string): AttendanceRow[] {
  // P1-2 : CSV UTF-8 — sans codepage, SheetJS décode en latin1 (mojibake).
  // Le BOM éventuel est retiré (il préfixait la 1re colonne « ﻿Matricule »).
  let data: Buffer = buffer;
  if (buffer.length > 2 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    data = buffer.subarray(3);
  }
  const workbook = XLSX.read(data, { type: "buffer", codepage: 65001 });
  const sheetName = workbook.SheetNames[0]; // Première feuille
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Aucune feuille trouvée dans le fichier "${filename}"`);
  }

  const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false, // Garder les valeurs comme strings pour validation
  });

  if (rawData.length === 0) {
    throw new Error(`Le fichier "${filename}" est vide ou ne contient aucune donnée exploitable`);
  }

  // Mapper les colonnes
  const headers = Object.keys(rawData[0]);
  const colMap: Record<string, string> = {}; // header → field
  for (const h of headers) {
    const field = mapColumn(h);
    if (field) colMap[h] = field;
  }

  // Vérifier que les colonnes requises sont présentes
  const requiredFields = ["matricule", "joursTravaillesReels"];
  const mappedFields = new Set(Object.values(colMap));
  for (const req of requiredFields) {
    if (!mappedFields.has(req)) {
      throw new Error(`Colonne requise "${req}" non trouvée. Colonnes détectées: ${headers.join(", ")}`);
    }
  }

  // Convertir en AttendanceRow
  const rows: AttendanceRow[] = [];
  for (let i = 0; i < rawData.length; i++) {
    const rawRow = rawData[i];
    const getVal = (field: string): string => {
      for (const [h, f] of Object.entries(colMap)) {
        if (f === field) return String(rawRow[h] ?? "").trim();
      }
      return "";
    };

    const toNum = (val: string): number => {
      if (val === "" || val === "-") return 0;
      const n = parseFloat(val.replace(",", "."));
      return isNaN(n) ? NaN : n;
    };

    rows.push({
      ligne: i + 2, // +2 car ligne 1 = en-tête
      matricule: getVal("matricule"),
      nomPrenom: getVal("nomPrenom") || getVal("matricule"), // Fallback si nom absent
      joursTravaillesReels: toNum(getVal("joursTravaillesReels")),
      congesPayes: toNum(getVal("congesPayes")),
      absencesJustifiees: toNum(getVal("absencesJustifiees")),
      absencesNonJustifiees: toNum(getVal("absencesNonJustifiees")),
      heuresSupplementaires: toNum(getVal("heuresSupplementaires")),
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Validation stricte avec détection d'anomalies
// ---------------------------------------------------------------------------

export interface PlageJoursOuvres {
  /** Plancher : jours ouvrés 40h (lundi-vendri) — convention administrative */
  plancher: number;
  /** Plafond : jours ouvrés 48h (lundi-samedi) — convention sectorielle tunisienne */
  plafond: number;
}

export async function validateRows(
  rows: AttendanceRow[],
  workspaceId: string,
  plageJoursOuvres: PlageJoursOuvres,
): Promise<ImportResult> {
  const anomalies: Anomalie[] = [];

  // 1. Charger les employés actifs du workspace pour lookup matricule
  const employees = await prisma.employees.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, matriculeCnss: true, firstName: true, lastName: true, baseSalary: true },
  });
  const matriculeMap = new Map(employees.map(e => [e.matriculeCnss, e]));

  // 2. Vérifier les doublons de matricule dans le fichier
  const seenMatricules = new Map<string, number>(); // matricule → première ligne

  for (const row of rows) {
    // --- Matricule vide ---
    if (!row.matricule || row.matricule.trim() === "") {
      anomalies.push({
        ligne: row.ligne, matricule: "", type: "MATRICULE_VIDE",
        message: "Matricule absent sur cette ligne",
        severity: "BLOQUANTE",
      });
      continue;
    }

    // --- Doublon ---
    const firstLine = seenMatricules.get(row.matricule);
    if (firstLine) {
      anomalies.push({
        ligne: row.ligne, matricule: row.matricule, type: "DOUBLON_MATRICULE",
        message: `Doublon: le matricule "${row.matricule}" apparaît aussi ligne ${firstLine}`,
        severity: "BLOQUANTE",
      });
      continue;
    }
    seenMatricules.set(row.matricule, row.ligne);

    // --- Matricule inconnu ---
    const employee = matriculeMap.get(row.matricule);
    if (!employee) {
      anomalies.push({
        ligne: row.ligne, matricule: row.matricule, type: "MATRICULE_INCONNU",
        message: `Matricule "${row.matricule}" non trouvé parmi les employés actifs du workspace`,
        severity: "BLOQUANTE",
      });
      continue;
    }

    // --- Valeurs négatives ---
    const numericFields: [string, number][] = [
      ["joursTravaillesReels", row.joursTravaillesReels],
      ["congesPayes", row.congesPayes],
      ["absencesJustifiees", row.absencesJustifiees],
      ["absencesNonJustifiees", row.absencesNonJustifiees],
      ["heuresSupplementaires", row.heuresSupplementaires],
    ];

    for (const [field, val] of numericFields) {
      if (isNaN(val)) {
        anomalies.push({
          ligne: row.ligne, matricule: row.matricule, type: "VALEUR_NON_NUMERIQUE",
          message: `Colonne "${field}": valeur non numérique`,
          severity: "BLOQUANTE",
        });
      } else if (val < 0) {
        anomalies.push({
          ligne: row.ligne, matricule: row.matricule, type: "VALEUR_NEGATIVE",
          message: `Colonne "${field}": valeur négative (${val})`,
          severity: "BLOQUANTE",
        });
      }
    }

    // --- Incohérence des jours ---
    // Référence : les DEUX conventions tunisiennes coexistent. 40h (lundi-vendri,
    // ~21-23 j/mois) et 48h (lundi-samedi, ~25-27 j/mois). Un total dans la plage
    // est TOUJOURS cohérent ; sous le plancher = sous-déclaration suspecte
    // (typo « 2 » au lieu de « 22 », embauche fin de mois à confirmer) ;
    // au-dessus du plafond + marge 2j = sur-déclaration.
    const totalJours = row.joursTravaillesReels + row.congesPayes + row.absencesJustifiees + row.absencesNonJustifiees;
    if (!isNaN(totalJours)) {
      if (totalJours > plageJoursOuvres.plafond + 2) {
        anomalies.push({
          ligne: row.ligne, matricule: row.matricule, type: "JOURS_EXCESSIFS",
          message: `Total jours (${totalJours}) dépasse les jours ouvrés du mois (${plageJoursOuvres.plafond} en 48h) + marge 2j`,
          severity: "AVERTISSEMENT",
        });
      } else if (totalJours < plageJoursOuvres.plancher) {
        anomalies.push({
          ligne: row.ligne, matricule: row.matricule, type: "INCOHERENCE_JOURS",
          message: `Total jours (${totalJours}) inférieur aux jours ouvrés 40h du mois (${plageJoursOuvres.plancher}) — vérifier le pointage (embauche/fin de contrat en cours de mois ?)`,
          severity: "AVERTISSEMENT",
        });
      }
    }

    // --- Jours travaillés > 31 ---
    if (row.joursTravaillesReels > 31) {
      anomalies.push({
        ligne: row.ligne, matricule: row.matricule, type: "JOURS_EXCESSIFS",
        message: `Jours travaillés (${row.joursTravaillesReels}) > 31 — valeur irréaliste`,
        severity: "BLOQUANTE",
      });
    }
  }

  // Résultat
  const lignesAvecAnomalie = new Set(anomalies.map(a => a.ligne));
  const lignesOk = rows.filter(r => !lignesAvecAnomalie.has(r.ligne)).length;
  const hasBloquantes = anomalies.some(a => a.severity === "BLOQUANTE");

  return {
    rows,
    anomalies,
    lignesTotal: rows.length,
    lignesOk,
    lignesAnomalie: lignesAvecAnomalie.size,
    hasBloquantes,
  };
}

// ---------------------------------------------------------------------------
// Créer les summaries + variables de paie à partir des lignes valides
// ---------------------------------------------------------------------------

export async function createSummariesAndVariables(
  importId: string,
  rows: AttendanceRow[],
  anomalies: Anomalie[],
  workspaceId: string,
  mois: number,
  annee: number,
  joursOuvresMois: number,
): Promise<{ summariesCreated: number; variablesCreated: number }> {
  // Lignes avec anomalies bloquantes → ignorées
  const bloquantes = new Set(
    anomalies.filter(a => a.severity === "BLOQUANTE").map(a => a.ligne)
  );
  const validRows = rows.filter(r => !bloquantes.has(r.ligne));

  // Charger les employés
  const employees = await prisma.employees.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, matriculeCnss: true, baseSalary: true },
  });
  const matriculeMap = new Map(employees.map(e => [e.matriculeCnss, e]));

  // Charger les contrats actifs avec dernière version
  const contracts = await prisma.contract.findMany({
    where: { workspaceId, statut: "ACTIF" },
    include: {
      versions: { orderBy: { dateEffet: "desc" }, take: 1 },
    },
  });
  const employeeContractMap = new Map(
    contracts.map(c => [c.employeeId, c.versions[0]?.salaireBrut ?? null])
  );

  let summariesCreated = 0;
  let variablesCreated = 0;

  for (const row of validRows) {
    const employee = matriculeMap.get(row.matricule);
    if (!employee) continue; // Déjà signalé en anomalie

    // Champs calculés
    // joursOuvresTotal = jours « comptés » du mois (réels + congés + absences
    // justifiées). P1-6 (réévaluation) : les congés payés sont RÉMUNÉRÉS en
    // Tunisie — ils comptent au numérateur ET au dénominateur du taux de
    // présence. Seules les absences justifiées (indemnisées côté CNSS) et non
    // justifiées réduisent la rémunération d'activité.
    const joursOuvresTotal = row.joursTravaillesReels + row.congesPayes + row.absencesJustifiees;
    const joursRemuneres = row.joursTravaillesReels + row.congesPayes;
    const tauxPresence = joursOuvresTotal > 0
      ? joursRemuneres / joursOuvresTotal
      : 0;

    // Créer le résumé
    const summary = await prisma.attendanceSummary.create({
      data: {
        importId,
        employeeId: employee.id,
        workspaceId,
        matricule: row.matricule,
        nomPrenom: row.nomPrenom,
        joursTravaillesReels: row.joursTravaillesReels,
        congesPayes: row.congesPayes,
        absencesJustifiees: row.absencesJustifiees,
        absencesNonJustifiees: row.absencesNonJustifiees,
        heuresSupplementaires: row.heuresSupplementaires,
        joursOuvresTotal,
        joursCalendairesMois: new Date(annee, mois, 0).getDate(),
        tauxPresence,
      },
    });
    summariesCreated++;

    // Salaire brut du contrat (ou baseSalary de l'employé en fallback)
    const salaireBrutMensuel = employeeContractMap.get(employee.id) ?? employee.baseSalary;
    const salaireBrutEffectif = salaireBrutMensuel * tauxPresence;
    const joursAbsence = row.absencesJustifiees + row.absencesNonJustifiees;
    const montantAbsence = joursAbsence > 0 && joursOuvresTotal > 0
      ? (salaireBrutMensuel / joursOuvresTotal) * joursAbsence
      : 0;

    // Créer la variable de paie (statut PROPOSEE — nécessite validation humaine)
    await prisma.payrollVariable.create({
      data: {
        summaryId: summary.id,
        employeeId: employee.id,
        workspaceId,
        mois,
        annee,
        salaireBrutMensuel,
        tauxPresence,
        salaireBrutEffectif,
        heuresSupplementaires: row.heuresSupplementaires,
        joursTravailles: row.joursTravaillesReels,
        joursAbsence,
        montantAbsence,
        statut: "PROPOSEE",
      },
    });
    variablesCreated++;
  }

  return { summariesCreated, variablesCreated };
}

// ---------------------------------------------------------------------------
// Jours ouvrés standard pour un mois donné
// Dualité tunisienne : 48h = lundi-samedi (plafond), 40h = lundi-vendri
// (plancher). Les deux sont des régimes normaux — la validation accepte la
// plage entière (l'ancien « 26 en dur » générait un avertissement fallacieux
// sur chaque mois réel, 21 à 27 jours).
// ---------------------------------------------------------------------------

export function getJoursOuvresMois(mois: number, annee: number): number {
  // Convention 48h (lundi-samedi) — alignée sur le moteur de paie
  return compterJours(mois, annee, false);
}

export function getJoursOuvresMois40h(mois: number, annee: number): number {
  // Convention 40h (lundi-vendri)
  return compterJours(mois, annee, true);
}

export function getPlageJoursOuvres(mois: number, annee: number): PlageJoursOuvres {
  return {
    plancher: getJoursOuvresMois40h(mois, annee),
    plafond: getJoursOuvresMois(mois, annee),
  };
}

function compterJours(mois: number, annee: number, lundiVendriSeulement: boolean): number {
  const premierJour = new Date(annee, mois - 1, 1);
  const dernierJour = new Date(annee, mois, 0);
  let joursOuvres = 0;

  for (let d = new Date(premierJour); d <= dernierJour; d.setDate(d.getDate() + 1)) {
    const jour = d.getDay();
    // Lundi(1) à Samedi(6) = ouvré, Dimanche(0) = repos ;
    // en 40h, le samedi(6) est également chômé
    if (jour >= 1 && (jour <= 5 || (!lundiVendriSeulement && jour === 6))) {
      joursOuvres++;
    }
  }

  return joursOuvres;
}
