// =============================================================================
// Le Fiduciaire — Génération Documents (Phase 6)
// Bulletin PDF, Exports Excel/CSV
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import prisma from "./prisma.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
// Sur Vercel (Lambda), le filesystem est read-only sauf /tmp.
// Utiliser /tmp/storage comme répertoire de stockage.
const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH ||
  (process.env.VERCEL === "1" ? "/tmp/storage" : path.resolve(process.cwd(), "storage"));

// Ensure storage dir exists (lazy — only when needed, not at module load on Vercel)
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}
// Create immediately in local dev (filesystem writable)
if (process.env.VERCEL !== "1") {
  ensureStorageDir();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PayslipFull {
  id: string;
  mois: number;
  annee: number;
  matricule: string;
  nomPrenom: string;
  salaireBrutContractuel: number;
  tauxPresence: number;
  joursTravailles: number;
  joursAbsence: number;
  heuresSupplementaires: number;
  salaireBrutEffectif: number;
  montantHeuresSup: number;
  montantAbsence: number;
  baseImposable: number;
  retenueCnssSalarial: number;
  retenueCss: number;
  totalRetenuesSalariales: number;
  retenueCnssPatronal: number;
  fraisProfessionnels: number;
  netImposableAvantDeductions: number;
  deductionChefFamille: number;
  deductionEnfants: number;
  deductionParents: number;
  totalDeductionsFamiliales: number;
  baseIrpp: number;
  retenueIrpp: number;
  salaireNet: number;
  tauxHoraire: number | null;
}

// ---------------------------------------------------------------------------
// Bulletin PDF — HTML → simple text PDF (no external PDF lib needed)
// We generate a structured HTML and store it; production would use a proper
// PDF engine (puppeteer/wkhtmltopdf), but for Phase 6 we create a structured
// text-based bulletin that is stored and downloadable.
// ---------------------------------------------------------------------------

export function generateBulletinHtml(payslip: PayslipFull, clientInfo: { raisonSociale: string; matriculeFiscal?: string | null; matriculeCnss?: string | null }): string {
  const moisNoms = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const periode = `${moisNoms[payslip.mois - 1]} ${payslip.annee}`;

  const fmt = (n: number) => n.toFixed(3);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Bulletin de Paie — ${payslip.nomPrenom} — ${periode}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e3a5f; }
  h1 { color: #1e3a5f; border-bottom: 3px solid #c9a84c; padding-bottom: 8px; }
  h2 { color: #1e3a5f; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 6px 10px; border: 1px solid #ddd; text-align: left; }
  th { background: #1e3a5f; color: white; }
  .total-row td { font-weight: bold; background: #f0f0f0; }
  .net-row td { font-weight: bold; background: #c9a84c22; font-size: 1.1em; }
  .header-info { display: flex; justify-content: space-between; }
  .section { margin: 15px 0; }
  .right { text-align: right; }
  .footer { margin-top: 30px; font-size: 0.85em; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
</style>
</head>
<body>
<h1>BULLETIN DE PAIE</h1>

<div class="header-info">
  <div>
    <strong>Employeur :</strong> ${clientInfo.raisonSociale}<br>
    ${clientInfo.matriculeFiscal ? `<strong>MF :</strong> ${clientInfo.matriculeFiscal}<br>` : ''}
    ${clientInfo.matriculeCnss ? `<strong>Mat. CNSS :</strong> ${clientInfo.matriculeCnss}` : ''}
  </div>
  <div class="right">
    <strong>Période :</strong> ${periode}<br>
    <strong>Matricule :</strong> ${payslip.matricule}<br>
    <strong>Salarié :</strong> ${payslip.nomPrenom}
  </div>
</div>

<div class="section">
<h2>1. Éléments d'entrée</h2>
<table>
  <tr><th>Élément</th><th class="right">Valeur</th></tr>
  <tr><td>Salaire brut contractuel</td><td class="right">${fmt(payslip.salaireBrutContractuel)} DT</td></tr>
  <tr><td>Taux de présence</td><td class="right">${(payslip.tauxPresence * 100).toFixed(1)}%</td></tr>
  <tr><td>Jours travaillés</td><td class="right">${payslip.joursTravailles}</td></tr>
  <tr><td>Jours d'absence</td><td class="right">${payslip.joursAbsence}</td></tr>
  <tr><td>Heures supplémentaires</td><td class="right">${payslip.heuresSupplementaires}h</td></tr>
</table>
</div>

<div class="section">
<h2>2. Calculs intermédiaires</h2>
<table>
  <tr><th>Élément</th><th class="right">Montant (DT)</th></tr>
  <tr><td>Salaire brut effectif</td><td class="right">${fmt(payslip.salaireBrutEffectif)}</td></tr>
  <tr><td>Montant heures supplémentaires</td><td class="right">${fmt(payslip.montantHeuresSup)}</td></tr>
  <tr><td>Déduction absence</td><td class="right">${fmt(payslip.montantAbsence)}</td></tr>
  <tr><td>Base imposable</td><td class="right">${fmt(payslip.baseImposable)}</td></tr>
</table>
</div>

<div class="section">
<h2>3. Cotisations sociales</h2>
<table>
  <tr><th>Cotisation</th><th class="right">Salariale (DT)</th><th class="right">Patronale (DT)</th></tr>
  <tr><td>CNSS</td><td class="right">${fmt(payslip.retenueCnssSalarial)}</td><td class="right">${fmt(payslip.retenueCnssPatronal)}</td></tr>
  <tr><td>CSS</td><td class="right">${fmt(payslip.retenueCss)}</td><td class="right">—</td></tr>
  <tr class="total-row"><td>Total retenues salariales</td><td class="right">${fmt(payslip.totalRetenuesSalariales)}</td><td></td></tr>
</table>
</div>

<div class="section">
<h2>4. Fiscalité</h2>
<table>
  <tr><th>Élément</th><th class="right">Montant (DT)</th></tr>
  <tr><td>Frais professionnels</td><td class="right">${fmt(payslip.fraisProfessionnels)}</td></tr>
  <tr><td>Net imposable avant déductions</td><td class="right">${fmt(payslip.netImposableAvantDeductions)}</td></tr>
  <tr><td>Déduction chef de famille</td><td class="right">${fmt(payslip.deductionChefFamille)}</td></tr>
  <tr><td>Déduction enfants</td><td class="right">${fmt(payslip.deductionEnfants)}</td></tr>
  <tr><td>Déduction parents en charge</td><td class="right">${fmt(payslip.deductionParents)}</td></tr>
  <tr class="total-row"><td>Total déductions familiales</td><td class="right">${fmt(payslip.totalDeductionsFamiliales)}</td></tr>
  <tr><td>Base IRPP</td><td class="right">${fmt(payslip.baseIrpp)}</td></tr>
  <tr><td>Retenue IRPP</td><td class="right">${fmt(payslip.retenueIrpp)}</td></tr>
</table>
</div>

<div class="section">
<h2>5. Résultat</h2>
<table>
  <tr class="net-row"><td><strong>SALAIRE NET À PAYER</strong></td><td class="right"><strong>${fmt(payslip.salaireNet)} DT</strong></td></tr>
  ${payslip.tauxHoraire !== null ? `<tr><td>Taux horaire effectif</td><td class="right">${fmt(payslip.tauxHoraire)} DT/h</td></tr>` : ''}
</table>
</div>

<div class="footer">
  Document généré par Le Fiduciaire — ${new Date().toISOString().slice(0, 10)}<br>
  Version réglementaire : Barème IRPP 2026, CNSS LF 2026
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Stockage fichier local
// ---------------------------------------------------------------------------

export function storeFile(filename: string, content: Buffer | string): string {
  ensureStorageDir();
  const filePath = path.join(STORAGE_ROOT, filename);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (typeof content === "string") {
    fs.writeFileSync(filePath, content, "utf-8");
  } else {
    fs.writeFileSync(filePath, content);
  }

  return filePath;
}

export function readFile(cheminStockage: string): Buffer {
  return fs.readFileSync(cheminStockage);
}

export function fileExists(cheminStockage: string): boolean {
  return fs.existsSync(cheminStockage);
}

// ---------------------------------------------------------------------------
// Export Excel des bulletins d'une période
// ---------------------------------------------------------------------------

export function generatePayrollExcel(payslips: PayslipFull[], periode: string): Buffer {
  const rows = payslips.map(p => ({
    "Matricule": p.matricule,
    "Nom & Prénom": p.nomPrenom,
    "Brut contractuel": p.salaireBrutContractuel,
    "Taux présence": p.tauxPresence,
    "Jours travaillés": p.joursTravailles,
    "Jours absence": p.joursAbsence,
    "Heures supp.": p.heuresSupplementaires,
    "Brut effectif": p.salaireBrutEffectif,
    "CNSS salarial": p.retenueCnssSalarial,
    "CSS": p.retenueCss,
    "Frais pro": p.fraisProfessionnels,
    "Déductions fam.": p.totalDeductionsFamiliales,
    "IRPP": p.retenueIrpp,
    "Net à payer": p.salaireNet,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  const sheetName = `Paie ${periode.replace("/", "-")}`;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// ---------------------------------------------------------------------------
// Export CSV des bulletins d'une période
// ---------------------------------------------------------------------------

export function generatePayrollCsv(payslips: PayslipFull[]): string {
  const headers = [
    "Matricule", "Nom & Prénom", "Brut contractuel", "Taux présence",
    "Jours travaillés", "Jours absence", "Heures supp.", "Brut effectif",
    "CNSS salarial", "CSS", "Frais pro", "Déductions fam.", "IRPP", "Net à payer"
  ];

  const rows = payslips.map(p => [
    p.matricule, p.nomPrenom, p.salaireBrutContractuel, p.tauxPresence,
    p.joursTravailles, p.joursAbsence, p.heuresSupplementaires, p.salaireBrutEffectif,
    p.retenueCnssSalarial, p.retenueCss, p.fraisProfessionnels,
    p.totalDeductionsFamiliales, p.retenueIrpp, p.salaireNet
  ].join(";"));

  return [headers.join(";"), ...rows].join("\n");
}
