// =============================================================================
// Le Fiduciaire — Gestion des Membres & Invitations (réservé PROPRIETAIRE)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/workspace";
import BackToTools from "@/components/BackToTools";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Icons
import { Users, UserPlus, Copy, Trash2, Crown, ShieldCheck, RefreshCw, Link2, Ban } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Membre {
  userId: string;
  email: string;
  fullName: string;
  statut: string;
  role: string;
  joinedAt: string;
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  statut: "EN_ATTENTE" | "EXPIREE" | "UTILISEE";
}

interface InvitationCreee {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  link: string;
}

const ROLE_LABELS: Record<string, string> = {
  PROPRIETAIRE: "Propriétaire",
  GESTIONNAIRE: "Gestionnaire",
  LECTEUR: "Lecteur",
};

const STATUT_INVITATION: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  EN_ATTENTE: { label: "En attente", variant: "default" },
  EXPIREE: { label: "Expirée", variant: "destructive" },
  UTILISEE: { label: "Utilisée", variant: "secondary" },
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function GestionMembres() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user);

  const [membres, setMembres] = useState<Membre[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [chargement, setChargement] = useState(true);

  // Dialog invitation
  const [invOpen, setInvOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState("GESTIONNAIRE");
  const [invSoumission, setInvSoumission] = useState(false);
  const [lienGenere, setLienGenere] = useState<InvitationCreee | null>(null);

  // Dialog transfert
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferCible, setTransferCible] = useState<Membre | null>(null);
  const [transferConfirmation, setTransferConfirmation] = useState("");
  const [transferSoumission, setTransferSoumission] = useState(false);

  const charger = useCallback(async () => {
    if (!workspaceId) return;
    setChargement(true);
    try {
      const [m, i] = await Promise.all([
        api.get<Membre[]>(`/workspaces/${workspaceId}/members`),
        api.get<InvitationItem[]>(`/workspaces/${workspaceId}/invitations`),
      ]);
      setMembres(m);
      setInvitations(i);
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Erreur de chargement");
    } finally {
      setChargement(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ── Actions membres ──
  const changerRole = async (membre: Membre, role: string) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${membre.userId}`, { role });
      toast.success(`${membre.fullName} est désormais ${ROLE_LABELS[role]}`);
      charger();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Erreur");
    }
  };

  const retirerMembre = async (membre: Membre) => {
    if (!workspaceId) return;
    if (!confirm(`Retirer ${membre.fullName} (${membre.email}) de ce cabinet ?`)) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${membre.userId}`);
      toast.success("Membre retiré");
      charger();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Erreur");
    }
  };

  const transferrer = async () => {
    if (!workspaceId || !transferCible) return;
    if (transferConfirmation !== "TRANSFERER") {
      toast.error("Tapez TRANSFERER en majuscules pour confirmer");
      return;
    }
    setTransferSoumission(true);
    try {
      await api.post(`/workspaces/${workspaceId}/transfer`, { newOwnerId: transferCible.userId });
      toast.success(`Propriété transférée à ${transferCible.fullName}`);
      setTransferOpen(false);
      setTransferConfirmation("");
      charger();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Erreur");
    } finally {
      setTransferSoumission(false);
    }
  };

  // ── Actions invitations ──
  const creerInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    if (!invEmail.trim() || !invEmail.includes("@")) {
      toast.error("Email valide requis");
      return;
    }
    setInvSoumission(true);
    try {
      const inv = await api.post<InvitationCreee>(`/workspaces/${workspaceId}/invitations`, {
        email: invEmail.trim(),
        role: invRole,
      });
      setLienGenere(inv);
      setInvEmail("");
      charger();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Erreur");
    } finally {
      setInvSoumission(false);
    }
  };

  const copierLien = async (lien: string) => {
    try {
      await navigator.clipboard.writeText(lien);
      toast.success("Lien copié — envoyez-le à l'invité");
    } catch {
      toast.error("Copie impossible — sélectionnez le lien manuellement");
    }
  };

  const revoquer = async (invitation: InvitationItem) => {
    if (!workspaceId) return;
    if (!confirm(`Révoquer l'invitation de ${invitation.email} ?`)) return;
    try {
      await api.delete(`/workspaces/${workspaceId}/invitations/${invitation.id}`);
      toast.success("Invitation révoquée");
      charger();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Erreur");
    }
  };

  // ── Rendu ──
  if (!workspaceId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackToTools />
        <p className="text-muted-foreground">Aucun workspace sélectionné.</p>
      </div>
    );
  }

  const membresModifiables = membres.filter((m) => m.role !== "PROPRIETAIRE");

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <BackToTools />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Gestion des membres
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Membres du cabinet, rôles, invitations et transfert de propriété.
          </p>
        </div>
      </div>

      {/* ── Membres ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" /> Membres du cabinet
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-2" onClick={charger}>
            <RefreshCw className="size-4" /> Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {chargement ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Arrivé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membres.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">
                      {m.fullName}
                      {m.userId === user?.id && <span className="text-xs text-muted-foreground"> (vous)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {m.role === "PROPRIETAIRE" ? (
                        <Badge className="gap-1"><Crown className="size-3" /> Propriétaire</Badge>
                      ) : (
                        <Select value={m.role} onValueChange={(v) => changerRole(m, v)}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GESTIONNAIRE">Gestionnaire</SelectItem>
                            <SelectItem value="LECTEUR">Lecteur</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(m.joinedAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.role === "PROPRIETAIRE" ? (
                        <span className="text-xs text-muted-foreground">Transférez la propriété pour retirer</span>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => retirerMembre(m)} title="Retirer du cabinet">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Transfert de propriété ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="size-5 text-primary" /> Propriété du cabinet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Le transfert de propriété vous rétrograde en Gestionnaire et promeut le membre choisi
            en Propriétaire. Cette action est journalisée et irréversible (sauf nouveau transfert inverse).
          </p>
          <div className="flex flex-wrap gap-2">
            {membresModifiables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun autre membre — invitez d'abord un gestionnaire pour pouvoir transférer.
              </p>
            ) : (
              <Select value={transferCible?.userId || ""} onValueChange={(v) => setTransferCible(membresModifiables.find((m) => m.userId === v) ?? null)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choisir le nouveau propriétaire" />
                </SelectTrigger>
                <SelectContent>
                  {membresModifiables.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>{m.fullName} ({m.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="destructive"
              className="gap-2"
              disabled={!transferCible || transferSoumission}
              onClick={() => setTransferOpen(true)}
            >
              <ShieldCheck className="size-4" /> Transférer la propriété
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Invitations ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" /> Invitations
          </CardTitle>
          <Button size="sm" className="gap-2" onClick={() => { setLienGenere(null); setInvOpen(true); }}>
            <UserPlus className="size-4" /> Inviter
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Les liens sont valables 7 jours, à usage unique. Ils ne sont affichés qu'une fois :
            copiez-le et envoyez-le à l'invité par le canal de votre choix.
          </p>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune invitation émise.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead>Expire le</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{ROLE_LABELS[inv.role] ?? inv.role}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(inv.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(inv.expiresAt).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      <Badge variant={STATUT_INVITATION[inv.statut]?.variant ?? "outline"}>
                        {STATUT_INVITATION[inv.statut]?.label ?? inv.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.statut === "EN_ATTENTE" && (
                        <Button variant="ghost" size="icon" onClick={() => revoquer(inv)} title="Révoquer">
                          <Ban className="size-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog : créer une invitation ── */}
      <Dialog open={invOpen} onOpenChange={(open) => { setInvOpen(open); if (!open) setLienGenere(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
            <DialogDescription>
              Le lien généré rattache l'invité à ce cabinet avec le rôle choisi.
            </DialogDescription>
          </DialogHeader>

          {lienGenere ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Invitation créée pour <span className="font-medium text-foreground">{lienGenere.email}</span> —
                copiez ce lien et envoyez-le :
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={lienGenere.link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                <Button variant="outline" size="icon" onClick={() => copierLien(lienGenere.link)} title="Copier">
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Valable jusqu'au {new Date(lienGenere.expiresAt).toLocaleDateString("fr-FR")} · usage unique
              </p>
            </div>
          ) : (
            <form onSubmit={creerInvitation} className="space-y-4">
              <div>
                <Label htmlFor="inv-email">Email de l'invité</Label>
                <Input id="inv-email" type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="prenom.nom@email.tn" required />
              </div>
              <div>
                <Label>Rôle à l'arrivée</Label>
                <Select value={invRole} onValueChange={setInvRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GESTIONNAIRE">Gestionnaire — paie & clients</SelectItem>
                    <SelectItem value="LECTEUR">Lecteur — consultation seule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={invSoumission} className="gap-2">
                  <Link2 className="size-4" /> {invSoumission ? "Génération…" : "Générer le lien"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog : confirmer le transfert ── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transférer la propriété</DialogTitle>
            <DialogDescription>
              Vous allez céder la propriété de ce cabinet à{" "}
              <span className="font-medium text-foreground">{transferCible?.fullName}</span>.
              Vous deviendrez Gestionnaire. Cette action est journalisée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="transfer-confirm">Tapez TRANSFERER pour confirmer</Label>
              <Input id="transfer-confirm" value={transferConfirmation} onChange={(e) => setTransferConfirmation(e.target.value)} placeholder="TRANSFERER" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>Annuler</Button>
              <Button variant="destructive" onClick={transferrer} disabled={transferSoumission}>
                {transferSoumission ? "Transfert…" : "Confirmer le transfert"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
