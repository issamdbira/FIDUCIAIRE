// =============================================================================
// Le Fiduciaire — Routes Documents (Phase 6)
// POST   /api/documents/payslips/:id/pdf     — Générer bulletin PDF
// GET    /api/documents/payslips/:id/download — Télécharger bulletin
// POST   /api/documents/periods/:id/excel    — Export Excel période
// POST   /api/documents/periods/:id/csv      — Export CSV période
// GET    /api/documents/:ws                  — Lister documents
// GET    /api/documents/:ws/:id              — Détail document
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter } from "../middleware/rbac.js";
import {
  generateBulletinHtml,
  generatePayrollExcel,
  generatePayrollCsv,
  storeFile,
  readFile,
  fileExists,
} from "../lib/document-generator.js";

const router = Router();

async function checkWs(userId: string, _role: string, ws: string): Promise<boolean> {
  // Sécurité (Phase 10) : plus de bypass « rôle global PROPRIETAIRE »
  const m = await prisma.workspace_members.findUnique({ where: { userId_workspaceId: { userId, workspaceId: ws } } });
  return !!m;
}

// ---------------------------------------------------------------------------
// POST /api/documents/payslips/:id/pdf — Générer bulletin PDF (HTML stocké)
// ---------------------------------------------------------------------------
router.post("/payslips/:id/pdf", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    // Récupérer le bulletin
    const payslip = await prisma.payslip.findFirst({
      where: { id, workspaceId },
      include: { payroll_period: { include: { client_company: true } } },
    });
    if (!payslip) return res.status(404).json({ error: "Bulletin introuvable" });

    // Vérifier si déjà généré
    const existing = await prisma.documentStorage.findFirst({
      where: { payslipId: id, type: "BULLETIN_PDF" },
    });
    if (existing && fileExists(existing.cheminStockage)) {
      return res.json({ document: existing, message: "Bulletin déjà généré" });
    }

    // Générer HTML
    const clientInfo = {
      raisonSociale: payslip.payroll_period.client_company.raisonSociale,
      matriculeFiscal: payslip.payroll_period.client_company.matriculeFiscal,
      matriculeCnss: payslip.payroll_period.client_company.matriculeCnss,
    };

    const html = generateBulletinHtml(payslip, clientInfo);

    // Stocker
    const filename = `bulletin_${payslip.annee}-${String(payslip.mois).padStart(2, "0")}_${payslip.matricule}.html`;
    const chemin = storeFile(filename, html);
    const taille = Buffer.byteLength(html, "utf-8");

    // Enregistrer en base
    const doc = await prisma.documentStorage.create({
      data: {
        workspaceId,
        clientCompanyId: payslip.clientCompanyId,
        payslipId: id,
        type: "BULLETIN_PDF",
        nomFichier: filename,
        cheminStockage: chemin,
        tailleOctets: taille,
        mimeType: "text/html",
        mois: payslip.mois,
        annee: payslip.annee,
        periodePaieId: payslip.periodId,
        generePar: req.user!.userId,
      },
    });

    return res.status(201).json({ document: doc, message: "Bulletin généré" });
  } catch (err) { console.error("[documents] generate pdf:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/documents/payslips/:id/download — Télécharger bulletin
// ---------------------------------------------------------------------------
router.get("/payslips/:id/download", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const doc = await prisma.documentStorage.findFirst({
      where: { payslipId: id, type: "BULLETIN_PDF", workspaceId },
    });
    if (!doc) return res.status(404).json({ error: "Document non généré" });

    if (!fileExists(doc.cheminStockage)) return res.status(404).json({ error: "Fichier introuvable sur le stockage" });

    const content = readFile(doc.cheminStockage);
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${doc.nomFichier}"`);
    return res.send(content);
  } catch (err) { console.error("[documents] download:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// POST /api/documents/periods/:id/excel — Export Excel d'une période
// ---------------------------------------------------------------------------
router.post("/periods/:id/excel", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period || period.workspaceId !== workspaceId) return res.status(404).json({ error: "Période introuvable" });

    const payslips = await prisma.payslip.findMany({ where: { periodId: id } });
    if (!payslips.length) return res.status(400).json({ error: "Aucun bulletin dans cette période" });

    const periode = `${period.mois}/${period.annee}`;
    const buffer = generatePayrollExcel(payslips as any, periode);

    // Stocker
    const filename = `export_paie_${period.annee}-${String(period.mois).padStart(2, "0")}.xlsx`;
    const chemin = storeFile(filename, buffer);

    const doc = await prisma.documentStorage.create({
      data: {
        workspaceId,
        clientCompanyId: period.clientCompanyId,
        type: "EXPORT_EXCEL",
        nomFichier: filename,
        cheminStockage: chemin,
        tailleOctets: buffer.length,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        mois: period.mois,
        annee: period.annee,
        periodePaieId: id,
        generePar: req.user!.userId,
      },
    });

    return res.status(201).json({ document: doc, message: "Export Excel généré" });
  } catch (err) { console.error("[documents] export excel:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// POST /api/documents/periods/:id/csv — Export CSV d'une période
// ---------------------------------------------------------------------------
router.post("/periods/:id/csv", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period || period.workspaceId !== workspaceId) return res.status(404).json({ error: "Période introuvable" });

    const payslips = await prisma.payslip.findMany({ where: { periodId: id } });
    if (!payslips.length) return res.status(400).json({ error: "Aucun bulletin dans cette période" });

    const csv = generatePayrollCsv(payslips as any);

    const filename = `export_paie_${period.annee}-${String(period.mois).padStart(2, "0")}.csv`;
    const chemin = storeFile(filename, csv);
    const taille = Buffer.byteLength(csv, "utf-8");

    const doc = await prisma.documentStorage.create({
      data: {
        workspaceId,
        clientCompanyId: period.clientCompanyId,
        type: "EXPORT_CSV",
        nomFichier: filename,
        cheminStockage: chemin,
        tailleOctets: taille,
        mimeType: "text/csv",
        mois: period.mois,
        annee: period.annee,
        periodePaieId: id,
        generePar: req.user!.userId,
      },
    });

    return res.status(201).json({ document: doc, message: "Export CSV généré" });
  } catch (err) { console.error("[documents] export csv:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/documents/:ws — Lister documents d'un workspace
// ---------------------------------------------------------------------------
router.get("/:ws", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId: ws };
    if (req.query.type) where.type = req.query.type;
    if (req.query.mois) where.mois = parseInt(req.query.mois as string, 10);
    if (req.query.annee) where.annee = parseInt(req.query.annee as string, 10);
    if (req.query.clientCompanyId) where.clientCompanyId = req.query.clientCompanyId;

    const docs = await prisma.documentStorage.findMany({
      where,
      orderBy: { genereAt: "desc" },
    });

    return res.json(docs);
  } catch (err) { console.error("[documents] list:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/documents/:ws/:id — Détail document
// ---------------------------------------------------------------------------
router.get("/:ws/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const doc = await prisma.documentStorage.findFirst({ where: { id, workspaceId: ws } });
    if (!doc) return res.status(404).json({ error: "Document introuvable" });

    return res.json(doc);
  } catch (err) { console.error("[documents] detail:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

export default router;
