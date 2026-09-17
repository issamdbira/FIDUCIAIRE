// =============================================================================
// Le Fiduciaire — Workspaces : gestion des membres & invitations (Phase 7)
// + Dossiers clients & accès délégués (Phase 10 — modèle espaces)
// GET    /api/workspaces/:ws/members            — Lister les membres (P)
// PATCH  /api/workspaces/:ws/members/:userId    — Changer un rôle (P)
// DELETE /api/workspaces/:ws/members/:userId    — Retirer un membre (P)
// POST   /api/workspaces/:ws/transfer           — Transférer la propriété (P)
// POST   /api/workspaces/:ws/invitations        — Créer une invitation (P)
// GET    /api/workspaces/:ws/invitations        — Lister les invitations (P)
// DELETE /api/workspaces/:ws/invitations/:id    — Révoquer une invitation (P)
// POST   /api/workspaces/:ws/client-spaces      — Créer l'espace d'un client (flux A, P)
// GET    /api/workspaces/:ws/delegations        — Lister les dossiers du cabinet (P)
// POST   /api/workspaces/:ws/delegations/link   — Relier via code de liaison (P)
// DELETE /api/workspaces/:ws/delegations/:id    — Révoquer un accès délégué (P)
// POST   /api/workspaces/:ws/liaison-codes      — Générer un code (entreprise, P)
// GET    /api/workspaces/:ws/liaison-codes      — Lister les codes (entreprise, P)
// DELETE /api/workspaces/:ws/liaison-codes/:id  — Annuler un code (entreprise, P)
// =============================================================================

import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceOwner } from "../middleware/rbac.js";
import { auditLog } from "../lib/audit-log.js";
import { provisionWorkspace } from "../lib/provision-workspace.js";

const router = Router();

/** Durée de validité d'une invitation */
const INVITATION_TTL_JOURS = 7;

/** Durée de validité d'un code de liaison cabinet */
const LIAISON_TTL_JOURS = 7;

