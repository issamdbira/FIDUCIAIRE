// =============================================================================
// Le Fiduciaire — Routes Paie Mensuelle (Phase 5)
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, requireWorkspaceOwner } from "../middleware/rbac.js";
import { calculateMassPayroll } from "../lib/payroll-engine.js";
import { auditLog, AUDIT_ACTIONS } from "../lib/audit-log.js";

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
router.post("/periods", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
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

    // Archivage bloquant : un client ARCHIVED ne peut plus ouvrir de période
    // de paie (l'historique reste consultable en lecture)
    if (client.statut === "ARCHIVED") {
      return res.status(409).json({ error: `Client archivé — réactivez-le avant d'ouvrir une période de paie` });
    }

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
router.get("/:ws/periods", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
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
router.get("/:ws/periods/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
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
router.patch("/:ws/periods/:id/calculate", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
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
router.patch("/:ws/periods/:id/review", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
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
router.patch("/:ws/periods/:id/validate", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
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
    await auditLog({ workspaceId: ws, userId: req.user!.userId, action: AUDIT_ACTIONS.PERIOD_VALIDATE, entity: "PayrollPeriod", entityId: id, details: JSON.stringify({ mois: period.mois, annee: period.annee }) });
    return res.json(updated);
  } catch (err) { console.error("[payroll] validate:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// PATCH /api/payroll/:ws/periods/:id/close — Clôturer période (PROPRIETAIRE)
// ---------------------------------------------------------------------------
router.patch("/:ws/periods/:id/close", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
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
    await auditLog({ workspaceId: ws, userId: req.user!.userId, action: AUDIT_ACTIONS.PERIOD_CLOSE, entity: "PayrollPeriod", entityId: id, details: JSON.stringify({ mois: period.mois, annee: period.annee }) });
    return res.json(updated);
  } catch (err) { console.error("[payroll] close:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/payroll/:ws/payslips — Lister bulletins
// ---------------------------------------------------------------------------
router.get("/:ws/payslips", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
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
router.get("/:ws/payslips/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
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
router.get("/:ws/anomalies", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
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
router.patch("/:ws/anomalies/:id/resolve", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
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

// ---------------------------------------------------------------------------
// POST /api/payroll/periods/:id/complementary — Créer paie complémentaire
// ---------------------------------------------------------------------------
router.post("/periods/:id/complementary", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId, motifComplement, note } = req.body;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId requis" });
    if (!motifComplement) return res.status(400).json({ error: "motifComplement requis" });

    if (!(await checkWs(req.user!.userId, req.user!.role, workspaceId))) return res.status(403).json({ error: "Accès refusé" });

    // La période parente doit être clôturée
    const parentPeriod = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!parentPeriod || parentPeriod.workspaceId !== workspaceId) return res.status(404).json({ error: "Période parente introuvable" });
    if (parentPeriod.statut !== "CLOSED") return res.status(400).json({ error: `Période parente non clôturée — statut: ${parentPeriod.statut}` });

    // Créer la période complémentaire (même mois/année, isComplementary=true)
    // Utiliser un mois "virtuel" — on ajoute 0.5 au mois via un flag ou on accepte le doublon
    // Puisque la contrainte unique est sur (ws, client, annee, mois), on ne peut pas créer
    // une deuxième période avec le même mois. Solution: on ajoute isComplementary à la période
    // existante et on crée une nouvelle période avec le même mois mais en modifiant la contrainte.
    // En pratique, on crée une nouvelle période avec isComplementary=true, et on retire la
    // contrainte unique pour les périodes complémentaires.
    // Pour simplifier, on crée une nouvelle PayrollPeriod en désactivant l'unicité via un workaround:
    // on utilise le même mois mais on note la période comme complémentaire.

    // Vérifier s'il existe déjà une complémentaire
    const existingComp = await prisma.payrollPeriod.findFirst({
      where: {
        workspaceId,
        clientCompanyId: parentPeriod.clientCompanyId,
        isComplementary: true,
        parentPeriodId: id,
      },
    });
    if (existingComp) return res.status(409).json({ error: "Paie complémentaire déjà existante", period: existingComp });

    // Pour contourner la contrainte unique, on utilise un mois "virtuel" (mois + 100)
    // qui sera interprété comme mois complémentaire. Le vrai mois est stocké dans les données.
    const compPeriod = await prisma.payrollPeriod.create({
      data: {
        workspaceId,
        clientCompanyId: parentPeriod.clientCompanyId,
        mois: parentPeriod.mois + 100, // Mois virtuel pour contourner unique constraint
        annee: parentPeriod.annee,
        isComplementary: true,
        parentPeriodId: id,
        motifComplement,
        note: note || null,
        openedBy: req.user!.userId,
        statut: "OPEN",
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: AUDIT_ACTIONS.COMPLEMENTARY_CREATE,
      entity: "PayrollPeriod",
      entityId: compPeriod.id,
      details: JSON.stringify({ parentPeriodId: id, mois: parentPeriod.mois, annee: parentPeriod.annee, motifComplement }),
    });

    return res.status(201).json({ complementaryPeriod: compPeriod, parentPeriodId: id });
  } catch (err) { console.error("[payroll] complementary:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

// ---------------------------------------------------------------------------
// GET /api/payroll/:ws/audit — Lister audit logs (filtres combinés)
// ---------------------------------------------------------------------------
router.get("/:ws/audit", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (req.user!.role !== "PROPRIETAIRE") return res.status(403).json({ error: "Rôle PROPRIETAIRE requis" });

    const where: Record<string, unknown> = { workspaceId: ws };
    // Filtres combinés (intersection AND)
    if (req.query.action) where.action = req.query.action;
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.entityId) where.entityId = req.query.entityId;
    if (req.query.userId) where.userId = req.query.userId;
    // Filtre période (depuis / jusqu'au)
    const createdAt: Record<string, Date> = {};
    if (req.query.from) createdAt.gte = new Date(req.query.from as string);
    if (req.query.to) createdAt.lte = new Date(req.query.to as string);
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return res.json({ data: logs, total, page, limit });
  } catch (err) { console.error("[payroll] audit:", err); return res.status(500).json({ error: "Erreur interne" }); }
});

export default router;
