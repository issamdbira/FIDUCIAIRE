// =============================================================================
// Le Fiduciaire — Messages du formulaire de contact (Lot 4 — consultation P)
// =============================================================================
// Réservé au PROPRIETAIRE (rôle global) : lecture des messages envoyés par
// la page publique /contact (persistés depuis le Lot 4), marquage lu/non lu,
// suppression avec confirmation. Les messages sont publics par nature —
// l'avertissement « aucune donnée de paie confidentielle » est rappelé en tête.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import BackToTools from "@/components/BackToTools";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  Mail,
  MailOpen,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface MessageContact {
  id: string;
  nom: string;
  email: string;
  objet: string;
  categorie: string;
  message: string;
  ip: string | null;
  lu: boolean;
  createdAt: string;
}

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesContact() {
  const [messages, setMessages] = useState<MessageContact[]>([]);
  const [nonLus, setNonLus] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtreNonLus, setFiltreNonLus] = useState(false);
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());
  const [aSupprimer, setASupprimer] = useState<MessageContact | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const charger = useCallback(async (nonLusSeuls: boolean) => {
    setChargement(true);
    setErreur(null);
    try {
      const r = await api.get<{ messages: MessageContact[]; nonLus: number }>(
        `/contact${nonLusSeuls ? "?nonLus=1" : ""}`
      );
      setMessages(r.messages);
      setNonLus(r.nonLus);
    } catch (err) {
      setErreur((err as ApiError)?.message || "Chargement impossible");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger(filtreNonLus);
  }, [charger, filtreNonLus]);

  const basculerOuvert = (id: string) => {
    setOuverts((prev) => {
      const copie = new Set(prev);
      if (copie.has(id)) {
        copie.delete(id);
      } else {
        copie.add(id);
      }
      return copie;
    });
  };

  const marquerLu = async (message: MessageContact, lu: boolean) => {
    // Mise à jour optimiste — annulée si le serveur refuse
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, lu } : m)));
    setNonLus((n) => Math.max(0, n + (lu ? -1 : 1)));
    try {
      await api.patch(`/contact/${message.id}/lu`, { lu });
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, lu: !lu } : m)));
      setNonLus((n) => Math.max(0, n + (lu ? 1 : -1)));
      toast.error((err as ApiError)?.message || "Mise à jour impossible");
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setSuppressionEnCours(true);
    try {
      await api.delete(`/contact/${aSupprimer.id}`);
      setMessages((prev) => prev.filter((m) => m.id !== aSupprimer.id));
      if (aSupprimer.lu === false) setNonLus((n) => Math.max(0, n - 1));
      toast.success("Message supprimé");
      setASupprimer(null);
    } catch (err) {
      toast.error((err as ApiError)?.message || "Suppression impossible");
    } finally {
      setSuppressionEnCours(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <BackToTools />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1
            className="text-2xl font-bold text-foreground mb-1"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Messages de contact
          </h1>
          <p className="text-muted-foreground text-sm">
            Messages envoyés depuis la page publique Contact.
            {nonLus > 0 ? (
              <Badge className="ml-2 bg-primary text-primary-foreground">{nonLus} non lu{nonLus > 1 ? "s" : ""}</Badge>
            ) : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => charger(filtreNonLus)}
          disabled={chargement}
        >
          <RefreshCw className={`h-4 w-4 ${chargement ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Rappel de confidentialité — miroir de l'avertissement de la page Contact */}
      <div className="mb-6 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          Le formulaire public previent ses expéditeurs de ne transmettre aucune donnée
          de paie confidentielle. En cas d'écart, supprimez le message et rappelez la
          procédure à l'expéditeur.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={filtreNonLus ? "outline" : "default"}
          size="sm"
          onClick={() => setFiltreNonLus(false)}
        >
          Tous
        </Button>
        <Button
          variant={filtreNonLus ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltreNonLus(true)}
          className="gap-1.5"
        >
          <Mail className="h-3.5 w-3.5" />
          Non lus {nonLus > 0 && `(${nonLus})`}
        </Button>
      </div>

      {/* Chargement */}
      {chargement && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Erreur */}
      {!chargement && erreur && (
        <Card className="p-8 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-4">{erreur}</p>
          <Button variant="outline" size="sm" onClick={() => charger(filtreNonLus)}>
            Réessayer
          </Button>
        </Card>
      )}

      {/* Vide */}
      {!chargement && !erreur && messages.length === 0 && (
        <Card className="p-12 rounded-lg text-center">
          <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {filtreNonLus
              ? "Aucun message non lu — tout est traité."
              : "Aucun message pour l'instant. Les envois depuis la page Contact apparaîtront ici."}
          </p>
        </Card>
      )}

      {/* Liste */}
      {!chargement && !erreur && messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((m) => {
            const ouvert = ouverts.has(m.id);
            return (
              <Card
                key={m.id}
                className={`rounded-lg p-4 ${m.lu ? "" : "border-primary/50 dark:border-primary/40"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {!m.lu && <Mail className="h-4 w-4 text-primary shrink-0" />}
                      {m.lu && <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="font-medium text-foreground text-sm truncate">
                        {m.objet}
                      </span>
                      <Badge variant="secondary" className="shrink-0">
                        {m.categorie}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.nom} · {m.email} · {formaterDate(m.createdAt)}
                      {m.ip ? ` · IP ${m.ip}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={m.lu ? "Marquer non lu" : "Marquer lu"}
                      onClick={() => marquerLu(m, !m.lu)}
                    >
                      <Check className={`h-4 w-4 ${m.lu ? "text-muted-foreground" : "text-primary"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Supprimer"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setASupprimer(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={ouvert ? "Replier" : "Déplier"}
                      onClick={() => basculerOuvert(m.id)}
                    >
                      {ouvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {ouvert && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {m.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Référence expéditeur : {m.createdAt.slice(0, 10)}-{m.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
          {messages.length === 200 && (
            <p className="text-xs text-muted-foreground text-center">
              200 messages les plus récents affichés — affinez avec le filtre « non lus ».
            </p>
          )}
        </div>
      )}

      {/* Confirmation de suppression */}
      <AlertDialog open={!!aSupprimer} onOpenChange={(open) => !open && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {aSupprimer?.objet} » de {aSupprimer?.nom} sera définitivement supprimé.
              Cette action est irréversible (tracée dans l'audit).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionEnCours}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // garder la boîte ouverte pendant l'appel
                supprimer();
              }}
              disabled={suppressionEnCours}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {suppressionEnCours ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
