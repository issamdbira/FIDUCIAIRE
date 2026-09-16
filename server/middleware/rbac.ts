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

/** Voie d'accès à un workspace (Phase 10 — modèle espaces) */
export type AccessVia = "DIRECT" | "DELEGATED";

export interface WorkspaceAccess {
  role: WorkspaceRole;
  via: AccessVia;
  /** Uniquement en accès DELEGATED : l'espace cabinet à l'origine de la délégation */
  cabinetWorkspaceId?: string;
}

declare global {
  namespace Express {
    interface Request {
      /** Injecté par requireWorkspaceRole — accès frais, relu en base */
      membership?: { userId: string; workspaceId: string; role: WorkspaceRole; via?: AccessVia; cabinetWorkspaceId?: string };
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
 * Résout l'accès EFFECTIF d'un utilisateur à un workspace (Phase 10 — modèle espaces) :
 *
 *   1. Membership DIRECT dans le workspace → rôle = workspace_members.role
 *   2. Sinon, ACCÈS DÉLÉGUÉ : une liaison delegated_access ACTIVE dont le cabinet
 *      compte cet utilisateur parmi ses membres → rôle effectif = rôle dans le
 *      cabinet (le cabinet « bascule » dans l'espace de son client)
 *   3. Sinon → null (aucun accès)
 *
 * Précédence : membership direct > délégation. La révocation d'une liaison est
 * immédiate — la résolution est relue en base à CHAQUE requête.
 */
export async function resolveWorkspaceAccess(userId: string, workspaceId: string): Promise<WorkspaceAccess | null> {
  // 1. Membership direct
  const m = await prisma.workspace_members.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (m) {
    return { role: m.role as WorkspaceRole, via: "DIRECT" };
  }

  // 2. Accès délégué via un cabinet dont l'utilisateur est membre
  const delegations = await prisma.delegated_access.findMany({
    where: { targetWorkspaceId: workspaceId, statut: "ACTIVE" },
    select: { cabinetWorkspaceId: true },
  });
  for (const d of delegations) {
    if (!d.cabinetWorkspaceId) continue;
    const cm = await prisma.workspace_members.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: d.cabinetWorkspaceId } },
    });
    if (cm) {
      return { role: cm.role as WorkspaceRole, via: "DELEGATED", cabinetWorkspaceId: d.cabinetWorkspaceId };
    }
  }

  // 3. Aucun accès
  return null;
}

/** Version booléenne — utilisée par les helpers locaux des routes (défense en profondeur). */
export async function hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
  return (await resolveWorkspaceAccess(userId, workspaceId)) !== null;
}

/**
 * Lit le rôle EFFECTIF (direct ou délégué) en base pour (userId, workspaceId).
 * Retourne null si l'utilisateur n'a aucun accès à ce workspace —
 * y compris pour un PROPRIETAIRE global : le rôle est PAR WORKSPACE
 * (décision produit), il faut être membre ou délégué pour agir.
 */
export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const access = await resolveWorkspaceAccess(userId, workspaceId);
  return access?.role ?? null;
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
      const access = await resolveWorkspaceAccess(req.user.userId, workspaceId);
      if (!access || !roles.includes(access.role)) {
        return res.status(403).json({ error: "Accès refusé — rôle insuffisant pour ce workspace" });
      }
      req.membership = {
        userId: req.user.userId,
        workspaceId,
        role: access.role,
        via: access.via,
        cabinetWorkspaceId: access.cabinetWorkspaceId,
      };
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
