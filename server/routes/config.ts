/**
 * Routes config paie — /api/config/*
 *
 * GET  /api/config/:workspaceId    — lire la config paie d'un workspace
 * PUT  /api/config/:workspaceId    — mettre à jour la config paie
 * POST /api/config/:workspaceId/reset — réinitialiser aux valeurs par défaut
 */
import { Router, type Request, type Response } from "express";
import prisma from "../lib/prisma";
import { verifyToken, type JwtPayload } from "../lib/auth";

const configRouter = Router();

function extractUser(req: Request): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

// ─── GET /:workspaceId ───

configRouter.get("/:workspaceId", async (req: Request, res: Response) => {
  try {
    const payload = extractUser(req);
    if (!payload) return res.status(401).json({ error: "Non authentifié" });

    const { workspaceId } = req.params;
    let config = await prisma.payrollConfig.findUnique({
      where: { workspaceId },
      include: { tranchesIRPP: { orderBy: { ordre: "asc" } } },
    });

    // Si pas de config, créer avec les valeurs par défaut
    if (!config) {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace) return res.status(404).json({ error: "Workspace introuvable" });

      config = await prisma.payrollConfig.create({
        data: {
          workspaceId,
          tranchesIRPP: {
            create: [
              { min: 0, max: 5000, taux: 0, ordre: 1 },
              { min: 5000, max: 10000, taux: 0.15, ordre: 2 },
              { min: 10000, max: 20000, taux: 0.25, ordre: 3 },
              { min: 20000, max: 30000, taux: 0.30, ordre: 4 },
              { min: 30000, max: 40000, taux: 0.33, ordre: 5 },
              { min: 40000, max: 50000, taux: 0.36, ordre: 6 },
              { min: 50000, max: 70000, taux: 0.38, ordre: 7 },
              { min: 70000, max: null, taux: 0.40, ordre: 8 },
            ],
          },
        },
        include: { tranchesIRPP: { orderBy: { ordre: "asc" } } },
      });
    }

    return res.json(config);
  } catch (err) {
    console.error("config get error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── PUT /:workspaceId ───

configRouter.put("/:workspaceId", async (req: Request, res: Response) => {
  try {
    const payload = extractUser(req);
    if (!payload) return res.status(401).json({ error: "Non authentifié" });
    if (payload.role === "LECTEUR") return res.status(403).json({ error: "Accès lecture uniquement" });

    const { workspaceId } = req.params;
    const data = req.body;

    // Séparer les tranches IRPP du reste
    const { tranchesIRPP, ...configFields } = data;

    const config = await prisma.payrollConfig.upsert({
      where: { workspaceId },
      update: configFields,
      create: { workspaceId, ...configFields },
      include: { tranchesIRPP: { orderBy: { ordre: "asc" } } },
    });

    // Si des tranches IRPP sont fournies, les remplacer
    if (tranchesIRPP && Array.isArray(tranchesIRPP)) {
      await prisma.trancheIRPP.deleteMany({ where: { payrollConfigId: config.id } });
      await prisma.trancheIRPP.createMany({
        data: tranchesIRPP.map((t: any, i: number) => ({
          payrollConfigId: config.id,
          min: t.min,
          max: t.max ?? null,
          taux: t.taux,
          ordre: i + 1,
        })),
      });
    }

    const refreshed = await prisma.payrollConfig.findUnique({
      where: { id: config.id },
      include: { tranchesIRPP: { orderBy: { ordre: "asc" } } },
    });

    return res.json(refreshed);
  } catch (err) {
    console.error("config put error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /:workspaceId/reset ───

configRouter.post("/:workspaceId/reset", async (req: Request, res: Response) => {
  try {
    const payload = extractUser(req);
    if (!payload) return res.status(401).json({ error: "Non authentifié" });
    if (payload.role !== "PROPRIETAIRE" && payload.role !== "GESTIONNAIRE") {
      return res.status(403).json({ error: "Accès insuffisant" });
    }

    const { workspaceId } = req.params;

    // Supprimer l'ancienne config (cascade supprime les tranches)
    await prisma.payrollConfig.deleteMany({ where: { workspaceId } });

    // Recréer avec les valeurs par défaut
    const config = await prisma.payrollConfig.create({
      data: {
        workspaceId,
        tranchesIRPP: {
          create: [
            { min: 0, max: 5000, taux: 0, ordre: 1 },
            { min: 5000, max: 10000, taux: 0.15, ordre: 2 },
            { min: 10000, max: 20000, taux: 0.25, ordre: 3 },
            { min: 20000, max: 30000, taux: 0.30, ordre: 4 },
            { min: 30000, max: 40000, taux: 0.33, ordre: 5 },
            { min: 40000, max: 50000, taux: 0.36, ordre: 6 },
            { min: 50000, max: 70000, taux: 0.38, ordre: 7 },
            { min: 70000, max: null, taux: 0.40, ordre: 8 },
          ],
        },
      },
      include: { tranchesIRPP: { orderBy: { ordre: "asc" } } },
    });

    return res.json(config);
  } catch (err) {
    console.error("config reset error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default configRouter;
