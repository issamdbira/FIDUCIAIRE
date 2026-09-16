// =============================================================================
// Le Fiduciaire — Auth Routes
// register | login | me | logout | pending | validate | setup
// invitation (consultation + acceptation — liens copiables, 7 jours, unique)
// =============================================================================

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { auditLog } from "../lib/audit-log.js";

const router = Router();

// ---------------------------------------------------------------------------
// Phase 10 — Liste des espaces accessibles à un utilisateur
// ---------------------------------------------------------------------------
// Shape (additive — les champs historiques id/name/role sont inchangés) :
//   - type : CABINET | ENTREPRISE (badge du sélecteur, parcours différencié)
//   - viaCabinetId / viaCabinetName : renseignés uniquement pour un accès
//     DÉLÉGUÉ (l'espace Entreprise d'un client du cabinet)
// Précédence : membership direct > délégation. Espaces archivés masqués
// (p.ex. cabinets fusionnés — les données sont conservées en base).
// ---------------------------------------------------------------------------
interface AccessibleWorkspace {
  id: string;
  name: string;
  role: string;
  type: string;
  viaCabinetId: string | null;
  viaCabinetName: string | null;
}

async function buildAccessibleWorkspaces(userId: string): Promise<AccessibleWorkspace[]> {
  const memberships = await prisma.workspace_members.findMany({
    where: { userId },
    include: { workspaces: true },
  });

  const list: AccessibleWorkspace[] = [];
  const directIds = new Set<string>();

  for (const wm of memberships) {
    if (wm.workspaces.archivedAt) continue; // espace fusionné/archivé : masqué
    directIds.add(wm.workspaces.id);
    list.push({
      id: wm.workspaces.id,
      name: wm.workspaces.name,
      role: wm.role,
      type: wm.workspaces.type,
      viaCabinetId: null,
      viaCabinetName: null,
    });
  }

  // Accès délégués : espaces Entreprise des clients des cabinets de l'utilisateur
  const activeCabinetIds = memberships
    .filter((m) => !m.workspaces.archivedAt)
    .map((m) => m.workspaces.id);
  if (activeCabinetIds.length > 0) {
    const delegations = await prisma.delegated_access.findMany({
      where: { statut: "ACTIVE", cabinetWorkspaceId: { in: activeCabinetIds } },
      include: { target_workspace: true, cabinet_workspace: true },
    });
    for (const d of delegations) {
      if (!d.cabinet_workspace || !d.cabinetWorkspaceId) continue;
      if (d.target_workspace.archivedAt) continue;
      if (directIds.has(d.targetWorkspaceId)) continue; // précédence accès direct
      const roleInCabinet = memberships.find(
        (m) => m.workspaces.id === d.cabinetWorkspaceId,
      )?.role;
      if (!roleInCabinet) continue;
      list.push({
        id: d.target_workspace.id,
        name: d.target_workspace.name,
        role: roleInCabinet,
        type: d.target_workspace.type,
        viaCabinetId: d.cabinetWorkspaceId,
        viaCabinetName: d.cabinet_workspace.name,
      });
    }
  }

  return list;
}

// ---------------------------------------------------------------------------
// POST /api/auth/register — Inscription ouverte
// DÉSACTIVÉE (décision produit) : les nouveaux comptes passent par invitation.
// Le code est conservé pour mémoire ; toute inscription publique reçoit 403.
// ---------------------------------------------------------------------------
router.post("/register", async (_req: Request, res: Response) => {
  return res.status(403).json({
    error: "Inscription désactivée — demandez une invitation au propriétaire de votre cabinet",
  });
});

/*
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "email, password et fullName requis" });
    }

    // Vérifier si l'email existe déjà
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Cet email est déjà inscrit" });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur EN_ATTENTE
    const user = await prisma.users.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "GESTIONNAIRE",
        statut: "EN_ATTENTE",
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      statut: user.statut,
      message: "Inscription enregistrée. En attente de validation par un propriétaire.",
    });
  } catch (error) {
    console.error("[auth] register error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});
*/

