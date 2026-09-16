// =============================================================================
// Le Fiduciaire — Workspaces : gestion des membres & invitations (Phase 7)
// GET    /api/workspaces/:ws/members            — Lister les membres (P)
// PATCH  /api/workspaces/:ws/members/:userId    — Changer un rôle (P)
// DELETE /api/workspaces/:ws/members/:userId    — Retirer un membre (P)
// POST   /api/workspaces/:ws/transfer           — Transférer la propriété (P)
// POST   /api/workspaces/:ws/invitations        — Créer une invitation (P)
// GET    /api/workspaces/:ws/invitations        — Lister les invitations (P)
// DELETE /api/workspaces/:ws/invitations/:id    — Révoquer une invitation (P)
// =============================================================================

import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceOwner } from "../middleware/rbac.js";
import { auditLog } from "../lib/audit-log.js";

const router = Router();

/** Durée de validité d'une invitation */
const INVITATION_TTL_JOURS = 7;

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
      await tx.workspace_members.update({
        where: { userId_workspaceId: { userId: newOwnerId, workspaceId: ws } },
        data: { role: "PROPRIETAIRE" },
      });
      await tx.workspace_members.update({
        where: { userId_workspaceId: { userId: req.user!.userId, workspaceId: ws } },
        data: { role: "GESTIONNAIRE" },
      });
      // Le rôle global de l'utilisateur suit pour la cohérence des vues simples
      await tx.users.update({ where: { id: newOwnerId }, data: { role: "PROPRIETAIRE" } });
      await tx.users.update({ where: { id: req.user!.userId }, data: { role: "GESTIONNAIRE" } });
      return true;
    });

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

export default router;
