import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, KeyRound, Loader2, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";

/** Réponse de GET /api/auth/password-reset/:token */
interface ResetInfo {
  email: string;
  expiresAt: string;
}

/**
 * Page publique de réinitialisation de mot de passe (/reinitialisation?token=…).
 * Le lien est généré par un PROPRIETAIRE (page Membres) et transmis à
 * l'utilisateur par son propre canal. Token à usage unique, TTL 24 h ;
 * la confirmation révoque toutes les sessions du compte.
 */
export default function Reinitialisation() {
  const [, navigate] = useLocation();

  const [info, setInfo] = useState<ResetInfo | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [soumission, setSoumission] = useState(false);
  const [termine, setTermine] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordConf, setPasswordConf] = useState("");

  // Lire le token depuis l'URL puis le valider côté serveur
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setErreur("Lien de réinitialisation invalide — token manquant");
      setChargement(false);
      return;
    }
    api
      .get<ResetInfo>(`/auth/password-reset/${token}`)
      .then((i) => setInfo(i))
      .catch((err) => setErreur(err?.message || "Lien de réinitialisation invalide"))
      .finally(() => setChargement(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmer = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== passwordConf) {
      toast.error("Les deux mots de passe ne correspondent pas");
      return;
    }

    setSoumission(true);
    try {
      await api.post("/auth/password-reset/confirm", { token, newPassword: password });
      setTermine(true);
      toast.success("Mot de passe réinitialisé");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Impossible de réinitialiser le mot de passe");
    } finally {
      setSoumission(false);
    }
  };

  if (chargement) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Lien invalide / expiré / déjà utilisé
  if (erreur) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-10">
        <Card className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-700">
          <CardHeader className="text-center">
            <Lock className="size-10 mx-auto text-muted-foreground mb-2" />
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>{erreur}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => navigate("/mot-de-passe-oublie")}>
              Demander un nouveau lien
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Réinitialisation effectuée
  if (termine) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-10">
        <Card className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-700">
          <CardHeader className="text-center">
            <CheckCircle2 className="size-10 mx-auto text-green-600 mb-2" />
            <CardTitle>Mot de passe réinitialisé</CardTitle>
            <CardDescription>
              Toutes vos sessions ont été révoquées par sécurité. Connectez-vous
              avec votre nouveau mot de passe.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/login")}>Se connecter</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Formulaire de nouveau mot de passe
  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-10">
      <Card className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="size-5 text-primary" />
            <CardTitle className="text-lg">Nouveau mot de passe</CardTitle>
          </div>
          <CardDescription>
            Compte : <strong>{info?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={confirmer} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConf">Confirmer le mot de passe</Label>
              <Input
                id="passwordConf"
                type="password"
                value={passwordConf}
                onChange={(e) => setPasswordConf(e.target.value)}
                placeholder="Répétez le mot de passe"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={soumission}>
              {soumission ? <Loader2 className="size-4 animate-spin" /> : "Réinitialiser le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
