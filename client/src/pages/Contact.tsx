import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import BackToTools from "@/components/BackToTools";

/**
 * Page Contact — Support Technique LE FIDUCIAIRE
 *
 * Formulaire sobre avec avertissement de sécurité obligatoire :
 * aucune donnée de paie confidentielle ne doit transiter par ce canal.
 * Anonymat total : signé au nom de la marque uniquement.
 */

const CATEGORIES = [
  "Question sur un calcul",
  "Signalement de bug",
  "Demande de fonctionnalité",
  "Problème d'export PDF",
  "Question légale / réglementaire",
  "Autre",
];

export default function Contact() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [objet, setObjet] = useState("");
  const [categorie, setCategorie] = useState("");
  const [message, setMessage] = useState("");
  const [envoye, setEnvoye] = useState(false);

  const peutEnvoyer =
    nom.trim() !== "" &&
    email.trim() !== "" &&
    email.includes("@") &&
    objet.trim() !== "" &&
    categorie !== "" &&
    message.trim().length >= 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peutEnvoyer) return;
    // Envoi simulé — en production, brancher un endpoint ou service email
    setEnvoye(true);
  };

  if (envoye) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <BackToTools />
        <Card className="p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-card text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 dark:text-green-400 mb-4" />
          <h2
            className="text-xl font-bold text-foreground mb-2"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Message bien reçu
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Merci pour votre message. Le Support Technique LE FIDUCIAIRE vous
            répondra dans les meilleurs délais à l'adresse indiquée.
          </p>
          <p className="text-xs text-muted-foreground">
            Référence : {new Date().toISOString().slice(0, 10)}-{Math.random().toString(36).slice(2, 8).toUpperCase()}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setEnvoye(false)}>
            Envoyer un autre message
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <BackToTools />
      <h1
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Contact
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Une question, un bug, une suggestion ? Écrivez au Support Technique LE FIDUCIAIRE.
      </p>

      {/* ── Avertissement de sécurité ── */}
      <div className="mb-6 p-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              Confidentialité — Ne transmettez aucune donnée sensible
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Ne transmettez jamais de bulletins de paie réels, de données nominatives de
              salariés ou de fichiers confidentiels par ce formulaire. Les calculs de
              LE FIDUCIAIRE s'exécutent exclusivement en local sur votre poste — aucune
              donnée de paie n'est transmise à nos serveurs.
            </p>
          </div>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Nom / Organisation
              </Label>
              <Input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Votre nom ou raison sociale"
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Adresse e-mail
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.tn"
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Objet
              </Label>
              <Input
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
                placeholder="Résumé de votre demande"
                required
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Catégorie
              </Label>
              <Select value={categorie} onValueChange={setCategorie}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Message
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre demande en détail (minimum 20 caractères)…"
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length < 20
                ? `${20 - message.length} caractères restants`
                : `${message.length} caractères`}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Signé : Support Technique LE FIDUCIAIRE</span>
            </div>
            <Button type="submit" disabled={!peutEnvoyer} className="gap-2">
              <Mail className="h-4 w-4" />
              Envoyer
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
