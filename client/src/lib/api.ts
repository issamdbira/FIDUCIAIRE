// =============================================================================
// Le Fiduciaire — Client HTTP centralisé
// =============================================================================

import { syncActiveWorkspaceId, clearActiveWorkspaceId } from "@/lib/workspace";

const BASE_URL = "/api";

// ── Session (Lot 1 — sécurité) ─────────────────────────────────────────
// Le jeton de session vit UNIQUEMENT dans un cookie HttpOnly posé par le
// serveur : il n'est ni lu ni stocké par le JavaScript. Les requêtes
// l'embarquent automatiquement (credentials: "include" + same-origin).
// getStoredUser() reste un simple cache d'affichage du profil (aucun secret).
const LEGACY_TOKEN_KEY = "fiduciaire_token"; // clé d'avant la V1 — à purger

/** Hygiène de migration : supprime l'éventuel jeton localStorage hérité (V0). */
export function cleanupLegacyToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // localStorage indisponible
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

/**
 * Espace accessible (Phase 10 — modèle espaces) :
 * - type : "CABINET" | "ENTREPRISE"
 * - viaCabinetId / viaCabinetName : renseignés uniquement pour un accès
 *   DÉLÉGUÉ (l'espace Entreprise d'un client du cabinet)
 * Les champs historiques id/name/role sont inchangés (additif).
 */
export interface AccessibleWorkspace {
  id: string;
  name: string;
  role: string;
  type?: string;
  viaCabinetId?: string | null;
  viaCabinetName?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  statut: string;
  workspaces?: AccessibleWorkspace[];
}

export interface LoginResponse {
  user: AuthUser;
}

// ── Token helpers (SUPPRIMÉS — Lot 1) ─────────────────────────────────────
// getToken/setToken/removeToken n'existent plus : la session est portée par
// le cookie HttpOnly `fiduciaire_session`. removeToken() est conservé comme
// nettoyage local (cache profil + workspace) pour les flux 401/logout.

function removeToken(): void {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    clearActiveWorkspaceId();
  } catch {
    // localStorage indisponible
  }
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { headers?: Record<string, string> }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  // Session par cookie HttpOnly — jamais d'en-tête Authorization côté navigateur
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → token expiré ou invalide → déconnecter
  if (res.status === 401) {
    removeToken();
    // Rediriger vers /login si on n'y est pas déjà
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw { status: 401, message: "Session expirée. Veuillez vous reconnecter." } as ApiError;
  }

  // 403 → accès interdit (compte en attente, suspendu, ou rôle insuffisant)
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    throw {
      status: 403,
      message: data.error || "Accès interdit",
      code: data.error?.includes("attente") ? "PENDING" : data.error?.includes("suspendu") ? "SUSPENDED" : undefined,
    } as ApiError;
  }

  // Autres erreurs
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      message: data.error || `Erreur ${res.status}`,
    } as ApiError;
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ── Public API ─────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: { headers?: Record<string, string> }) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: { headers?: Record<string, string> }) =>
    request<T>("POST", path, body, options),

  put: <T>(path: string, body?: unknown, options?: { headers?: Record<string, string> }) =>
    request<T>("PUT", path, body, options),

  patch: <T>(path: string, body?: unknown, options?: { headers?: Record<string, string> }) =>
    request<T>("PATCH", path, body, options),

  delete: <T>(path: string, options?: { headers?: Record<string, string> }) =>
    request<T>("DELETE", path, undefined, options),
};

// ── Auth helpers ───────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await api.post<LoginResponse>("/auth/login", { email, password });

  // Le serveur a posé le cookie de session HttpOnly. On ne stocke que le
  // profil (cache d'affichage, aucun secret) et le workspace actif.
  localStorage.setItem("fiduciaire_user", JSON.stringify(result.user));

  // Synchroniser le workspace actif : conserve le choix précédent s'il est
  // toujours valide, sinon pose le premier workspace (le login renvoie
  // désormais workspaces[], même forme que /auth/me)
  syncActiveWorkspaceId(result.user);

  return result;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Même si l'appel échoue, on nettoie localement
  } finally {
    removeToken();
    localStorage.removeItem("fiduciaire_user");
  }
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await api.get<AuthUser>("/auth/me");
    localStorage.setItem("fiduciaire_user", JSON.stringify(user));
    // Garantir un workspace actif valide en localStorage (sessions créées
    // avant l'unification, ID périmé, etc.) — sans écraser un choix valide
    syncActiveWorkspaceId(user);
    return user;
  } catch {
    return null;
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("fiduciaire_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
