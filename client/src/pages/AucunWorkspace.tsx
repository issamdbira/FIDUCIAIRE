import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, MailQuestion } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Écran « Aucun workspace » — affiché quand un utilisateur authentifié n'est
 * membre d'aucun cabinet (comptes historiques validés sans membership, avant
 * le système d'invitations). Aucune donnée métier n'est accessible tant que
 * cette situation n'est pas résolue par un propriétaire.
 */
export default function AucunWorkspace() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4 py-10">
      <Card className="max-w-md w-full p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-card text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 mx-auto mb-5">
          <MailQuestion className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-primary mb-3" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Aucun cabinet ne vous est encore attribué
        </h1>
        <p className="text-sm text-muted-foreground mb-2">
          Bonjour {user?.fullName || user?.email}. Votre compte est actif, mais vous n'êtes
          membre d'aucun espace de travail pour le moment.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Demandez au propriétaire de votre cabinet de vous envoyer une invitation
          (il la génère depuis <span className="font-medium">Gestion des membres</span>),
          puis reconnectez-vous une fois le lien accepté.
        </p>
        <Button variant="outline" className="gap-2 w-full" onClick={() => logout()}>
          <LogOut className="w-4 h-4" /> Se déconnecter
        </Button>
      </Card>
    </div>
  );
}
