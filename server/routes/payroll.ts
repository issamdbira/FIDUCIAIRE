// =============================================================================
// Le Fiduciaire — Routes Paie Mensuelle (Phase 5)
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { calculateMassPayroll } from "../lib/payroll-engine.js";

const router = Router();

async function checkWs(userId: string, role: string, ws: string): Promise<boolean> {
  if (role === "PROPRIETAIRE") return true;
  const m = await prisma.workspace_members.findUnique({ where: { userId_workspaceId: { userId, workspaceId: ws } } });
  return !!m;
}

const TRANSITIONS: Record<string, string[]> = {
  OPEN: ["CALCULATED"],
  CALCULATED: ["TO_REVIEW", "VALIDATED"],
  TO_REVIEW: ["VALIDATED", "CALCULATED"],
  VALIDATED: ["CLOSED"],
  CLOSED: [],
};

// ---------------------------------------------------------------------------
// POST /api/payroll/periods — Ouvrir période
// ---------------------------------------------------------------------------
router.post("/periods", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, clientCompanyId, mois, annee, note } = req.body;
    if (!workspaceId || !clientCompanyId || !mois || !annee) {
      return res.status(400).json({ error: "workspaceId, clientCompanyId, mois et annee requis" });
    }
    const m = parseInt(mois, 10), a = parseInt(annee, 10);
    if (m < 1 || m > 12 || a < 2000 || a > 2100) return res.status(400).json({ error: "mois/annee invalides" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    const client = await prisma.clientCompany.findFirst({ where: { id: clientCompanyId, workspaceId } });
    if (!client) return res.status(404).json({ error: "Client introuvable" });

    const existing = await prisma.payrollPeriod.findUnique({
      where: { workspaceId_clientCompanyId_annee_mois: { workspaceId, clientCompanyId, annee: a, mois: m } },
    });
    if (existing) return res.status(409).json({ error: "Période déjà existante", period: existing });

    const period = await prisma.payrollPeriod.create({
      data: { workspaceId, clientCompanyId, mois: m, annee: a, note: note || null, openedBy: req.user!.userId },
    });
    return res.status(201).json(period);
  } catch (err) { console.error("[payroll] POST periods:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/payroll/:ws/periods — Lister périodes
// ---------------------------------------------------------------------------
router.get("/:ws/periods", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId: ws };
    if (req.query.statut) where.statut = req.query.statut;
    if (req.query.clientCompanyId) where.clientCompanyId = req.query.clientCompanyId;
    if (req.query.mois) where.mois = parseInt(req.query.mois as string, 10);
    if (req.query.annee) where.annee = parseInt(req.query.annee as string, 10);

    const periods = await prisma.payrollPeriod.findMany({
      where,
      include: { client_company: { select: { id: true, raisonSociale: true } }, _count: { select: { payslips: true, anomalies: true } } },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    });
    return res.json(periods);
  } catch (err) { console.error("[payroll] GET periods:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/payroll/:ws/periods/:id — Détail période
// ---------------------------------------------------------------------------
router.get("/:ws/periods/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const period = await prisma.payrollPeriod.findFirst({
      where: { id, workspaceId: ws },
      include: { client_company: { select: { id: true, raisonSociale: true, secteur: true } }, _count: { select: { payslips: true, anomalies: true } } },
    });
    if (!period) return res.status(404).json({ error: "Période introuvable" });
    return res.json(period);
  } catch (err) { console.error("[payroll] GET period:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/payroll/:ws/periods/:id/calculate — Calcul en masse
// ---------------------------------------------------------------------------
router.patch("/:ws/periods/:id/calculate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period || period.workspaceId !== ws) return res.status(404).json({ error: "Période introuvable" });
    if (period.statut !== "OPEN" && period.statut !== "TO_REVIEW") {
      return res.status(400).json({ error: `Calcul impossible — statut: ${period.statut}` });
    }

    // Nettoyer anciens bulletins/anomalies si recalcul
    await prisma.$transaction([
      prisma.anomaly.deleteMany({ where: { periodId: id } }),
      prisma.payslip.deleteMany({ where: { periodId: id } }),
    ]);

    const result = await calculateMassPayroll({
      periodId: id, workspaceId: ws, clientCompanyId: period.clientCompanyId,
      mois: period.mois, annee: period.annee, calculatedBy: req.user!.userId,
    });

    const updated = await prisma.payrollPeriod.findUnique({ where: { id } });
    return res.json({ period: updated, result });
  } catch (err) { console.error("[payroll] calculate:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/payroll/:ws/periods/:id/review — Marquer TO_REVIEW
// ---------------------------------------------------------------------------
router.patch("/:ws/periods/:id/review", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period || period.workspaceId !== ws) return res.status(404).json({ error: "Période introuvable" });

    const allowed = TRANSITIONS[period.statut] || [];
    if (!allowed.includes("TO_REVIEW")) return res.status(400).json({ error: `Transition ${period.statut}→TO_REVIEW impossible` });

    const updated = await prisma.payrollPeriod.update({ where: { id }, data: { statut: "TO_REVIEW" } });
    return res.json(updated);
  } catch (err) { console.error("[payroll] review:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/payroll/:ws/periods/:id/validate — Valider période
// ---------------------------------------------------------------------------
router.patch("/:ws/periods/:id/validate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period || period.workspaceId !== ws) return res.status(404).json({ error: "Période introuvable" });

    const allowed = TRANSITIONS[period.statut] || [];
    if (!allowed.includes("VALIDATED")) return res.status(400).json({ error: `Validation impossible — statut: ${period.statut}` });

    // Vérifier anomalies bloquantes non résolues
    const bloquantes = await prisma.anomaly.count({ where: { periodId: id, niveau: "BLOQUANTE", estResolue: false } });
    if (bloquantes > 0) return res.status(400).json({ error: `${bloquantes} anomalie(s) bloquante(s) non résolue(s)` });

    // Valider tous les bulletins de la période
    await prisma.payslip.updateMany({ where: { periodId: id }, data: { statut: "VALIDEe", validatedAt: new Date() } });

    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: { statut: "VALIDATED", validatedBy: req.user!.userId, dateValidation: new Date() },
    });
    return res.json(updated);
  } catch (err) { console.error("[payroll] validate:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/payroll/:ws/periods/:id/close — Clôturer période (PROPRIETAIRE)
// ---------------------------------------------------------------------------
router.patch("/:ws/periods/:id/close", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (req.user!.role !== "PROPRIETAIRE") return res.status(403).json({ error: "Rôle PROPRIETAIRE requis" });

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period || period.workspaceId !== ws) return res.status(404).json({ error: "Période introuvable" });

    const allowed = TRANSITIONS[period.statut] || [];
    if (!allowed.includes("CLOSED")) return res.status(400).json({ error: `Clôture impossible — statut: ${period.statut}` });

    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: { statut: "CLOSED", closedBy: req.user!.userId, dateCloture: new Date() },
    });
    return res.json(updated);
  } catch (err) { console.error("[payroll] close:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/payroll/:ws/payslips — Lister bulletins
// ---------------------------------------------------------------------------
router.get("/:ws/payslips", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId: ws };
    if (req.query.periodId) where.periodId = req.query.periodId;
    if (req.query.employeeId) where.employeeId = req.query.employeeId;
    if (req.query.mois) where.mois = parseInt(req.query.mois as string, 10);
    if (req.query.annee) where.annee = parseInt(req.query.annee as string, 10);
    if (req.query.statut) where.statut = req.query.statut;

    const payslips = await prisma.payslip.findMany({ where, orderBy: { nomPrenom: "asc" } });
    return res.json(payslips);
  } catch (err) { console.error("[payroll] GET payslips:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/payroll/:ws/payslips/:id — Détail bulletin
// ---------------------------------------------------------------------------
router.get("/:ws/payslips/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const payslip = await prisma.payslip.findFirst({
      where: { id, workspaceId: ws },
      include: { anomalies: true, payroll_period: { select: { id: true, mois: true, annee: true, statut: true } } },
    });
    if (!payslip) return res.status(404).json({ error: "Bulletin introuvable" });
    return res.json(payslip);
  } catch (err) { console.error("[payroll] GET payslip:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/payroll/:ws/anomalies — Lister anomalies
// ---------------------------------------------------------------------------
router.get("/:ws/anomalies", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const where: Record<string, unknown> = { workspaceId: ws };
    if (req.query.periodId) where.periodId = req.query.periodId;
    if (req.query.niveau) where.niveau = req.query.niveau;
    if (req.query.estResolue !== undefined) where.estResolue = req.query.estResolue === "true";
    if (req.query.employeeId) where.employeeId = req.query.employeeId;

    const anomalies = await prisma.anomaly.findMany({ where, orderBy: { createdAt: "desc" } });
    return res.json(anomalies);
  } catch (err) { console.error("[payroll] GET anomalies:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/payroll/:ws/anomalies/:id/resolve — Résoudre anomalie
// ---------------------------------------------------------------------------
router.patch("/:ws/anomalies/:id/resolve", requireAuth, async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;
    const { noteResolution } = req.body;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) return res.status(403).json({ error: "Accès refusé" });

    const anomaly = await prisma.anomaly.findFirst({ where: { id, workspaceId: ws } });
    if (!anomaly) return res.status(404).json({ error: "Anomalie introuvable" });
    if (anomaly.estResolue) return res.status(400).json({ error: "Anomalie déjà résolue" });

    const updated = await prisma.anomaly.update({
      where: { id },
      data: { estResolue: true, resoluPar: req.user!.userId, resoluAt: new Date(), noteResolution: noteResolution || null },
    });
    return res.json(updated);
  } catch (err) { console.error("[payroll] resolve anomaly:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

export default router;
