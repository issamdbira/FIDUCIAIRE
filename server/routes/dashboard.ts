// =============================================================================
// Le Fiduciaire — Routes Dashboard (Phase 9)
// GET    /dashboard/cabinet              — Vue cabinet (PROPRIETAIRE only)
// GET    /dashboard/workspace/:ws        — Vue workspace
// GET    /dashboard/workspace/:ws/alerts — Alertes workspace
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireWorkspaceAccess } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, requireAnyWorkspaceOwner, hasWorkspaceAccess } from "../middleware/rbac.js";

const router = Router();

// ---------------------------------------------------------------------------
// Helper : vérifier l'accès au workspace
// ---------------------------------------------------------------------------
async function checkWs(userId: string, _role: string, ws: string): Promise<boolean> {
  // Phase 10 : accès direct OU délégué (cabinet) — résolution centralisée rbac.ts
  return hasWorkspaceAccess(userId, ws);
}

// ---------------------------------------------------------------------------
// Helpers : trimestres
// ---------------------------------------------------------------------------
function getCurrentQuarter(): { annee: number; numeroTrimestre: number } {
  const now = new Date();
  const annee = now.getFullYear();
  const mois = now.getMonth() + 1; // 1-12
  const numeroTrimestre = Math.ceil(mois / 3);
  return { annee, numeroTrimestre };
}

function getPreviousQuarter(): { annee: number; numeroTrimestre: number } {
  const current = getCurrentQuarter();
  if (current.numeroTrimestre === 1) {
    return { annee: current.annee - 1, numeroTrimestre: 4 };
  }
  return { annee: current.annee, numeroTrimestre: current.numeroTrimestre - 1 };
}

function getMoisTrimestre(numeroTrimestre: number): number[] {
  switch (numeroTrimestre) {
    case 1: return [1, 2, 3];
    case 2: return [4, 5, 6];
    case 3: return [7, 8, 9];
    case 4: return [10, 11, 12];
    default: return [1, 2, 3];
  }
}

