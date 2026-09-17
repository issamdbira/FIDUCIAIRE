import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LifeBuoy, Mail, Users } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Page publique « Mot de passe oublié » (/mot-de-passe-oublie).
 * En V1, la réinitialisation est initiée par le PROPRIETAIRE du cabinet
 * (page Membres → « Réinitialiser le mot de passe ») qui transmet le lien
 * par son propre canal. Cette page guide l'utilisateur sans le bloquer.
 */
export default function MotDePasseOublie() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-10">
      <Card className="max-w-lg w-full rounded-xl border border-slate-200 dark:border-slate-700">
        <CardHeader className="text-center">
          <LifeBuoy className="size-10 mx-auto text-primary mb-2" />
          <CardTitle>Mot de passe oublié ?</CardTitle>
          <CardDescription>
            Votre accès peut être rétabli en quelques minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-muted/40 p-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="size-4 text-primary shrink-0" />
              Contactez le propriétaire de votre cabinet
            </p>
            <p className="text-sm text-muted-foreground">
              Demandez-lui une réinitialisation depuis la page{" "}
              <strong>Membres &amp; invitations</strong> →{" "}
              <strong>Réinitialiser le mot de passe</strong>. Il vous transmettra
              un lien sécurisé valable 24 heures, à usage unique.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Mail className="size-4 text-primary shrink-0" />
              Vous êtes seul sur votre espace ?
            </p>
            <p className="text-sm text-muted-foreground">
              Si vous êtes le propriétaire et que personne d'autre ne peut vous
              réinitialiser, contactez l'administrateur du service Le Fiduciaire
              avec la preuve de votre identité (email du compte).
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/login")}>
              Retour à la connexion
            </Button>
            <Button className="flex-1" onClick={() => navigate("/")}>
              Accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
