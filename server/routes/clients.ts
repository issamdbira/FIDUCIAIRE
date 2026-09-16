// =============================================================================
// Le Fiduciaire — Clients & Établissements Routes (Phase 2)
// POST   /api/clients                     — Créer entreprise + établissement principal
// GET    /api/clients/:workspaceId        — Lister les entreprises d'un workspace
// GET    /api/clients/:workspaceId/:id    — Détail entreprise + établissements
// PUT    /api/clients/:workspaceId/:id    — Mettre à jour entreprise
// PATCH  /api/clients/:workspaceId/:id/archive — Archiver (jamais supprimer)
// PATCH  /api/clients/:workspaceId/:id/activate — Réactiver
// POST   /api/clients/:workspaceId/:id/establishments    — Ajouter établissement
// PUT    /api/clients/:workspaceId/:id/establishments/:estId — Modifier établissement
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, requireWorkspaceOwner } from "../middleware/rbac.js";
import { auditLog } from "../lib/audit-log.js";

const router = Router();

// ---------------------------------------------------------------------------
// Helper : vérifier l'accès au workspace
// ---------------------------------------------------------------------------
async function checkWorkspaceAccess(userId: string, role: string, workspaceId: string): Promise<boolean> {
  if (role === "PROPRIETAIRE") return true;
  const membership = await prisma.workspace_members.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!membership;
}

