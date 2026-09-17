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

interface PayrollVariable {
  id: string;
  workspaceId: string;
  importId?: string;
  summaryId: string;
  employeeId?: string;
  mois: number;
  annee: number;
  typeVariable: string;
  valeur: number;
  statut: string;
  motifRefus?: string | null;
  noteValidation?: string | null;
  createdAt: string;
  attendance_summary?: { matricule: string; nomPrenom: string };
}

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
      await api.patch(`/attendance/${workspaceId}/variables/${actingVariable.id}/refuse`, {
        motifRefus: motifRefus || undefined,
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
              {selectedImport.nomFichier} — {formatMoisAnnee(selectedImport.mois, selectedImport.annee)}
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
                      Importez un fichier Excel ou CSV de pointage mensuel pour commencer.
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
                      Les variables de paie apparaîtront ici après l'import d'un fichier de pointage.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employé</TableHead>
                        <TableHead>Variable</TableHead>
                        <TableHead className="text-right">Valeur</TableHead>
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
                          <TableCell className="text-sm">{v.typeVariable}</TableCell>
                          <TableCell className="text-right font-mono">{v.valeur}</TableCell>
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

      {/* ═══ Validate Dialog ═══ */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Valider la variable
            </DialogTitle>
            <DialogDescription>
              Confirmez la validation de cette variable de paie.
              {actingVariable && (
                <span className="block mt-2 font-medium text-foreground">
                  {actingVariable.typeVariable} = {actingVariable.valeur} — {actingVariable.attendance_summary?.nomPrenom}
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
                  {actingVariable.typeVariable} = {actingVariable.valeur} — {actingVariable.attendance_summary?.nomPrenom}
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
