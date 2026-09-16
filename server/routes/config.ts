// =============================================================================
// Le Fiduciaire — Payroll Config Routes
// GET | PUT | reset — avec fallback localStorage
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, requireWorkspaceAccess } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceOwner } from "../middleware/rbac.js";

const router = Router();

// ---------------------------------------------------------------------------
// IRPP barème 2026 — 8 tranches (fallback)
// Source unique : aligné sur CONFIG_PAR_DEFAUT.baremeIRPP
// (client/src/lib/payroll/config.ts) et les tests du moteur
// (client/src/lib/payroll/irpp.test.ts). Doit rester identique aux tranches
// créées par /auth/setup — c'était une divergence : l'ancien barème
// (26/28/32/36/39/40) contredisait le moteur et aurait écrasé les tranches
// correctes en base lors d'un POST /reset.
// ---------------------------------------------------------------------------
const IRPP_BAREME_2026 = [
  { min: 0, max: 5000, taux: 0, ordre: 1 },
  { min: 5000, max: 10000, taux: 0.15, ordre: 2 },
  { min: 10000, max: 20000, taux: 0.25, ordre: 3 },
  { min: 20000, max: 30000, taux: 0.3, ordre: 4 },
  { min: 30000, max: 40000, taux: 0.33, ordre: 5 },
  { min: 40000, max: 50000, taux: 0.36, ordre: 6 },
  { min: 50000, max: 70000, taux: 0.38, ordre: 7 },
  { min: 70000, max: null, taux: 0.4, ordre: 8 },
];

