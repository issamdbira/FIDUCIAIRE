// =============================================================================
// Le Fiduciaire — Client HTTP centralisé
// =============================================================================

import { syncActiveWorkspaceId } from "@/lib/workspace";

const TOKEN_KEY = "fiduciaire_token";
const BASE_URL = "/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  statut: string;
  workspaces?: { id: string; name: string; role: string }[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ── Token helpers ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage indisponible
  }
}

export function removeToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("fiduciaire_workspace");
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
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
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

  // Stocker le token et les infos utilisateur
  setToken(result.token);
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
