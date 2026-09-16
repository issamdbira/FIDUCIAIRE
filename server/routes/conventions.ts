// =============================================================================
// Le Fiduciaire — Conventions collectives Routes (Phase 3)
// POST   /api/conventions                               — Créer convention
// GET    /api/conventions/:workspaceId                   — Lister conventions
// GET    /api/conventions/:workspaceId/:id               — Détail + articles + grille
// PUT    /api/conventions/:workspaceId/:id               — Mettre à jour convention
// DELETE /api/conventions/:workspaceId/:id               — Supprimer (si non système)
// POST   /api/conventions/:workspaceId/:id/articles      — Ajouter article
// POST   /api/conventions/:workspaceId/:id/grille        — Ajouter entrée grille salariale
// POST   /api/conventions/:workspaceId/:id/adaptations   — Créer adaptation client
// GET    /api/conventions/:workspaceId/:id/adaptations   — Lister adaptations
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, requireWorkspaceOwner } from "../middleware/rbac.js";
import { auditLog } from "../lib/audit-log.js";

const router = Router();

async function checkWorkspaceAccess(userId: string, role: string, workspaceId: string): Promise<boolean> {
  if (role === "PROPRIETAIRE") return true;
  const membership = await prisma.workspace_members.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!membership;
}

// ---------------------------------------------------------------------------
// POST /api/conventions — Créer convention collective
// ---------------------------------------------------------------------------
router.post("/", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, code, nom, secteur, organisme, datePublication, isSystem } = req.body;

    if (!workspaceId || !code || !nom) {
      return res.status(400).json({ error: "workspaceId, code et nom sont requis" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
    }

    // Vérifier unicité du code dans le workspace
    const existing = await prisma.conventionCollective.findFirst({
      where: { workspaceId, code },
    });
    if (existing) {
      return res.status(409).json({ error: `Convention avec code "${code}" existe déjà dans ce workspace` });
    }

    // Seul PROPRIETAIRE peut créer des conventions système
    const isSystemFlag = isSystem && req.user!.role === "PROPRIETAIRE";

    const convention = await prisma.conventionCollective.create({
      data: {
        workspaceId,
        code,
        nom,
        secteur: secteur || "NON_AGRICOLE",
        organisme: organisme || null,
        datePublication: datePublication ? new Date(datePublication) : null,
        isSystem: isSystemFlag || false,
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "CONVENTION_CREATE",
      entity: "ConventionCollective",
      entityId: convention.id,
      details: JSON.stringify({ nom: convention.nom, code: convention.code }),
      ipAddress: req.ip,
    });

    return res.status(201).json(convention);
  } catch (error) {
    console.error("[conventions] POST error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/conventions/:workspaceId — Lister conventions
// ---------------------------------------------------------------------------
router.get("/:workspaceId", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { secteur } = req.query;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const where: Record<string, unknown> = { workspaceId, isActive: true };
    if (secteur) where.secteur = secteur;

    const conventions = await prisma.conventionCollective.findMany({
      where,
      include: {
        _count: { select: { articles: true, grille_salaires: true, adaptations: true } },
      },
      orderBy: { code: "asc" },
    });

    return res.json(conventions);
  } catch (error) {
    console.error("[conventions] GET list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/conventions/:workspaceId/:id — Détail + articles + grille
// ---------------------------------------------------------------------------
router.get("/:workspaceId/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const convention = await prisma.conventionCollective.findFirst({
      where: { id, workspaceId },
      include: {
        articles: { orderBy: { ordre: "asc" } },
        grille_salaires: {
          where: { dateFin: null }, // Seulement les entrées en vigueur
          orderBy: [{ coefficient: "asc" }, { echelon: "asc" }],
        },
        _count: { select: { adaptations: true, contracts: true } },
      },
    });

    if (!convention) {
      return res.status(404).json({ error: "Convention introuvable" });
    }

    return res.json(convention);
  } catch (error) {
    console.error("[conventions] GET detail error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/conventions/:workspaceId/:id — Mettre à jour convention
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { nom, secteur, organisme, datePublication, isActive } = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.conventionCollective.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Convention introuvable" });
    }

    // Convention système : seul PROPRIETAIRE peut modifier
    if (existing.isSystem && req.user!.role !== "PROPRIETAIRE") {
      return res.status(403).json({ error: "Convention système — modification réservée au propriétaire" });
    }

    const updated = await prisma.conventionCollective.update({
      where: { id },
      data: {
        nom: nom !== undefined ? nom : undefined,
        secteur: secteur !== undefined ? secteur : undefined,
        organisme: organisme !== undefined ? organisme : undefined,
        datePublication: datePublication !== undefined ? (datePublication ? new Date(datePublication) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[conventions] PUT error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/conventions/:workspaceId/:id — Supprimer (si non système)
// ---------------------------------------------------------------------------
router.delete("/:workspaceId/:id", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const existing = await prisma.conventionCollective.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Convention introuvable" });
    }
    if (existing.isSystem) {
      return res.status(403).json({ error: "Convention système — suppression interdite" });
    }

    await prisma.conventionCollective.delete({ where: { id } });
    return res.json({ message: "Convention supprimée" });
  } catch (error) {
    console.error("[conventions] DELETE error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/conventions/:workspaceId/:id/articles — Ajouter article
// ---------------------------------------------------------------------------
router.post("/:workspaceId/:id/articles", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { numero, titre, contenu, ordre } = req.body;

    if (!numero || !titre || !contenu) {
      return res.status(400).json({ error: "numero, titre et contenu sont requis" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const convention = await prisma.conventionCollective.findFirst({ where: { id, workspaceId } });
    if (!convention) {
      return res.status(404).json({ error: "Convention introuvable" });
    }

    const article = await prisma.conventionArticle.create({
      data: {
        conventionCollectiveId: id,
        numero,
        titre,
        contenu,
        ordre: ordre || 1,
      },
    });

    return res.status(201).json(article);
  } catch (error) {
    console.error("[conventions] POST article error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/conventions/:workspaceId/:id/grille — Ajouter entrée grille salariale
// ---------------------------------------------------------------------------
router.post("/:workspaceId/:id/grille", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { coefficient, echelon, salaireMinimum, dateEffet, dateFin } = req.body;

    if (!coefficient || !echelon || salaireMinimum == null || !dateEffet) {
      return res.status(400).json({ error: "coefficient, echelon, salaireMinimum et dateEffet sont requis" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const convention = await prisma.conventionCollective.findFirst({ where: { id, workspaceId } });
    if (!convention) {
      return res.status(404).json({ error: "Convention introuvable" });
    }

    const entry = await prisma.conventionGrilleSalariale.create({
      data: {
        conventionCollectiveId: id,
        coefficient,
        echelon,
        salaireMinimum,
        dateEffet: new Date(dateEffet),
        dateFin: dateFin ? new Date(dateFin) : null,
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    console.error("[conventions] POST grille error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/conventions/:workspaceId/:id/adaptations — Créer adaptation client
// ---------------------------------------------------------------------------
router.post("/:workspaceId/:id/adaptations", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const {
      clientCompanyId, articleNumero, adaptationDescription,
      valeurOriginale, valeurAdaptee, dateEffet, dateFin,
    } = req.body;

    if (!clientCompanyId || !articleNumero || !adaptationDescription || !dateEffet) {
      return res.status(400).json({ error: "clientCompanyId, articleNumero, adaptationDescription et dateEffet sont requis" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    // Vérifier que la convention et le client existent dans ce workspace
    const convention = await prisma.conventionCollective.findFirst({ where: { id, workspaceId } });
    if (!convention) {
      return res.status(404).json({ error: "Convention introuvable" });
    }

    const client = await prisma.clientCompany.findFirst({ where: { id: clientCompanyId, workspaceId } });
    if (!client) {
      return res.status(404).json({ error: "Entreprise cliente introuvable dans ce workspace" });
    }

    const adaptation = await prisma.conventionAdaptation.create({
      data: {
        conventionCollectiveId: id,
        clientCompanyId,
        workspaceId,
        articleNumero,
        adaptationDescription,
        valeurOriginale: valeurOriginale || null,
        valeurAdaptee: valeurAdaptee || null,
        dateEffet: new Date(dateEffet),
        dateFin: dateFin ? new Date(dateFin) : null,
      },
    });

    return res.status(201).json(adaptation);
  } catch (error) {
    console.error("[conventions] POST adaptation error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/conventions/:workspaceId/:id/adaptations — Lister adaptations
// ---------------------------------------------------------------------------
router.get("/:workspaceId/:id/adaptations", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const adaptations = await prisma.conventionAdaptation.findMany({
      where: { conventionCollectiveId: id, workspaceId },
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
      },
      orderBy: { dateEffet: "desc" },
    });

    return res.json(adaptations);
  } catch (error) {
    console.error("[conventions] GET adaptations error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