// ---------------------------------------------------------------------------
// POST /api/clients — Créer entreprise + établissement principal en une fois
// ---------------------------------------------------------------------------
router.post("/", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const {
      workspaceId,
      raisonSociale,
      matriculeFiscal,
      matriculeCnss,
      codeTVA,
      secteur,
      adresse,
      ville,
      gouvernorat,
      codePostal,
      contactNom,
      contactTelephone,
      contactEmail,
    } = req.body;

    // Validations
    if (!workspaceId || !raisonSociale) {
      return res.status(400).json({ error: "workspaceId et raisonSociale sont requis" });
    }

    // Vérifier l'accès
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
    }

    // Créer l'entreprise + établissement principal en transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.clientCompany.create({
        data: {
          workspaceId,
          raisonSociale,
          matriculeFiscal,
          matriculeCnss,
          codeTVA,
          secteur: secteur || "NON_AGRICOLE",
          statut: "ACTIVE",
          adresse,
          ville,
          gouvernorat,
          codePostal,
          contactNom,
          contactTelephone,
          contactEmail,
        },
      });

      // Créer l'établissement principal automatiquement
      const establishment = await tx.establishment.create({
        data: {
          clientCompanyId: company.id,
          designation: "Siège social",
          isPrincipal: true,
          adresse: adresse || null,
          ville: ville || null,
          gouvernorat: gouvernorat || null,
          codePostal: codePostal || null,
          matriculeCnss: matriculeCnss || null,
        },
      });

      return { company, establishment };
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "CLIENT_CREATE",
      entity: "ClientCompany",
      entityId: result.company.id,
      details: JSON.stringify({ raisonSociale, matriculeFiscal: matriculeFiscal || null }),
      ipAddress: req.ip,
    });

    return res.status(201).json({
      company: result.company,
      establishment: result.establishment,
      message: "Entreprise créée avec son établissement principal",
    });
  } catch (error) {
    console.error("[clients] POST error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clients/:workspaceId — Lister les entreprises du workspace
// ---------------------------------------------------------------------------
router.get("/:workspaceId", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { statut, search } = req.query;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const where: Record<string, unknown> = { workspaceId };
    if (statut && ["ACTIVE", "ARCHIVED"].includes(statut as string)) {
      where.statut = statut;
    }
    if (search) {
      where.OR = [
        { raisonSociale: { contains: search as string, mode: "insensitive" } },
        { matriculeFiscal: { contains: search as string, mode: "insensitive" } },
        { matriculeCnss: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const companies = await prisma.clientCompany.findMany({
      where,
      include: {
        establishments: { orderBy: { isPrincipal: "desc" } },
        _count: { select: { employees: true } },
      },
      orderBy: { raisonSociale: "asc" },
    });

    return res.json(companies);
  } catch (error) {
    console.error("[clients] GET list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/clients/:workspaceId/:id — Détail entreprise
// ---------------------------------------------------------------------------
router.get("/:workspaceId/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const company = await prisma.clientCompany.findFirst({
      where: { id, workspaceId },
      include: {
        establishments: { orderBy: { isPrincipal: "desc" } },
        employees: {
          where: { isActive: true },
          select: {
            id: true, matriculeCnss: true, firstName: true, lastName: true,
            baseSalary: true, civilStatus: true, establishmentId: true,
          },
          orderBy: { lastName: "asc" },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: "Entreprise introuvable" });
    }

    return res.json(company);
  } catch (error) {
    console.error("[clients] GET detail error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/clients/:workspaceId/:id — Mettre à jour entreprise
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.clientCompany.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Entreprise introuvable" });
    }

    const data = req.body;
    const updated = await prisma.clientCompany.update({
      where: { id },
      data: {
        raisonSociale: data.raisonSociale,
        matriculeFiscal: data.matriculeFiscal,
        matriculeCnss: data.matriculeCnss,
        codeTVA: data.codeTVA,
        secteur: data.secteur,
        adresse: data.adresse,
        ville: data.ville,
        gouvernorat: data.gouvernorat,
        codePostal: data.codePostal,
        contactNom: data.contactNom,
        contactTelephone: data.contactTelephone,
        contactEmail: data.contactEmail,
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "CLIENT_UPDATE",
      entity: "ClientCompany",
      entityId: id,
      details: JSON.stringify({
        avant: { raisonSociale: existing.raisonSociale, matriculeFiscal: existing.matriculeFiscal, contactEmail: existing.contactEmail },
        apres: { raisonSociale: updated.raisonSociale, matriculeFiscal: updated.matriculeFiscal, contactEmail: updated.contactEmail },
      }),
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error("[clients] PUT error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/clients/:workspaceId/:id/archive — Archiver (jamais supprimer)
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/:id/archive", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.clientCompany.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Entreprise introuvable" });
    }
    if (existing.statut === "ARCHIVED") {
      return res.status(400).json({ error: "Entreprise déjà archivée" });
    }

    const updated = await prisma.clientCompany.update({
      where: { id },
      data: { statut: "ARCHIVED", archivedAt: new Date() },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "CLIENT_ARCHIVE",
      entity: "ClientCompany",
      entityId: id,
      details: JSON.stringify({ raisonSociale: existing.raisonSociale, avant: "ACTIVE", apres: "ARCHIVED" }),
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error("[clients] archive error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/clients/:workspaceId/:id/activate — Réactiver
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/:id/activate", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.clientCompany.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Entreprise introuvable" });
    }

    const updated = await prisma.clientCompany.update({
      where: { id },
      data: { statut: "ACTIVE", archivedAt: null },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "CLIENT_ACTIVATE",
      entity: "ClientCompany",
      entityId: id,
      details: JSON.stringify({ raisonSociale: existing.raisonSociale, avant: "ARCHIVED", apres: "ACTIVE" }),
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error("[clients] activate error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/clients/:workspaceId/:id/establishments — Ajouter établissement
// ---------------------------------------------------------------------------
router.post("/:workspaceId/:id/establishments", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const { designation, isPrincipal, adresse, ville, gouvernorat, codePostal, matriculeCnss, codeExploitation } = req.body;

    if (!designation) {
      return res.status(400).json({ error: "designation est requis" });
    }

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const company = await prisma.clientCompany.findFirst({ where: { id, workspaceId } });
    if (!company) {
      return res.status(404).json({ error: "Entreprise introuvable" });
    }

    // Si on marque isPrincipal, retirer le flag de l'ancien principal
    if (isPrincipal) {
      await prisma.establishment.updateMany({
        where: { clientCompanyId: id, isPrincipal: true },
        data: { isPrincipal: false },
      });
    }

    const establishment = await prisma.establishment.create({
      data: {
        clientCompanyId: id,
        designation,
        isPrincipal: isPrincipal || false,
        adresse,
        ville,
        gouvernorat,
        codePostal,
        matriculeCnss,
        codeExploitation,
      },
    });

    return res.status(201).json(establishment);
  } catch (error) {
    console.error("[clients] POST establishment error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/clients/:workspaceId/:id/establishments/:estId — Modifier établissement
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id/establishments/:estId", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id, estId } = req.params;
    const data = req.body;

    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    // IDOR : vérifier que la société appartient bien au workspace avant de
    // toucher ses établissements (sinon un membre du ws A pouvait modifier
    // un établissement d'une société du ws B)
    const company = await prisma.clientCompany.findFirst({ where: { id, workspaceId } });
    if (!company) {
      return res.status(404).json({ error: "Entreprise introuvable" });
    }

    const est = await prisma.establishment.findFirst({
      where: { id: estId, clientCompanyId: id },
    });
    if (!est) {
      return res.status(404).json({ error: "Établissement introuvable" });
    }

    // Si on marque isPrincipal, retirer le flag de l'ancien
    if (data.isPrincipal) {
      await prisma.establishment.updateMany({
        where: { clientCompanyId: id, isPrincipal: true },
        data: { isPrincipal: false },
      });
    }

    const updated = await prisma.establishment.update({
      where: { id: estId },
      data: {
        designation: data.designation,
        isPrincipal: data.isPrincipal,
        adresse: data.adresse,
        ville: data.ville,
        gouvernorat: data.gouvernorat,
        codePostal: data.codePostal,
        matriculeCnss: data.matriculeCnss,
        codeExploitation: data.codeExploitation,
        isActive: data.isActive,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("[clients] PUT establishment error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
