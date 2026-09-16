// =============================================================================
// Le Fiduciaire — Gestion CNSS (Déclarations trimestrielles CNSS)
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

// Icons
import {
  Plus,
  MoreHorizontal,
  Eye,
  Shield,
  CheckCircle2,
  FileDown,
  Archive,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type CnssStatut = "BROUILLON" | "CONTROLEE" | "GENEREE" | "ARCHIVEE";

interface ClientCompany {
  id: string;
  raisonSociale: string;
  matriculeFiscal?: string;
  matriculeCnss?: string;
  secteur?: string;
  statut?: string;
}

interface CnssDeclaration {
  id: string;
  workspaceId: string;
  clientCompanyId: string;
  annee: number;
  numeroTrimestre: number;
  trimestre: string;
  statut: CnssStatut;
  note?: string | null;
  nombreSalaries: number;
  totalSalaires: number;
  totalCotisationsSalariales: number;
  totalCotisationsPatronales: number;
  matriculesManquants?: number;
  createdAt: string;
  client_company: { id: string; raisonSociale: string; matriculeCnss?: string };
  _count?: { cnss_documents: number };
}

interface CnssDeclarationDetail extends CnssDeclaration {
  periodeMois1Id?: string | null;
  periodeMois2Id?: string | null;
  periodeMois3Id?: string | null;
  controlledBy?: string | null;
  dateControle?: string | null;
  generatedBy?: string | null;
  dateGeneration?: string | null;
  archivedBy?: string | null;
  dateArchivage?: string | null;
  cnss_documents?: { id: string; nomFichier: string; type: string }[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const TRIMESTRE_LABELS: Record<number, string> = {
  1: "1er trimestre",
  2: "2ème trimestre",
  3: "3ème trimestre",
  4: "4ème trimestre",
};

const STATUT_LABELS: Record<CnssStatut, string> = {
  BROUILLON: "Brouillon",
  CONTROLEE: "Contrôlée",
  GENEREE: "Générée",
  ARCHIVEE: "Archivée",
};

const STATUT_CLASSES: Record<CnssStatut, string> = {
  BROUILLON: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
  CONTROLEE: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  GENEREE: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  ARCHIVEE: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GestionCNSS() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user);
  // Permissions du workspace actif (miroir backend)
  const roleWs = roleInWorkspace(user, workspaceId);
  const peutEcrire = can(roleWs, "write");         // créer déclaration
  const peutGenerer = can(roleWs, "generateCnss"); // générer / régénérer export (P+G)
  const peutSoumettre = can(roleWs, "submitCnss"); // contrôler / archiver (P seul)

  // ── State ──────────────────────────────────────────────────────────────
  const [declarations, setDeclarations] = useState<CnssDeclaration[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterAnnee, setFilterAnnee] = useState<string>("all");

  // New declaration dialog
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newAnnee, setNewAnnee] = useState<string>(String(new Date().getFullYear()));
  const [newTrimestre, setNewTrimestre] = useState<string>("1");
  const [newNote, setNewNote] = useState("");
  const [creating, setCreating] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDecl, setDetailDecl] = useState<CnssDeclarationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Fetch declarations ────────────────────────────────────────────────
  const fetchDeclarations = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatut && filterStatut !== "all") params.set("statut", filterStatut);
      if (filterClient && filterClient !== "all") params.set("clientCompanyId", filterClient);
      if (filterAnnee && filterAnnee !== "all") params.set("annee", filterAnnee);

      const qs = params.toString();
      const data = await api.get<CnssDeclaration[]>(`/cnss/${workspaceId}/declarations${qs ? `?${qs}` : ""}`);
      setDeclarations(data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors du chargement des déclarations");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterStatut, filterClient, filterAnnee]);

  // ── Fetch clients ─────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await api.get<ClientCompany[]>(`/clients/${workspaceId}`);
      setClients(data);
    } catch {
      // silent — clients are supplementary
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Create declaration ────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!workspaceId || !newClientId || !newAnnee || !newTrimestre) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setCreating(true);
    try {
      await api.post("/cnss/declarations", {
        workspaceId,
        clientCompanyId: newClientId,
        annee: parseInt(newAnnee, 10),
        numeroTrimestre: parseInt(newTrimestre, 10),
        note: newNote || undefined,
      });
      toast.success("Déclaration CNSS créée avec succès");
      setOpenNewDialog(false);
      setNewClientId("");
      setNewAnnee(String(new Date().getFullYear()));
      setNewTrimestre("1");
      setNewNote("");
      fetchDeclarations();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de la création de la déclaration");
    } finally {
      setCreating(false);
    }
  };

  // ── View detail ───────────────────────────────────────────────────────
  const handleViewDetail = async (decl: CnssDeclaration) => {
    if (!workspaceId) return;
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await api.get<CnssDeclarationDetail>(`/cnss/${workspaceId}/declarations/${decl.id}`);
      setDetailDecl(data);
    } catch {
      // Fallback: use list item data
      setDetailDecl(decl as CnssDeclarationDetail);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Status transition actions ─────────────────────────────────────────
  const handleControler = async (decl: CnssDeclaration) => {
    if (!workspaceId) return;
    setActionLoading(decl.id);
    try {
      const updated = await api.patch<CnssDeclaration>(`/cnss/${workspaceId}/declarations/${decl.id}/controler`);
      toast.success(`Déclaration contrôlée — ${decl.client_company.raisonSociale} ${TRIMESTRE_LABELS[decl.numeroTrimestre]} ${decl.annee}`);
      updateDeclarationInList(updated);
      if (detailDecl?.id === decl.id) {
        setDetailDecl(prev => prev ? { ...prev, ...updated } : null);
      }
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors du contrôle");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerer = async (decl: CnssDeclaration) => {
    if (!workspaceId) return;
    setActionLoading(decl.id);
    try {
      const result = await api.patch<{ declaration: CnssDeclaration }>(`/cnss/${workspaceId}/declarations/${decl.id}/generer`);
      toast.success(`Déclaration générée — fichier export créé`);
      updateDeclarationInList(result.declaration || result);
      if (detailDecl?.id === decl.id) {
        setDetailDecl(prev => prev ? { ...prev, ...(result.declaration || result) } : null);
      }
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de la génération");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchiver = async (decl: CnssDeclaration) => {
    if (!workspaceId) return;
    setActionLoading(decl.id);
    try {
      const updated = await api.patch<CnssDeclaration>(`/cnss/${workspaceId}/declarations/${decl.id}/archiver`);
      toast.success(`Déclaration archivée`);
      updateDeclarationInList(updated);
      if (detailDecl?.id === decl.id) {
        setDetailDecl(prev => prev ? { ...prev, ...updated } : null);
      }
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de l'archivage");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Export & Download ─*────────────────────────────────────────────────
  const handleExport = async (decl: CnssDeclaration) => {
    if (!workspaceId) return;
    setActionLoading(decl.id);
    try {
      await api.post(`/cnss/declarations/${decl.id}/export`, { workspaceId });
      toast.success("Fichier export CNSS généré avec succès");
      fetchDeclarations();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de l'export");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (decl: CnssDeclaration) => {
    if (!workspaceId) return;
    try {
      const token = localStorage.getItem("fiduciaire_token");
      const res = await fetch(`/api/cnss/declarations/${decl.id}/download?workspaceId=${workspaceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors du téléchargement");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?(.+?)"?$/);
      a.download = match?.[1] || `cnss_export_${decl.id}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Fichier téléchargé");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  // ── Helper: update declaration in list ────────────────────────────────
  const updateDeclarationInList = (updated: CnssDeclaration) => {
    setDeclarations(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
  };

  // ── Available years for filter ────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <BackToTools />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-gold flex items-center gap-2">
            <Shield className="size-6" />
            Déclarations CNSS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des déclarations trimestrielles CNSS
          </p>
        </div>
        {peutEcrire && (
          <Button
            onClick={() => setOpenNewDialog(true)}
            className="bg-navy-800 hover:bg-navy-900 text-white gap-1.5"
          >
            <Plus className="size-4" />
            Nouvelle déclaration
          </Button>
        )}
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Statut</Label>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="BROUILLON">Brouillon</SelectItem>
                  <SelectItem value="CONTROLEE">Contrôlée</SelectItem>
                  <SelectItem value="GENEREE">Générée</SelectItem>
                  <SelectItem value="ARCHIVEE">Archivée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.raisonSociale}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[120px]">
              <Label className="text-xs text-muted-foreground mb-1 block">Année</Label>
              <Select value={filterAnnee} onValueChange={setFilterAnnee}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes les années" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => fetchDeclarations()}
            >
              <RefreshCw className="size-3.5" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : declarations.length === 0 ? (
            <Empty className="m-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shield className="size-6" />
                </EmptyMedia>
                <EmptyTitle>Aucune déclaration CNSS</EmptyTitle>
                <EmptyDescription>
                  Créez votre première déclaration trimestrielle CNSS pour commencer.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Année</TableHead>
                    <TableHead className="font-semibold">Trimestre</TableHead>
                    <TableHead className="font-semibold text-right">Nb salariés</TableHead>
                    <TableHead className="font-semibold text-right">Total assujetti</TableHead>
                    <TableHead className="font-semibold text-right">Cotisations</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.map((decl) => {
                    const totalCotisations = (decl.totalCotisationsSalariales || 0) + (decl.totalCotisationsPatronales || 0);
                    const isActionLoading = actionLoading === decl.id;

                    return (
                      <TableRow key={decl.id} className="group">
                        <TableCell className="font-medium">
                          {decl.client_company?.raisonSociale || "—"}
                        </TableCell>
                        <TableCell>{decl.annee}</TableCell>
                        <TableCell>{TRIMESTRE_LABELS[decl.numeroTrimestre] || `Q${decl.numeroTrimestre}`}</TableCell>
                        <TableCell className="text-right">{decl.nombreSalaries ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {decl.totalSalaires != null ? formatMoney(decl.totalSalaires) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {totalCotisations > 0 ? formatMoney(totalCotisations) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUT_CLASSES[decl.statut]}>
                            {STATUT_LABELS[decl.statut]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 opacity-60 group-hover:opacity-100"
                                disabled={isActionLoading}
                              >
                                {isActionLoading ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="size-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewDetail(decl)} className="gap-2">
                                <Eye className="size-4" /> Voir détail
                              </DropdownMenuItem>

                              {decl.statut === "BROUILLON" && peutSoumettre && (
                                <DropdownMenuItem onClick={() => handleControler(decl)} className="gap-2">
                                  <CheckCircle2 className="size-4" /> Contrôler
                                </DropdownMenuItem>
                              )}

                              {decl.statut === "CONTROLEE" && peutGenerer && (
                                <DropdownMenuItem onClick={() => handleGenerer(decl)} className="gap-2">
                                  <FileDown className="size-4" /> Générer
                                </DropdownMenuItem>
                              )}

                              {decl.statut === "GENEREE" && (
                                <>
                                  {peutSoumettre && (
                                    <DropdownMenuItem onClick={() => handleArchiver(decl)} className="gap-2">
                                      <Archive className="size-4" /> Archiver
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDownload(decl)} className="gap-2">
                                    <Download className="size-4" /> Télécharger
                                  </DropdownMenuItem>
                                </>
                              )}

                              {decl.statut === "ARCHIVEE" && (
                                <DropdownMenuItem onClick={() => handleDownload(decl)} className="gap-2">
                                  <Download className="size-4" /> Télécharger
                                </DropdownMenuItem>
                              )}

                              {(decl.statut === "GENEREE" || decl.statut === "ARCHIVEE") && decl.statut === "GENEREE" && (
                                <DropdownMenuSeparator />
                              )}

                              {(decl.statut === "GENEREE" || decl.statut === "ARCHIVEE") && peutGenerer && (
                                <DropdownMenuItem onClick={() => handleExport(decl)} className="gap-2">
                                  <FileDown className="size-4" /> Régénérer export
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── New Declaration Dialog ── */}
      <Dialog open={openNewDialog} onOpenChange={setOpenNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-900 dark:text-gold">
              <Shield className="size-5" />
              Nouvelle déclaration CNSS
            </DialogTitle>
            <DialogDescription>
              Créer une déclaration trimestrielle CNSS pour un client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cnss-client">Client *</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
                <SelectTrigger id="cnss-client">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cnss-annee">Année *</Label>
                <Select value={newAnnee} onValueChange={setNewAnnee}>
                  <SelectTrigger id="cnss-annee">
                    <SelectValue placeholder="Année" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnss-trimestre">Trimestre *</Label>
                <Select value={newTrimestre} onValueChange={setNewTrimestre}>
                  <SelectTrigger id="cnss-trimestre">
                    <SelectValue placeholder="Trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1er trimestre</SelectItem>
                    <SelectItem value="2">2ème trimestre</SelectItem>
                    <SelectItem value="3">3ème trimestre</SelectItem>
                    <SelectItem value="4">4ème trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnss-note">Note (optionnel)</Label>
              <Textarea
                id="cnss-note"
                placeholder="Note interne..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenNewDialog(false)} disabled={creating}>
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newClientId}
              className="bg-navy-800 hover:bg-navy-900 text-white gap-1.5"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-900 dark:text-gold">
              <Shield className="size-5" />
              Détail de la déclaration
            </DialogTitle>
            <DialogDescription>
              Informations détaillées de la déclaration CNSS
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailDecl ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Client</span>
                  <p className="font-medium">{detailDecl.client_company?.raisonSociale || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Matricule CNSS</span>
                  <p className="font-medium font-mono">{detailDecl.client_company?.matriculeCnss || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Année</span>
                  <p className="font-medium">{detailDecl.annee}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trimestre</span>
                  <p className="font-medium">{TRIMESTRE_LABELS[detailDecl.numeroTrimestre]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Nb salariés</span>
                  <p className="font-medium">{detailDecl.nombreSalaries ?? "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Matricules manquants</span>
                  <p className="font-medium">{detailDecl.matriculesManquants ?? 0}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total assujetti</span>
                  <p className="font-medium font-mono">
                    {detailDecl.totalSalaires != null ? formatMoney(detailDecl.totalSalaires) : "—"} TND
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cotisations salariales</span>
                  <p className="font-medium font-mono">
                    {formatMoney(detailDecl.totalCotisationsSalariales || 0)} TND
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cotisations patronales</span>
                  <p className="font-medium font-mono">
                    {formatMoney(detailDecl.totalCotisationsPatronales || 0)} TND
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total cotisations</span>
                  <p className="font-medium font-mono text-navy-800 dark:text-gold">
                    {formatMoney((detailDecl.totalCotisationsSalariales || 0) + (detailDecl.totalCotisationsPatronales || 0))} TND
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Statut</span>
                  <div className="mt-1">
                    <Badge variant="outline" className={STATUT_CLASSES[detailDecl.statut]}>
                      {STATUT_LABELS[detailDecl.statut]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Créée le</span>
                  <p className="font-medium">{formatDate(detailDecl.createdAt)}</p>
                </div>
                {detailDecl.dateControle && (
                  <div>
                    <span className="text-muted-foreground">Date contrôle</span>
                    <p className="font-medium">{formatDate(detailDecl.dateControle)}</p>
                  </div>
                )}
                {detailDecl.dateGeneration && (
                  <div>
                    <span className="text-muted-foreground">Date génération</span>
                    <p className="font-medium">{formatDate(detailDecl.dateGeneration)}</p>
                  </div>
                )}
                {detailDecl.dateArchivage && (
                  <div>
                    <span className="text-muted-foreground">Date archivage</span>
                    <p className="font-medium">{formatDate(detailDecl.dateArchivage)}</p>
                  </div>
                )}
              </div>

              {detailDecl.note && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Note</span>
                    <p className="mt-1 whitespace-pre-wrap">{detailDecl.note}</p>
                  </div>
                </>
              )}

              {/* Detail actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {detailDecl.statut === "BROUILLON" && (
                  <Button
                    size="sm"
                    onClick={() => { handleControler(detailDecl); }}
                    disabled={actionLoading === detailDecl.id}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckCircle2 className="size-3.5" /> Contrôler
                  </Button>
                )}
                {detailDecl.statut === "CONTROLEE" && (
                  <Button
                    size="sm"
                    onClick={() => { handleGenerer(detailDecl); }}
                    disabled={actionLoading === detailDecl.id}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <FileDown className="size-3.5" /> Générer
                  </Button>
                )}
                {detailDecl.statut === "GENEREE" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { handleArchiver(detailDecl); }}
                      disabled={actionLoading === detailDecl.id}
                      className="gap-1.5"
                    >
                      <Archive className="size-3.5" /> Archiver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { handleDownload(detailDecl); }}
                      className="gap-1.5"
                    >
                      <Download className="size-3.5" /> Télécharger
                    </Button>
                  </>
                )}
                {detailDecl.statut === "ARCHIVEE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { handleDownload(detailDecl); }}
                    className="gap-1.5"
                  >
                    <Download className="size-3.5" /> Télécharger
                  </Button>
                )}
                {(detailDecl.statut === "GENEREE" || detailDecl.statut === "ARCHIVEE") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { handleExport(detailDecl); }}
                    disabled={actionLoading === detailDecl.id}
                    className="gap-1.5"
                  >
                    <FileDown className="size-3.5" /> Régénérer export
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Aucune donnée disponible
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