// ---------------------------------------------------------------------------
// POST /api/auth/login — Connexion
// ---------------------------------------------------------------------------
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email et password requis" });
    }

    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        workspace_members: {
          include: { workspaces: true },
        },
      },
    });
    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    // Refuser si EN_ATTENTE ou SUSPENDU
    if (user.statut === "EN_ATTENTE") {
      return res.status(403).json({ error: "Compte en attente de validation" });
    }
    if (user.statut === "SUSPENDU") {
      return res.status(403).json({ error: "Compte suspendu" });
    }
    if (user.statut === "REFUSE") {
      return res.status(403).json({ error: "Inscription refusée" });
    }

    // Signer le JWT
    const { token, jti, expiresAt } = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Créer la session en base
    await prisma.session.create({
      data: {
        userId: user.id,
        token: jti,
        expiresAt,
      },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        statut: user.statut,
        workspaces: await buildAccessibleWorkspaces(user.id),
      },
    });
  } catch (error) {
    console.error("[auth] login error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — Profil courant
// ---------------------------------------------------------------------------
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user!.userId },
      include: {
        workspace_members: {
          include: { workspaces: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    return res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      statut: user.statut,
      workspaces: await buildAccessibleWorkspaces(user.id),
    });
  } catch (error) {
    console.error("[auth] me error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout — Déconnexion (révocation session)
// ---------------------------------------------------------------------------
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    // Supprimer la session courante
    await prisma.session.deleteMany({
      where: { token: req.user!.jti },
    });

    return res.json({ message: "Déconnecté" });
  } catch (error) {
    console.error("[auth] logout error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/pending — Liste des utilisateurs en attente (PROPRIETAIRE only)
// ---------------------------------------------------------------------------
router.get("/pending", requireAuth, requireRole("PROPRIETAIRE"), async (_req: Request, res: Response) => {
  try {
    const pending = await prisma.users.findMany({
      where: { statut: "EN_ATTENTE" },
      select: { id: true, email: true, fullName: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return res.json(pending);
  } catch (error) {
    console.error("[auth] pending error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/validate — Valider ou refuser un utilisateur (PROPRIETAIRE only)
// ---------------------------------------------------------------------------
router.post("/validate", requireAuth, requireRole("PROPRIETAIRE"), async (req: Request, res: Response) => {
  try {
    const { userId, action, role } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ error: "userId et action (valider|refuser|suspendre) requis" });
    }

    if (!["valider", "refuser", "suspendre"].includes(action)) {
      return res.status(400).json({ error: "action invalide — valider|refuser|suspendre" });
    }

    const target = await prisma.users.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // Ne pas permettre de valider un PROPRIETAIRE par un autre PROPRIETAIRE
    if (target.role === "PROPRIETAIRE" && action === "valider") {
      return res.status(400).json({ error: "Impossible de valider un propriétaire — procédure spéciale requise" });
    }

    const statutMap: Record<string, string> = {
      valider: "VALIDE",
      refuser: "REFUSE",
      suspendre: "SUSPENDU",
    };

    const updateData: Record<string, unknown> = {
      statut: statutMap[action],
      updatedAt: new Date(),
    };

    // Si validation avec changement de rôle
    if (action === "valider" && role && ["GESTIONNAIRE", "LECTEUR"].includes(role)) {
      updateData.role = role;
    }

    const updated = await prisma.users.update({
      where: { id: userId },
      data: updateData,
    });

    return res.json({
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      statut: updated.statut,
    });
  } catch (error) {
    console.error("[auth] validate error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/invitation/:token — Consulter une invitation (public)
// L'invité voit l'email, le workspace et le rôle proposés AVANT de définir
// son mot de passe. Aucune information sensible au-delà de ces champs.
// ---------------------------------------------------------------------------
router.get("/invitation/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const invitation = await prisma.invitations.findUnique({
      where: { tokenHash },
      include: { workspaces: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation introuvable" });
    }
    if (invitation.usedAt) {
      return res.status(410).json({ error: "Cette invitation a déjà été utilisée" });
    }
    if (invitation.expiresAt < new Date()) {
      return res.status(410).json({ error: "Cette invitation a expiré" });
    }

    // Un utilisateur ayant déjà un compte à cet email devra s'authentifier
    const existingUser = await prisma.users.findUnique({ where: { email: invitation.email } });

    return res.json({
      email: invitation.email,
      workspaceName: invitation.workspaces.name,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      compteExistant: !!existingUser,
    });
  } catch (error) {
    console.error("[auth] invitation consult error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/invitation/:token/accept — Accepter une invitation (public)
// Définit le mot de passe, crée le compte VALIDE si nécessaire et — point
// crucial qui manquait historiquement — CRÉE LE MEMBERSHIP au workspace.
// Si un compte existe déjà à cet email, le mot de passe actuel est exigé
// (preuve d'identité) avant de rattacher le workspace.
// ---------------------------------------------------------------------------
router.post("/invitation/:token/accept", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password, fullName, currentPassword } = req.body;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await prisma.invitations.findUnique({
      where: { tokenHash },
      include: { workspaces: { select: { id: true, name: true } } },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation introuvable" });
    }
    if (invitation.usedAt) {
      return res.status(410).json({ error: "Cette invitation a déjà été utilisée" });
    }
    if (invitation.expiresAt < new Date()) {
      return res.status(410).json({ error: "Cette invitation a expiré" });
    }

    const existingUser = await prisma.users.findUnique({ where: { email: invitation.email } });

    let user = existingUser;
    if (existingUser) {
      // Compte existant : seul le mot de passe ACTUEL est exigé (preuve
      // d'identité) — aucun nouveau mot de passe n'est défini ici.
      if (!currentPassword) {
        return res.status(400).json({ error: "Un compte existe déjà pour cet email — saisissez votre mot de passe actuel pour confirmer" });
      }
      const ok = await bcrypt.compare(currentPassword, existingUser.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: "Mot de passe actuel incorrect" });
      }
    } else {
      // Nouveau compte : fullName + mot de passe (8 caractères min.) requis
      if (!fullName) {
        return res.status(400).json({ error: "fullName requis pour créer le compte" });
      }
      if (!password || password.length < 8) {
        return res.status(400).json({ error: "Un mot de passe d'au moins 8 caractères est requis" });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.users.create({
        data: {
          email: invitation.email,
          passwordHash,
          fullName,
          role: invitation.role,
          statut: "VALIDE",
          updatedAt: new Date(),
        },
      });
    }

    // Créer le membership (le gap historique : comptes validés sans workspace)
    const alreadyMember = await prisma.workspace_members.findUnique({
      where: { userId_workspaceId: { userId: user!.id, workspaceId: invitation.workspaceId } },
    });
    if (!alreadyMember) {
      await prisma.workspace_members.create({
        data: {
          userId: user!.id,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      });
    }

    // Marquer l'invitation comme utilisée (usage unique)
    await prisma.invitations.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    await auditLog({
      workspaceId: invitation.workspaceId,
      userId: user!.id,
      action: "INVITATION_ACCEPT",
      entity: "invitations",
      entityId: invitation.id,
      details: JSON.stringify({ email: invitation.email, role: invitation.role, nouveauCompte: !existingUser }),
      ipAddress: req.ip,
    });

    // Session + JWT : l'invité est immédiatement connecté
    const { token: jwt, jti, expiresAt } = signToken({
      userId: user!.id,
      email: user!.email,
      role: user!.role,
    });
    await prisma.session.create({
      data: { userId: user!.id, token: jti, expiresAt },
    });

    return res.json({
      message: "Invitation acceptée — bienvenue",
      token: jwt,
      user: {
        id: user!.id,
        email: user!.email,
        fullName: user!.fullName,
        role: user!.role,
        statut: user!.statut,
        workspaces: await buildAccessibleWorkspaces(user!.id),
      },
    });
  } catch (error) {
    console.error("[auth] invitation accept error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/setup — Initialisation du système (crée le 1er PROPRIETAIRE)
// Uniquement si AUCUN PROPRIETAIRE n'existe encore.
// ---------------------------------------------------------------------------
router.post("/setup", async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, workspaceName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "email, password et fullName requis" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    // Vérifier si un PROPRIETAIRE existe déjà
    // Sécurité (P0) : cette route est STRICTEMENT réservée à l'initialisation
    // du système (bootstrap). Aucune réinitialisation de mot de passe n'est
    // possible ici — l'ancienne branche « reset par email » permettait à
    // quiconque connaissant l'email du propriétaire de prendre le contrôle
    // du compte. La récupération d'accès passera par un flux dédié avec
    // token expiré (chantier futur, nécessite un service email).
    const existingProp = await prisma.users.findFirst({ where: { role: "PROPRIETAIRE" } });
    if (existingProp) {
      return res.status(403).json({
        error: "Le système est déjà initialisé — cette route est réservée à la première installation",
      });
    }

    // Vérifier si l'email est déjà pris
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Cet email est déjà inscrit" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Créer le PROPRIETAIRE
    const proprietaire = await prisma.users.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "PROPRIETAIRE",
        statut: "VALIDE",
        updatedAt: new Date(),
      },
    });

    // Créer le workspace par défaut
    const workspace = await prisma.workspaces.create({
      data: {
        name: workspaceName || "Fiduciaire Principale",
        secteur: "non_agricole",
        tauxAtMp: 0.01,
        updatedAt: new Date(),
      },
    });

    // Assigner le propriétaire au workspace
    await prisma.workspace_members.create({
      data: {
        userId: proprietaire.id,
        workspaceId: workspace.id,
        role: "PROPRIETAIRE",
      },
    });

    // Créer la config paie par défaut pour ce workspace.
    // Les valeurs par défaut du schéma Prisma sont identiques à la config de
    // référence du moteur (client/src/lib/payroll/config.ts CONFIG_PAR_DEFAUT) :
    // CNSS non agricole 9,68 % / 17,07 %, CSS inactive (LF 2026 art. 23),
    // frais pro 10 % plafonné à 2000, déductions 300/100/1000, plafond 4…
    const payrollConfig = await prisma.payrollConfig.create({
      data: { workspaceId: workspace.id },
    });

    // Créer les tranches IRPP par défaut — barème 2026 en 8 tranches,
    // aligné sur CONFIG_PAR_DEFAUT.baremeIRPP et les tests du moteur
    // (client/src/lib/payroll/irpp.test.ts). `ordre` est requis et unique
    // par config (@@unique([payrollConfigId, ordre])) ; la clé étrangère
    // est payrollConfigId, plus workspaceId.
    const tranchesIrpp = [
      { min: 0, max: 5000, taux: 0 },
      { min: 5000, max: 10000, taux: 0.15 },
      { min: 10000, max: 20000, taux: 0.25 },
      { min: 20000, max: 30000, taux: 0.3 },
      { min: 30000, max: 40000, taux: 0.33 },
      { min: 40000, max: 50000, taux: 0.36 },
      { min: 50000, max: 70000, taux: 0.38 },
      { min: 70000, max: null, taux: 0.4 },
    ];
    await prisma.tranches_irpp.createMany({
      data: tranchesIrpp.map((t, i) => ({
        payrollConfigId: payrollConfig.id,
        min: t.min,
        max: t.max,
        taux: t.taux,
        ordre: i + 1,
      })),
    });

    // Générer un token JWT pour le propriétaire
    const token = signToken({
      userId: proprietaire.id,
      email: proprietaire.email,
      role: proprietaire.role,
    });

    return res.status(201).json({
      message: "Système initialisé avec succès",
      user: {
        id: proprietaire.id,
        email: proprietaire.email,
        fullName: proprietaire.fullName,
        role: proprietaire.role,
        statut: proprietaire.statut,
        workspaces: [{
          id: workspace.id,
          name: workspace.name,
          role: "PROPRIETAIRE",
          type: workspace.type,
          viaCabinetId: null,
          viaCabinetName: null,
        }],
      },
      token,
    });
  } catch (error) {
    console.error("[auth] setup error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

export default router;
