// =============================================================================
// Le Fiduciaire — Gestion des Documents (Bulletins PDF, Exports, CNSS)
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

// Icons
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Download,
  Eye,
  RefreshCw,
  Loader2,
  Search,
  FolderOpen,
  File,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type TypeDocument =
  | "BULLETIN_PDF"
  | "EXPORT_EXCEL"
  | "EXPORT_CSV"
  | "EXPORT_CNSS"
  | "RAPPORT_GROUPE"
  | "ATTESTATION";

interface DocumentStorage {
  id: string;
  workspaceId: string;
  clientCompanyId?: string | null;
  payslipId?: string | null;
  cnssDeclarationId?: string | null;
  type: TypeDocument;
  nomFichier: string;
  cheminStockage: string;
  tailleOctets?: number | null;
  mimeType: string;
  mois?: number | null;
  annee?: number | null;
  periodePaieId?: string | null;
  generePar?: string | null;
  genereAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ClientCompany {
  id: string;
  raisonSociale: string;
}

// P2-1 : sélecteurs réels — plus jamais d'ID technique à copier-coller
interface PeriodePaie {
  id: string;
  mois: number;
  annee: number;
  statut: string;
  client_company?: { raisonSociale: string } | null;
  _count?: { payslips: number; anomalies: number };
}

interface PayslipSimple {
  id: string;
  matricule: string;
  nomPrenom: string;
  mois: number;
  annee: number;
  salaireNet?: number | null;
  salaireBrutEffectif?: number | null;
}

const MOIS_COURTS = [
  "Janv.", "Fév.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

const periodeLabel = (p: { mois: number; annee: number; statut?: string }) =>
  `${MOIS_COURTS[p.mois - 1] ?? p.mois} ${p.annee}${p.statut ? ` — ${p.statut}` : ""}`;

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: TypeDocument; label: string; badgeClass: string }[] = [
  {
    value: "BULLETIN_PDF",
    // P2-2 : honnêteté — le bulletin généré est du HTML imprimable (le
    // bouton « PDF » d'avant promettait un PDF qui n'existait pas)
    label: "Bulletin",
    badgeClass:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  },
  {
    value: "EXPORT_EXCEL",
    label: "Excel",
    badgeClass:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    value: "EXPORT_CSV",
    label: "CSV",
    badgeClass:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  },
  {
    value: "EXPORT_CNSS",
    label: "CNSS",
    badgeClass:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800",
  },
  {
    value: "RAPPORT_GROUPE",
    label: "Rapport",
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  },
  {
    value: "ATTESTATION",
    label: "Attestation",
    badgeClass:
      "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function formatFileSize(octets: number | null | undefined): string {
  if (!octets) return "—";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getTypeInfo(type: TypeDocument) {
  return TYPE_OPTIONS.find((t) => t.value === type) ?? {
    value: type,
    label: type,
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function GestionDocuments() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user) ?? "";
  // Permissions du workspace actif (miroir backend) — LECTEUR : lecture seule
  const roleWs = roleInWorkspace(user, workspaceId || null);
  const peutEcrire = can(roleWs, "write"); // générer PDF / Excel / CSV

  // ── State ─────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentStorage[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filtres
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterClient, setFilterClient] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs — génération
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [showExcelDialog, setShowExcelDialog] = useState(false);
  const [showCsvDialog, setShowCsvDialog] = useState(false);

  // P2-1 : sélecteurs (période → bulletin) — remplacement des inputs d'ID
  const [periods, setPeriods] = useState<PeriodePaie[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [payslips, setPayslips] = useState<PayslipSimple[]>([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [selectedPayslipId, setSelectedPayslipId] = useState("");

  // Dialog détail
  const [detailDoc, setDetailDoc] = useState<DocumentStorage | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Fetch documents ──────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    try {
      let path = `/documents/${workspaceId}`;
      const params: string[] = [];
      if (filterType && filterType !== "ALL") params.push(`type=${filterType}`);
      if (filterClient && filterClient !== "ALL")
        params.push(`clientCompanyId=${filterClient}`);
      if (params.length) path += `?${params.join("&")}`;

      const data = await api.get<DocumentStorage[]>(path);
      setDocuments(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des documents");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, filterType, filterClient]);

  // ── Fetch clients (pour le filtre) ───────────────────────────────────
  const fetchClients = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await api.get<ClientCompany[]>(
        `/clients/${workspaceId}/companies`
      );
      setClients(data);
    } catch {
      // Silencieux — le filtre client est optionnel
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // P2-1 : charger les périodes à l'ouverture d'un dialog de génération
  const fetchPeriods = useCallback(async () => {
    if (!workspaceId) return;
    setPeriodsLoading(true);
    try {
      const data = await api.get<PeriodePaie[]>(`/payroll/${workspaceId}/periods`);
      setPeriods(data);
    } catch {
      toast.error("Impossible de charger les périodes de paie");
    } finally {
      setPeriodsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (showPdfDialog || showExcelDialog || showCsvDialog) {
      setSelectedPeriodId("");
      setSelectedPayslipId("");
      setPayslips([]);
      fetchPeriods();
    }
  }, [showPdfDialog, showExcelDialog, showCsvDialog, fetchPeriods]);

  // P2-1 : charger les bulletins de la période choisie (dialog PDF)
  useEffect(() => {
    if (!showPdfDialog || !workspaceId || !selectedPeriodId) {
      setPayslips([]);
      return;
    }
    let cancelled = false;
    setPayslipsLoading(true);
    setSelectedPayslipId("");
    api
      .get<PayslipSimple[]>(`/payroll/${workspaceId}/payslips?periodId=${selectedPeriodId}`)
      .then((data) => {
        if (!cancelled) setPayslips(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Impossible de charger les bulletins de la période");
      })
      .finally(() => {
        if (!cancelled) setPayslipsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showPdfDialog, workspaceId, selectedPeriodId]);

  // ── Generate Bulletin (P2-1 : depuis le sélecteur, P2-2 : HTML imprimable)
  const handleGeneratePdf = async () => {
    if (!selectedPayslipId) {
      toast.error("Sélectionnez d'abord la période puis le bulletin");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await api.post<{
        message: string;
        document: DocumentStorage;
      }>(`/documents/payslips/${selectedPayslipId}/pdf`, { workspaceId });
      toast.success(result.message || "Bulletin généré — prêt à imprimer / enregistrer en PDF");
      setShowPdfDialog(false);
      fetchDocuments();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la génération du bulletin");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Export Excel ──────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!selectedPeriodId) {
      toast.error("Sélectionnez la période à exporter");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await api.post<{
        message: string;
        document: DocumentStorage;
      }>(`/documents/periods/${selectedPeriodId}/excel`, { workspaceId });
      toast.success(result.message || "Export Excel généré avec succès");
      setShowExcelDialog(false);
      fetchDocuments();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'export Excel");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Export CSV ────────────────────────────────────────────────────────
  const handleExportCsv = async () => {
    if (!selectedPeriodId) {
      toast.error("Sélectionnez la période à exporter");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await api.post<{
        message: string;
        document: DocumentStorage;
      }>(`/documents/periods/${selectedPeriodId}/csv`, { workspaceId });
      toast.success(result.message || "Export CSV généré avec succès");
      setShowCsvDialog(false);
      fetchDocuments();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'export CSV");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Download document ────────────────────────────────────────────────
  const handleDownload = (doc: DocumentStorage) => {
    // Pour les bulletins PDF, utiliser la route de téléchargement dédiée
    if (doc.payslipId && doc.type === "BULLETIN_PDF") {
      const url = `/api/documents/payslips/${doc.payslipId}/download?workspaceId=${workspaceId}`;
      // Lot 1 : session par cookie HttpOnly — le cookie accompagne le fetch,
      // on récupère le blob puis on déclenche le téléchargement.
      fetch(url, {
        credentials: "include",
      })
        .then((res) => {
          if (!res.ok) throw new Error("Erreur de téléchargement");
          return res.blob();
        })
        .then((blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = doc.nomFichier;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
          toast.success("Téléchargement lancé");
        })
        .catch(() => toast.error("Erreur lors du téléchargement"));
      return;
    }

    // Pour les autres types, on peut tenter de télécharger via le chemin de stockage
    // (le serveur n'a pas de route de download générique, donc on informe l'utilisateur)
    toast.info("Téléchargement disponible pour les bulletins PDF uniquement via cette interface");
  };

  // ── Voir détail ──────────────────────────────────────────────────────
  const handleViewDetail = async (doc: DocumentStorage) => {
    setDetailLoading(true);
    try {
      const data = await api.get<DocumentStorage>(
        `/documents/${workspaceId}/${doc.id}`
      );
      setDetailDoc(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement du détail");
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Filtered documents (search) ──────────────────────────────────────
  const filteredDocs = documents.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.nomFichier.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      d.mimeType.toLowerCase().includes(q)
    );
  });

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <BackToTools />

      {/* ─── Titre ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bulletins PDF, exports Excel/CSV, fichiers CNSS et autres documents
            générés
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-navy/20 dark:border-navy/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4 text-red-600" />
              Générer un bulletin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Bulletin de paie prêt à imprimer — sélectionnez la période puis
              le salarié (imprimer ou enregistrer en PDF depuis le navigateur).
            </p>
            {peutEcrire && (
              <Button
                size="sm"
                className="w-full bg-navy hover:bg-navy/90 text-white gap-1.5"
                onClick={() => setShowPdfDialog(true)}
              >
              <FileText className="size-3.5" />
              Générer le bulletin
            </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-navy/20 dark:border-navy/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-emerald-600" />
              Exporter période Excel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Exporter tous les bulletins d&apos;une période de paie au format
              Excel.
            </p>
            {peutEcrire && (
              <Button
                size="sm"
                className="w-full bg-navy hover:bg-navy/90 text-white gap-1.5"
                onClick={() => setShowExcelDialog(true)}
              >
              <FileSpreadsheet className="size-3.5" />
              Exporter Excel
            </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-navy/20 dark:border-navy/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileDown className="size-4 text-blue-600" />
              Exporter période CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Exporter tous les bulletins d&apos;une période de paie au format
              CSV.
            </p>
            {peutEcrire && (
              <Button
                size="sm"
                className="w-full bg-navy hover:bg-navy/90 text-white gap-1.5"
                onClick={() => setShowCsvDialog(true)}
              >
              <FileDown className="size-3.5" />
              Exporter CSV
            </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Filtres ─── */}
      <Card className="border-navy/10 dark:border-navy/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Recherche */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Recherche
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Nom du fichier, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* Filtre type */}
            <div className="min-w-[160px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Type de document
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les types</SelectItem>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre client */}
            <div className="min-w-[200px]">
              <Label className="text-xs text-muted-foreground mb-1 block">
                Client
              </Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.raisonSociale}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Table ─── */}
      <Card className="border-navy/10 dark:border-navy/30">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderOpen />
                </EmptyMedia>
                <EmptyTitle>Aucun document</EmptyTitle>
                <EmptyDescription>
                  {searchQuery || filterType !== "ALL" || filterClient !== "ALL"
                    ? "Aucun document ne correspond aux filtres sélectionnés. Essayez de modifier vos critères."
                    : "Aucun document n'a encore été généré. Utilisez les actions rapides ci-dessus pour générer des bulletins PDF ou des exports."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-xs font-semibold">
                      Nom du fichier
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-[100px]">
                      Type
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-[90px]">
                      Taille
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-[160px]">
                      Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold w-[140px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => {
                    const typeInfo = getTypeInfo(doc.type);
                    return (
                      <TableRow key={doc.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <File className="size-4 text-muted-foreground shrink-0" />
                            <span
                              className="text-sm font-medium truncate max-w-[300px]"
                              title={doc.nomFichier}
                            >
                              {doc.nomFichier}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${typeInfo.badgeClass}`}
                          >
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatFileSize(doc.tailleOctets)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(doc.genereAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-primary"
                              onClick={() => handleDownload(doc)}
                              title="Télécharger"
                            >
                              <Download className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-primary"
                              onClick={() => handleViewDetail(doc)}
                              title="Voir détail"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                          </div>
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

      {/* ─── Dialog: Générer Bulletin (P2-1 : sélecteurs, P2-2 : honnête) ─── */}
      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-red-600" />
              Générer un bulletin de paie
            </DialogTitle>
            <DialogDescription>
              Sélectionnez la période de paie puis le salarié. Le bulletin est
              généré en HTML prêt à imprimer — utilisez « Imprimer → Enregistrer
              en PDF » depuis le navigateur pour un PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Période de paie</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-full" disabled={periodsLoading}>
                  <SelectValue placeholder={periodsLoading ? "Chargement…" : "Choisir la période"} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {periodeLabel(p)}
                      {p._count ? ` (${p._count.payslips} bulletin(s))` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Bulletin (salarié)</Label>
              <Select
                value={selectedPayslipId}
                onValueChange={setSelectedPayslipId}
                disabled={!selectedPeriodId || payslipsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      !selectedPeriodId
                        ? "Choisissez d'abord la période"
                        : payslipsLoading
                          ? "Chargement…"
                          : payslips.length === 0
                            ? "Aucun bulletin calculé pour cette période"
                            : "Choisir le salarié"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {payslips.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nomPrenom} — {s.matricule}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPdfDialog(false)}
              disabled={isGenerating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleGeneratePdf}
              disabled={isGenerating || !selectedPayslipId}
              className="bg-navy hover:bg-navy/90 text-white gap-1.5"
            >
              {isGenerating && <Loader2 className="size-3.5 animate-spin" />}
              Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Exporter Excel (P2-1 : sélecteur de période) ─── */}
      <Dialog open={showExcelDialog} onOpenChange={setShowExcelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              Exporter période Excel
            </DialogTitle>
            <DialogDescription>
              Sélectionnez la période de paie à exporter au format Excel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Période de paie</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-full" disabled={periodsLoading}>
                  <SelectValue placeholder={periodsLoading ? "Chargement…" : "Choisir la période"} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {periodeLabel(p)}
                      {p._count ? ` (${p._count.payslips} bulletin(s))` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {periods.length === 0 && !periodsLoading && (
                <p className="text-xs text-muted-foreground">
                  Aucune période — ouvrez d'abord une période dans « Paie du mois ».
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExcelDialog(false)}
              disabled={isGenerating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={isGenerating || !selectedPeriodId}
              className="bg-navy hover:bg-navy/90 text-white gap-1.5"
            >
              {isGenerating && <Loader2 className="size-3.5 animate-spin" />}
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Exporter CSV (P2-1 : sélecteur de période) ─── */}
      <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="size-5 text-blue-600" />
              Exporter période CSV
            </DialogTitle>
            <DialogDescription>
              Sélectionnez la période de paie à exporter au format CSV.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Période de paie</Label>
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger className="w-full" disabled={periodsLoading}>
                  <SelectValue placeholder={periodsLoading ? "Chargement…" : "Choisir la période"} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {periodeLabel(p)}
                      {p._count ? ` (${p._count.payslips} bulletin(s))` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {periods.length === 0 && !periodsLoading && (
                <p className="text-xs text-muted-foreground">
                  Aucune période — ouvrez d'abord une période dans « Paie du mois ».
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCsvDialog(false)}
              disabled={isGenerating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleExportCsv}
              disabled={isGenerating || !selectedPeriodId}
              className="bg-navy hover:bg-navy/90 text-white gap-1.5"
            >
              {isGenerating && <Loader2 className="size-3.5 animate-spin" />}
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Détail du document ─── */}
      <Dialog
        open={!!detailDoc}
        onOpenChange={(open) => {
          if (!open) setDetailDoc(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-primary" />
              Détail du document
            </DialogTitle>
            <DialogDescription>
              Informations détaillées sur le document sélectionné.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : detailDoc ? (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ID :</span>
                  <p className="font-mono text-xs mt-0.5 break-all">
                    {detailDoc.id}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type :</span>
                  <p className="mt-0.5">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getTypeInfo(detailDoc.type).badgeClass}`}
                    >
                      {getTypeInfo(detailDoc.type).label}
                    </Badge>
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Nom du fichier :</span>
                  <p className="font-medium mt-0.5 break-all">
                    {detailDoc.nomFichier}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">MIME :</span>
                  <p className="text-xs mt-0.5">{detailDoc.mimeType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Taille :</span>
                  <p className="mt-0.5">
                    {formatFileSize(detailDoc.tailleOctets)}
                  </p>
                </div>
                {detailDoc.mois && detailDoc.annee && (
                  <div>
                    <span className="text-muted-foreground">Période :</span>
                    <p className="mt-0.5">
                      {detailDoc.mois}/{detailDoc.annee}
                    </p>
                  </div>
                )}
                {detailDoc.clientCompanyId && (
                  <div>
                    <span className="text-muted-foreground">Client :</span>
                    {/* 6-E (réévaluation) : nom lisible, plus jamais l'ID brut */}
                    <p className="mt-0.5">
                      {clients.find((c) => c.id === detailDoc.clientCompanyId)?.raisonSociale
                        ?? "Société supprimée ou inconnue"}
                    </p>
                  </div>
                )}
                {detailDoc.payslipId && (
                  <div>
                    <span className="text-muted-foreground">Réf. bulletin :</span>
                    <p className="font-mono text-xs mt-0.5 break-all">
                      {detailDoc.payslipId}
                    </p>
                  </div>
                )}
                {detailDoc.cnssDeclarationId && (
                  <div>
                    <span className="text-muted-foreground">
                      Réf. déclaration CNSS :
                    </span>
                    <p className="font-mono text-xs mt-0.5 break-all">
                      {detailDoc.cnssDeclarationId}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Généré le :</span>
                  <p className="mt-0.5">{formatDate(detailDoc.genereAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Créé le :</span>
                  <p className="mt-0.5">{formatDate(detailDoc.createdAt)}</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            {detailDoc && (
              <Button
                variant="outline"
                onClick={() => handleDownload(detailDoc)}
                className="gap-1.5"
              >
                <Download className="size-3.5" />
                Télécharger
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailDoc(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
