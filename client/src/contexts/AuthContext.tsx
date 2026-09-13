// =============================================================================
// Le Fiduciaire — Hook d'authentification
// =============================================================================

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import {
  getToken,
  getStoredUser,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  removeToken,
  type AuthUser,
  type LoginResponse,
  type ApiError,
} from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;      // Vérification initiale en cours
  user: AuthUser | null;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,       // On commence en loading pour vérifier le token existant
    user: null,
    error: null,
  });

  // ── Vérification initiale : token présent → valider via /auth/me
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
      return;
    }

    // Token présent → vérifier côté serveur
    fetchCurrentUser()
      .then((user) => {
        if (user) {
          setState({ isAuthenticated: true, isLoading: false, user, error: null });
        } else {
          // Token invalide ou expiré
          removeToken();
          setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
        }
      })
      .catch(() => {
        removeToken();
        setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
      });
  }, []);

  // ── Login
  const login = useCallback(async (email: string, password: string): Promise<LoginResponse> => {
    setState((s) => ({ ...s, error: null }));
    try {
      const result = await apiLogin(email, password);
      setState({ isAuthenticated: true, isLoading: false, user: result.user, error: null });
      return result;
    } catch (err) {
      const apiErr = err as ApiError;
      setState({ isAuthenticated: false, isLoading: false, user: null, error: apiErr.message });
      throw err;
    }
  }, []);

  // ── Logout
  const logout = useCallback(async () => {
    await apiLogout();
    setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
  }, []);

  // ── Refresh user (depuis /auth/me)
  const refreshUser = useCallback(async () => {
    const user = await fetchCurrentUser();
    if (user) {
      setState((s) => ({ ...s, isAuthenticated: true, user, error: null }));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
