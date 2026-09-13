// =============================================================================
// Le Fiduciaire — Contrats de travail Routes (Phase 3)
// POST   /api/contracts                           — Créer un contrat + version initiale
// GET    /api/contracts/:workspaceId              — Lister contrats du workspace
// GET    /api/contracts/:workspaceId/:id          — Détail contrat + versions
// PUT    /api/contracts/:workspaceId/:id          — Mettre à jour contrat
// POST   /api/contracts/:workspaceId/:id/versions — Ajouter une version (historique)
// PATCH  /api/contracts/:workspaceId/:id/resilier — Résilier un contrat
// PATCH  /api/contracts/:workspaceId/:id/suspendre — Suspendre un contrat
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Helper : vérifier l'accès au workspace
async function checkWorkspaceAccess(userId: string, role: string, workspaceId: string): Promise<boolean> {
  if (role === "PROPRIETAIRE") return true;
  const membership = await prisma.workspace_members.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!membership;
}

// ---------------------------------------------------------------------------
// POST /api/contracts — Créer un contrat + version initiale
// ---------------------------------------------------------------------------
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      employeeId, workspaceId, type, poste, conventionCollectiveId,
      dateDebut, dateFin, periodeEssai,
      salaireBrut, salaireBrutAnnuel, coefficient, echelon,
      heuresHebdomadaires, heuresMensuelles, motifChangement,
    } = req.body;

    // Validations requises
    if (!employeeId || !workspaceId || !type || !poste || !dateDebut || salaireBrut == null) {
      return res.status(400).json({
        error: "employeeId, workspaceId, type, poste, dateDebut et salaireBrut sont requis",
      });
    }

    // Vérifier l'accès au workspace
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
    }

    // Vérifier que l'employé existe dans ce workspace
    const employee = await prisma.employees.findFirst({
      where: { id: employeeId, workspaceId },
    });
    if (!employee) {
      return res.status(404).json({ error: "Employé introuvable dans ce workspace" });
    }

    // Vérifier le type de contrat
    const validTypes = ["CDI", "CDD", "TEMPS_PARTIEL", "SAISONNIER", "STAGE", "INTERIM"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Type invalide. Valeurs: ${validTypes.join(", ")}` });
    }

    // Vérifier la convention si fournie
    if (conventionCollectiveId) {
      const conv = await prisma.conventionCollective.findFirst({
        where: { id: conventionCollectiveId, workspaceId },
      });
      if (!conv) {
        return res.status(404).json({ error: "Convention collective introuvable dans ce workspace" });
      }
    }

    // Créer le contrat + version initiale en transaction
    const result = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          employeeId,
          workspaceId,
          type,
          statut: "ACTIF",
          poste,
          conventionCollectiveId: conventionCollectiveId || null,
          dateDebut: new Date(dateDebut),
          dateFin: dateFin ? new Date(dateFin) : null,
          periodeEssai: periodeEssai || null,
        },
      });

      // Version initiale obligatoire
      const version = await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          salaireBrut,
          salaireBrutAnnuel: salaireBrutAnnuel || null,
          coefficient: coefficient || null,
          echelon: echelon || null,
          conventionCollectiveId: conventionCollectiveId || null,
          heuresHebdomadaires: heuresHebdomadaires || null,
          heuresMensuelles: heuresMensuelles || null,
          motifChangement: motifChangement || "creation",
          dateEffet: new Date(dateDebut),
        },
      });

      return { contract, version };
    });

    return res.status(201).json({
      contract: result.contract,
      version: result.version,
      message: "Contrat créé avec sa version initiale",
    });
  } catch (error) {
    console.error("[contracts] POST error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/contracts/:workspaceId — Lister contrats du workspace
// ---------------------------------------------------------------------------
router.get("/:workspaceId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { statut, type, employeeId } = req.query;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const where: Record<string, unknown> = { workspaceId };
    if (statut) where.statut = statut;
    if (type) where.type = type;
    if (employeeId) where.employeeId = employeeId;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, matriculeCnss: true },
        },
        convention_collective: {
          select: { id: true, code: true, nom: true },
        },
        versions: {
          orderBy: { dateEffet: "desc" },
          take: 1, // Dernière version seulement
        },
      },
      orderBy: { dateDebut: "desc" },
    });

    return res.json(contracts);
  } catch (error) {
    console.error("[contracts] GET list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/contracts/:workspaceId/:id — Détail contrat + toutes versions
// ---------------------------------------------------------------------------
router.get("/:workspaceId/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const contract = await prisma.contract.findFirst({
      where: { id, workspaceId },
      include: {
        employee: true,
        convention_collective: true,
        versions: {
          orderBy: { dateEffet: "desc" },
          include: {
            convention_collective: {
              select: { id: true, code: true, nom: true },
            },
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: "Contrat introuvable" });
    }

    return res.json(contract);
  } catch (error) {
    console.error("[contracts] GET detail error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/contracts/:workspaceId/:id — Mettre à jour contrat
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { poste, conventionCollectiveId, dateFin, periodeEssai } = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.contract.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Contrat introuvable" });
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        poste: poste !== undefined ? poste : undefined,
        conventionCollectiveId: conventionCollectiveId !== undefined ? conventionCollectiveId : undefined,
        dateFin: dateFin !== undefined ? (dateFin ? new Date(dateFin) : null) : undefined,
        periodeEssai: periodeEssai !== undefined ? periodeEssai : undefined,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[contracts] PUT error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/contracts/:workspaceId/:id/versions — Ajouter une version
// ---------------------------------------------------------------------------
router.post("/:workspaceId/:id/versions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const {
      salaireBrut, salaireBrutAnnuel, coefficient, echelon,
      conventionCollectiveId, heuresHebdomadaires, heuresMensuelles,
      motifChangement, dateEffet, note,
    } = req.body;

    if (salaireBrut == null || !motifChangement || !dateEffet) {
      return res.status(400).json({
        error: "salaireBrut, motifChangement et dateEffet sont requis",
      });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.contract.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Contrat introuvable" });
    }

    const version = await prisma.contractVersion.create({
      data: {
        contractId: id,
        salaireBrut,
        salaireBrutAnnuel: salaireBrutAnnuel || null,
        coefficient: coefficient || null,
        echelon: echelon || null,
        conventionCollectiveId: conventionCollectiveId || null,
        heuresHebdomadaires: heuresHebdomadaires || null,
        heuresMensuelles: heuresMensuelles || null,
        motifChangement,
        dateEffet: new Date(dateEffet),
        note: note || null,
      },
    });

    return res.status(201).json(version);
  } catch (error) {
    console.error("[contracts] POST version error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/contracts/:workspaceId/:id/resilier — Résilier
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/:id/resilier", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { motifRupture, dateRupture } = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.contract.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Contrat introuvable" });
    }
    if (existing.statut !== "ACTIF" && existing.statut !== "SUSPENDU") {
      return res.status(400).json({ error: `Contrat déjà ${existing.statut}, impossible de résilier` });
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: {
        statut: "RESILIE",
        motifRupture: motifRupture || null,
        dateRupture: dateRupture ? new Date(dateRupture) : new Date(),
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[contracts] resilier error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/contracts/:workspaceId/:id/suspendre — Suspendre
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/:id/suspendre", requireAuth, async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.contract.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Contrat introuvable" });
    }
    if (existing.statut !== "ACTIF") {
      return res.status(400).json({ error: `Contrat ${existing.statut}, impossible de suspendre` });
    }

    const updated = await prisma.contract.update({
      where: { id },
      data: { statut: "SUSPENDU" },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[contracts] suspendre error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
