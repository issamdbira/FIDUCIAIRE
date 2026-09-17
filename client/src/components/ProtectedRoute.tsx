// =============================================================================
// Le Fiduciaire — Composant de route protégée
// =============================================================================

import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AucunWorkspace from "@/pages/AucunWorkspace";
import { getWorkspaceId } from "@/lib/workspace";
import { roleInWorkspace } from "@/lib/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Restrict to specific roles (optional). If omitted, any authenticated user is allowed. */
  roles?: string[];
}

/**
 * ProtectedRoute — Protège une route en vérifiant l'authentification (cookie
 * de session) + le rôle DANS LE WORKSPACE ACTIF.
 *
 * - Si l'utilisateur n'est pas connecté → redirige vers /login
 * - Si l'utilisateur est connecté mais n'a pas le rôle requis → message d'erreur
 * - Sinon → affiche les enfants
 *
 * P1-5/P1-4 (réévaluation réelle) : la vérification utilisait user.role —
 * le rôle GLOBAL du compte (JWT), différent du rôle dans l'espace actif
 * (ex. propriétaire d'un espace Entreprise souvent « GESTIONNAIRE » global).
 * Conséquence : « Accès insuffisant » immérités et dead-ends. On raisonne
 * désormais sur le rôle workspace, miroir exact du backend (workspace_members
 * résolu en base à chaque requête par requireWorkspaceRole).
 */
export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();

  // Vérification en cours (premier rendu après refresh)
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-r-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Non authentifié → rediriger vers login
  if (!isAuthenticated) {
    // Utiliser navigate au prochain tick pour éviter un rendu pendant la redirection
    // (wouter ne supporte pas <Redirect>, on utilise navigate impérativement)
    navigate("/login");
    return null;
  }

  // Rôle insuffisant — évalué DANS LE WORKSPACE ACTIF (P1-5)
  if (roles && roles.length > 0 && user) {
    const workspaceId = getWorkspaceId(user);
    // Rôle workspace ; repli sur le rôle global pour les comptes sans
    // workspaces[] (l'écran AucunWorkspace s'affiche de toute façon après)
    const roleActif = roleInWorkspace(user, workspaceId) ?? user.role;
    if (!roles.includes(roleActif)) {
      return (
        <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 mx-auto mb-4">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Accès insuffisant</h2>
            <p className="text-sm text-muted-foreground">
              Votre rôle dans cet espace ({roleActif}) ne vous permet pas d'accéder à cette page.
              Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.
            </p>
          </div>
        </div>
      );
    }
  }

  // Authentifié mais membre d'aucun workspace (comptes historiques orphelins)
  // → écran d'attente dédié plutôt qu'un contenu vide
  if (user && (!user.workspaces || user.workspaces.length === 0)) {
    return <AucunWorkspace />;
  }

  // Authentifié et rôle OK → afficher le contenu
  return <>{children}</>;
}
