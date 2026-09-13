/**
 * Routes d'authentification — /api/auth/*
 *
 * POST /api/auth/register   — inscription (statut EN_ATTENTE, validation par propriétaire)
 * POST /api/auth/login      — connexion (retourne JWT)
 * POST /api/auth/logout     — déconnexion (supprime session DB)
 * GET  /api/auth/me         — utilisateur courant
 * GET  /api/auth/pending    — liste utilisateurs en attente (PROPRIETAIRE uniquement)
 * POST /api/auth/validate   — valider/refuser un utilisateur (PROPRIETAIRE uniquement)
 */
import { Router, type Request, type Response } from "express";
import prisma from "../lib/prisma";
import { hashPassword, verifyPassword, signToken, verifyToken, type JwtPayload } from "../lib/auth";

const authRouter = Router();

// ─── Middleware : extraire l'utilisateur du header Authorization ───

function extractUser(req: Request): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

// ─── POST /register ───

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "email, password et fullName sont requis" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Cet email est déjà utilisé" });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, role: "GESTIONNAIRE", statut: "EN_ATTENTE" },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      statut: user.statut,
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /login ───

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email et password sont requis" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    if (user.statut !== "VALIDE") {
      return res.status(403).json({ error: `Compte ${user.statut.toLowerCase()} — contactez un propriétaire` });
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
    const token = signToken(payload);

    // Créer une session en DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    await prisma.session.create({ data: { userId: user.id, token, expiresAt } });

    return res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, statut: user.statut },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /logout ───

authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const payload = extractUser(req);
    if (!payload) return res.status(401).json({ error: "Non authentifié" });

    const auth = req.headers.authorization!;
    const token = auth.slice(7);
    await prisma.session.deleteMany({ where: { token } });

    return res.json({ message: "Déconnecté" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /me ───

authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const payload = extractUser(req);
    if (!payload) return res.status(401).json({ error: "Non authentifié" });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, fullName: true, role: true, statut: true, workspaceMembers: { include: { workspace: true } } },
    });
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    return res.json(user);
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /pending (PROPRIETAIRE uniquement) ───

authRouter.get("/pending", async (req: Request, res: Response) => {
  try {
    const payload = extractUser(req);
    if (!payload || payload.role !== "PROPRIETAIRE") {
      return res.status(403).json({ error: "Accès réservé aux propriétaires" });
    }

    const pending = await prisma.user.findMany({
      where: { statut: "EN_ATTENTE" },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    return res.json(pending);
  } catch (err) {
    console.error("pending error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── POST /validate (PROPRIETAIRE uniquement) ───

authRouter.post("/validate", async (req: Request, res: Response) => {
  try {
    const payload = extractUser(req);
    if (!payload || payload.role !== "PROPRIETAIRE") {
      return res.status(403).json({ error: "Accès réservé aux propriétaires" });
    }

    const { userId, action } = req.body as { userId: string; action: "VALIDE" | "REFUSE" };
    if (!userId || !["VALIDE", "REFUSE"].includes(action)) {
      return res.status(400).json({ error: "userId et action (VALIDE|REFUSE) sont requis" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { statut: action },
      select: { id: true, email: true, fullName: true, role: true, statut: true },
    });

    return res.json(user);
  } catch (err) {
    console.error("validate error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default authRouter;
