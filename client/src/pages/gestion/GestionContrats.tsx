// =============================================================================
// Le Fiduciaire — Gestion des Contrats de travail (CRUD complet)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspaceId } from "@/lib/workspace";
import { can, roleInWorkspace } from "@/lib/permissions";
import { api, type ApiError } from "@/lib/api";
import BackToTools from "@/components/BackToTools";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  FileText,
  History,
  Ban,
  Pause,
  User,
  CalendarDays,
  Banknote,
  Briefcase,
  // Lot 8-E : icônes pour les nouvelles actions contrat
  PlayCircle,
  CheckCircle2,
  Copy,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface EmployeeSimple {
  id: string;
  firstName: string;
  lastName: string;
  matriculeCnss?: string | null;
}

interface ConventionSimple {
  id: string;
  code: string;
  nom: string;
}

interface ContractVersion {
  id: string;
  salaireBrut: number;
  salaireBrutAnnuel?: number | null;
  coefficient?: number | null;
  echelon?: number | null;
  heuresHebdomadaires?: number | null;
  heuresMensuelles?: number | null;
  motifChangement: string;
  dateEffet: string;
  note?: string | null;
  convention_collective?: ConventionSimple | null;
  conventionCollectiveId?: string | null;
}

interface Contract {
  id: string;
  type: string;
  statut: string;
  poste: string;
  dateDebut: string;
  dateFin?: string | null;
  periodeEssai?: string | null;
  motifRupture?: string | null;
  dateRupture?: string | null;
  employeeId: string;
  workspaceId: string;
  conventionCollectiveId?: string | null;
  employee?: EmployeeSimple;
  convention_collective?: ConventionSimple | null;
  versions?: ContractVersion[];
}

interface ContractFormData {
  employeeId: string;
  type: string;
  poste: string;
  conventionCollectiveId: string;
  dateDebut: string;
  dateFin: string;
  periodeEssai: string;
  salaireBrut: string;
  salaireBrutAnnuel: string;
  coefficient: string;
  echelon: string;
  heuresHebdomadaires: string;
  heuresMensuelles: string;
  motifChangement: string;
}

interface EditFormData {
  poste: string;
  conventionCollectiveId: string;
  dateFin: string;
  periodeEssai: string;
}

interface VersionFormData {
  salaireBrut: string;
  salaireBrutAnnuel: string;
  coefficient: string;
  echelon: string;
  conventionCollectiveId: string;
  heuresHebdomadaires: string;
  heuresMensuelles: string;
  motifChangement: string;
  dateEffet: string;
  note: string;
}

interface ResilierFormData {
  motifRupture: string;
  dateRupture: string;
}

type FilterStatut = "ACTIF" | "SUSPENDU" | "RESILIE" | "ALL";
type FilterType = "ALL" | "CDI" | "CDD" | "TEMPS_PARTIEL" | "SAISONNIER" | "STAGE" | "INTERIM";

// =============================================================================
// Constants
// =============================================================================

const CONTRACT_TYPES = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "TEMPS_PARTIEL", label: "Temps partiel" },
  { value: "SAISONNIER", label: "Saisonnier" },
  { value: "STAGE", label: "Stage" },
  { value: "INTERIM", label: "Intérim" },
] as const;

const MOTIFS_CHANGEMENT = [
  { value: "creation", label: "Création" },
  { value: "augmentation", label: "Augmentation" },
  { value: "promotion", label: "Promotion" },
  { value: "changement_poste", label: "Changement de poste" },
  { value: "revision_convention", label: "Révision conventionnelle" },
  { value: "autre", label: "Autre" },
];

const EMPTY_FORM: ContractFormData = {
  employeeId: "",
  type: "CDI",
  poste: "",
  conventionCollectiveId: "",
  dateDebut: new Date().toISOString().slice(0, 10),
  dateFin: "",
  periodeEssai: "",
  salaireBrut: "",
  salaireBrutAnnuel: "",
  coefficient: "",
  echelon: "",
  heuresHebdomadaires: "",
  heuresMensuelles: "",
  motifChangement: "creation",
};

const EMPTY_EDIT: EditFormData = {
  poste: "",
  conventionCollectiveId: "",
  dateFin: "",
  periodeEssai: "",
};

