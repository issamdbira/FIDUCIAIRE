import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { api, setToken } from "@/lib/api";
import { syncActiveWorkspaceId } from "@/lib/workspace";
import { toast } from "sonner";

/** Réponse de GET /api/auth/invitation/:token */
interface InvitationInfo {
  email: string;
  workspaceName: string;
  role: string;
  expiresAt: string;
  compteExistant: boolean;
}

/**
 * Page publique d'acceptation d'invitation (/invitation?token=…).
 * L'invité voit le cabinet et le rôle proposés, définit son mot de passe,
 * puis est connecté automatiquement. Si un compte existe déjà à cet email,
 * le mot de passe actuel est exigé (preuve d'identité) avant le rattachement.
 */
export default function Invitation() {
  const [, navigate] = useLocation();

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [soumission, setSoumission] = useState(false);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConf, setPasswordConf] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  // Lire le token depuis l'URL puis consulter l'invitation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setErreur("Lien d'invitation invalide — token manquant");
      setChargement(false);
      return;
    }
    api
      .get<InvitationInfo>(`/auth/invitation/${token}`)
      .then((i) => setInfo(i))
      .catch((err) => setErreur(err?.message || "Invitation introuvable"))
      .finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accepter = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;

    if (!info?.compteExistant && !fullName.trim()) {
      toast.error("Votre nom complet est requis");
      return;
    }
    if (!info?.compteExistant) {
      if (password.length < 8) {
        toast.error("Le mot de passe doit contenir au moins 8 caractères");
        return;
      }
      if (password !== passwordConf) {
        toast.error("Les deux mots de passe ne correspondent pas");
        return;
      }
    } else if (!currentPassword) {
      toast.error("Saisissez votre mot de passe actuel pour confirmer");
      return;
    }

    setSoumission(true);
    try {
      const result = await api.post<{ token: string; user: { id: string; email: string; fullName: string; role: string; statut: string; workspaces: { id: string; name: string; role: string }[] } }>(
        `/auth/invitation/${token}/accept`,
        {
          fullName: fullName.trim() || undefined,
          password,
          currentPassword: currentPassword || undefined,
        }
      );
      setToken(result.token);
      localStorage.setItem("fiduciaire_user", JSON.stringify(result.user));
      syncActiveWorkspaceId(result.user);
      toast.success(`Bienvenue — vous avez rejoint ${info?.workspaceName}`);
      navigate("/dashboard/workspace");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Impossible d'accepter l'invitation");
    } finally {
      setSoumission(false);
    }
  };

  // ── États : chargement / erreur ──
  if (chargement) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (erreur || !info) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-card text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 mx-auto mb-4">
            <Mail className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold mb-2">Invitation indisponible</h1>
          <p className="text-sm text-muted-foreground">{erreur || "Invitation introuvable"}</p>
          <p className="text-xs text-muted-foreground mt-4">
            Le lien a peut-être expiré (validité 7 jours) ou a déjà été utilisé.
            Demandez au propriétaire du cabinet d'en générer un nouveau.
          </p>
        </Card>
      </div>
    );
  }

  const roleLibelle =
    info.role === "GESTIONNAIRE" ? "Gestionnaire (paie & clients)" :
    info.role === "LECTEUR" ? "Lecteur (consultation seule)" :
    info.role === "PROPRIETAIRE" ? "Propriétaire" : info.role;

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-10">
      <Card className="max-w-md w-full p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Invitation à rejoindre un cabinet
            </h1>
            <p className="text-xs text-muted-foreground">LE FIDUCIAIRE</p>
          </div>
        </div>

        {/* Résumé de l'invitation */}
        <div className="space-y-2 mb-6 p-4 rounded-md bg-muted/50 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cabinet</span>
            <span className="font-medium">{info.workspaceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Votre email</span>
            <span className="font-medium">{info.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rôle attribué</span>
            <span className="font-medium">{roleLibelle}</span>
          </div>
        </div>

        <form onSubmit={accepter} className="space-y-4">
          {!info.compteExistant && (
            <div>
              <Label htmlFor="inv-nom">Nom complet</Label>
              <Input
                id="inv-nom"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Prénom et nom"
                className="mt-1"
                required
              />
            </div>
          )}

          {info.compteExistant && (
            <>
              <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3">
                Un compte existe déjà pour <span className="font-medium">{info.email}</span>.
                Saisissez votre mot de passe actuel pour rattacher ce cabinet à votre compte.
              </p>
              <div>
                <Label htmlFor="inv-current">Mot de passe actuel</Label>
                <Input
                  id="inv-current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </>
          )}

          {!info.compteExistant && (
            <>
              <div>
                <Label htmlFor="inv-pwd">Choisir un mot de passe</Label>
                <Input
                  id="inv-pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="inv-pwd2">Confirmer le mot de passe</Label>
                <Input
                  id="inv-pwd2"
                  type="password"
                  value={passwordConf}
                  onChange={(e) => setPasswordConf(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full gap-2" disabled={soumission}>
            {soumission ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : info.compteExistant ? (
              <KeyRound className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {info.compteExistant ? "Confirmer et rejoindre" : "Créer mon compte et rejoindre"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Ce lien est à usage unique et expire le {new Date(info.expiresAt).toLocaleDateString("fr-FR")}.
        </p>
      </Card>
    </div>
  );
}
