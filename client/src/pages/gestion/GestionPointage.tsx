// =============================================================================
// Le Fiduciaire — Gestion du Pointage (Imports + Variables de paie)
// =============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspaceId } from "@/lib/workspace";
import { can, roleInWorkspace } from "@/lib/permissions";
import { api, type ApiError } from "@/lib/api";
import BackToTools from "@/components/BackToTools";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

// Icons
import {
  Upload,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  Keyboard,
  Loader2,
  RefreshCw,
  ChevronLeft,
  AlertTriangle,
  Search,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ClientCompany {
  id: string;
  raisonSociale: string;
  statut?: string;
}

interface AttendanceImport {
  id: string;
  workspaceId: string;
  clientCompanyId: string;
  mois: number;
  annee: number;
  nomFichier: string;
  tailleFichier: number;
  statut: string;
  lignesTotal: number;
  lignesOk: number;
  lignesAnomalie: number;
  anomalies?: unknown;
  createdAt: string;
  client_company?: { id: string; raisonSociale: string };
  _count?: { summaries: number };
}

interface AttendanceSummary {
  id: string;
  importId: string;
  workspaceId: string;
  employeeId?: string;
  matricule: string;
  nomPrenom: string;
  joursTravailles: number;
  joursAbsence: number;
  congesPayes: number;
  absJustifiees: number;
  absNonJustifiees: number;
  heuresSup: number;
  employee?: { id: string; firstName: string; lastName: string; matriculeCnss?: string };
  _count?: { variables: number };
}

// P1-3 : miroir du VRAI modèle PayrollVariable — l'ancienne interface exposait
// typeVariable/valeur qui n'existent pas → colonnes « Variable » et « Valeur »
// toujours vides, validation « à l'aveugle ».
interface PayrollVariable {
  id: string;
  workspaceId: string;
  summaryId: string;
  employeeId: string;
  mois: number;
  annee: number;
  salaireBrutMensuel: number;
  tauxPresence: number;
  salaireBrutEffectif: number;
  heuresSupplementaires: number;
  montantHeuresSup?: number | null;
  joursTravailles: number;
  joursAbsence: number;
  montantAbsence?: number | null;
  salaireNet?: number | null;
  statut: string;
  noteValidation?: string | null;
  createdAt: string;
  attendance_summary?: { matricule: string; nomPrenom: string };
}

// ── Saisie manuelle (exigence TPE — pointage sans fichier) ──────────────────

interface EmployeeSimple {
  id: string;
  firstName: string;
  lastName: string;
  matriculeCnss?: string | null;
}

interface ManualLigne {
  jt: string;   // jours travaillés réels
  cp: string;   // congés payés
  aj: string;   // absences justifiées
  anj: string;  // absences non justifiées
  hs: string;   // heures supplémentaires
}

const EMPTY_MANUAL_LIGNE: ManualLigne = { jt: "", cp: "0", aj: "0", anj: "0", hs: "0" };

// ── Helpers ────────────────────────────────────────────────────────────────

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function formatMoisAnnee(mois: number, annee: number): string {
  return `${MOIS_LABELS[mois - 1] || mois} ${annee}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getImportStatutBadge(statut: string) {
  switch (statut) {
    case "VALIDE":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Validé</Badge>;
    case "ANOMALIES":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Anomalies</Badge>;
    case "REJETE":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Rejeté</Badge>;
    default:
      return <Badge variant="secondary">{statut}</Badge>;
  }
}

function getVariableStatutBadge(statut: string) {
  switch (statut) {
    case "PROPOSEE":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">En attente</Badge>;
    case "VALIDEe":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Validée</Badge>;
    case "REFUSEe":
      return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Refusée</Badge>;
    default:
      return <Badge variant="secondary">{statut}</Badge>;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GestionPointage() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user) ?? "";
  // Permissions du workspace actif (miroir backend) — LECTEUR : lecture seule
  const roleWs = roleInWorkspace(user, workspaceId || null);
  const peutEcrire = can(roleWs, "write"); // importer, valider/refuser les variables

  // ── Imports state ──
  const [imports, setImports] = useState<AttendanceImport[]>([]);
  const [importsLoading, setImportsLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedImport, setSelectedImport] = useState<AttendanceImport | null>(null);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);

  // ── Import form state ──
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedMois, setSelectedMois] = useState("1");
  const [selectedAnnee, setSelectedAnnee] = useState(new Date().getFullYear().toString());
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── Variables state ──
  const [variables, setVariables] = useState<PayrollVariable[]>([]);
  const [variablesLoading, setVariablesLoading] = useState(true);
  const [variableStatutFilter, setVariableStatutFilter] = useState<string>("");

  // ── Variable actions ──
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [refuseDialogOpen, setRefuseDialogOpen] = useState(false);
  const [actingVariable, setActingVariable] = useState<PayrollVariable | null>(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ── Saisie manuelle state (exigence TPE — pointage sans fichier) ──
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualClient, setManualClient] = useState("");
  const [manualMois, setManualMois] = useState(String(new Date().getMonth() + 1));
  const [manualAnnee, setManualAnnee] = useState(String(new Date().getFullYear()));
  const [manualEmployees, setManualEmployees] = useState<EmployeeSimple[]>([]);
  const [manualRows, setManualRows] = useState<Record<string, ManualLigne>>({});
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // ── Fetch imports ──
  const fetchImports = useCallback(async () => {
    if (!workspaceId) return;
    setImportsLoading(true);
    try {
      const data = await api.get<AttendanceImport[]>(`/attendance/${workspaceId}/imports`);
      setImports(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des imports");
    } finally {
      setImportsLoading(false);
    }
  }, [workspaceId]);

  // ── Fetch variables ──
  const fetchVariables = useCallback(async () => {
    if (!workspaceId) return;
    setVariablesLoading(true);
    try {
      const query = variableStatutFilter ? `?statut=${variableStatutFilter}` : "";
      const data = await api.get<PayrollVariable[]>(`/attendance/${workspaceId}/variables${query}`);
      setVariables(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des variables");
    } finally {
      setVariablesLoading(false);
    }
  }, [workspaceId, variableStatutFilter]);

  // ── Fetch clients ──
  const fetchClients = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await api.get<ClientCompany[]>(`/clients/${workspaceId}`);
      setClients(data);
    } catch {
      // Silently fail — clients are optional for the dialog
    }
  }, [workspaceId]);

  // ── Fetch summaries ──
  const fetchSummaries = useCallback(async (importId: string) => {
    if (!workspaceId) return;
    setSummariesLoading(true);
    try {
      const data = await api.get<AttendanceSummary[]>(`/attendance/${workspaceId}/summaries/${importId}`);
      setSummaries(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des résumés");
    } finally {
      setSummariesLoading(false);
    }
  }, [workspaceId]);

  // ── Initial load ──
  useEffect(() => {
    fetchImports();
    fetchVariables();
    fetchClients();
  }, [fetchImports, fetchVariables, fetchClients]);

  // ── Handle file import ──
  const handleImport = async () => {
    if (!uploadFile || !selectedClient || !selectedMois || !selectedAnnee) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("workspaceId", workspaceId);
      formData.append("clientCompanyId", selectedClient);
      formData.append("mois", selectedMois);
      formData.append("annee", selectedAnnee);

      // Lot 1 : session par cookie HttpOnly — plus de jeton localStorage
      const res = await fetch("/api/attendance/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      const result = await res.json();
      toast.success(result.message || "Fichier importé avec succès");

      // Reset form
      setUploadFile(null);
      setSelectedClient("");
      setSelectedMois("1");
      setSelectedAnnee(new Date().getFullYear().toString());
      setImportDialogOpen(false);

      // Refresh
      fetchImports();
    } catch (err) {
      toast.error((err as Error).message || "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  // ── Download template ──
  const handleDownloadTemplate = async () => {
    try {
      // Lot 1 : session par cookie HttpOnly
      const res = await fetch("/api/attendance/template", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Erreur lors du téléchargement du template");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_pointage.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error((err as Error).message || "Erreur lors du téléchargement");
    }
  };

  // ── View import detail ──
  const handleViewImport = async (imp: AttendanceImport) => {
    setSelectedImport(imp);
    await fetchSummaries(imp.id);
  };

  // ── Saisie manuelle : charger les salariés de la société choisie ──
  const fetchManualEmployees = useCallback(async (clientId: string) => {
    if (!workspaceId || !clientId) {
      setManualEmployees([]);
      return;
    }
    setManualLoading(true);
    try {
      const data = await api.get<EmployeeSimple[]>(
        `/employees/${workspaceId}?activeOnly=true&clientId=${clientId}`
      );
      setManualEmployees(data);
      setManualRows({});
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des salariés");
    } finally {
      setManualLoading(false);
    }
  }, [workspaceId]);

  const setManualField = (employeeId: string, field: keyof ManualLigne, value: string) => {
    setManualRows((prev) => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] ?? EMPTY_MANUAL_LIGNE), [field]: value },
    }));
  };

  // Charger les salariés quand la société (ou l'ouverture du dialogue) change
  useEffect(() => {
    if (manualDialogOpen && manualClient) {
      fetchManualEmployees(manualClient);
    }
  }, [manualDialogOpen, manualClient, fetchManualEmployees]);

  // ── Saisie manuelle : soumettre ──
  const handleManualSubmit = async () => {
    if (!manualClient || !manualMois || !manualAnnee) {
      toast.error("Veuillez choisir la société, le mois et l'année");
      return;
    }
    const pointables = manualEmployees.filter((e) => e.matriculeCnss);
    if (pointables.length === 0) {
      toast.error("Aucun salarié avec matricule CNSS dans cette société — complétez les fiches salariés");
      return;
    }
    const lignes = pointables.map((emp) => {
      const r = manualRows[emp.id] ?? EMPTY_MANUAL_LIGNE;
      return {
        matricule: emp.matriculeCnss!,
        nomPrenom: `${emp.firstName} ${emp.lastName}`,
        joursTravaillesReels: r.jt === "" ? 0 : parseFloat(r.jt) || 0,
        congesPayes: parseFloat(r.cp) || 0,
        absencesJustifiees: parseFloat(r.aj) || 0,
        absencesNonJustifiees: parseFloat(r.anj) || 0,
        heuresSupplementaires: parseFloat(r.hs) || 0,
      };
    });
    const joursSaisis = lignes.filter((l) => l.joursTravaillesReels > 0).length;
    if (lignes.length > 0 && joursSaisis === 0) {
      toast.error("Saisissez au moins un nombre de jours travaillés");
      return;
    }

    setManualSubmitting(true);
    try {
      const result = await api.post<{
        message: string;
        summariesCreated: number;
        variablesCreated: number;
        anomalies: Array<{ matricule: string; type: string; message: string; severity: string }>;
      }>(`/attendance/${workspaceId}/manual`, {
        clientCompanyId: manualClient,
        mois: manualMois,
        annee: manualAnnee,
        lignes,
      });

      const bloquantes = (result.anomalies ?? []).filter((a) => a.severity === "BLOQUANTE");
      if (bloquantes.length > 0) {
        toast.warning(
          `${result.message} — anomalies : ${bloquantes.slice(0, 2).map((a) => a.message).join(" ; ")}${bloquantes.length > 2 ? "…" : ""}`,
          { duration: 8000 }
        );
      } else {
        toast.success(`${result.message} (${result.summariesCreated} salarié(s), ${result.variablesCreated} variable(s))`);
      }

      setManualDialogOpen(false);
      setManualRows({});
      fetchImports();
      fetchVariables();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'enregistrement de la saisie");
    } finally {
      setManualSubmitting(false);
    }
  };

  // ── Validate variable ──
  const handleValidateVariable = async () => {
    if (!actingVariable) return;
    setActionLoading(true);
    try {
      await api.patch(`/attendance/${workspaceId}/variables/${actingVariable.id}/validate`);
      toast.success("Variable validée avec succès");
      setValidateDialogOpen(false);
      setActingVariable(null);
      fetchVariables();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la validation");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Refuse variable ──
  const handleRefuseVariable = async () => {
    if (!actingVariable) return;
    setActionLoading(true);
    try {
      // P1-3 : le serveur lit noteValidation — l'ancien champ motifRefus
      // envoyé était silencieusement ignoré (motif jamais enregistré)
      await api.patch(`/attendance/${workspaceId}/variables/${actingVariable.id}/refuse`, {
        noteValidation: motifRefus || undefined,
      });
      toast.success("Variable refusée");
      setRefuseDialogOpen(false);
      setActingVariable(null);
      setMotifRefus("");
      fetchVariables();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du refus");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Drag & drop handlers ──
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  // Detail view
  if (selectedImport) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <BackToTools />
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1.5 text-muted-foreground hover:text-primary -ml-1"
          onClick={() => {
            setSelectedImport(null);
            setSummaries([]);
          }}
        >
          <ChevronLeft className="size-4" />
          Retour aux imports
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Détail de l'import
            </CardTitle>
            <CardDescription>
              {selectedImport.nomFichier === "saisie-manuelle"
                ? "Saisie manuelle"
                : selectedImport.nomFichier}{" "}
              — {formatMoisAnnee(selectedImport.mois, selectedImport.annee)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Client :</span>{" "}
                <span className="font-medium">{selectedImport.client_company?.raisonSociale || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Statut :</span>{" "}
                {getImportStatutBadge(selectedImport.statut)}
              </div>
              <div>
                <span className="text-muted-foreground">Lignes valides :</span>{" "}
                <span className="font-medium">{selectedImport.lignesOk}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Lignes anomalie :</span>{" "}
                <span className="font-medium text-amber-600">{selectedImport.lignesAnomalie}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date :</span>{" "}
                <span className="font-medium">{formatDate(selectedImport.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Taille :</span>{" "}
                <span className="font-medium">{formatFileSize(selectedImport.tailleFichier)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumés par salarié</CardTitle>
            <CardDescription>
              {summaries.length} salarié(s) dans cet import
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summariesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : summaries.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileSpreadsheet />
                  </EmptyMedia>
                  <EmptyTitle>Aucun résumé</EmptyTitle>
                  <EmptyDescription>Aucun résumé disponible pour cet import.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Nom & Prénom</TableHead>
                      <TableHead className="text-right">J. travaillés</TableHead>
                      <TableHead className="text-right">Congés payés</TableHead>
                      <TableHead className="text-right">Abs. justifiées</TableHead>
                      <TableHead className="text-right">Abs. non justifiées</TableHead>
                      <TableHead className="text-right">Heures sup.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.matricule}</TableCell>
                        <TableCell className="font-medium">{s.nomPrenom}</TableCell>
                        <TableCell className="text-right">{s.joursTravailles}</TableCell>
                        <TableCell className="text-right">{s.congesPayes}</TableCell>
                        <TableCell className="text-right">{s.absJustifiees}</TableCell>
                        <TableCell className="text-right">{s.absNonJustifiees}</TableCell>
                        <TableCell className="text-right">{s.heuresSup}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <BackToTools />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Clock className="size-6" />
            Gestion du Pointage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Import et suivi du pointage mensuel, variables de paie
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleDownloadTemplate}
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Template Excel</span>
        </Button>
      </div>

      <Tabs defaultValue="imports" className="w-full">
        <TabsList>
          <TabsTrigger value="imports" className="gap-1.5">
            <Upload className="size-4" />
            Imports
          </TabsTrigger>
          <TabsTrigger value="variables" className="gap-1.5">
            <FileSpreadsheet className="size-4" />
            Variables de paie
          </TabsTrigger>
        </TabsList>

        {/* ═══ Imports Tab ═══ */}
        <TabsContent value="imports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Imports de pointage</CardTitle>
                  <CardDescription>Historique des fichiers importés</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={fetchImports}
                    disabled={importsLoading}
                  >
                    <RefreshCw className={`size-4 ${importsLoading ? "animate-spin" : ""}`} />
                  </Button>
                  {peutEcrire && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setManualClient(clients.find((c) => c.statut !== "ARCHIVED")?.id ?? "");
                        setManualDialogOpen(true);
                      }}
                    >
                      <Keyboard className="size-4" />
                      <span className="hidden sm:inline">Saisie manuelle</span>
                    </Button>
                  )}
                  {peutEcrire && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-primary hover:bg-primary/90"
                      onClick={() => setImportDialogOpen(true)}
                    >
                      <Upload className="size-4" />
                      Importer un fichier
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {importsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : imports.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Upload />
                    </EmptyMedia>
                    <EmptyTitle>Aucun import</EmptyTitle>
                    <EmptyDescription>
                      Importez un fichier Excel/CSV de pointage, ou utilisez la saisie
                      manuelle pour pointer vos salariés sans fichier.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Mois / Année</TableHead>
                        <TableHead className="text-right">Nb salariés</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imports.map((imp) => (
                        <TableRow key={imp.id}>
                          <TableCell className="text-sm">{formatDate(imp.createdAt)}</TableCell>
                          <TableCell className="font-medium">
                            {imp.client_company?.raisonSociale || "—"}
                          </TableCell>
                          <TableCell>{formatMoisAnnee(imp.mois, imp.annee)}</TableCell>
                          <TableCell className="text-right">
                            {imp._count?.summaries ?? imp.lignesOk}
                          </TableCell>
                          <TableCell>{getImportStatutBadge(imp.statut)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => handleViewImport(imp)}
                            >
                              <Eye className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Variables de paie Tab ═══ */}
        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Variables de paie</CardTitle>
                  <CardDescription>Variables issues du pointage à valider ou refuser</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={fetchVariables}
                    disabled={variablesLoading}
                  >
                    <RefreshCw className={`size-4 ${variablesLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Select
                    value={variableStatutFilter}
                    onValueChange={(v) => setVariableStatutFilter(v === "TOUTES" ? "" : v)}
                  >
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <Search className="size-3.5 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TOUTES">Toutes</SelectItem>
                      <SelectItem value="PROPOSEE">En attente</SelectItem>
                      <SelectItem value="VALIDEe">Validée</SelectItem>
                      <SelectItem value="REFUSEe">Refusée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {variablesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : variables.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileSpreadsheet />
                    </EmptyMedia>
                    <EmptyTitle>Aucune variable</EmptyTitle>
                    <EmptyDescription>
                      Les variables de paie apparaissent ici après l'import d'un pointage ou une saisie manuelle.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employé</TableHead>
                        <TableHead className="text-right">Jours travaillés</TableHead>
                        <TableHead className="text-right">Taux présence</TableHead>
                        <TableHead className="text-right">Brut effectif</TableHead>
                        <TableHead className="text-right">Heures supp.</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variables.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">
                            {v.attendance_summary?.nomPrenom || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {v.joursTravailles}
                            {v.joursAbsence > 0 && (
                              <span className="text-destructive ml-1">(-{v.joursAbsence} j)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(v.tauxPresence * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {v.salaireBrutEffectif.toLocaleString("fr-TN", { maximumFractionDigits: 3 })} TND
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {v.heuresSupplementaires > 0 ? (
                              <>
                                {v.heuresSupplementaires} h
                                {v.montantHeuresSup != null && (
                                  <span className="text-muted-foreground ml-1">
                                    ({v.montantHeuresSup.toLocaleString("fr-TN", { maximumFractionDigits: 3 })} TND)
                                  </span>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{formatMoisAnnee(v.mois, v.annee)}</TableCell>
                          <TableCell>{getVariableStatutBadge(v.statut)}</TableCell>
                          <TableCell className="text-right">
                            {v.statut === "PROPOSEE" && (
                              <div className="flex gap-1 justify-end">
                                {peutEcrire && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => {
                                      setActingVariable(v);
                                      setValidateDialogOpen(true);
                                    }}
                                    title="Valider"
                                  >
                                    <CheckCircle2 className="size-4" />
                                  </Button>
                                )}
                                {peutEcrire && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setActingVariable(v);
                                      setMotifRefus("");
                                      setRefuseDialogOpen(true);
                                    }}
                                    title="Refuser"
                                  >
                                    <XCircle className="size-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Import Dialog ═══ */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              Importer un fichier de pointage
            </DialogTitle>
            <DialogDescription>
              Importez un fichier Excel ou CSV contenant les données de pointage mensuel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File upload zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : uploadFile
                    ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.ods"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="size-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">{uploadFile.name}</span>
                  <span className="text-xs text-muted-foreground">({formatFileSize(uploadFile.size)})</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="size-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Glissez-déposez un fichier ici ou <span className="text-primary underline">parcourir</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés : .xlsx, .xls, .csv, .ods (max 5 Mo)
                  </p>
                </div>
              )}
            </div>

            {/* Client select */}
            <div className="space-y-1.5">
              <Label>Entreprise cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.raisonSociale}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mois / Année */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Mois</Label>
                <Select value={selectedMois} onValueChange={setSelectedMois}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOIS_LABELS.map((label, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Année</Label>
                <Input
                  type="number"
                  min="2000"
                  max="2100"
                  value={selectedAnnee}
                  onChange={(e) => setSelectedAnnee(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || !uploadFile || !selectedClient}
              className="bg-primary hover:bg-primary/90"
            >
              {importing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Import en cours…
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-1.5" />
                  Importer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Saisie manuelle Dialog (exigence TPE) ═══ */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="size-5 text-primary" />
              Saisie manuelle du pointage
            </DialogTitle>
            <DialogDescription>
              Pointez vos salariés directement, sans fichier. Les mêmes contrôles que l'import
              sont appliqués (jours cohérents, matricules, salariés actifs) et les variables
              de paie sont créées à valider.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Société</Label>
              <Select value={manualClient} onValueChange={(v) => setManualClient(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir une société" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter((c) => c.statut !== "ARCHIVED").map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mois</Label>
              <Select value={manualMois} onValueChange={setManualMois}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOIS_LABELS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Année</Label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={manualAnnee}
                onChange={(e) => setManualAnnee(e.target.value)}
              />
            </div>
          </div>

          {/* Chargement des salariés à la sélection de la société */}
          {manualClient && manualEmployees.length === 0 && !manualLoading && (
            <p className="text-sm text-muted-foreground">
              Aucun salarié actif dans cette société — créez d'abord vos salariés (avec matricule CNSS).
            </p>
          )}
          {manualLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {manualEmployees.length > 0 && (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salarié</TableHead>
                    <TableHead className="w-[90px]">J. travaillés</TableHead>
                    <TableHead className="w-[80px]">Congés</TableHead>
                    <TableHead className="w-[80px]">Abs. just.</TableHead>
                    <TableHead className="w-[80px]">Abs. non just.</TableHead>
                    <TableHead className="w-[90px]">H. supp.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manualEmployees.map((emp) => {
                    const row = manualRows[emp.id] ?? EMPTY_MANUAL_LIGNE;
                    const saisissable = Boolean(emp.matriculeCnss);
                    return (
                      <TableRow key={emp.id} className={!saisissable ? "opacity-50" : ""}>
                        <TableCell className="text-sm font-medium">
                          {emp.lastName} {emp.firstName}
                          {!saisissable && (
                            <span className="block text-[11px] text-muted-foreground">
                              Matricule CNSS manquant — non pointable
                            </span>
                          )}
                        </TableCell>
                        {(["jt", "cp", "aj", "anj", "hs"] as const).map((field) => (
                          <TableCell key={field} className="p-1">
                            <Input
                              type="number"
                              min="0"
                              step={field === "hs" ? "0.5" : "0.5"}
                              disabled={!saisissable}
                              className="h-8 text-right text-sm font-mono"
                              value={row[field]}
                              onChange={(e) => setManualField(emp.id, field, e.target.value)}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-[11px] text-muted-foreground px-3 py-2">
                Laisser « J. travaillés » vide = 0 jour pour ce salarié. Une resaisie pour le même
                mois remplace la saisie manuelle précédente.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)} disabled={manualSubmitting}>
              Annuler
            </Button>
            <Button
              onClick={handleManualSubmit}
              disabled={manualSubmitting || !manualClient || manualEmployees.length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              {manualSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-1.5" />
                  Enregistrer le pointage
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Validate Dialog ═══ */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Valider la variable
            </DialogTitle>
            <DialogDescription>
              Confirmez la validation de ce pointage converti en variable de paie.
              {actingVariable && (
                <span className="block mt-2 font-medium text-foreground">
                  {actingVariable.attendance_summary?.nomPrenom} — {formatMoisAnnee(actingVariable.mois, actingVariable.annee)} :{" "}
                  {actingVariable.joursTravailles} j travaillés, {actingVariable.tauxPresence * 100 > 0 ? (actingVariable.tauxPresence * 100).toFixed(1) : "0"}% de présence,{" "}
                  brut effectif {actingVariable.salaireBrutEffectif.toLocaleString("fr-TN", { maximumFractionDigits: 3 })} TND
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateDialogOpen(false)} disabled={actionLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleValidateVariable}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="size-4 mr-1.5" />
              )}
              Confirmer la validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Refuse Dialog ═══ */}
      <Dialog open={refuseDialogOpen} onOpenChange={setRefuseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-red-600" />
              Refuser la variable
            </DialogTitle>
            <DialogDescription>
              Indiquez le motif de refus de cette variable.
              {actingVariable && (
                <span className="block mt-2 font-medium text-foreground">
                  {actingVariable.attendance_summary?.nomPrenom} — {formatMoisAnnee(actingVariable.mois, actingVariable.annee)} :{" "}
                  {actingVariable.joursTravailles} j travaillés, brut effectif {actingVariable.salaireBrutEffectif.toLocaleString("fr-TN", { maximumFractionDigits: 3 })} TND
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motif de refus (optionnel)</Label>
            <Textarea
              placeholder="Expliquez la raison du refus…"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseDialogOpen(false)} disabled={actionLoading}>
              Annuler
            </Button>
            <Button
              onClick={handleRefuseVariable}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <XCircle className="size-4 mr-1.5" />
              )}
              Confirmer le refus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