const EMPTY_VERSION: VersionFormData = {
  salaireBrut: "",
  salaireBrutAnnuel: "",
  coefficient: "",
  echelon: "",
  conventionCollectiveId: "",
  heuresHebdomadaires: "",
  heuresMensuelles: "",
  motifChangement: "augmentation",
  dateEffet: new Date().toISOString().slice(0, 10),
  note: "",
};

const EMPTY_RESILIER: ResilierFormData = {
  motifRupture: "",
  dateRupture: new Date().toISOString().slice(0, 10),
};

// =============================================================================
// Helpers
// =============================================================================

const typeLabel = (val: string): string =>
  CONTRACT_TYPES.find((t) => t.value === val)?.label ?? val;

const motifLabel = (val: string): string =>
  MOTIFS_CHANGEMENT.find((m) => m.value === val)?.label ?? val;

const formatDate = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatMoney = (val: number | null | undefined): string => {
  if (val == null) return "—";
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(val) + " TND";
};

// =============================================================================
// Main Component
// =============================================================================

export default function GestionContrats() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user);
  // Permissions du workspace actif (miroir backend) — LECTEUR : lecture seule
  const roleWs = roleInWorkspace(user, workspaceId);
  const peutEcrire = can(roleWs, "write");

  // ── State ────────────────────────────────────────────────────────────────
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<FilterStatut>("ALL");
  const [filterType, setFilterType] = useState<FilterType>("ALL");

  // Employees & conventions for selects
  const [employees, setEmployees] = useState<EmployeeSimple[]>([]);
  const [conventions, setConventions] = useState<ConventionSimple[]>([]);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [resilierOpen, setResilierOpen] = useState(false);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [form, setForm] = useState<ContractFormData>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<EditFormData>(EMPTY_EDIT);
  const [versionForm, setVersionForm] = useState<VersionFormData>(EMPTY_VERSION);
  const [resilierForm, setResilierForm] = useState<ResilierFormData>(EMPTY_RESILIER);

  // ── Fetch employees & conventions ────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    if (!workspaceId) return;
    try {
      // P0-1 : le sélecteur employé était TOUJOURS vide — l'ancien code lisait
      // `client.employees` sur la LISTE /clients/:ws qui ne renvoie que _count.
      // Le endpoint dédié existe et renvoie les salariés actifs directement.
      const data = await api.get<EmployeeSimple[]>(`/employees/${workspaceId}?activeOnly=true`);
      setEmployees(data);
    } catch {
      // Silently fail — employees list is not critical
    }
  }, [workspaceId]);

  const fetchConventions = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await api.get<ConventionSimple[]>(`/conventions/${workspaceId}`);
      setConventions(data);
    } catch {
      // Silently fail
    }
  }, [workspaceId]);

  // ── Fetch contracts ──────────────────────────────────────────────────────
  const fetchContracts = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      let path = `/contracts/${workspaceId}?`;
      if (filterStatut !== "ALL") path += `statut=${filterStatut}&`;
      if (filterType !== "ALL") path += `type=${filterType}&`;

      const data = await api.get<Contract[]>(path);
      setContracts(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des contrats");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterStatut, filterType]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    fetchEmployees();
    fetchConventions();
  }, [fetchEmployees, fetchConventions]);

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!workspaceId) return;
    if (!form.employeeId) {
      toast.error("Veuillez sélectionner un employé");
      return;
    }
    if (!form.poste.trim()) {
      toast.error("Le poste est requis");
      return;
    }
    if (!form.dateDebut) {
      toast.error("La date de début est requise");
      return;
    }
    if (!form.salaireBrut || parseFloat(form.salaireBrut) <= 0) {
      toast.error("Le salaire brut doit être positif");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        employeeId: form.employeeId,
        workspaceId,
        type: form.type,
        poste: form.poste.trim(),
        dateDebut: form.dateDebut,
        salaireBrut: parseFloat(form.salaireBrut),
        motifChangement: form.motifChangement || "creation",
      };
      if (form.conventionCollectiveId) body.conventionCollectiveId = form.conventionCollectiveId;
      if (form.dateFin) body.dateFin = form.dateFin;
      if (form.periodeEssai) body.periodeEssai = form.periodeEssai;
      if (form.salaireBrutAnnuel) body.salaireBrutAnnuel = parseFloat(form.salaireBrutAnnuel);
      if (form.coefficient) body.coefficient = parseFloat(form.coefficient);
      if (form.echelon) body.echelon = parseFloat(form.echelon);
      if (form.heuresHebdomadaires) body.heuresHebdomadaires = parseFloat(form.heuresHebdomadaires);
      if (form.heuresMensuelles) body.heuresMensuelles = parseFloat(form.heuresMensuelles);

      await api.post("/contracts", body);
      toast.success("Contrat créé avec succès");
      setFormOpen(false);
      setForm(EMPTY_FORM);
      fetchContracts();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la création du contrat");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!workspaceId || !selectedContract) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.poste.trim()) body.poste = editForm.poste.trim();
      if (editForm.conventionCollectiveId) body.conventionCollectiveId = editForm.conventionCollectiveId;
      if (editForm.dateFin) body.dateFin = editForm.dateFin;
      if (editForm.periodeEssai) body.periodeEssai = editForm.periodeEssai;

      await api.put(`/contracts/${workspaceId}/${selectedContract.id}`, body);
      toast.success("Contrat mis à jour avec succès");
      setEditOpen(false);
      setSelectedContract(null);
      fetchContracts();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Add version ──────────────────────────────────────────────────────────
  const handleAddVersion = async () => {
    if (!workspaceId || !selectedContract) return;
    if (!versionForm.salaireBrut || parseFloat(versionForm.salaireBrut) <= 0) {
      toast.error("Le salaire brut doit être positif");
      return;
    }
    if (!versionForm.motifChangement) {
      toast.error("Le motif de changement est requis");
      return;
    }
    if (!versionForm.dateEffet) {
      toast.error("La date d'effet est requise");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        salaireBrut: parseFloat(versionForm.salaireBrut),
        motifChangement: versionForm.motifChangement,
        dateEffet: versionForm.dateEffet,
      };
      if (versionForm.salaireBrutAnnuel) body.salaireBrutAnnuel = parseFloat(versionForm.salaireBrutAnnuel);
      if (versionForm.coefficient) body.coefficient = parseFloat(versionForm.coefficient);
      if (versionForm.echelon) body.echelon = parseFloat(versionForm.echelon);
      if (versionForm.conventionCollectiveId) body.conventionCollectiveId = versionForm.conventionCollectiveId;
      if (versionForm.heuresHebdomadaires) body.heuresHebdomadaires = parseFloat(versionForm.heuresHebdomadaires);
      if (versionForm.heuresMensuelles) body.heuresMensuelles = parseFloat(versionForm.heuresMensuelles);
      if (versionForm.note) body.note = versionForm.note;

      await api.post(`/contracts/${workspaceId}/${selectedContract.id}/versions`, body);
      toast.success("Nouvelle version ajoutée avec succès");
      setVersionOpen(false);
      setSelectedContract(null);
      setVersionForm(EMPTY_VERSION);
      fetchContracts();
      // Refresh detail if open
      if (detailOpen && detailContract?.id === selectedContract.id) {
        openDetail(selectedContract);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'ajout de la version");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Résilier ─────────────────────────────────────────────────────────────
  const handleResilier = async () => {
    if (!workspaceId || !selectedContract) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (resilierForm.motifRupture) body.motifRupture = resilierForm.motifRupture;
      if (resilierForm.dateRupture) body.dateRupture = resilierForm.dateRupture;

      await api.patch(`/contracts/${workspaceId}/${selectedContract.id}/resilier`, body);
      toast.success("Contrat résilié avec succès");
      setResilierOpen(false);
      setSelectedContract(null);
      setResilierForm(EMPTY_RESILIER);
      fetchContracts();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la résiliation");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Suspendre ────────────────────────────────────────────────────────────
  const handleSuspendre = async (contract: Contract) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/contracts/${workspaceId}/${contract.id}/suspendre`);
      toast.success("Contrat suspendu avec succès");
      fetchContracts();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la suspension");
    }
  };

  // ── Lot 8-E : Réactiver un contrat suspendu ─────────────────────────────
  const handleReactiver = async (contract: Contract) => {
    if (!workspaceId) return;
    if (!confirm(`Réactiver le contrat de ${contract.employee?.firstName} ${contract.employee?.lastName} ?`)) return;
    try {
      await api.patch(`/contracts/${workspaceId}/${contract.id}/reactiver`);
      toast.success("Contrat réactivé avec succès");
      fetchContracts();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la réactivation");
    }
  };

  // ── Lot 8-E : Terminer un CDD/saisonnier/stage/interim à son échéance ────
  const handleTerminer = async (contract: Contract) => {
    if (!workspaceId) return;
    const motifFin = prompt(
      `Terminer le contrat de ${contract.employee?.firstName} ${contract.employee?.lastName} ?\n\n` +
      `Indiquez le motif (laissez vide pour \"Fin normale du contrat\") :`
    );
    if (motifFin === null) return; // utilisateur a cliqué sur Annuler
    try {
      await api.patch(`/contracts/${workspaceId}/${contract.id}/terminer`, {
        motifFin: motifFin || undefined,
      });
      toast.success("Contrat marqué comme TERMINÉ");
      fetchContracts();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la terminaison du contrat");
    }
  };

  // ── Lot 8-E : Dupliquer un contrat (renouvellement de CDD) ───────────────
  const handleDupliquer = async (contract: Contract) => {
    if (!workspaceId) return;
    const dateDebut = prompt(
      `Dupliquer le contrat de ${contract.employee?.firstName} ${contract.employee?.lastName} ?\n\n` +
      `Date de début du nouveau contrat (YYYY-MM-DD) :`,
      new Date().toISOString().slice(0, 10)
    );
    if (!dateDebut) return;
    try {
      const response = await api.post<{ contract: { id: string }; version: { id: string }; message: string }>(
        `/contracts/${workspaceId}/${contract.id}/dupliquer`,
        { dateDebut }
      );
      toast.success(response.message || "Contrat dupliqué avec succès");
      fetchContracts();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la duplication du contrat");
    }
  };

  // ── Detail ───────────────────────────────────────────────────────────────
  const openDetail = async (contract: Contract) => {
    if (!workspaceId) return;
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await api.get<Contract>(`/contracts/${workspaceId}/${contract.id}`);
      setDetailContract(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement du détail");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Open forms ───────────────────────────────────────────────────────────
  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (contract: Contract) => {
    setSelectedContract(contract);
    setEditForm({
      poste: contract.poste || "",
      conventionCollectiveId: contract.conventionCollectiveId || "",
      dateFin: contract.dateFin ? contract.dateFin.slice(0, 10) : "",
      periodeEssai: contract.periodeEssai || "",
    });
    setEditOpen(true);
  };

  const openVersionForm = (contract: Contract) => {
    setSelectedContract(contract);
    setVersionForm(EMPTY_VERSION);
    setVersionOpen(true);
  };

  const openResilierForm = (contract: Contract) => {
    setSelectedContract(contract);
    setResilierForm(EMPTY_RESILIER);
    setResilierOpen(true);
  };

  // ── Statut badge ─────────────────────────────────────────────────────────
  const StatutBadge = ({ statut }: { statut: string }) => {
    switch (statut) {
      case "ACTIF":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
            Actif
          </Badge>
        );
      case "SUSPENDU":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
            Suspendu
          </Badge>
        );
      case "RESILIE":
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
            Résilié
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{statut}</Badge>;
    }
  };

  // ── No workspace guard ───────────────────────────────────────────────────
  if (!workspaceId) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <Card className="p-6 border border-destructive/30">
          <p className="text-destructive">
            Aucun workspace sélectionné. Veuillez vous reconnecter.
          </p>
        </Card>
      </div>
    );
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      <BackToTools />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold text-primary"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Gestion des Contrats
        </h1>
        {peutEcrire && (
          <Button
            onClick={openCreateForm}
            className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
          >
            <Plus className="size-4" />
            Nouveau contrat
          </Button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Statut filter */}
        <div className="flex gap-1 flex-wrap">
          {(["ALL", "ACTIF", "SUSPENDU", "RESILIE"] as FilterStatut[]).map((s) => (
            <Button
              key={s}
              variant={filterStatut === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatut(s)}
              className={
                filterStatut === s
                  ? "bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
                  : ""
              }
            >
              {s === "ALL" ? "Tous" : s === "ACTIF" ? "Actifs" : s === "SUSPENDU" ? "Suspendus" : "Résiliés"}
            </Button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Type :</Label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {CONTRACT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table ── */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="size-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filterStatut !== "ALL" || filterType !== "ALL"
                  ? "Aucun contrat ne correspond aux filtres"
                  : "Aucun contrat. Créez votre premier contrat."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Employé</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Poste</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Date début</TableHead>
                  <TableHead className="font-semibold text-right hidden lg:table-cell">Salaire brut</TableHead>
                  <TableHead className="font-semibold text-center">Statut</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => {
                  const latestSalary = contract.versions?.[0]?.salaireBrut;
                  return (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => openDetail(contract)}
                    >
                      <TableCell className="font-medium text-primary">
                        {contract.employee
                          ? `${contract.employee.lastName} ${contract.employee.firstName}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {typeLabel(contract.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {contract.poste || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-xs">
                        {formatDate(contract.dateDebut)}
                      </TableCell>
                      <TableCell className="text-right hidden lg:table-cell font-mono text-xs">
                        {latestSalary != null ? formatMoney(latestSalary) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatutBadge statut={contract.statut} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(contract)}>
                              <Eye className="size-4 mr-2" />
                              Voir détail
                            </DropdownMenuItem>
                            {peutEcrire && (
                              <DropdownMenuItem onClick={() => openEditForm(contract)}>
                                <Pencil className="size-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {peutEcrire && (
                              <DropdownMenuItem onClick={() => openVersionForm(contract)}>
                                <History className="size-4 mr-2" />
                                Ajouter version
                              </DropdownMenuItem>
                            )}
                            {/* Lot 8-E — Duplication (renouvellement de CDD ou nouveau contrat) */}
                            {peutEcrire && (contract.statut === "TERMINE" || contract.statut === "RESILIE") && (
                              <DropdownMenuItem
                                onClick={() => handleDupliquer(contract)}
                                className="text-emerald-600 focus:text-emerald-700"
                              >
                                <Copy className="size-4 mr-2" />
                                Dupliquer (renouvellement)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {contract.statut === "ACTIF" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleSuspendre(contract)}
                                  className="text-amber-600 focus:text-amber-700"
                                >
                                  <Pause className="size-4 mr-2" />
                                  Suspendre
                                </DropdownMenuItem>
                                {/* Lot 8-E — Terminer un CDD/saisonnier/stage/interim à son échéance */}
                                {(contract.type === "CDD" || contract.type === "SAISONNIER" || contract.type === "STAGE" || contract.type === "INTERIM") && (
                                  <DropdownMenuItem
                                    onClick={() => handleTerminer(contract)}
                                    className="text-blue-600 focus:text-blue-700"
                                  >
                                    <CheckCircle2 className="size-4 mr-2" />
                                    Terminer (fin de contrat)
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openResilierForm(contract)}
                                  className="text-red-600 focus:text-red-700"
                                >
                                  <Ban className="size-4 mr-2" />
                                  Résilier
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* Lot 8-E — Réactiver un contrat suspendu */}
                            {contract.statut === "SUSPENDU" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleReactiver(contract)}
                                  className="text-emerald-600 focus:text-emerald-700"
                                >
                                  <PlayCircle className="size-4 mr-2" />
                                  Réactiver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openResilierForm(contract)}
                                  className="text-red-600 focus:text-red-700"
                                >
                                  <Ban className="size-4 mr-2" />
                                  Résilier
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Count ── */}
      {!loading && contracts.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-right">
          {contracts.length} contrat{contracts.length > 1 ? "s" : ""} trouvé{contracts.length > 1 ? "s" : ""}
        </p>
      )}

      {/* ========================================================================= */}
      {/* Create Dialog                                                             */}
      {/* ========================================================================= */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-primary"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Nouveau contrat
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du nouveau contrat de travail.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Employé */}
            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">
                Employé <span className="text-destructive">*</span>
              </Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.lastName} {emp.firstName}{emp.matriculeCnss ? ` — ${emp.matriculeCnss}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {employees.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun salarié actif trouvé. Créez d'abord vos salariés dans « Salariés », puis revenez créer leur contrat.
                </p>
              )}
            </div>

            {/* Type + Poste */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">
                  Type de contrat <span className="text-destructive">*</span>
                </Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="poste" className="text-sm font-medium">
                  Poste <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="poste"
                  placeholder="Ex: Comptable, Chef d'équipe…"
                  value={form.poste}
                  onChange={(e) => setForm((p) => ({ ...p, poste: e.target.value }))}
                />
              </div>
            </div>

            {/* Convention collective */}
            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Convention collective</Label>
              <Select
                value={form.conventionCollectiveId}
                onValueChange={(v) => setForm((p) => ({ ...p, conventionCollectiveId: v === "_none" ? "" : v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {conventions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dateDebut" className="text-sm font-medium">
                  Date de début <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dateDebut"
                  type="date"
                  value={form.dateDebut}
                  onChange={(e) => setForm((p) => ({ ...p, dateDebut: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dateFin" className="text-sm font-medium">Date de fin</Label>
                <Input
                  id="dateFin"
                  type="date"
                  value={form.dateFin}
                  onChange={(e) => setForm((p) => ({ ...p, dateFin: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="periodeEssai" className="text-sm font-medium">Période d'essai</Label>
                <Input
                  id="periodeEssai"
                  placeholder="Ex: 3 mois"
                  value={form.periodeEssai}
                  onChange={(e) => setForm((p) => ({ ...p, periodeEssai: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Salaire */}
            <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Banknote className="size-4" /> Rémunération
            </p>
            {/* Lot 8-D : le salaire brut du contrat est INDICATIF (objectif de rémunération).
                En mode CONVENTIONNEL de paie, il sera décomposé en :
                - salaire de base (grille échelle × échelon × année, depuis la convention)
                - indemnité complémentaire (excédent au-dessus de la grille)
                Donc l'utilisateur saisit ici l'objectif, pas le brut figé. */}
            <p className="text-xs text-muted-foreground italic">
              Salaire indicatif (objectif de rémunération) — sera décomposé en base + indemnité complémentaire lors du calcul de paie si une convention est rattachée.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="salaireBrut" className="text-sm font-medium">
                  Salaire brut mensuel indicatif (TND) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="salaireBrut"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={form.salaireBrut}
                  onChange={(e) => setForm((p) => ({ ...p, salaireBrut: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="salaireBrutAnnuel" className="text-sm font-medium">Salaire brut annuel (TND)</Label>
                <Input
                  id="salaireBrutAnnuel"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={form.salaireBrutAnnuel}
                  onChange={(e) => setForm((p) => ({ ...p, salaireBrutAnnuel: e.target.value }))}
                />
              </div>
            </div>

            {/* Coefficient + Échelon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="coefficient" className="text-sm font-medium">Coefficient</Label>
                <Input
                  id="coefficient"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.coefficient}
                  onChange={(e) => setForm((p) => ({ ...p, coefficient: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="echelon" className="text-sm font-medium">Échelon</Label>
                <Input
                  id="echelon"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.echelon}
                  onChange={(e) => setForm((p) => ({ ...p, echelon: e.target.value }))}
                />
              </div>
            </div>

            {/* Heures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="heuresHebdo" className="text-sm font-medium">Heures hebdomadaires</Label>
                <Input
                  id="heuresHebdo"
                  type="number"
                  step="0.5"
                  placeholder="48"
                  value={form.heuresHebdomadaires}
                  onChange={(e) => setForm((p) => ({ ...p, heuresHebdomadaires: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="heuresMens" className="text-sm font-medium">Heures mensuelles</Label>
                <Input
                  id="heuresMens"
                  type="number"
                  step="0.5"
                  placeholder="208"
                  value={form.heuresMensuelles}
                  onChange={(e) => setForm((p) => ({ ...p, heuresMensuelles: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !form.employeeId || !form.poste.trim() || !form.salaireBrut}
              className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
            >
              {submitting && (
                <span className="size-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
              )}
              Créer le contrat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Edit Dialog                                                               */}
      {/* ========================================================================= */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setSelectedContract(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-primary"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Modifier le contrat
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations du contrat de travail.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="editPoste" className="text-sm font-medium">Poste</Label>
              <Input
                id="editPoste"
                placeholder="Poste"
                value={editForm.poste}
                onChange={(e) => setEditForm((p) => ({ ...p, poste: e.target.value }))}
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Convention collective</Label>
              <Select
                value={editForm.conventionCollectiveId}
                onValueChange={(v) => setEditForm((p) => ({ ...p, conventionCollectiveId: v === "_none" ? "" : v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {conventions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="editDateFin" className="text-sm font-medium">Date de fin</Label>
                <Input
                  id="editDateFin"
                  type="date"
                  value={editForm.dateFin}
                  onChange={(e) => setEditForm((p) => ({ ...p, dateFin: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="editPeriodeEssai" className="text-sm font-medium">Période d'essai</Label>
                <Input
                  id="editPeriodeEssai"
                  placeholder="Ex: 3 mois"
                  value={editForm.periodeEssai}
                  onChange={(e) => setEditForm((p) => ({ ...p, periodeEssai: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditOpen(false); setSelectedContract(null); }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={submitting}
              className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
            >
              {submitting && (
                <span className="size-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Version Dialog                                                            */}
      {/* ========================================================================= */}
      <Dialog open={versionOpen} onOpenChange={(open) => { setVersionOpen(open); if (!open) { setSelectedContract(null); setVersionForm(EMPTY_VERSION); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-primary"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Ajouter une version
            </DialogTitle>
            <DialogDescription>
              Enregistrez un changement de rémunération ou de conditions (augmentation, promotion, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vSalaire" className="text-sm font-medium">
                  Nouveau salaire brut (TND) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vSalaire"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={versionForm.salaireBrut}
                  onChange={(e) => setVersionForm((p) => ({ ...p, salaireBrut: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vSalaireAnnuel" className="text-sm font-medium">Salaire brut annuel (TND)</Label>
                <Input
                  id="vSalaireAnnuel"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={versionForm.salaireBrutAnnuel}
                  onChange={(e) => setVersionForm((p) => ({ ...p, salaireBrutAnnuel: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vCoef" className="text-sm font-medium">Coefficient</Label>
                <Input
                  id="vCoef"
                  type="number"
                  step="0.01"
                  value={versionForm.coefficient}
                  onChange={(e) => setVersionForm((p) => ({ ...p, coefficient: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vEchelon" className="text-sm font-medium">Échelon</Label>
                <Input
                  id="vEchelon"
                  type="number"
                  step="0.01"
                  value={versionForm.echelon}
                  onChange={(e) => setVersionForm((p) => ({ ...p, echelon: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Convention collective</Label>
              <Select
                value={versionForm.conventionCollectiveId}
                onValueChange={(v) => setVersionForm((p) => ({ ...p, conventionCollectiveId: v === "_none" ? "" : v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucune</SelectItem>
                  {conventions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vHebdo" className="text-sm font-medium">Heures hebdomadaires</Label>
                <Input
                  id="vHebdo"
                  type="number"
                  step="0.5"
                  value={versionForm.heuresHebdomadaires}
                  onChange={(e) => setVersionForm((p) => ({ ...p, heuresHebdomadaires: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vMens" className="text-sm font-medium">Heures mensuelles</Label>
                <Input
                  id="vMens"
                  type="number"
                  step="0.5"
                  value={versionForm.heuresMensuelles}
                  onChange={(e) => setVersionForm((p) => ({ ...p, heuresMensuelles: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">
                  Motif du changement <span className="text-destructive">*</span>
                </Label>
                <Select value={versionForm.motifChangement} onValueChange={(v) => setVersionForm((p) => ({ ...p, motifChangement: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIFS_CHANGEMENT.filter((m) => m.value !== "creation").map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vDateEffet" className="text-sm font-medium">
                  Date d'effet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vDateEffet"
                  type="date"
                  value={versionForm.dateEffet}
                  onChange={(e) => setVersionForm((p) => ({ ...p, dateEffet: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="vNote" className="text-sm font-medium">Note</Label>
              <Textarea
                id="vNote"
                placeholder="Commentaire optionnel…"
                value={versionForm.note}
                onChange={(e) => setVersionForm((p) => ({ ...p, note: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setVersionOpen(false); setSelectedContract(null); setVersionForm(EMPTY_VERSION); }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddVersion}
              disabled={submitting || !versionForm.salaireBrut || !versionForm.dateEffet}
              className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
            >
              {submitting && (
                <span className="size-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
              )}
              Ajouter la version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Résilier Dialog                                                           */}
      {/* ========================================================================= */}
      <Dialog open={resilierOpen} onOpenChange={(open) => { setResilierOpen(open); if (!open) { setSelectedContract(null); setResilierForm(EMPTY_RESILIER); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-primary"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Résilier le contrat
            </DialogTitle>
            <DialogDescription>
              Confirmez la résiliation du contrat de {selectedContract?.employee
                ? `${selectedContract.employee.lastName} ${selectedContract.employee.firstName}`
                : "cet employé"}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rMotif" className="text-sm font-medium">Motif de rupture</Label>
              <Input
                id="rMotif"
                placeholder="Ex: Démission, Licenciement…"
                value={resilierForm.motifRupture}
                onChange={(e) => setResilierForm((p) => ({ ...p, motifRupture: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rDate" className="text-sm font-medium">Date de rupture</Label>
              <Input
                id="rDate"
                type="date"
                value={resilierForm.dateRupture}
                onChange={(e) => setResilierForm((p) => ({ ...p, dateRupture: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setResilierOpen(false); setSelectedContract(null); setResilierForm(EMPTY_RESILIER); }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleResilier}
              disabled={submitting}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && (
                <span className="size-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
              )}
              Résilier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Detail Dialog                                                             */}
      {/* ========================================================================= */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="size-8 border-4 border-primary border-r-transparent rounded-full animate-spin" />
            </div>
          ) : detailContract ? (
            <>
              <DialogHeader>
                <DialogTitle
                  className="text-primary flex items-center gap-2"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  <FileText className="size-5" />
                  Contrat — {detailContract.employee
                    ? `${detailContract.employee.lastName} ${detailContract.employee.firstName}`
                    : "Inconnu"}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <StatutBadge statut={detailContract.statut} />
                  <Badge variant="outline" className="text-xs">
                    {typeLabel(detailContract.type)}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Contract Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={<User className="size-4" />} label="Employé" value={detailContract.employee ? `${detailContract.employee.lastName} ${detailContract.employee.firstName}` : "—"} />
                  <InfoItem icon={<Briefcase className="size-4" />} label="Poste" value={detailContract.poste} />
                  <InfoItem icon={<CalendarDays className="size-4" />} label="Date de début" value={formatDate(detailContract.dateDebut)} />
                  <InfoItem icon={<CalendarDays className="size-4" />} label="Date de fin" value={detailContract.dateFin ? formatDate(detailContract.dateFin) : "Non définie"} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={<CalendarDays className="size-4" />} label="Période d'essai" value={detailContract.periodeEssai || "—"} />
                  {detailContract.convention_collective && (
                    <InfoItem icon={<FileText className="size-4" />} label="Convention collective" value={`${detailContract.convention_collective.code} — ${detailContract.convention_collective.nom}`} />
                  )}
                </div>

                {detailContract.statut === "RESILIE" && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoItem icon={<Ban className="size-4" />} label="Motif de rupture" value={detailContract.motifRupture || "—"} />
                      <InfoItem icon={<CalendarDays className="size-4" />} label="Date de rupture" value={detailContract.dateRupture ? formatDate(detailContract.dateRupture) : "—"} />
                    </div>
                  </>
                )}

                <Separator />

                {/* Version History */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <History className="size-4" />
                    Historique des versions ({detailContract.versions?.length ?? 0})
                  </p>
                  {detailContract.versions && detailContract.versions.length > 0 ? (
                    <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-md border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30 sticky top-0">
                          <tr>
                            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Date d'effet</th>
                            <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Salaire brut</th>
                            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Motif</th>
                            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground hidden sm:table-cell">Coeff.</th>
                            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground hidden md:table-cell">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailContract.versions.map((v) => (
                            <tr key={v.id} className="border-t border-border/50 hover:bg-muted/20">
                              <td className="py-1.5 px-2 font-mono">{formatDate(v.dateEffet)}</td>
                              <td className="py-1.5 px-2 text-right font-mono">{formatMoney(v.salaireBrut)}</td>
                              <td className="py-1.5 px-2">{motifLabel(v.motifChangement)}</td>
                              <td className="py-1.5 px-2 hidden sm:table-cell">{v.coefficient ?? "—"}</td>
                              <td className="py-1.5 px-2 hidden md:table-cell text-muted-foreground">{v.note || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucune version enregistrée</p>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailOpen(false);
                    openEditForm(detailContract);
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="size-4" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailOpen(false);
                    openVersionForm(detailContract);
                  }}
                  className="gap-1.5"
                >
                  <History className="size-4" />
                  Nouvelle version
                </Button>
                {detailContract.statut === "ACTIF" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailOpen(false);
                        handleSuspendre(detailContract);
                      }}
                      className="gap-1.5 text-amber-600 hover:text-amber-700 border-amber-300 hover:border-amber-400"
                    >
                      <Pause className="size-4" />
                      Suspendre
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDetailOpen(false);
                        openResilierForm(detailContract);
                      }}
                      className="gap-1.5 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                    >
                      <Ban className="size-4" />
                      Résilier
                    </Button>
                  </>
                )}
                {detailContract.statut === "SUSPENDU" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailOpen(false);
                      openResilierForm(detailContract);
                    }}
                    className="gap-1.5 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  >
                    <Ban className="size-4" />
                    Résilier
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setDetailOpen(false)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Impossible de charger les détails
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Sub-component: InfoItem
// =============================================================================

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
