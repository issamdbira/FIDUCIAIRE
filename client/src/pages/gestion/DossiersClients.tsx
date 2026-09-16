// =============================================================================
// Le Fiduciaire — Dossiers clients & accès délégués (Phase 10 — modèle espaces)
// =============================================================================
// Mode CABINET   : liste des dossiers (espaces Entreprise des clients reliés
//                 par delegated_access) — création d'espace client (flux A),
//                 liaison par code (flux B côté cabinet), entrée dans l'espace,
//                 révocation d'accès.
// Mode ENTREPRISE: panneau « Accès cabinet » — génération/annulation de codes
//                 de liaison à transmettre au cabinet comptable.
//
// Ce composant est ADDITIF : la liste classique des clients (GestionClients)
// reste intégralement fonctionnelle (coexistence pendant la migration).
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api, type ApiError } from "@/lib/api";
import { setActiveWorkspaceId } from "@/lib/workspace";
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
  Briefcase,
  Building2,
  DoorOpen,
  Link2,
  Plus,
  ShieldOff,
  KeyRound,
  Copy,
  XCircle,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface DossierSociete {
  id: string;
  raisonSociale: string;
  statut: "ACTIVE" | "ARCHIVED";
}

interface Dossier {
  id: string;
  statut: "PENDING" | "ACTIVE" | "REVOKED";
  createdAt: string;
  revokedAt?: string | null;
  workspace: {
    id: string;
    name: string;
    archivedAt?: string | null;
    societe: DossierSociete | null;
    employeesCount: number;
    dernierePeriode?: { mois: number; annee: number; statut: string } | null;
  };
}

interface LiaisonCode {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  expire: boolean;
}

interface Props {
  workspaceId: string;
  espaceType?: string;
  peutEcrire: boolean;
  isProprietaire: boolean;
}

const SECTEURS_ESPACE = [
  { value: "NON_AGRICOLE", label: "Non agricole" },
  { value: "AGRICOLE", label: "Agricole" },
  { value: "SERVICES", label: "Services" },
  { value: "INDUSTRIEL", label: "Industriel" },
  { value: "COMMERCIAL", label: "Commercial" },
];

const MOIS_ABBR = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

// ── Composant ───────────────────────────────────────────────────────────────

