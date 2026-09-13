// =============================================================================
// Le Fiduciaire — Auth Routes
// register | login | me | logout | pending | validate
// =============================================================================

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { signToken, verifyToken } from "../lib/jwt.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/auth/register — Inscription ouverte
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /api/auth/login — Connexion
// ---------------------------------------------------------------------------
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email et password requis" });
    }

    const user = await prisma.users.findUnique({ where: { email } });
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
      workspaces: user.workspace_members.map((wm) => ({
        id: wm.workspaces.id,
        name: wm.workspaces.name,
        role: wm.role,
      })),
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

export default router;