// ---------------------------------------------------------------------------
// GET /api/workspaces/:ws/members — Lister les membres du workspace (P)
// ---------------------------------------------------------------------------
router.get("/:ws/members", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;

    const members = await prisma.workspace_members.findMany({
      where: { workspaceId: ws },
      include: {
        users: { select: { id: true, email: true, fullName: true, statut: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return res.json(
      members.map((m) => ({
        userId: m.userId,
        email: m.users.email,
        fullName: m.users.fullName,
        statut: m.users.statut,
        role: m.role,
        joinedAt: m.joinedAt,
      }))
    );
  } catch (error) {
    console.error("[workspaces] members error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/workspaces/:ws/members/:userId — Changer le rôle d'un membre (P)
// Règles : cible PROPRIETAIRE interdite (passer par /transfer),
//          auto-modification interdite, rôles G/L uniquement.
// ---------------------------------------------------------------------------
router.patch("/:ws/members/:userId", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws, userId } = req.params;
    const { role } = req.body;

    if (!["GESTIONNAIRE", "LECTEUR"].includes(role)) {
      return res.status(400).json({ error: "role doit être GESTIONNAIRE ou LECTEUR (la propriété se transfère via /transfer)" });
    }
    if (userId === req.user!.userId) {
      return res.status(400).json({ error: "Impossible de modifier son propre rôle" });
    }

    const target = await prisma.workspace_members.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: ws } },
    });
    if (!target) {
      return res.status(404).json({ error: "Membre introuvable dans ce workspace" });
    }
    if (target.role === "PROPRIETAIRE") {
      return res.status(400).json({ error: "Impossible de modifier le rôle du propriétaire — utilisez le transfert de propriété" });
    }

    const updated = await prisma.workspace_members.update({
      where: { userId_workspaceId: { userId, workspaceId: ws } },
      data: { role },
    });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "MEMBER_ROLE_UPDATE",
      entity: "workspace_members",
      entityId: userId,
      details: JSON.stringify({ avant: target.role, apres: role }),
      ipAddress: req.ip,
    });

    return res.json({ userId, role: updated.role });
  } catch (error) {
    console.error("[workspaces] role update error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/workspaces/:ws/members/:userId — Retirer un membre (P)
// Règles : PROPRIETAIRE intouchable, auto-retrait interdit (anti-verrouillage).
// ---------------------------------------------------------------------------
router.delete("/:ws/members/:userId", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws, userId } = req.params;

    if (userId === req.user!.userId) {
      return res.status(400).json({ error: "Impossible de se retirer soi-même — transférez la propriété ou demandez à un autre propriétaire" });
    }

    const target = await prisma.workspace_members.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: ws } },
    });
    if (!target) {
      return res.status(404).json({ error: "Membre introuvable dans ce workspace" });
    }
    if (target.role === "PROPRIETAIRE") {
      return res.status(400).json({ error: "Impossible de retirer le propriétaire — transférez d'abord la propriété" });
    }

    await prisma.workspace_members.delete({
      where: { userId_workspaceId: { userId, workspaceId: ws } },
    });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "MEMBER_REMOVE",
      entity: "workspace_members",
      entityId: userId,
      details: JSON.stringify({ role: target.role }),
      ipAddress: req.ip,
    });

    return res.json({ message: "Membre retiré" });
  } catch (error) {
    console.error("[workspaces] member remove error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/workspaces/:ws/transfer — Transférer la propriété (P)
// L'ancien propriétaire devient GESTIONNAIRE ; le nouveau doit déjà être
// membre. Transaction : les deux rôles changent ensemble ou pas du tout.
// ---------------------------------------------------------------------------
router.post("/:ws/transfer", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ error: "newOwnerId requis" });
    }
    if (newOwnerId === req.user!.userId) {
      return res.status(400).json({ error: "Vous êtes déjà le propriétaire" });
    }

    const target = await prisma.workspace_members.findUnique({
      where: { userId_workspaceId: { userId: newOwnerId, workspaceId: ws } },
    });
    if (!target) {
      return res.status(404).json({ error: "Le nouveau propriétaire doit être membre du workspace" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Lot 1 — ordre imposé par l'index unique workspace_members_proprietaire_unique :
      // RÉTROGRADER l'ancien propriétaire AVANT de promouvoir le nouveau,
      // sinon la transaction est rejetée par la contrainte (doublon temporaire).
      await tx.workspace_members.update({
        where: { userId_workspaceId: { userId: req.user!.userId, workspaceId: ws } },
        data: { role: "GESTIONNAIRE" },
      });
      await tx.workspace_members.update({
        where: { userId_workspaceId: { userId: newOwnerId, workspaceId: ws } },
        data: { role: "PROPRIETAIRE" },
      });
      // Le rôle global de l'utilisateur suit pour la cohérence des vues simples
      await tx.users.update({ where: { id: req.user!.userId }, data: { role: "GESTIONNAIRE" } });
      await tx.users.update({ where: { id: newOwnerId }, data: { role: "PROPRIETAIRE" } });
      return true;
    }, { timeout: 15_000 });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "OWNERSHIP_TRANSFER",
      entity: "workspace_members",
      entityId: newOwnerId,
      details: JSON.stringify({ ancienProprietaire: req.user!.userId, nouveauProprietaire: newOwnerId }),
      ipAddress: req.ip,
    });

    return res.json({ message: "Propriété transférée", transferred: result });
  } catch (error) {
    console.error("[workspaces] transfer error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/workspaces/:ws/invitations — Créer une invitation (P)
// Lien copiable : valable 7 jours, à usage unique. Le token est aléatoire
// (32 octets) ; seule sa empreinte sha256 est stockée.
// ---------------------------------------------------------------------------
router.post("/:ws/invitations", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: "email requis" });
    }
    if (!["GESTIONNAIRE", "LECTEUR"].includes(role)) {
      return res.status(400).json({ error: "role doit être GESTIONNAIRE ou LECTEUR" });
    }

    // Un utilisateur déjà membre ne peut pas être invité
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      const m = await prisma.workspace_members.findUnique({
        where: { userId_workspaceId: { userId: existingUser.id, workspaceId: ws } },
      });
      if (m) {
        return res.status(409).json({ error: "Cet utilisateur est déjà membre de ce workspace" });
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + INVITATION_TTL_JOURS * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitations.create({
      data: {
        workspaceId: ws,
        email,
        role,
        tokenHash,
        expiresAt,
        createdBy: req.user!.userId,
      },
    });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "INVITATION_CREATE",
      entity: "invitations",
      entityId: invitation.id,
      details: JSON.stringify({ email, role, expiresAt: expiresAt.toISOString() }),
      ipAddress: req.ip,
    });

    // Lien complet à copier-coller et envoyer manuellement
    const origin = (req.headers.origin || `https://${req.headers.host}`) as string;
    const link = `${origin}/invitation?token=${token}`;

    return res.status(201).json({
      id: invitation.id,
      email,
      role,
      expiresAt: invitation.expiresAt,
      link, // à transmettre manuellement — jamais envoyé par email
      message: "Invitation créée — copiez le lien et envoyez-le à l'invité",
    });
  } catch (error) {
    console.error("[workspaces] invitation create error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/workspaces/:ws/invitations — Lister les invitations (P)
// ---------------------------------------------------------------------------
router.get("/:ws/invitations", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;

    const invitations = await prisma.invitations.findMany({
      where: { workspaceId: ws },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    return res.json(
      invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        usedAt: i.usedAt,
        // Statut dérivé : utilise le champ utilisé/expirée/en attente
        statut: i.usedAt ? "UTILISEE" : i.expiresAt < now ? "EXPIREE" : "EN_ATTENTE",
      }))
    );
  } catch (error) {
    console.error("[workspaces] invitations list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/workspaces/:ws/invitations/:id — Révoquer une invitation (P)
// ---------------------------------------------------------------------------
router.delete("/:ws/invitations/:id", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;

    const invitation = await prisma.invitations.findFirst({
      where: { id, workspaceId: ws },
    });
    if (!invitation) {
      return res.status(404).json({ error: "Invitation introuvable" });
    }
    if (invitation.usedAt) {
      return res.status(400).json({ error: "Invitation déjà utilisée — rien à révoquer" });
    }

    await prisma.invitations.delete({ where: { id } });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "INVITATION_REVOKE",
      entity: "invitations",
      entityId: id,
      details: JSON.stringify({ email: invitation.email }),
      ipAddress: req.ip,
    });

    return res.json({ message: "Invitation révoquée" });
  } catch (error) {
    console.error("[workspaces] invitation revoke error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/workspaces/:ws/client-spaces — Flux A : le cabinet crée l'espace
// de son client (P du cabinet uniquement)
// ---------------------------------------------------------------------------
// Crée en UNE transaction : l'espace ENTREPRISE de la société cliente, sa
// fiche société, sa config paie (copiée du cabinet) et la délégation ACTIVE
// cabinet → espace. Le client est ensuite invité à rejoindre SON espace via
// une invitation classique (POST /:targetWs/invitations — le P du cabinet a
// un rôle délégué P sur l'espace créé).
// ---------------------------------------------------------------------------
router.post("/:ws/client-spaces", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    const s = req.body ?? {};

    if (!s.raisonSociale) {
      return res.status(400).json({ error: "raisonSociale requise" });
    }

    const cabinet = await prisma.workspaces.findUnique({ where: { id: ws } });
    if (!cabinet) {
      return res.status(404).json({ error: "Espace cabinet introuvable" });
    }
    if (cabinet.type !== "CABINET") {
      return res.status(400).json({ error: "Seul un espace Cabinet peut créer des espaces clients" });
    }
    if (cabinet.archivedAt) {
      return res.status(400).json({ error: "Ce cabinet est archivé" });
    }

    const configCabinet = await prisma.payrollConfig.findUnique({
      where: { workspaceId: ws },
    });

    const { workspace, societe } = await provisionWorkspace({
      name: s.raisonSociale,
      type: "ENTREPRISE",
      societe: {
        raisonSociale: s.raisonSociale,
        matriculeFiscal: s.matriculeFiscal ?? null,
        matriculeCnss: s.matriculeCnss ?? null,
        secteur: s.secteur,
        adresse: s.adresse ?? null,
        ville: s.ville ?? null,
        gouvernorat: s.gouvernorat ?? null,
        codePostal: s.codePostal ?? null,
        contactNom: s.contactNom ?? null,
        contactTelephone: s.contactTelephone ?? null,
        contactEmail: s.contactEmail ?? null,
      },
      configSourceId: configCabinet?.id ?? null,
      delegationFrom: { cabinetWorkspaceId: ws, createdByUserId: req.user!.userId },
    });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "CLIENT_SPACE_CREATE",
      entity: "workspaces",
      entityId: workspace.id,
      details: JSON.stringify({ raisonSociale: s.raisonSociale, espaceCree: workspace.id }),
      ipAddress: req.ip,
    });
    await auditLog({
      workspaceId: workspace.id,
      userId: req.user!.userId,
      action: "SPACE_CREATED_BY_CABINET",
      entity: "workspaces",
      entityId: workspace.id,
      details: JSON.stringify({ cabinet: cabinet.name, cabinetId: ws }),
      ipAddress: req.ip,
    });

    return res.status(201).json({
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      societe: societe ? { id: societe.id, raisonSociale: societe.raisonSociale } : null,
      message: "Espace client créé — le dossier est accessible dans la liste des clients",
    });
  } catch (error) {
    console.error("[workspaces] client-space create error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/workspaces/:ws/delegations — Dossiers du cabinet (P)
// ---------------------------------------------------------------------------
router.get("/:ws/delegations", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;

    const rows = await prisma.delegated_access.findMany({
      where: { cabinetWorkspaceId: ws },
      include: {
        target_workspace: {
          include: { client_companies: { select: { id: true, raisonSociale: true, statut: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const dossiers = await Promise.all(
      rows.map(async (d) => {
        const employeesCount = await prisma.employees.count({
          where: { workspaceId: d.targetWorkspaceId, isActive: true },
        });
        const dernierePeriode = await prisma.payrollPeriod.findFirst({
          where: { workspaceId: d.targetWorkspaceId },
          orderBy: [{ annee: "desc" }, { mois: "desc" }],
          select: { mois: true, annee: true, statut: true },
        });
        return {
          id: d.id,
          statut: d.statut,
          createdAt: d.createdAt,
          revokedAt: d.revokedAt,
          workspace: {
            id: d.target_workspace.id,
            name: d.target_workspace.name,
            archivedAt: d.target_workspace.archivedAt,
            societe: d.target_workspace.client_companies[0] ?? null,
            employeesCount,
            dernierePeriode,
          },
        };
      })
    );

    return res.json(dossiers);
  } catch (error) {
    console.error("[workspaces] delegations list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/workspaces/:ws/delegations/link — Le cabinet accepte un code de
// liaison généré par une entreprise (P du cabinet)
// ---------------------------------------------------------------------------
router.post("/:ws/delegations/link", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;
    const { code } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "code requis" });
    }
    const normalized = code.trim().toUpperCase();

    const pending = await prisma.delegated_access.findFirst({
      where: { code: normalized, statut: "PENDING" },
    });
    if (!pending) {
      return res.status(404).json({ error: "Code de liaison inconnu" });
    }
    if (pending.expiresAt && pending.expiresAt < new Date()) {
      return res.status(410).json({ error: "Code de liaison expiré — demandez-en un nouveau à l'entreprise" });
    }
    if (pending.targetWorkspaceId === ws) {
      return res.status(400).json({ error: "Un cabinet ne peut pas se lier à lui-même" });
    }

    const target = await prisma.workspaces.findUnique({
      where: { id: pending.targetWorkspaceId },
    });
    if (!target || target.archivedAt) {
      return res.status(410).json({ error: "L'espace cible n'est plus disponible" });
    }

    // Contrainte unique (cabinet, cible) : une ligne REVOKED précédente est
    // réactivée plutôt que d'en créer une seconde.
    const existing = await prisma.delegated_access.findFirst({
      where: { cabinetWorkspaceId: ws, targetWorkspaceId: pending.targetWorkspaceId },
    });

    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.delegated_access.update({
          where: { id: existing.id },
          data: { statut: "ACTIVE", revokedAt: null, code: null, expiresAt: null },
        });
        await tx.delegated_access.delete({ where: { id: pending.id } });
      } else {
        await tx.delegated_access.update({
          where: { id: pending.id },
          data: { cabinetWorkspaceId: ws, statut: "ACTIVE", code: null, expiresAt: null },
        });
      }
    });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "DELEGATION_LINK",
      entity: "delegated_access",
      entityId: pending.targetWorkspaceId,
      details: JSON.stringify({ cible: target.name }),
      ipAddress: req.ip,
    });
    await auditLog({
      workspaceId: pending.targetWorkspaceId,
      userId: req.user!.userId,
      action: "DELEGATION_ACCEPTED",
      entity: "delegated_access",
      entityId: ws,
      details: JSON.stringify({ cabinet: ws }),
      ipAddress: req.ip,
    });

    return res.json({
      message: `Dossier « ${target.name} » relié au cabinet`,
      target: { id: target.id, name: target.name },
    });
  } catch (error) {
    console.error("[workspaces] delegation link error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/workspaces/:ws/delegations/:id — Révoquer un accès délégué (P)
// La révocation est IMMÉDIATE (résolution relue à chaque requête côté RBAC).
// La ligne est conservée (statut REVOKED) — une nouvelle liaison peut la reviver.
// ---------------------------------------------------------------------------
router.delete("/:ws/delegations/:id", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;

    const d = await prisma.delegated_access.findFirst({
      where: { id, cabinetWorkspaceId: ws },
    });
    if (!d) {
      return res.status(404).json({ error: "Accès délégué introuvable" });
    }
    if (d.statut !== "ACTIVE") {
      return res.status(400).json({ error: "Cet accès n'est pas actif" });
    }

    await prisma.delegated_access.update({
      where: { id },
      data: { statut: "REVOKED", revokedAt: new Date() },
    });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "DELEGATION_REVOKE",
      entity: "delegated_access",
      entityId: id,
      details: JSON.stringify({ cible: d.targetWorkspaceId }),
      ipAddress: req.ip,
    });
    await auditLog({
      workspaceId: d.targetWorkspaceId,
      userId: req.user!.userId,
      action: "DELEGATION_REVOKED",
      entity: "delegated_access",
      entityId: id,
      details: JSON.stringify({ par: "cabinet", cabinetId: ws }),
      ipAddress: req.ip,
    });

    return res.json({ message: "Accès délégué révoqué — effectif immédiatement" });
  } catch (error) {
    console.error("[workspaces] delegation revoke error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/workspaces/:ws/liaison-codes — L'entreprise génère un code de
// liaison pour son cabinet (P de l'espace Entreprise)
// ---------------------------------------------------------------------------
router.post("/:ws/liaison-codes", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;

    const espace = await prisma.workspaces.findUnique({ where: { id: ws } });
    if (!espace) {
      return res.status(404).json({ error: "Espace introuvable" });
    }
    if (espace.type !== "ENTREPRISE") {
      return res.status(400).json({ error: "Seul un espace Entreprise peut générer un code de liaison — les cabinets reçoivent des codes, ils n'en émettent pas" });
    }
    if (espace.archivedAt) {
      return res.status(400).json({ error: "Cet espace est archivé" });
    }

    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + LIAISON_TTL_JOURS * 24 * 60 * 60 * 1000);

    const row = await prisma.delegated_access.create({
      data: {
        targetWorkspaceId: ws,
        statut: "PENDING",
        code,
        expiresAt,
        createdByUserId: req.user!.userId,
      },
    });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "LIAISON_CODE_CREATE",
      entity: "delegated_access",
      entityId: row.id,
      details: JSON.stringify({ expiresAt: expiresAt.toISOString() }),
      ipAddress: req.ip,
    });

    return res.status(201).json({ id: row.id, code, expiresAt });
  } catch (error) {
    console.error("[workspaces] liaison-code create error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/workspaces/:ws/liaison-codes — Codes en attente (entreprise, P)
// ---------------------------------------------------------------------------
router.get("/:ws/liaison-codes", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws } = req.params;

    const rows = await prisma.delegated_access.findMany({
      where: { targetWorkspaceId: ws, statut: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    return res.json(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        expire: r.expiresAt ? r.expiresAt < now : false,
      }))
    );
  } catch (error) {
    console.error("[workspaces] liaison-codes list error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/workspaces/:ws/liaison-codes/:id — Annuler un code (entreprise, P)
// ---------------------------------------------------------------------------
router.delete("/:ws/liaison-codes/:id", requireAuth, requireWorkspaceOwner(), async (req: Request, res: Response) => {
  try {
    const { ws, id } = req.params;

    const row = await prisma.delegated_access.findFirst({
      where: { id, targetWorkspaceId: ws, statut: "PENDING" },
    });
    if (!row) {
      return res.status(404).json({ error: "Code de liaison introuvable ou déjà utilisé" });
    }

    await prisma.delegated_access.delete({ where: { id } });

    await auditLog({
      workspaceId: ws,
      userId: req.user!.userId,
      action: "LIAISON_CODE_CANCEL",
      entity: "delegated_access",
      entityId: id,
      details: JSON.stringify({}),
      ipAddress: req.ip,
    });

    return res.json({ message: "Code de liaison annulé" });
  } catch (error) {
    console.error("[workspaces] liaison-code cancel error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
