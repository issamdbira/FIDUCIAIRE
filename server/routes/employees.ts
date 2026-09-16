// =============================================================================
// Le Fiduciaire — Employés Routes
// POST   /api/employees                     — Créer un salarié
// GET    /api/employees/:workspaceId        — Lister les salariés d'un workspace
// GET    /api/employees/:workspaceId/:id    — Détail d'un salarié
// PUT    /api/employees/:workspaceId/:id    — Mettre à jour un salarié
// PATCH  /api/employees/:workspaceId/:id/archive   — Archiver (désactiver)
// PATCH  /api/employees/:workspaceId/:id/activate  — Réactiver
// =============================================================================

import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceMember, requireWorkspaceWriter, requireWorkspaceOwner, hasWorkspaceAccess } from "../middleware/rbac.js";
import { auditLog } from "../lib/audit-log.js";

const router = Router();

// ---------------------------------------------------------------------------
// Helper : vérifier l'accès au workspace
// ---------------------------------------------------------------------------
async function checkWorkspaceAccess(userId: string, _role: string, workspaceId: string): Promise<boolean> {
  // Phase 10 : accès direct OU délégué (cabinet) — résolution centralisée rbac.ts
  return hasWorkspaceAccess(userId, workspaceId);
}

// ---------------------------------------------------------------------------
// POST /api/employees — Créer un salarié
// ---------------------------------------------------------------------------
router.post("/", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const {
      workspaceId,
      clientCompanyId,
      establishmentId,
      matriculeCnss,
      firstName,
      lastName,
      baseSalary,
      civilStatus,
      numberOfChildren,
      hiredAt,
    } = req.body;

    if (!workspaceId || !matriculeCnss || !firstName || !lastName || baseSalary === undefined) {
      return res.status(400).json({ error: "workspaceId, matriculeCnss, firstName, lastName et baseSalary sont requis" });
    }

    // Vérifier l'accès au workspace
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
    }

    // Vérifier l'unicité du matricule CNSS dans le workspace
    const existing = await prisma.employees.findFirst({
      where: { workspaceId, matriculeCnss },
    });
    if (existing) {
      return res.status(409).json({ error: `Un salarié avec le matricule CNSS "${matriculeCnss}" existe déjà dans ce workspace` });
    }

    // Vérifier que le client existe si fourni
    if (clientCompanyId) {
      const client = await prisma.clientCompany.findFirst({
        where: { id: clientCompanyId, workspaceId },
      });
      if (!client) {
        return res.status(400).json({ error: "Entreprise cliente non trouvée dans ce workspace" });
      }
    }

    // Vérifier que l'établissement existe si fourni
    if (establishmentId) {
      const est = await prisma.establishment.findFirst({
        where: { id: establishmentId, clientCompanyId },
      });
      if (!est) {
        return res.status(400).json({ error: "Établissement non trouvé pour cette entreprise" });
      }
    }

    const employee = await prisma.employees.create({
      data: {
        workspaceId,
        clientCompanyId: clientCompanyId || null,
        establishmentId: establishmentId || null,
        matriculeCnss,
        firstName,
        lastName,
        baseSalary: parseFloat(String(baseSalary)),
        civilStatus: civilStatus || "CELIBATAIRE",
        numberOfChildren: numberOfChildren ? parseInt(String(numberOfChildren), 10) : 0,
        isActive: true,
        hiredAt: hiredAt ? new Date(hiredAt) : new Date(),
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "EMPLOYEE_CREATE",
      entity: "employees",
      entityId: employee.id,
      details: JSON.stringify({ salarié: `${employee.firstName} ${employee.lastName}`, matriculeCnss: employee.matriculeCnss, baseSalary: employee.baseSalary }),
      ipAddress: req.ip,
    });

    res.status(201).json(employee);
  } catch (err: any) {
    console.error("[employees] POST error:", err.message);
    res.status(500).json({ error: "Erreur lors de la création du salarié" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/employees/:workspaceId — Lister les salariés d'un workspace
// ---------------------------------------------------------------------------
router.get("/:workspaceId", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const { search, clientId, activeOnly } = req.query;

    const where: any = { workspaceId };
    if (activeOnly === "true") where.isActive = true;
    if (clientId) where.clientCompanyId = String(clientId);
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: "insensitive" } },
        { lastName: { contains: String(search), mode: "insensitive" } },
        { matriculeCnss: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employees.findMany({
      where,
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
        establishment: { select: { id: true, designation: true } },
        contracts: {
          where: { statut: "ACTIF" },
          take: 1,
          select: { id: true, type: true, poste: true, dateDebut: true, dateFin: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    res.json(employees);
  } catch (err: any) {
    console.error("[employees] GET list error:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération des salariés" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/employees/:workspaceId/:id — Détail d'un salarié
// ---------------------------------------------------------------------------
router.get("/:workspaceId/:id", requireAuth, requireWorkspaceMember(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const employee = await prisma.employees.findFirst({
      where: { id, workspaceId },
      include: {
        client_company: { select: { id: true, raisonSociale: true, matriculeFiscal: true } },
        establishment: { select: { id: true, designation: true, matriculeCnss: true } },
        contracts: {
          orderBy: { createdAt: "desc" },
          include: {
            versions: { orderBy: { dateEffet: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Salarié non trouvé" });
    }

    res.json(employee);
  } catch (err: any) {
    console.error("[employees] GET detail error:", err.message);
    res.status(500).json({ error: "Erreur lors de la récupération du salarié" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/employees/:workspaceId/:id — Mettre à jour un salarié
// ---------------------------------------------------------------------------
router.put("/:workspaceId/:id", requireAuth, requireWorkspaceWriter(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.employees.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Salarié non trouvé" });
    }

    const {
      clientCompanyId,
      establishmentId,
      matriculeCnss,
      firstName,
      lastName,
      baseSalary,
      civilStatus,
      numberOfChildren,
      hiredAt,
      departedAt,
    } = req.body;

    // Si changement de matricule CNSS, vérifier l'unicité
    if (matriculeCnss && matriculeCnss !== existing.matriculeCnss) {
      const duplicate = await prisma.employees.findFirst({
        where: { workspaceId, matriculeCnss, id: { not: id } },
      });
      if (duplicate) {
        return res.status(409).json({ error: `Un autre salarié utilise déjà le matricule CNSS "${matriculeCnss}"` });
      }
    }

    const data: any = {};
    if (clientCompanyId !== undefined) data.clientCompanyId = clientCompanyId || null;
    if (establishmentId !== undefined) data.establishmentId = establishmentId || null;
    if (matriculeCnss !== undefined) data.matriculeCnss = matriculeCnss;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (baseSalary !== undefined) data.baseSalary = parseFloat(String(baseSalary));
    if (civilStatus !== undefined) data.civilStatus = civilStatus;
    if (numberOfChildren !== undefined) data.numberOfChildren = parseInt(String(numberOfChildren), 10);
    if (hiredAt !== undefined) data.hiredAt = hiredAt ? new Date(hiredAt) : null;
    if (departedAt !== undefined) data.departedAt = departedAt ? new Date(departedAt) : null;

    const updated = await prisma.employees.update({
      where: { id },
      data,
      include: {
        client_company: { select: { id: true, raisonSociale: true } },
        establishment: { select: { id: true, designation: true } },
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "EMPLOYEE_UPDATE",
      entity: "employees",
      entityId: id,
      details: JSON.stringify({
        avant: { firstName: existing.firstName, lastName: existing.lastName, baseSalary: existing.baseSalary, clientCompanyId: existing.clientCompanyId },
        apres: { firstName: updated.firstName, lastName: updated.lastName, baseSalary: updated.baseSalary, clientCompanyId: updated.clientCompanyId },
      }),
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    console.error("[employees] PUT error:", err.message);
    res.status(500).json({ error: "Erreur lors de la mise à jour du salarié" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/employees/:workspaceId/:id/archive — Archiver (soft delete)
// On choisit l'archivage (isActive=false + departedAt) plutôt que la suppression
// physique car un salarié peut avoir des bulletins de paie, des contrats, des
// déclarations CNSS. Supprimer l'enregistrement casserait l'intégrité
// référentielle et l'historique fiscal/social.
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/:id/archive", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.employees.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Salarié non trouvé" });
    }

    const updated = await prisma.employees.update({
      where: { id },
      data: {
        isActive: false,
        departedAt: new Date(),
      },
    });

    await auditLog({
      workspaceId,
      userId: req.user!.userId,
      action: "EMPLOYEE_ARCHIVE",
      entity: "employees",
      entityId: id,
      details: JSON.stringify({ salarié: `${existing.firstName} ${existing.lastName}`, avant: "actif", apres: "archivé" }),
      ipAddress: req.ip,
    });

    res.json(updated);
  } catch (err: any) {
    console.error("[employees] PATCH archive error:", err.message);
    res.status(500).json({ error: "Erreur lors de l'archivage du salarié" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/employees/:workspaceId/:id/activate — Réactiver un salarié archivé
// ---------------------------------------------------------------------------
router.patch("/:workspaceId/:id/activate", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { workspaceId, id } = req.params;
    const hasAccess = await checkWorkspaceAccess(req.user!.userId, req.user!.role, workspaceId);
    if (!hasAccess) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    const existing = await prisma.employees.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: "Salarié non trouvé" });
    }

    const updated = await prisma.employees.update({
      where: { id },
      data: {
        isActive: true,
        departedAt: null,
      },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("[employees] PATCH activate error:", err.message);
    res.status(500).json({ error: "Erreur lors de la réactivation du salarié" });
  }
});

export default router;
