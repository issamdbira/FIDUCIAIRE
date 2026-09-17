// =============================================================================
// Le Fiduciaire — Gestion de la Paie (Périodes de paie)
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
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Lock,
  XCircle,
  Banknote,
  ChevronLeft,
  Search,
  RefreshCw,
  FileText,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type PeriodStatut = "OPEN" | "CALCULATED" | "TO_REVIEW" | "VALIDATED" | "CLOSED";

interface ClientCompany {
  id: string;
  raisonSociale: string;
  matriculeFiscal?: string;
  matriculeCnss?: string;
  secteur?: string;
  statut?: string;
}

interface PayrollPeriod {
  id: string;
  workspaceId: string;
  clientCompanyId: string;
  mois: number;
  annee: number;
  statut: PeriodStatut;
  note?: string | null;
  openedBy?: string;
  calculatedBy?: string;
  validatedBy?: string;
  closedAt?: string | null;
  createdAt: string;
  client_company: { id: string; raisonSociale: string };
  _count: { payslips: number; anomalies: number };
}

// Miroir de MassPayrollResult (server/lib/payroll-engine.ts) — P1-1
interface CalculateResult {
  bulletinsCreated: number;
  anomaliesCreated: number;
  skippedNoContract: number;
  skippedNoAttendance: number;
  errors: string[];
}

interface Payslip {
  id: string;
  nomPrenom: string;
  matricule?: string;
  statut: string;
  salaireBrutContractuel?: number;
  salaireBrutEffectif?: number;
  salaireNet?: number;
  totalRetenuesSalariales?: number;
  retenueCnssSalarial?: number;
  retenueIrpp?: number;
  retenueCss?: number;
  baseImposable?: number;
  netAPayer?: number;
  mois: number;
  annee: number;
}

interface Anomaly {
  id: string;
  code: string; // P2-4 : le modèle Anomaly porte « code » (ex. CONTRAT_MANQUANT) — « type » n’existe pas
  message: string;
  niveau: "BLOQUANTE" | "AVERTISSEMENT" | "INFO";
  estResolue: boolean;
  noteResolution?: string | null;
  employeeName?: string;
  createdAt: string;
}

const MOIS_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUT_LABELS: Record<PeriodStatut, string> = {
  OPEN: "Ouverte",
  CALCULATED: "Calculée",
  TO_REVIEW: "À revoir",
  VALIDATED: "Validée",
  CLOSED: "Clôturée",
};

const STATUT_CLASSES: Record<PeriodStatut, string> = {
  OPEN: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  CALCULATED: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  TO_REVIEW: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
  VALIDATED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
};