// ---------------------------------------------------------------------------
// GET /api/config/:workspaceId — Lecture config (Neon d'abord, fallback client)
// ---------------------------------------------------------------------------
router.get("/:workspaceId", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Vérifier l'accès au workspace
    if (req.user!.role !== "PROPRIETAIRE") {
      const membership = await prisma.workspace_members.findUnique({
        where: { userId_workspaceId: { userId: req.user!.userId, workspaceId } },
      });
      if (!membership) {
        return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
      }
    }

    const config = await prisma.payrollConfig.findUnique({
      where: { workspaceId },
      include: { tranches_irpp: { orderBy: { ordre: "asc" } } },
    });

    if (!config) {
      // Aucune config en base — retourner le fallback par défaut
      return res.json({
        source: "fallback",
        workspaceId,
        cnssSalarialNonAgricole: 0.0968,
        cnssPatronalNonAgricole: 0.1707,
        cnssSalarialAgricole: 0.0699,
        cnssPatronalAgricole: 0.1248,
        cssActive: false,
        cssTaux: 0,
        cssSeuilExonerationAnnuel: 5000,
        fraisProTauxActifs: 0.10,
        fraisProPlafondActifsAnnuel: 2000,
        fraisProTauxRetraites: 0.25,
        deductionChefFamille: 300,
        deductionEnfant: 100,
        deductionEtudiant: 1000,
        plafondNombreEnfantsEtudiants: 4,
        deductionInfirme: 2000,
        parentsEnChargeActif: false,
        parentsEnChargeTaux: 0.05,
        parentsEnChargePlafondParAnnuel: 450,
        tranchesIrpp: IRPP_BAREME_2026,
      });
    }

    return res.json({
      source: "neon",
      ...config,
      tranchesIrpp: config.tranches_irpp,
    });
  } catch (error) {
    console.error("[config] GET error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/config/:workspaceId — Mise à jour config
// ---------------------------------------------------------------------------
router.put("/:workspaceId", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Vérifier l'accès (PROPRIETAIRE ou GESTIONNAIRE du workspace)
    if (req.user!.role !== "PROPRIETAIRE") {
      const membership = await prisma.workspace_members.findUnique({
        where: { userId_workspaceId: { userId: req.user!.userId, workspaceId } },
      });
      if (!membership || membership.role === "LECTEUR") {
        return res.status(403).json({ error: "Accès refusé — droits insuffisants" });
      }
    }

    const data = req.body;

    // Upsert config
    const config = await prisma.payrollConfig.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        cnssSalarialNonAgricole: data.cnssSalarialNonAgricole ?? 0.0968,
        cnssPatronalNonAgricole: data.cnssPatronalNonAgricole ?? 0.1707,
        cnssSalarialAgricole: data.cnssSalarialAgricole ?? 0.0699,
        cnssPatronalAgricole: data.cnssPatronalAgricole ?? 0.1248,
        cssActive: data.cssActive ?? false,
        cssTaux: data.cssTaux ?? 0,
        cssSeuilExonerationAnnuel: data.cssSeuilExonerationAnnuel ?? 5000,
        fraisProTauxActifs: data.fraisProTauxActifs ?? 0.10,
        fraisProPlafondActifsAnnuel: data.fraisProPlafondActifsAnnuel ?? 2000,
        fraisProTauxRetraites: data.fraisProTauxRetraites ?? 0.25,
        deductionChefFamille: data.deductionChefFamille ?? 300,
        deductionEnfant: data.deductionEnfant ?? 100,
        deductionEtudiant: data.deductionEtudiant ?? 1000,
        plafondNombreEnfantsEtudiants: data.plafondNombreEnfantsEtudiants ?? 4,
        deductionInfirme: data.deductionInfirme ?? 2000,
        parentsEnChargeActif: data.parentsEnChargeActif ?? false,
        parentsEnChargeTaux: data.parentsEnChargeTaux ?? 0.05,
        parentsEnChargePlafondParAnnuel: data.parentsEnChargePlafondParAnnuel ?? 450,
      },
      update: {
        cnssSalarialNonAgricole: data.cnssSalarialNonAgricole,
        cnssPatronalNonAgricole: data.cnssPatronalNonAgricole,
        cnssSalarialAgricole: data.cnssSalarialAgricole,
        cnssPatronalAgricole: data.cnssPatronalAgricole,
        cssActive: data.cssActive,
        cssTaux: data.cssTaux,
        cssSeuilExonerationAnnuel: data.cssSeuilExonerationAnnuel,
        fraisProTauxActifs: data.fraisProTauxActifs,
        fraisProPlafondActifsAnnuel: data.fraisProPlafondActifsAnnuel,
        fraisProTauxRetraites: data.fraisProTauxRetraites,
        deductionChefFamille: data.deductionChefFamille,
        deductionEnfant: data.deductionEnfant,
        deductionEtudiant: data.deductionEtudiant,
        plafondNombreEnfantsEtudiants: data.plafondNombreEnfantsEtudiants,
        deductionInfirme: data.deductionInfirme,
        parentsEnChargeActif: data.parentsEnChargeActif,
        parentsEnChargeTaux: data.parentsEnChargeTaux,
        parentsEnChargePlafondParAnnuel: data.parentsEnChargePlafondParAnnuel,
      },
    });

    // Upsert tranches IRPP si fournies
    if (data.tranchesIrpp && Array.isArray(data.tranchesIrpp)) {
      // Supprimer les anciennes et recréer
      await prisma.tranches_irpp.deleteMany({ where: { payrollConfigId: config.id } });
      await prisma.tranches_irpp.createMany({
        data: data.tranchesIrpp.map((t: any) => ({
          payrollConfigId: config.id,
          min: t.min,
          max: t.max,
          taux: t.taux,
          ordre: t.ordre,
        })),
      });
    }

    const result = await prisma.payrollConfig.findUnique({
      where: { workspaceId },
      include: { tranches_irpp: { orderBy: { ordre: "asc" } } },
    });

    return res.json({ source: "neon", ...result, tranchesIrpp: result!.tranches_irpp });
  } catch (error) {
    console.error("[config] PUT error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/config/:workspaceId/reset — Réinitialiser aux valeurs par défaut
// ---------------------------------------------------------------------------
router.post("/:workspaceId/reset", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Vérifier l'accès
    if (req.user!.role !== "PROPRIETAIRE") {
      const membership = await prisma.workspace_members.findUnique({
        where: { userId_workspaceId: { userId: req.user!.userId, workspaceId } },
      });
      if (!membership) {
        return res.status(403).json({ error: "Accès refusé" });
      }
    }

    // Supprimer la config existante
    const existing = await prisma.payrollConfig.findUnique({ where: { workspaceId } });
    if (existing) {
      await prisma.tranches_irpp.deleteMany({ where: { payrollConfigId: existing.id } });
      await prisma.payrollConfig.delete({ where: { workspaceId } });
    }

    // Recréer avec les valeurs par défaut
    const config = await prisma.payrollConfig.create({
      data: { workspaceId },
    });

    // Créer les tranches IRPP par défaut
    await prisma.tranches_irpp.createMany({
      data: IRPP_BAREME_2026.map((t) => ({
        payrollConfigId: config.id,
        min: t.min,
        max: t.max,
        taux: t.taux,
        ordre: t.ordre,
      })),
    });

    const result = await prisma.payrollConfig.findUnique({
      where: { workspaceId },
      include: { tranches_irpp: { orderBy: { ordre: "asc" } } },
    });

    return res.json({ source: "neon", ...result, tranchesIrpp: result!.tranches_irpp });
  } catch (error) {
    console.error("[config] reset error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
