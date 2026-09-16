// =============================================================================
// Le Fiduciaire — Créer mon espace entreprise (Phase 10, flux B)
// =============================================================================
// Auto-inscription publique d'une société qui gère sa propre paie SANS
// cabinet : compte + espace ENTREPRISE autonome + fiche société + config
// paie (barème 2026). Une fois connecté, l'entreprise peut générer un code
// de liaison pour donner accès à son cabinet comptable (Accès cabinet).
//
// Distinct de /invitation (rejoindre l'espace de quelqu'un d'autre) et de
// l'ancien /auth/register (désactivé — comptes sans espace interdits).
// =============================================================================

import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { api, setToken, type ApiError, type LoginResponse } from "@/lib/api";
import { syncActiveWorkspaceId } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Briefcase, CheckCircle2, ArrowLeft } from "lucide-react";

const SECTEURS = [
  { value: "NON_AGRICOLE", label: "Non agricole" },
  { value: "AGRICOLE", label: "Agricole" },
  { value: "SERVICES", label: "Services" },
  { value: "INDUSTRIEL", label: "Industriel" },
  { value: "COMMERCIAL", label: "Commercial" },
];

export default function CreerEspace() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    companyName: "",
    matriculeFiscal: "",
    matriculeCnss: "",
    secteur: "NON_AGRICOLE",
    ville: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.fullName || !form.email || !form.password || !form.companyName) {
      setError("Tous les champs marqués * sont requis");
      return;
    }
    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);
    try {
      const result = await api.post<LoginResponse>("/auth/create-space", {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        companyName: form.companyName,
        matriculeFiscal: form.matriculeFiscal || undefined,
        matriculeCnss: form.matriculeCnss || undefined,
        secteur: form.secteur,
        ville: form.ville || undefined,
      });

      // Session immédiate (même mécanique que le login)
      setToken(result.token);
      localStorage.setItem("fiduciaire_user", JSON.stringify(result.user));
      syncActiveWorkspaceId(result.user);

      toast.success("Votre espace entreprise est créé — bienvenue !");
      // Rechargement complet : AuthContext relit le token au démarrage
      window.location.href = "/";
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Erreur lors de la création de l'espace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-10">
      <Card className="max-w-lg w-full rounded-xl border border-slate-200 dark:border-slate-700">
        <CardHeader className="text-center pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-4">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle
            className="text-xl font-bold text-primary"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Créer mon espace entreprise
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Votre société gère sa propre paie, sans cabinet ? Créez votre espace autonome :
            salariés, contrats, bulletins, déclarations CNSS — avec le barème tunisien 2026
            préconfiguré.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cs-name">Votre nom complet *</Label>
              <Input
                id="cs-name"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="Prénom Nom"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="cs-email">Email *</Label>
                <Input
                  id="cs-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="vous@societe.tn"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cs-password">Mot de passe *</Label>
                <Input
                  id="cs-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="8 caractères min."
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Votre société
              </p>
              <div className="grid gap-2 mb-3">
                <Label htmlFor="cs-company">Raison sociale *</Label>
                <Input
                  id="cs-company"
                  value={form.companyName}
                  onChange={(e) => setField("companyName", e.target.value)}
                  placeholder="Société X SARL"
                  required
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="grid gap-2">
                  <Label htmlFor="cs-mf">Matricule fiscal</Label>
                  <Input
                    id="cs-mf"
                    value={form.matriculeFiscal}
                    onChange={(e) => setField("matriculeFiscal", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cs-mc">Matricule CNSS</Label>
                  <Input
                    id="cs-mc"
                    value={form.matriculeCnss}
                    onChange={(e) => setField("matriculeCnss", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Secteur</Label>
                  <Select
                    value={form.secteur}
                    onValueChange={(v) => setField("secteur", v)}
                    disabled={loading}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTEURS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cs-ville">Ville</Label>
                  <Input
                    id="cs-ville"
                    value={form.ville}
                    onChange={(e) => setField("ville", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Créer mon espace
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <Briefcase className="size-4 shrink-0 mt-0.5 text-primary/70" />
              <span>
                Vous êtes un <span className="font-medium">cabinet comptable</span> ? Gérez
                plusieurs sociétés : connectez-vous, puis créez les espaces de vos clients
                depuis <span className="font-medium">Gestion des clients</span>.
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Vous avez reçu une invitation ?{" "}
              <Link href="/login" className="text-primary hover:underline">
                <span className="inline-flex items-center gap-1">
                  <ArrowLeft className="size-3" /> Connectez-vous
                </span>
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