export default function DossiersClients({ workspaceId, espaceType, peutEcrire, isProprietaire }: Props) {
  // ── Mode cabinet : dossiers ──
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog : création d'espace client (flux A)
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    raisonSociale: "",
    matriculeFiscal: "",
    matriculeCnss: "",
    secteur: "NON_AGRICOLE",
    ville: "",
  });

  // Dialog : liaison par code
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);

  // ── Mode entreprise : codes de liaison ──
  const [codes, setCodes] = useState<LiaisonCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const estCabinet = espaceType !== "ENTREPRISE"; // défaut historique : CABINET

  // ── Fetch dossiers (cabinet) ──
  const fetchDossiers = useCallback(async () => {
    if (!estCabinet || !isProprietaire) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<Dossier[]>(`/workspaces/${workspaceId}/delegations`);
      setDossiers(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des dossiers");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, estCabinet, isProprietaire]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  // ── Fetch codes (entreprise) ──
  const fetchCodes = useCallback(async () => {
    if (estCabinet || !isProprietaire) {
      setCodesLoading(false);
      return;
    }
    setCodesLoading(true);
    try {
      const data = await api.get<LiaisonCode[]>(`/workspaces/${workspaceId}/liaison-codes`);
      setCodes(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des codes");
    } finally {
      setCodesLoading(false);
    }
  }, [workspaceId, estCabinet, isProprietaire]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // ── Actions cabinet ──

  const entrerDansEspace = (wsId: string) => {
    setActiveWorkspaceId(wsId);
    window.location.reload();
  };

  const handleCreateEspace = async () => {
    if (!createForm.raisonSociale.trim()) {
      toast.error("La raison sociale est requise");
      return;
    }
    setCreating(true);
    try {
      await api.post(`/workspaces/${workspaceId}/client-spaces`, createForm);
      toast.success("Espace client créé — le dossier apparaît ci-dessous");
      setCreateOpen(false);
      setCreateForm({ raisonSociale: "", matriculeFiscal: "", matriculeCnss: "", secteur: "NON_AGRICOLE", ville: "" });
      fetchDossiers();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la création de l'espace");
    } finally {
      setCreating(false);
    }
  };

  const handleLink = async () => {
    if (!linkCode.trim()) {
      toast.error("Saisissez le code fourni par l'entreprise");
      return;
    }
    setLinking(true);
    try {
      const res = await api.post<{ message: string }>(`/workspaces/${workspaceId}/delegations/link`, {
        code: linkCode.trim(),
      });
      toast.success(res.message || "Dossier relié");
      setLinkOpen(false);
      setLinkCode("");
      fetchDossiers();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la liaison");
    } finally {
      setLinking(false);
    }
  };

  const handleRevoke = async (dossier: Dossier) => {
    if (!window.confirm(`Révoquer l'accès à l'espace « ${dossier.workspace.name} » ? L'accès sera immédiatement interdit à tous les membres du cabinet.`)) {
      return;
    }
    try {
      await api.delete(`/workspaces/${workspaceId}/delegations/${dossier.id}`);
      toast.success("Accès révoqué — effectif immédiatement");
      fetchDossiers();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la révocation");
    }
  };

  // ── Actions entreprise ──

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      await api.post(`/workspaces/${workspaceId}/liaison-codes`, {});
      toast.success("Code généré — transmettez-le à votre cabinet (valable 7 jours)");
      fetchCodes();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const handleCancelCode = async (id: string) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/liaison-codes/${id}`);
      toast.success("Code annulé");
      fetchCodes();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'annulation");
    }
  };

  const copierCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success("Code copié"),
      () => toast.error("Copie impossible — notez le code manuellement")
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU — MODE ENTREPRISE : panneau « Accès cabinet »
  // ═══════════════════════════════════════════════════════════════════════════
  if (!estCabinet) {
    return (
      <Card className="border border-slate-200 dark:border-slate-700 mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <Briefcase className="size-4" />
            Accès cabinet comptable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pour permettre à votre cabinet de gérer votre paie depuis cet espace, générez un code
            de liaison et transmettez-le lui (téléphone, email…). Il le saisira une seule fois
            dans son espace cabinet. Valable 7 jours, révocable à tout moment.
          </p>
          {isProprietaire && (
            <Button
              onClick={handleGenerateCode}
              disabled={generating}
              className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
            >
              <KeyRound className="size-4" />
              {generating ? "Génération…" : "Générer un code de liaison"}
            </Button>
          )}
          {codesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : codes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun code actif — votre espace reste accessible à vous et à vos membres uniquement.
            </p>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <code className="text-sm font-mono font-bold tracking-widest text-primary">
                      {c.code}
                    </code>
                    <Badge variant={c.expire ? "secondary" : "outline"} className="text-[10px]">
                      {c.expire ? "Expiré" : "En attente du cabinet"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => copierCode(c.code)}>
                      <Copy className="size-3.5" />
                    </Button>
                    {isProprietaire && (
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => handleCancelCode(c.id)}>
                        <XCircle className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU — MODE CABINET : liste des dossiers
  // ═══════════════════════════════════════════════════════════════════════════
  if (!isProprietaire) {
    // Les G/L du cabinet voient les dossiers via le sélecteur d'espace
    // (groupes « Dossiers clients ») — pas de gestion ici (P seul).
    return null;
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-700 mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-primary">
            <Building2 className="size-4" />
            Dossiers clients — espaces dédiés
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-3.5" />
              Relier un espace
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" />
              Nouveau client
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Chaque client dispose de son propre espace autonome. « Nouveau client » crée l'espace
          dédié (avec votre configuration paie) et y rattache le dossier. « Relier un espace »
          utilise un code fourni par une entreprise déjà inscrite.
        </p>

        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : dossiers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucun dossier pour l'instant — créez votre premier espace client ci-dessus.
          </p>
        ) : (
          <div className="space-y-2">
            {dossiers.map((d) => (
              <div
                key={d.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.workspace.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.workspace.employeesCount} salarié{d.workspace.employeesCount > 1 ? "s" : ""}
                      {d.workspace.dernierePeriode
                        ? ` · dernière paie ${MOIS_ABBR[d.workspace.dernierePeriode.mois - 1] ?? ""} ${d.workspace.dernierePeriode.annee}`
                        : " · aucune paie"}
                    </p>
                  </div>
                  {d.statut === "REVOKED" && <Badge variant="secondary" className="text-[10px]">Accès révoqué</Badge>}
                  {d.workspace.societe?.statut === "ARCHIVED" && (
                    <Badge variant="secondary" className="text-[10px]">Société archivée</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.statut === "ACTIVE" && (
                    <Button size="sm" className="gap-1.5" onClick={() => entrerDansEspace(d.workspace.id)}>
                      <DoorOpen className="size-3.5" />
                      Entrer dans l'espace
                    </Button>
                  )}
                  {d.statut === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      title="Révoquer l'accès"
                      onClick={() => handleRevoke(d)}
                    >
                      <ShieldOff className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ── Dialog : création d'espace client (flux A) ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau client — création de son espace</DialogTitle>
            <DialogDescription>
              L'espace dédié de la société est créé avec votre configuration paie, et votre cabinet
              y obtient immédiatement un accès délégué. Invitez ensuite le client à rejoindre son
              espace (Membres &amp; invitations, après être entré dans son espace).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="dc-raison">Raison sociale *</Label>
              <Input
                id="dc-raison"
                value={createForm.raisonSociale}
                onChange={(e) => setCreateForm((f) => ({ ...f, raisonSociale: e.target.value }))}
                placeholder="Société X SARL"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="dc-mf">Matricule fiscal</Label>
                <Input
                  id="dc-mf"
                  value={createForm.matriculeFiscal}
                  onChange={(e) => setCreateForm((f) => ({ ...f, matriculeFiscal: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dc-mc">Matricule CNSS</Label>
                <Input
                  id="dc-mc"
                  value={createForm.matriculeCnss}
                  onChange={(e) => setCreateForm((f) => ({ ...f, matriculeCnss: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Secteur</Label>
                <Select
                  value={createForm.secteur}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, secteur: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTEURS_ESPACE.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dc-ville">Ville</Label>
                <Input
                  id="dc-ville"
                  value={createForm.ville}
                  onChange={(e) => setCreateForm((f) => ({ ...f, ville: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateEspace} disabled={creating}>
              {creating ? "Création…" : "Créer l'espace client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog : liaison par code ── */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relier un espace entreprise existant</DialogTitle>
            <DialogDescription>
              L'entreprise vous a transmis un code de liaison (généré depuis son espace,
              valable 7 jours). Saisissez-le ci-dessous pour prendre en charge son dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="dc-code">Code de liaison</Label>
            <Input
              id="dc-code"
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              placeholder="ex. 3F9A21BC"
              className="font-mono tracking-widest uppercase"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Annuler</Button>
            <Button onClick={handleLink} disabled={linking}>
              {linking ? "Liaison…" : "Relier le dossier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
