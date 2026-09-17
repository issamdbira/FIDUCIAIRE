// =============================================================================
// Le Fiduciaire — Tests P1-2 : import pointage CSV/XLSX encodage UTF-8
// =============================================================================
// Régression de la réévaluation réelle : tout CSV standard (Excel/LibreOffice,
// UTF-8) était REJETÉ — SheetJS décodait en latin1 → « jours travaillés réels »
// devenait « jours travaillÃ©s rÃ©els » → colonne requise introuvable.
// =============================================================================

import { describe, test, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseFile } from "./attendance-import.js";

/** Construit un CSV UTF-8 BOM comme Excel/LibreOffice l'exportent. */
function csvUtf8(headers: string, row: string): Buffer {
  const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
  const body = Buffer.from(`${headers}\r\n${row}\r\n`, "utf-8");
  return Buffer.concat([BOM, body]);
}

/** Simule le mojibake : texte UTF-8 lu octet-par-octet en latin1. */
function mojibake(headers: string, row: string): Buffer {
  const utf8 = Buffer.from(`${headers}\r\n${row}\r\n`, "utf-8");
  // Chaque octet devient un caractère latin1 (comme un mauvais décodage)
  return Buffer.from(Array.from(utf8).map((b) => b), "latin1");
}

const HEADERS = "Matricule;Nom & Prénom;Jours travaillés réels;Congés payés;Absences justifiées;Absences non justifiées;Heures supplémentaires";
const ROW = "E2E-900001;Ali BenE2E;22;0;0;0;8";

describe("P1-2 — Import pointage : encodages CSV", () => {

  test("CSV UTF-8 avec BOM (export Excel standard) est accepté", () => {
    const rows = parseFile(csvUtf8(HEADERS, ROW), "pointage.csv");
    expect(rows.length).toBe(1);
    expect(rows[0].matricule).toBe("E2E-900001");
    expect(rows[0].joursTravaillesReels).toBe(22);
    expect(rows[0].heuresSupplementaires).toBe(8);
  });

  test("CSV UTF-8 SANS BOM est accepté", () => {
    const buf = Buffer.from(`${HEADERS}\r\n${ROW}\r\n`, "utf-8");
    const rows = parseFile(buf, "pointage.csv");
    expect(rows.length).toBe(1);
    expect(rows[0].joursTravaillesReels).toBe(22);
  });

  test("CSV avec en-têtes mojibake (Ã©) est réparé et accepté", () => {
    // C'est le cas exact observé : « travaillÃ©s » au lieu de « travaillés »
    const rows = parseFile(mojibake(HEADERS, ROW), "pointage.csv");
    expect(rows.length).toBe(1);
    expect(rows[0].joursTravaillesReels).toBe(22);
    expect(rows[0].congesPayes).toBe(0);
  });

  test("CSV avec en-têtes SANS ACCENTS est accepté (saisie manuelle)", () => {
    const headers = "matricule;nom & prenom;jours travailles reels;conges payes;absences justifiees;absences non justifiees;heures supplementaires";
    const buf = Buffer.from(`${headers}\r\n${ROW}\r\n`, "utf-8");
    const rows = parseFile(buf, "pointage.csv");
    expect(rows.length).toBe(1);
    expect(rows[0].heuresSupplementaires).toBe(8);
  });

  test("XLSX binaire reste fonctionnel (aucune régression)", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      HEADERS.split(";"),
      ROW.split(";"),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Pointage");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const rows = parseFile(buf, "pointage.xlsx");
    expect(rows.length).toBe(1);
    expect(rows[0].joursTravaillesReels).toBe(22);
  });

  test("Colonne requise absente → erreur explicite (pas de crash)", () => {
    const buf = Buffer.from("Matricule;Nom\r\nE2E-1;Ali\r\n", "utf-8");
    expect(() => parseFile(buf, "bad.csv")).toThrow(/jours/i);
  });
});