// ---------------------------------------------------------------------------
// GET /dashboard/cabinet — Vue globale cabinet (PROPRIETAIRE only)
// ---------------------------------------------------------------------------
router.get("/cabinet", requireAuth, requireAnyWorkspaceOwner, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // --- totalWorkspaces ---
    const totalWorkspaces = await prisma.workspaces.count();

    // --- activeClients ---
    const activeClients = await prisma.clientCompany.count({
      where: { statut: "ACTIVE" },
    });

    // --- newClientsThisMonth ---
    const newClientsThisMonth = await prisma.clientCompany.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    // --- inactiveClients ---
    const inactiveClients = await prisma.clientCompany.count({
      where: { statut: "ARCHIVED" },
    });

    // --- totalMasseSalariale : sum of payslips' salaireBrutEffectif for CLOSED periods ---
    const closedPeriods = await prisma.payrollPeriod.findMany({
      where: { statut: "CLOSED" },
      select: { id: true },
    });
    const closedPeriodIds = closedPeriods.map((p) => p.id);

    let totalMasseSalariale = 0;
    if (closedPeriodIds.length > 0) {
      const agg = await prisma.payslip.aggregate({
        where: { periodId: { in: closedPeriodIds } },
        _sum: { salaireBrutEffectif: true },
      });
      totalMasseSalariale = agg._sum.salaireBrutEffectif || 0;
    }

    // --- totalBulletins ---
    const totalBulletins = await prisma.payslip.count();

    // --- bulletinsLast12Months : payslips grouped by month for last 12 months ---
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const payslipsByMonth = await prisma.payslip.groupBy({
      by: ["mois", "annee"],
      where: {
        createdAt: { gte: twelveMonthsAgo },
      },
      _count: { id: true },
      orderBy: [{ annee: "asc" }, { mois: "asc" }],
    });
    const bulletinsLast12Months = payslipsByMonth.map((r) => ({
      mois: r.mois,
      annee: r.annee,
      count: r._count.id,
    }));

    // --- cnssDeclarations ---
    const currentQ = getCurrentQuarter();
    const previousQ = getPreviousQuarter();

    // aJour : declarations ARCHIVEE
    const aJour = await prisma.cNSSDeclaration.count({
      where: { statut: "ARCHIVEE" },
    });

    // enRetard : BROUILLON or CONTROLEE for past quarters
    const enRetard = await prisma.cNSSDeclaration.count({
      where: {
        statut: { in: ["BROUILLON", "CONTROLEE"] },
        OR: [
          { annee: { lt: currentQ.annee } },
          {
            annee: currentQ.annee,
            numeroTrimestre: { lt: currentQ.numeroTrimestre },
          },
        ],
      },
    });

    // manquantes : active clients with no declaration for current or previous quarter
    const activeClientsList = await prisma.clientCompany.findMany({
      where: { statut: "ACTIVE" },
      select: { id: true, workspaceId: true },
    });

    const relevantDeclarations = await prisma.cNSSDeclaration.findMany({
      where: {
        OR: [
          { annee: previousQ.annee, numeroTrimestre: previousQ.numeroTrimestre },
          { annee: currentQ.annee, numeroTrimestre: currentQ.numeroTrimestre },
        ],
      },
      select: { clientCompanyId: true, annee: true, numeroTrimestre: true },
    });

    const declarationSet = new Set(
      relevantDeclarations.map((d) => `${d.clientCompanyId}:${d.annee}:${d.numeroTrimestre}`)
    );

    let manquantes = 0;
    for (const client of activeClientsList) {
      for (const q of [previousQ, currentQ]) {
        const key = `${client.id}:${q.annee}:${q.numeroTrimestre}`;
        if (!declarationSet.has(key)) manquantes++;
      }
    }

    const cnssDeclarations = { aJour, enRetard, manquantes };

    // --- recentAuditLogs : last 10 entries ---
    const recentAuditLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      totalWorkspaces,
      activeClients,
      newClientsThisMonth,
      inactiveClients,
      totalMasseSalariale,
      totalBulletins,
      bulletinsLast12Months,
      cnssDeclarations,
      recentAuditLogs,
    });
  } catch (error) {
    console.error("[dashboard] GET /cabinet error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /dashboard/workspace/:ws — Vue workspace
// ---------------------------------------------------------------------------
router.get("/workspace/:ws", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const startOfNextMonth = new Date(currentYear, now.getMonth() + 1, 1);

    // Previous month calculation
    const prevMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevYear = prevMonthDate.getFullYear();

    // --- effectifActif : count of employees with active contracts (statut=ACTIF) ---
    const activeContracts = await prisma.contract.findMany({
      where: {
        workspaceId: ws,
        statut: "ACTIF",
      },
      select: { employeeId: true },
    });
    const uniqueEmployeeIds = new Set(activeContracts.map((c) => c.employeeId));
    const effectifActif = uniqueEmployeeIds.size;

    // --- entrees : contracts created this month ---
    const entrees = await prisma.contract.count({
      where: {
        workspaceId: ws,
        createdAt: { gte: startOfMonth, lt: startOfNextMonth },
      },
    });

    // --- sorties : contracts RESILIE/TERMINE updated this month ---
    const sorties = await prisma.contract.count({
      where: {
        workspaceId: ws,
        statut: { in: ["RESILIE", "TERMINE"] },
        updatedAt: { gte: startOfMonth, lt: startOfNextMonth },
      },
    });

    // --- masseSalarialeMois : sum of payslips for current month CLOSED/VALIDATED periods ---
    const currentPeriods = await prisma.payrollPeriod.findMany({
      where: {
        workspaceId: ws,
        mois: currentMonth,
        annee: currentYear,
        statut: { in: ["CLOSED", "VALIDATED"] },
      },
      select: { id: true },
    });
    const currentPeriodIds = currentPeriods.map((p) => p.id);

    let masseSalarialeMois = 0;
    if (currentPeriodIds.length > 0) {
      const agg = await prisma.payslip.aggregate({
        where: { periodId: { in: currentPeriodIds } },
        _sum: { salaireBrutEffectif: true },
      });
      masseSalarialeMois = agg._sum.salaireBrutEffectif || 0;
    }

    // --- masseSalarialePrecedent : same for previous month ---
    const prevPeriods = await prisma.payrollPeriod.findMany({
      where: {
        workspaceId: ws,
        mois: prevMonth,
        annee: prevYear,
        statut: { in: ["CLOSED", "VALIDATED"] },
      },
      select: { id: true },
    });
    const prevPeriodIds = prevPeriods.map((p) => p.id);

    let masseSalarialePrecedent = 0;
    if (prevPeriodIds.length > 0) {
      const agg = await prisma.payslip.aggregate({
        where: { periodId: { in: prevPeriodIds } },
        _sum: { salaireBrutEffectif: true },
      });
      masseSalarialePrecedent = agg._sum.salaireBrutEffectif || 0;
    }

    // --- variationMasseSalariale : percentage change ---
    let variationMasseSalariale = 0;
    if (masseSalarialePrecedent > 0) {
      variationMasseSalariale =
        ((masseSalarialeMois - masseSalarialePrecedent) / masseSalarialePrecedent) * 100;
    } else if (masseSalarialeMois > 0) {
      variationMasseSalariale = 100;
    }

    // --- repartitionCNSS : salarial + patronal from last quarter's validated payslips ---
    const lastQ = getPreviousQuarter();
    const trimestreMois = getMoisTrimestre(lastQ.numeroTrimestre);

    const lastQuarterPeriods = await prisma.payrollPeriod.findMany({
      where: {
        workspaceId: ws,
        annee: lastQ.annee,
        mois: { in: trimestreMois },
        statut: { in: ["VALIDATED", "CLOSED"] },
      },
      select: { id: true },
    });
    const lastQuarterPeriodIds = lastQuarterPeriods.map((p) => p.id);

    let repartitionCNSS = { salarial: 0, patronal: 0 };
    if (lastQuarterPeriodIds.length > 0) {
      const aggCnss = await prisma.payslip.aggregate({
        where: { periodId: { in: lastQuarterPeriodIds } },
        _sum: { retenueCnssSalarial: true, retenueCnssPatronal: true },
      });
      repartitionCNSS = {
        salarial: aggCnss._sum.retenueCnssSalarial || 0,
        patronal: aggCnss._sum.retenueCnssPatronal || 0,
      };
    }

    // --- periodesOuvertes : OPEN or CALCULATED ---
    const periodesOuvertes = await prisma.payrollPeriod.findMany({
      where: {
        workspaceId: ws,
        statut: { in: ["OPEN", "CALCULATED"] },
      },
      orderBy: [{ annee: "desc" }, { mois: "desc" }],
    });

    return res.json({
      effectifActif,
      entreesMois: entrees,
      sortiesMois: sorties,
      masseSalarialeMois,
      masseSalarialePrecedent,
      variationMasseSalariale,
      repartitionCnss: repartitionCNSS,
      periodesOuvertes: periodesOuvertes.map((p) => ({ mois: p.mois, annee: p.annee })),
    });
  } catch (error) {
    console.error("[dashboard] GET /workspace/:ws error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /dashboard/maint/auto-close-contracts
// Passe automatiquement à TERMINE les contrats ACTIF dont dateFin est dépassée.
// Retourne le nombre de contrats clôturés.
// Appelé par le frontend au chargement du dashboard — pas de cron nécessaire.
// ---------------------------------------------------------------------------
router.post("/maint/auto-close-contracts", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId requis" });
    }

    const hasAccess = await checkWs(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const now = new Date();

    // Trouver les contrats ACTIF dont dateFin est dans le passé
    const expiredContracts = await prisma.contract.findMany({
      where: {
        workspaceId,
        statut: "ACTIF",
        dateFin: { lte: now },
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (expiredContracts.length === 0) {
      return res.json({ closedCount: 0, contracts: [] });
    }

    // Passage à TERMINE en masse
    const ids = expiredContracts.map((c) => c.id);
    await prisma.contract.updateMany({
      where: { id: { in: ids } },
      data: { statut: "TERMINE" },
    });

    // Audit log pour chaque contrat clôturé
    for (const c of expiredContracts) {
      await prisma.auditLog.create({
        data: {
          workspaceId,
          userId: req.user!.userId,
          action: "AUTO_CLOSE_CONTRACT",
          entity: "Contract",
          entityId: c.id,
          details: `Contrat ${c.type} de ${c.employee.firstName} ${c.employee.lastName} automatiquement clôturé à l'échéance (${new Date(c.dateFin!).toLocaleDateString("fr-TN")})`,
        },
      });
    }

    return res.json({
      closedCount: expiredContracts.length,
      contracts: expiredContracts.map((c) => ({
        id: c.id,
        type: c.type,
        employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
        dateFin: c.dateFin,
      })),
    });
  } catch (error) {
    console.error("[dashboard] POST /maint/auto-close-contracts error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /dashboard/workspace/:ws/alerts — Alertes workspace
// ---------------------------------------------------------------------------
router.get("/workspace/:ws/alerts", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    if (!(await checkWs(req.user!.userId, req.user!.role, ws))) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    // --- Auto-close expired contracts (silently) ---
    // Passe à TERMINE les contrats dont dateFin <= maintenant
    const expiredCount = await prisma.contract.updateMany({
      where: {
        workspaceId: ws,
        statut: "ACTIF",
        dateFin: { lte: now },
      },
      data: { statut: "TERMINE" },
    });

    // --- matriculesCnssManquants : employees with no or invalid matriculeCnss ---
    const matriculesCnssManquants = await prisma.employees.findMany({
      where: {
        workspaceId: ws,
        isActive: true,
        OR: [
          { matriculeCnss: "" },
          { matriculeCnss: { startsWith: "TEMP-" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matriculeCnss: true,
      },
    });

    // --- contratsExpirant : active contracts with dateFin within 30 days ---
    const contratsExpirant = await prisma.contract.findMany({
      where: {
        workspaceId: ws,
        statut: "ACTIF",
        dateFin: {
          gte: now,
          lte: in30Days,
        },
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, matriculeCnss: true },
        },
      },
    });

    // --- periodesNonCloturees : OPEN/CALCULATED/TO_REVIEW for more than 15 days ---
    const periodesNonCloturees = await prisma.payrollPeriod.findMany({
      where: {
        workspaceId: ws,
        statut: { in: ["OPEN", "CALCULATED", "TO_REVIEW"] },
        createdAt: { lte: fifteenDaysAgo },
      },
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
      },
    });

    // --- declarationsCnssEnRetard : past quarters still BROUILLON/CONTROLEE ---
    const currentQ = getCurrentQuarter();
    const declarationsCnssEnRetard = await prisma.cNSSDeclaration.findMany({
      where: {
        workspaceId: ws,
        statut: { in: ["BROUILLON", "CONTROLEE"] },
        OR: [
          { annee: { lt: currentQ.annee } },
          {
            annee: currentQ.annee,
            numeroTrimestre: { lt: currentQ.numeroTrimestre },
          },
        ],
      },
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
      },
    });

    return res.json({
      // Formes alignées sur l'interface WorkspaceAlerts du client
      // (DashboardWorkspace.tsx) — éviter tout crash de rendu.
      matriculesCnssManquants: matriculesCnssManquants.map((e) =>
        `${e.firstName} ${e.lastName}`.trim(),
      ),
      contratsExpirant: contratsExpirant.map((c) => ({
        employeNom: `${c.employee.firstName} ${c.employee.lastName}`.trim(),
        dateFin: c.dateFin ? c.dateFin.toISOString().slice(0, 10) : "",
      })),
      periodesNonCloturees: periodesNonCloturees.map((p) => ({
        mois: p.mois,
        annee: p.annee,
        joursOuverts: Math.max(
          1,
          Math.floor((now.getTime() - p.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
        ),
      })),
      declarationsCnssEnRetard: declarationsCnssEnRetard.map((d) => ({
        periode: `T${d.numeroTrimestre} ${d.annee}`,
      })),
      autoClosedContracts: expiredCount.count,
    });
  } catch (error) {
    console.error("[dashboard] GET /workspace/:ws/alerts error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
