// =============================================================================
// Le Fiduciaire — Workspace actif : source de vérité unique
// =============================================================================
// Toute l'application doit résoudre le workspace actif via getWorkspaceId(user).
// Règle de résolution (dans l'ordre) :
//   1. L'ID stocké dans localStorage s'il est toujours accessible à l'utilisateur
//      (c'est le choix explicite fait via le WorkspaceSelector)
//   2. Sinon, le premier workspace de l'utilisateur (comportement historique)
//   3. Sinon null → la page affiche son état « Aucun workspace »
// =============================================================================

import type { AuthUser } from "@/lib/api";

export const WS_KEY = "fiduciaire_workspace";

/** Lire l'ID du workspace actif stocké dans localStorage (valeur brute). */
export function getActiveWorkspaceId(): string | null {
  try {
    return localStorage.getItem(WS_KEY);
  } catch {
    return null;
  }
}

/** Écrire l'ID du workspace actif dans localStorage. */
export function setActiveWorkspaceId(workspaceId: string): void {
  try {
    localStorage.setItem(WS_KEY, workspaceId);
  } catch {
    // localStorage indisponible
  }
}

/** Supprimer le workspace actif (déconnexion). */
export function clearActiveWorkspaceId(): void {
  try {
    localStorage.removeItem(WS_KEY);
  } catch {
    // localStorage indisponible
  }
}

/**
 * Résoudre le workspace actif pour l'utilisateur connecté.
 *
 * - ID stocké encore valide → le respecter (choix du sélecteur)
 * - ID stocké périmé (membership retiré) ou absent → premier workspace
 * - Utilisateur sans aucun workspace → null
 */
export function getWorkspaceId(user?: { workspaces?: { id: string }[] } | null): string | null {
  const stored = getActiveWorkspaceId();
  const workspaces = user?.workspaces;

  // Pas d'info utilisateur fiable → se fier au stockage local tel quel
  if (!workspaces) return stored;

  // Utilisateur sans aucun workspace → rien à afficher
  if (workspaces.length === 0) return null;

  // Choix explicite de l'utilisateur encore valide → le respecter
  if (stored && workspaces.some((ws) => ws.id === stored)) return stored;

  // Sinon → premier workspace (comportement historique du login)
  return workspaces[0].id;
}

/**
 * Synchroniser localStorage avec le workspace résolu — à appeler après
 * /auth/login ou /auth/me. Ne réécrit rien si le choix stocké est valide,
 * ce qui préserve la sélection de l'utilisateur entre les sessions.
 */
export function syncActiveWorkspaceId(user?: AuthUser | null): void {
  const resolved = getWorkspaceId(user);
  if (resolved && resolved !== getActiveWorkspaceId()) {
    setActiveWorkspaceId(resolved);
  }
}
