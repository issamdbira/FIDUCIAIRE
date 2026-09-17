// =============================================================================
// Le Fiduciaire — Page de connexion
// =============================================================================

import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, AlertCircle, Clock, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { ApiError } from "@/lib/api";
import { getWorkspaceId } from "@/lib/workspace";
import { roleInWorkspace } from "@/lib/permissions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<
    null | "invalid" | "pending" | "suspended" | "refused" | "generic"
  >(null);
  const [errorMessage, setErrorMessage] = useState("");

  const { login } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorType(null);
    setErrorMessage("");

    try {
      const result = await login(email, password);

      // P1-5 (réévaluation réelle) : rediriger selon le TYPE D'ESPACE, pas
      // selon le rôle. Un PROPRIÉTAIRE d'espace ENTREPRISE atterrissait sur
      // le dashboard « Cabinet » (compteurs cabinet à zéro, concepts hors
      // sujet). Le dashboard cabinet n'a de sens que pour le propriétaire
      // d'un espace CABINET.
      const wsId = getWorkspaceId(result.user);
      const activeWs = result.user.workspaces?.find((w) => w.id === wsId);
      const estProprietaireCabinet =
        activeWs?.type === "CABINET" && roleInWorkspace(result.user, wsId) === "PROPRIETAIRE";
      if (estProprietaireCabinet) {
        navigate("/dashboard/cabinet");
      } else {
        navigate("/dashboard/workspace");
      }
    } catch (err) {
      const apiErr = err as ApiError;
      const msg = apiErr.message || "";

      // Classifier l'erreur pour afficher le bon message
      if (apiErr.status === 401) {
        setErrorType("invalid");
        setErrorMessage("Email ou mot de passe incorrect.");
      } else if (apiErr.status === 403) {
        if (msg.includes("attente") || apiErr.code === "PENDING") {
          setErrorType("pending");
          setErrorMessage("Votre compte est en attente de validation par un propriétaire.");
        } else if (msg.includes("suspendu") || apiErr.code === "SUSPENDED") {
          setErrorType("suspended");
          setErrorMessage("Votre compte a été suspendu. Contactez un administrateur.");
        } else if (msg.includes("refus")) {
          setErrorType("refused");
          setErrorMessage("Votre inscription a été refusée.");
        } else {
          setErrorType("generic");
          setErrorMessage(msg);
        }
      } else {
        setErrorType("generic");
        setErrorMessage(msg || "Erreur de connexion. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LogIn className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1
              className="text-xl font-bold text-primary"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Connexion
            </h1>
            <p className="text-xs text-muted-foreground">Le Fiduciaire</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Connectez-vous pour accéder à la gestion de paie de votre cabinet.
        </p>

        {/* Message d'erreur contextualisé */}
        {errorType && (
          <div
            className={`flex items-start gap-3 rounded-md p-3 mb-4 text-sm ${
              errorType === "pending"
                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
                : errorType === "suspended" || errorType === "refused"
                  ? "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200"
                  : "bg-destructive/10 text-destructive"
            }`}
          >
            {errorType === "pending" ? (
              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
            ) : errorType === "suspended" || errorType === "refused" ? (
              <ShieldOff className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorType(null); }}
              placeholder="votre@email.com"
              className="mt-1"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="login-password">Mot de passe</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorType(null); }}
              placeholder="Entrez votre mot de passe"
              className="mt-1"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Se connecter
              </>
            )}
          </Button>

          {/* Lot 1 — récupération de compte */}
          <div className="text-center">
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </form>

        {/* Lien d'inscription futur */}
        <p className="text-xs text-muted-foreground mt-6 text-center">
          Votre société gère sa propre paie, sans cabinet ?{" "}
          <Link href="/creer-espace" className="text-primary hover:underline font-medium">
            Créez votre espace entreprise
          </Link>
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Invité par un cabinet ou un collègue ? Utilisez simplement le lien d'invitation reçu.
        </p>
      </Card>
    </div>
  );
}
