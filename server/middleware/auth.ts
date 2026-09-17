// =============================================================================
// Le Fiduciaire — Auth Middleware
// =============================================================================

import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt.js";
import prisma from "../lib/prisma.js";
import { SESSION_COOKIE } from "../lib/session-cookie.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Require a valid session.
 *\n * Extraction du jeton (Lot 1 — sécurité) :
 *   1. cookie HttpOnly `fiduciaire_session` (navigateur — aucune exposition JS) ;
 *   2. en-tête `Authorization: Bearer` en repli (clients programmatiques, tests).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? bearerToken;

  if (!token) {
    return res.status(401).json({ error: "Token manquant ou invalide" });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Token expiré ou invalide" });
  }

  // Check session still exists (not revoked)
  const session = await prisma.session.findUnique({ where: { token: payload.jti } });
  if (!session) {
    return res.status(401).json({ error: "Session révoquée" });
  }

  // Check user is still active
  const user = await prisma.users.findUnique({ where: { id: payload.userId } });
  if (!user || user.statut !== "VALIDE") {
    return res.status(403).json({ error: "Compte non validé ou suspendu" });
  }

  req.user = payload;
  next();
}

/** Require the user to have one of the specified roles */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé — rôle insuffisant" });
    }
    next();
  };
}

/** Require the user to be a member of the specified workspace */
export async function requireWorkspaceAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const workspaceId = req.params.workspaceId || req.body.workspaceId;
  if (!workspaceId) {
    return res.status(400).json({ error: "workspaceId requis" });
  }

  // PROPRIETAIRE has global access
  if (req.user.role === "PROPRIETAIRE") {
    return next();
  }

  // Others must be workspace members
  const membership = await prisma.workspace_members.findUnique({
    where: {
      userId_workspaceId: {
        userId: req.user.userId,
        workspaceId,
      },
    },
  });

  if (!membership) {
    return res.status(403).json({ error: "Accès refusé — workspace non attribué" });
  }

  next();
}
