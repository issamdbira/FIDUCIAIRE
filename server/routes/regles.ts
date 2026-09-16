// =============================================================================
// Le Fiduciaire — Règles réglementaires Routes (Phase 3)
// POST   /api/regles                                — Créer une règle versionnée
// GET    /api/regles/:workspaceId                    — Lister règles (filtres: categorie, code, date)
// GET    /api/regles/:workspaceId/:id                — Détail règle
// PUT    /api/regles/:workspaceId/:id                — Mettre à jour règle
// DELETE /api/regles/:workspaceId/:id                — Supprimer (si non système)
// GET    /api/regles/:workspaceId/active/:code       — Règle active à une date donnée
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, requireWorkspaceOwner, hasWorkspaceAccess } from "../middleware/rbac.js";

const router = Router();

async function checkWorkspaceAccess(userId: string, _role: string, workspaceId: string): Promise<boolean> {
  // Phase 10 : accès direct OU délégué (cabinet) — résolution centralisée rbac.ts
  return hasWorkspaceAccess(userId, workspaceId);
}

// ---------------------------------------------------------------------------
// POST /api/regles — Créer une règle réglementaire
// ---------------------------------------------------------------------------
router.post("/", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const {
      workspaceId, code, categorie, description, valeur, unite,
      dateDebut, dateFin, source, reference, isSystem,
    } = req.body;

    if (!workspaceId || !code || !categorie || !description || valeur == null || !unite || !dateDebut) {
      return res.status(400).json({
        error: "workspaceId, code, categorie, description, valeur, unite et dateDebut sont requis",
      });
    }

    const validCategories = ["CNSS", "IRPP", "CSS", "FRAIS_PRO", "DEDUCTION", "RETRAITE", "ACCIDENT", "GENERAL"];
    if (!validCategories.includes(categorie)) {
      return res.status(400).json({ error: `Catégorie invalide. Valeurs: ${validCategories.join(", ")}` });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
    }

    // Vérifier unicité (workspaceId + code + dateDebut)
    const existing = await prisma.regleReglementaire.findFirst({
      where: { workspaceId, code, dateDebut: new Date(dateDebut) },
    });
    if (existing) {
      return res.status(409).json({ error: `Règle "${code}" existe déjà avec cette dateDebut dans ce workspace` });
    }

    // Seul PROPRIETAIRE peut créer des règles système
    const isSystemFlag = isSystem && req.user!.role === "PROPRIETAIRE";

    const regle = await prisma.regleReglementaire.create({
      data: {
        workspaceId,
        code,
        categorie,
        description,
        valeur,
        unite,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        source: source || null,
        reference: reference || null,
        isSystem: isSystemFlag || false,
      },
    });

    return res.status(201).json(regle);
  } catch (error) {
    console.error("[regles] POST error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/regles/:workspaceId — Lister règles
// ---------------------------------------------------------------------------
router.get("/:workspaceId", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { categorie, code, activeAt } = req.query;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const where: Record<string, unknown> = { workspaceId };
    if (categorie) where.categorie = categorie;
    if (code) where.code = code;

    // Filtrer par date d'activité
    if (activeAt) {
      const date = new Date(activeAt as string);
      where.dateDebut = { lte: date };
      where.OR = [
        { dateFin: null },
        { dateFin: { gte: date } },
      ];
    }

    const regles = await prisma.regleReglementaire.findMany({
      where,
      orderBy: [{ code: "asc" }, { dateDebut: "desc" }],
    });

    return res.json(regles);
  } catch (error) {
    console.error("[regles] GET list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/regles/:workspaceId/active/:code — Règle active à une date donnée
// ---------------------------------------------------------------------------
router.get("/:workspaceId/active/:code", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, code } = req.params;
    const { date } = req.query;
    const referenceDate = date ? new Date(date as string) : new Date();

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    // Trouver la règle active à la date donnée
    const regle = await prisma.regleReglementaire.findFirst({
      where: {
        workspaceId,
        code,
        dateDebut: { lte: referenceDate },
        OR: [
          { dateFin: null },
          { dateFin: { gte: referenceDate } },
        ],
      },
      orderBy: { dateDebut: "desc" },
    });

    if (!regle) {
      return res.status(404).json({ error: `Aucune règle "${code}" active à cette date` });
    }

    return res.json(regle);
  } catch (error) {
    console.error("[regles] GET active error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/regles/:workspaceId/:id — Détail règle
// ---------------------------------------------------------------------------
router.get("/:workspaceId/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const regle = await prisma.regleReglementaire.findFirst({
      where: { id, workspaceId },
    });

    if (!regle) {
      return res.status(404).json({ error: "Règle introuvable" });
    }

    return res.json(regle);
  } catch (error) {
    console.error("[regles] GET detail error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/regles/:workspaceId/:id — Mettre à jour règle
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { description, valeur, unite, dateFin, source, reference } = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.regleReglementaire.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Règle introuvable" });
    }

    // Règle système : seul PROPRIETAIRE peut modifier
    if (existing.isSystem && req.user!.role !== "PROPRIETAIRE") {
      return res.status(403).json({ error: "Règle système — modification réservée au propriétaire" });
    }

    const updated = await prisma.regleReglementaire.update({
      where: { id },
      data: {
        description: description !== undefined ? description : undefined,
        valeur: valeur !== undefined ? valeur : undefined,
        unite: unite !== undefined ? unite : undefined,
        dateFin: dateFin !== undefined ? (dateFin ? new Date(dateFin) : null) : undefined,
        source: source !== undefined ? source : undefined,
        reference: reference !== undefined ? reference : undefined,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[regles] PUT error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/regles/:workspaceId/:id — Supprimer (si non système)
// ---------------------------------------------------------------------------
router.delete("/:workspaceId/:id", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const existing = await prisma.regleReglementaire.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Règle introuvable" });
    }
    if (existing.isSystem) {
      return res.status(403).json({ error: "Règle système — suppression interdite" });
    }

    await prisma.regleReglementaire.delete({ where: { id } });
    return res.json({ message: "Règle supprimée" });
  } catch (error) {
    console.error("[regles] DELETE error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
