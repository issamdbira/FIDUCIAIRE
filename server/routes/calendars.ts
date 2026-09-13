// =============================================================================
// Le Fiduciaire — Calendriers de travail Routes (Phase 3)
// POST   /api/calendars                              — Créer calendrier + jours
// GET    /api/calendars/:workspaceId                  — Lister calendriers
// GET    /api/calendars/:workspaceId/:id              — Détail calendrier + jours
// PUT    /api/calendars/:workspaceId/:id              — Mettre à jour calendrier
// PUT    /api/calendars/:workspaceId/:id/days         — Mettre à jour jours
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

async function checkWorkspaceAccess(userId: string, role: string, workspaceId: string): Promise<boolean> {
  if (role === "PROPRIETAIRE") return true;
  const membership = await prisma.workspace_members.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!membership;
}

// Jours standard Tunisie (48h/semaine)
const DEFAULT_DAYS_48H = [
  { jour: "LUNDI", estOuvre: true, heuresTravail: 8 },
  { jour: "MARDI", estOuvre: true, heuresTravail: 8 },
  { jour: "MERCREDI", estOuvre: true, heuresTravail: 8 },
  { jour: "JEUDI", estOuvre: true, heuresTravail: 8 },
  { jour: "VENDREDI", estOuvre: true, heuresTravail: 8 },
  { jour: "SAMEDI", estOuvre: true, heuresTravail: 8 },
  { jour: "DIMANCHE", estOuvre: false, heuresTravail: 0 },
];

// Jours standard administratif (40h/semaine)
const DEFAULT_DAYS_40H = [
  { jour: "LUNDI", estOuvre: true, heuresTravail: 8 },
  { jour: "MARDI", estOuvre: true, heuresTravail: 8 },
  { jour: "MERCREDI", estOuvre: true, heuresTravail: 8 },
  { jour: "JEUDI", estOuvre: true, heuresTravail: 8 },
  { jour: "VENDREDI", estOuvre: true, heuresTravail: 8 },
  { jour: "SAMEDI", estOuvre: false, heuresTravail: 0 },
  { jour: "DIMANCHE", estOuvre: false, heuresTravail: 0 },
];

// ---------------------------------------------------------------------------
// POST /api/calendars — Créer calendrier de travail
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      clientCompanyId, workspaceId, nom,
      heuresHebdomadaires, joursMoisStandard, heuresMoisStandard,
      jours,
    } = req.body;

    if (!clientCompanyId || !workspaceId || !nom) {
      return res.status(400).json({ error: "clientCompanyId, workspaceId et nom sont requis" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
    }

    // Vérifier que le client existe dans ce workspace
    const client = await prisma.clientCompany.findFirst({ where: { id: clientCompanyId, workspaceId } });
    if (!client) {
      return res.status(404).json({ error: "Entreprise cliente introuvable dans ce workspace" });
    }

    // Utiliser jours personnalisés ou défaut 48h
    const joursData = jours && jours.length > 0 ? jours : DEFAULT_DAYS_48H;
    const heuresHebdo = heuresHebdomadaires || joursData.reduce((sum: number, j: any) => sum + (j.heuresTravail || 0), 0);

    // Créer calendrier + jours en transaction
    const result = await prisma.$transaction(async (tx) => {
      const calendar = await tx.workCalendar.create({
        data: {
          clientCompanyId,
          workspaceId,
          nom,
          heuresHebdomadaires: heuresHebdo,
          joursMoisStandard: joursMoisStandard || 26,
          heuresMoisStandard: heuresMoisStandard || (heuresHebdo * 52 / 12),
        },
      });

      await tx.workCalendarDay.createMany({
        data: joursData.map((j: any) => ({
          workCalendarId: calendar.id,
          jour: j.jour,
          estOuvre: j.estOuvre,
          heuresTravail: j.heuresTravail,
        })),
      });

      return calendar;
    });

    // Recharger avec les jours
    const calendar = await prisma.workCalendar.findUnique({
      where: { id: result.id },
      include: { jours: { orderBy: { jour: "asc" } } },
    });

    return res.status(201).json(calendar);
  } catch (error) {
    console.error("[calendars] POST error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/calendars/:workspaceId — Lister calendriers
// ---------------------------------------------------------------------------
router.get("/:workspaceId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { clientCompanyId } = req.query;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const where: Record<string, unknown> = { workspaceId, isActive: true };
    if (clientCompanyId) where.clientCompanyId = clientCompanyId;

    const calendars = await prisma.workCalendar.findMany({
      where,
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
        _count: { select: { jours: true } },
      },
      orderBy: { nom: "asc" },
    });

    return res.json(calendars);
  } catch (error) {
    console.error("[calendars] GET list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/calendars/:workspaceId/:id — Détail calendrier + jours
// ---------------------------------------------------------------------------
router.get("/:workspaceId/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const calendar = await prisma.workCalendar.findFirst({
      where: { id, workspaceId },
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
        jours: { orderBy: { jour: "asc" } },
      },
    });

    if (!calendar) {
      return res.status(404).json({ error: "Calendrier introuvable" });
    }

    return res.json(calendar);
  } catch (error) {
    console.error("[calendars] GET detail error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/calendars/:workspaceId/:id — Mettre à jour calendrier
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { nom, heuresHebdomadaires, joursMoisStandard, heuresMoisStandard, isActive } = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.workCalendar.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Calendrier introuvable" });
    }

    const updated = await prisma.workCalendar.update({
      where: { id },
      data: {
        nom: nom !== undefined ? nom : undefined,
        heuresHebdomadaires: heuresHebdomadaires !== undefined ? heuresHebdomadaires : undefined,
        joursMoisStandard: joursMoisStandard !== undefined ? joursMoisStandard : undefined,
        heuresMoisStandard: heuresMoisStandard !== undefined ? heuresMoisStandard : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[calendars] PUT error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/calendars/:workspaceId/:id/days — Mettre à jour les jours
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id/days", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { jours } = req.body;

    if (!jours || !Array.isArray(jours)) {
      return res.status(400).json({ error: "jours (array) est requis" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.workCalendar.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Calendrier introuvable" });
    }

    // Mettre à jour les jours en transaction
    await prisma.$transaction(async (tx) => {
      for (const j of jours) {
        await tx.workCalendarDay.upsert({
          where: { workCalendarId_jour: { workCalendarId: id, jour: j.jour } },
          update: { estOuvre: j.estOuvre, heuresTravail: j.heuresTravail },
          create: { workCalendarId: id, jour: j.jour, estOuvre: j.estOuvre, heuresTravail: j.heuresTravail },
        });
      }
      // Recalculer heures hebdomadaires
      const allDays = await tx.workCalendarDay.findMany({ where: { workCalendarId: id } });
      const totalHeures = allDays.reduce((sum, d) => sum + d.heuresTravail, 0);
      await tx.workCalendar.update({
        where: { id },
        data: { heuresHebdomadaires: totalHeures },
      });
    });

    const calendar = await prisma.workCalendar.findUnique({
      where: { id },
      include: { jours: { orderBy: { jour: "asc" } } },
    });

    return res.json(calendar);
  } catch (error) {
    console.error("[calendars] PUT days error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