const ANOMALY_NIVEAU_CLASSES: Record<string, string> = {
  BLOQUANTE: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
  AVERTISSEMENT: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  INFO: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function GestionPaie() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user);
  // Permissions du workspace actif (miroir backend)
  const roleWs = roleInWorkspace(user, workspaceId);
  const peutEcrire = can(roleWs, "write");       // ouvrir période, calculer, revoir
  const peutValider = can(roleWs, "writePayroll"); // valider (P+G)
  const peutCloturer = can(roleWs, "closePeriod"); // clôturer (P seul)

  // ── State ──────────────────────────────────────────────────────────────
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatingId, setCalculatingId] = useState<string | null>(null);

  // Filters
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterMois, setFilterMois] = useState<string>("all");
  const [filterAnnee, setFilterAnnee] = useState<string>("all");

  // Dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [detailPeriod, setDetailPeriod] = useState<PayrollPeriod | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [resolveDialogAnomaly, setResolveDialogAnomaly] = useState<Anomaly | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  // New period form
  const [newClientId, setNewClientId] = useState("");
  const [newMois, setNewMois] = useState<string>(String(new Date().getMonth() + 1));
  const [newAnnee, setNewAnnee] = useState<string>(String(new Date().getFullYear()));
  const [newNote, setNewNote] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Fetch periods ─────────────────────────────────────────────────────
  const fetchPeriods = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatut && filterStatut !== "all") params.set("statut", filterStatut);
      if (filterClient && filterClient !== "all") params.set("clientCompanyId", filterClient);
      if (filterMois && filterMois !== "all") params.set("mois", filterMois);
      if (filterAnnee && filterAnnee !== "all") params.set("annee", filterAnnee);

      const qs = params.toString();
      const data = await api.get<PayrollPeriod[]>(`/payroll/${workspaceId}/periods${qs ? `?${qs}` : ""}`);
      setPeriods(data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors du chargement des périodes");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filterStatut, filterClient, filterMois, filterAnnee]);

  // ── Fetch clients for filters & new period dialog ────────────────────
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
    fetchPeriods();
  }, [fetchPeriods]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Open new period ──────────────────────────────────────────────────
  const handleOpenPeriod = async () => {
    if (!workspaceId || !newClientId || !newMois || !newAnnee) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    setCreating(true);
    try {
      await api.post("/payroll/periods", {
        workspaceId,
        clientCompanyId: newClientId,
        mois: parseInt(newMois, 10),
        annee: parseInt(newAnnee, 10),
        note: newNote || undefined,
      });
      toast.success("Période de paie ouverte avec succès");
      setOpenDialog(false);
      setNewClientId("");
      setNewMois(String(new Date().getMonth() + 1));
      setNewAnnee(String(new Date().getFullYear()));
      setNewNote("");
      fetchPeriods();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de l'ouverture de la période");
    } finally {
      setCreating(false);
    }
  };

  // ── Actions ──────────────────────────────────────────────────────────
  // P1-1 : 200 ≠ succès métier — le moteur renvoie { result: { errors[],
  // bulletinsCreated, skippedNoContract, skippedNoAttendance } }. L'ancien
  // code affichait « Calcul effectué » même avec 0 bulletin et des erreurs.
  const handleCalculate = async (period: PayrollPeriod) => {
    if (!workspaceId) return;
    setCalculatingId(period.id);
    try {
      const data = await api.patch<{ period: PayrollPeriod; result: CalculateResult }>(
        `/payroll/${workspaceId}/periods/${period.id}/calculate`
      );
      const r = data?.result;
      const label = `${period.client_company.raisonSociale} — ${MOIS_LABELS[period.mois - 1]} ${period.annee}`;

      if (r && r.errors.length > 0) {
        toast.error(`Calcul échoué (${label}) : ${r.errors.slice(0, 2).join(" ; ")}${r.errors.length > 2 ? "…" : ""}`);
      } else if (r && r.bulletinsCreated === 0) {
        const causes: string[] = [];
        if (r.skippedNoContract > 0) causes.push(`${r.skippedNoContract} salarié(s) sans contrat actif`);
        if (r.skippedNoAttendance > 0) causes.push(`${r.skippedNoAttendance} salarié(s) sans pointage`);
        toast.warning(
          `Aucun bulletin généré (${label})${causes.length ? " — " + causes.join(", ") : " — vérifiez les salariés, contrats et pointages"}`,
          { duration: 7000 }
        );
      } else {
        const details: string[] = [`${r?.bulletinsCreated ?? "?"} bulletin(s)`];
        if (r?.anomaliesCreated) details.push(`${r.anomaliesCreated} anomalie(s)`);
        if (r?.skippedNoContract) details.push(`${r.skippedNoContract} sans contrat`);
        if (r?.skippedNoAttendance) details.push(`${r.skippedNoAttendance} sans pointage`);
        toast.success(`Paie calculée — ${details.join(", ")} (${label})`, { duration: 7000 });
      }

      fetchPeriods();
      // If detail view is open for this period, refresh it
      if (detailPeriod?.id === period.id) {
        fetchDetail(period.id);
      }
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors du calcul");
    } finally {
      setCalculatingId(null);
    }
  };

  const handleReview = async (period: PayrollPeriod) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/payroll/${workspaceId}/periods/${period.id}/review`);
      toast.success("Période marquée « À revoir »");
      fetchPeriods();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur");
    }
  };

  const handleValidate = async (period: PayrollPeriod) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/payroll/${workspaceId}/periods/${period.id}/validate`);
      toast.success("Période validée avec succès");
      fetchPeriods();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de la validation");
    }
  };

  const handleClose = async (period: PayrollPeriod) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/payroll/${workspaceId}/periods/${period.id}/close`);
      toast.success("Période clôturée");
      fetchPeriods();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de la clôture");
    }
  };

  // ── Detail view ──────────────────────────────────────────────────────
  const fetchDetail = async (periodId: string) => {
    if (!workspaceId) return;
    setDetailLoading(true);
    try {
      const [periodData, payslipsData, anomaliesData] = await Promise.all([
        api.get<PayrollPeriod>(`/payroll/${workspaceId}/periods/${periodId}`),
        api.get<Payslip[]>(`/payroll/${workspaceId}/payslips?periodId=${periodId}`),
        api.get<Anomaly[]>(`/payroll/${workspaceId}/anomalies?periodId=${periodId}`),
      ]);
      setDetailPeriod(periodData);
      setPayslips(payslipsData);
      setAnomalies(anomaliesData);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors du chargement du détail");
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (period: PayrollPeriod) => {
    setDetailPeriod(period);
    fetchDetail(period.id);
  };

  const closeDetail = () => {
    setDetailPeriod(null);
    setPayslips([]);
    setAnomalies([]);
  };

  // ── Resolve anomaly ──────────────────────────────────────────────────
  const handleResolveAnomaly = async () => {
    if (!workspaceId || !resolveDialogAnomaly) return;
    try {
      await api.patch(`/payroll/${workspaceId}/anomalies/${resolveDialogAnomaly.id}/resolve`, {
        noteResolution: resolutionNote || undefined,
      });
      toast.success("Anomalie résolue");
      setResolveDialogAnomaly(null);
      setResolutionNote("");
      // Refresh detail
      if (detailPeriod) fetchDetail(detailPeriod.id);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || "Erreur lors de la résolution");
    }
  };

  // ── Available years for filter ────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // ── Format currency ───────────────────────────────────────────────────
  const fmtMoney = (v?: number | null) => {
    if (v == null) return "—";
    return v.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  // ── Guard: no workspace ──────────────────────────────────────────────
  if (!workspaceId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackToTools />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Banknote /></EmptyMedia>
            <EmptyTitle>Aucun workspace</EmptyTitle>
            <EmptyDescription>Vous devez être associé à un workspace pour accéder à la gestion de la paie.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // ── Detail View ──────────────────────────────────────────────────────
  if (detailPeriod) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={closeDetail} className="gap-1.5">
            <ChevronLeft className="size-4" />
            Retour
          </Button>
        </div>

        {detailLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {/* Period Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Banknote className="size-5 text-gold" />
                    {detailPeriod.client_company.raisonSociale} — {MOIS_LABELS[detailPeriod.mois - 1]} {detailPeriod.annee}
                  </CardTitle>
                  <Badge className={STATUT_CLASSES[detailPeriod.statut]}>
                    {STATUT_LABELS[detailPeriod.statut]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nb fiches de paie</span>
                    <p className="font-semibold mt-0.5">{detailPeriod._count.payslips}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nb anomalies</span>
                    <p className="font-semibold mt-0.5">{detailPeriod._count.anomalies}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ouverte le</span>
                    <p className="font-semibold mt-0.5">{new Date(detailPeriod.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Note</span>
                    <p className="font-semibold mt-0.5">{detailPeriod.note || "—"}</p>
                  </div>
                </div>

                {/* Action buttons for detail */}
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {(detailPeriod.statut === "OPEN" || detailPeriod.statut === "TO_REVIEW") && peutEcrire && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleCalculate(detailPeriod)}
                      disabled={calculatingId === detailPeriod.id}
                    >
                      {calculatingId === detailPeriod.id ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
                      {calculatingId === detailPeriod.id ? "Calcul en cours…" : "Calculer"}
                    </Button>
                  )}
                  {detailPeriod.statut === "CALCULATED" && peutEcrire && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleReview(detailPeriod)}>
                      <AlertTriangle className="size-4" />
                      Marquer à revoir
                    </Button>
                  )}
                  {(detailPeriod.statut === "CALCULATED" || detailPeriod.statut === "TO_REVIEW") && peutValider && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleValidate(detailPeriod)}>
                      <CheckCircle2 className="size-4" />
                      Valider
                    </Button>
                  )}
                  {detailPeriod.statut === "VALIDATED" && peutCloturer && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleClose(detailPeriod)}>
                      <Lock className="size-4" />
                      Clôturer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payslips Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4 text-gold" />
                  Fiches de paie ({payslips.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payslips.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune fiche de paie. Lancez le calcul pour générer les bulletins.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom / Prénom</TableHead>
                          <TableHead>Matricule</TableHead>
                          <TableHead className="text-right">Salaire brut</TableHead>
                          <TableHead className="text-right">Cotisations</TableHead>
                          <TableHead className="text-right">IRPP</TableHead>
                          <TableHead className="text-right">Salaire net</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payslips.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.nomPrenom}</TableCell>
                            <TableCell className="text-muted-foreground">{p.matricule || "—"}</TableCell>
                            <TableCell className="text-right">{fmtMoney(p.salaireBrutEffectif ?? p.salaireBrutContractuel)}</TableCell>
                            <TableCell className="text-right">{fmtMoney(p.totalRetenuesSalariales)}</TableCell>
                            <TableCell className="text-right">{fmtMoney(p.retenueIrpp)}</TableCell>
                            <TableCell className="text-right font-semibold text-gold">{fmtMoney(p.salaireNet)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{p.statut}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anomalies Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Anomalies ({anomalies.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {anomalies.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune anomalie détectée.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Niveau</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Employé</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {anomalies.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Badge className={ANOMALY_NIVEAU_CLASSES[a.niveau] || ""}>
                                {a.niveau}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">{a.code}</TableCell>
                            <TableCell className="max-w-xs truncate">{a.message}</TableCell>
                            <TableCell>{a.employeeName || "—"}</TableCell>
                            <TableCell>
                              {a.estResolue ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Résolue
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Non résolue</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!a.estResolue && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-emerald-600 hover:text-emerald-700"
                                  onClick={() => {
                                    setResolveDialogAnomaly(a);
                                    setResolutionNote("");
                                  }}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  Résoudre
                                </Button>
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
          </>
        )}

        {/* Resolve Anomaly Dialog */}
        <Dialog open={!!resolveDialogAnomaly} onOpenChange={(open) => { if (!open) setResolveDialogAnomaly(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Résoudre l'anomalie</DialogTitle>
              <DialogDescription>
                {resolveDialogAnomaly && (
                  <span className="block mt-1">
                    <Badge className={ANOMALY_NIVEAU_CLASSES[resolveDialogAnomaly.niveau] || ""}>
                      {resolveDialogAnomaly.niveau}
                    </Badge>{" "}
                    {resolveDialogAnomaly.message}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="resolutionNote">Note de résolution (optionnel)</Label>
              <Textarea
                id="resolutionNote"
                placeholder="Décrivez la correction apportée…"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialogAnomaly(null)}>
                Annuler
              </Button>
              <Button onClick={handleResolveAnomaly} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="size-4 mr-1.5" />
                Marquer résolue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Main List View ───────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <BackToTools />
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="size-6 text-gold" />
            Gestion de la Paie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des périodes de paie et des bulletins de salaire
          </p>
        </div>
        {peutEcrire && (
          <Button onClick={() => setOpenDialog(true)} className="gap-1.5 bg-navy-800 hover:bg-navy-900 text-white">
            <Plus className="size-4" />
            Ouvrir période
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 min-w-[140px]">
              <Label className="text-xs text-muted-foreground">Statut</Label>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="OPEN">Ouverte</SelectItem>
                  <SelectItem value="CALCULATED">Calculée</SelectItem>
                  <SelectItem value="TO_REVIEW">À revoir</SelectItem>
                  <SelectItem value="VALIDATED">Validée</SelectItem>
                  <SelectItem value="CLOSED">Clôturée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Client</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">Mois</Label>
              <Select value={filterMois} onValueChange={setFilterMois}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {MOIS_LABELS.map((label, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 min-w-[100px]">
              <Label className="text-xs text-muted-foreground">Année</Label>
              <Select value={filterAnnee} onValueChange={setFilterAnnee}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="sm" className="gap-1.5" onClick={fetchPeriods}>
              <RefreshCw className="size-3.5" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Periods Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : periods.length === 0 ? (
            <Empty className="m-4">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Banknote /></EmptyMedia>
                <EmptyTitle>Aucune période de paie</EmptyTitle>
                <EmptyDescription>
                  Ouvrez une nouvelle période de paie pour commencer le traitement des bulletins de salaire.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Mois / Année</TableHead>
                    <TableHead className="text-center">Nb fiches</TableHead>
                    <TableHead className="text-center">Nb anomalies</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.client_company.raisonSociale}</TableCell>
                      <TableCell>{MOIS_LABELS[p.mois - 1]} {p.annee}</TableCell>
                      <TableCell className="text-center">{p._count.payslips}</TableCell>
                      <TableCell className="text-center">
                        {p._count.anomalies > 0 ? (
                          <span className="text-amber-600 font-medium">{p._count.anomalies}</span>
                        ) : (
                          <span>0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUT_CLASSES[p.statut]}>
                          {STATUT_LABELS[p.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={calculatingId === p.id}
                            >
                              {calculatingId === p.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="size-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(p)} className="gap-2">
                              <Eye className="size-4" /> Voir détail
                            </DropdownMenuItem>

                            {(p.statut === "OPEN" || p.statut === "TO_REVIEW") && peutEcrire && (
                              <DropdownMenuItem onClick={() => handleCalculate(p)} className="gap-2">
                                <Calculator className="size-4" /> Calculer
                              </DropdownMenuItem>
                            )}

                            {p.statut === "CALCULATED" && peutEcrire && (
                              <DropdownMenuItem onClick={() => handleReview(p)} className="gap-2">
                                <AlertTriangle className="size-4" /> Marquer à revoir
                              </DropdownMenuItem>
                            )}

                            {(p.statut === "CALCULATED" || p.statut === "TO_REVIEW") && peutValider && (
                              <DropdownMenuItem onClick={() => handleValidate(p)} className="gap-2">
                                <CheckCircle2 className="size-4" /> Valider
                              </DropdownMenuItem>
                            )}

                            {p.statut === "VALIDATED" && peutCloturer && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleClose(p)} className="gap-2">
                                  <Lock className="size-4" /> Clôturer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Period Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-gold" />
              Ouvrir une période de paie
            </DialogTitle>
            <DialogDescription>
              Créez une nouvelle période de paie pour un client. Les bulletins seront générés lors du calcul.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="paie-client">Client *</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
                <SelectTrigger id="paie-client">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paie-mois">Mois *</Label>
                <Select value={newMois} onValueChange={setNewMois}>
                  <SelectTrigger id="paie-mois">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOIS_LABELS.map((label, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paie-annee">Année *</Label>
                <Select value={newAnnee} onValueChange={setNewAnnee}>
                  <SelectTrigger id="paie-annee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paie-note">Note (optionnel)</Label>
              <Textarea
                id="paie-note"
                placeholder="Observations sur cette période…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={creating}>
              Annuler
            </Button>
            <Button
              onClick={handleOpenPeriod}
              disabled={creating || !newClientId}
              className="bg-navy-800 hover:bg-navy-900 text-white gap-1.5"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {creating ? "Création…" : "Ouvrir la période"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
