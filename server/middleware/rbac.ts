// =============================================================================
// Le Fiduciaire — Middleware RBAC (rôle PAR WORKSPACE, relu en base)
// =============================================================================
// Source de vérité : table workspace_members.role — PAS le JWT.
// Conséquence voulue : un rétrogradage (ou une promotion) est effectif
// immédiatement, sans attendre l'expiration du token (7 jours).
//
// Matrice officielle (validée par le propriétaire du produit) :
//   - Lecture  (GET)                         → PROPRIETAIRE, GESTIONNAIRE, LECTEUR
//   - Écriture métier (clients, salariés…)   → PROPRIETAIRE, GESTIONNAIRE
//   - Actes engageants (clôture, validation
//     CNSS, archivage, config, membres, audit) → PROPRIETAIRE seul
// =============================================================================

import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

export type WorkspaceRole = "PROPRIETAIRE" | "GESTIONNAIRE" | "LECTEUR";

declare global {
  namespace Express {
    interface Request {
      /** Injecté par requireWorkspaceRole — membership frais, relu en base */
      membership?: { userId: string; workspaceId: string; role: WorkspaceRole };
    }
  }
}

/**
 * Extrait le workspaceId d'une requête, quel que soit l'endroit où la route
 * le transporte : paramètre :workspaceId ou :ws, corps JSON, ou query string.
 */
function extractWorkspaceId(req: Request): string | null {
  const p = req.params as Record<string, string | undefined>;
  const candidates = [
    p?.workspaceId,
    p?.ws,
    (req.body as Record<string, unknown> | undefined)?.workspaceId as string | undefined,
    (req.query as Record<string, unknown>)?.workspaceId as string | undefined,
    (req.query as Record<string, unknown>)?.ws as string | undefined,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

/**
 * Lit le membership ACTUEL en base pour (userId, workspaceId).
 * Retourne null si l'utilisateur n'est pas membre de ce workspace —
 * y compris pour un PROPRIETAIRE global : le rôle est PAR WORKSPACE
 * (décision produit), il faut être membre pour agir.
 */
export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const m = await prisma.workspace_members.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return (m?.role as WorkspaceRole) ?? null;
}

/**
 * Middleware générique : exige la membership au workspace ciblé avec l'un
 * des rôles autorisés. À utiliser APRÈS requireAuth.
 */
export function requireWorkspaceRole(...roles: WorkspaceRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Non authentifié" });
      }
      const workspaceId = extractWorkspaceId(req);
      if (!workspaceId) {
        return res.status(400).json({ error: "workspaceId requis" });
      }
      const role = await getWorkspaceRole(req.user.userId, workspaceId);
      if (!role || !roles.includes(role)) {
        return res.status(403).json({ error: "Accès refusé — rôle insuffisant pour ce workspace" });
      }
      req.membership = { userId: req.user.userId, workspaceId, role };
      next();
    } catch (error) {
      console.error("[rbac] requireWorkspaceRole error:", error);
      return res.status(500).json({ error: "Erreur interne" });
    }
  };
}

/** Lecture : tout membre du workspace (P, G ou L) */
export function requireWorkspaceMember() {
  return requireWorkspaceRole("PROPRIETAIRE", "GESTIONNAIRE", "LECTEUR");
}

/** Écriture métier : P ou G */
export function requireWorkspaceWriter() {
  return requireWorkspaceRole("PROPRIETAIRE", "GESTIONNAIRE");
}

/** Actes engageants : P seul */
export function requireWorkspaceOwner() {
  return requireWorkspaceRole("PROPRIETAIRE");
}

/**
 * Routes transversales SANS workspace dans l'URL (ex: dashboard cabinet) :
 * exige que l'utilisateur soit PROPRIETAIRE d'au moins un workspace.
 */
export async function requireAnyWorkspaceOwner(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Non authentifié" });
    }
    const owned = await prisma.workspace_members.findFirst({
      where: { userId: req.user.userId, role: "PROPRIETAIRE" },
    });
    if (!owned) {
      return res.status(403).json({ error: "Accès refusé — réservé aux propriétaires" });
    }
    next();
  } catch (error) {
    console.error("[rbac] requireAnyWorkspaceOwner error:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
}
