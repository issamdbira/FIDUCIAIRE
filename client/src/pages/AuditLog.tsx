import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, FileSearch, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import BackToTools from "@/components/BackToTools";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspaceId } from "@/lib/workspace";

/* ── Types ─────────────────────────────────────────────────────────── */

type ActionType =
  | "ALL"
  | "PERIOD_CLOSE"
  | "PERIOD_VALIDATE"
  | "CNSS_GENERATE"
  | "CNSS_ARCHIVE"
  | "COMPLEMENTARY_CREATE"
  | "RAPPORT_GROUPE_GENERATE";

interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  page: number;
  totalPages: number;
  total: number;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: "ALL", label: "Toutes les actions" },
  { value: "PERIOD_CLOSE", label: "Clôture période" },
  { value: "PERIOD_VALIDATE", label: "Validation période" },
  { value: "CNSS_GENERATE", label: "Génération CNSS" },
  { value: "CNSS_ARCHIVE", label: "Archivage CNSS" },
  { value: "COMPLEMENTARY_CREATE", label: "Création complémentaire" },
  { value: "RAPPORT_GROUPE_GENERATE", label: "Rapport de groupe" },
];

const ACTION_BADGE_COLORS: Record<string, string> = {
  PERIOD_CLOSE:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PERIOD_VALIDATE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CNSS_GENERATE:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CNSS_ARCHIVE:
    "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300",
  COMPLEMENTARY_CREATE:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RAPPORT_GROUPE_GENERATE:
    "bg-gold/20 text-gold-foreground",
};

const ACTION_LABELS: Record<string, string> = {
  PERIOD_CLOSE: "Clôture période",
  PERIOD_VALIDATE: "Validation période",
  CNSS_GENERATE: "Génération CNSS",
  CNSS_ARCHIVE: "Archivage CNSS",
  COMPLEMENTARY_CREATE: "Complémentaire",
  RAPPORT_GROUPE_GENERATE: "Rapport groupe",
};

/* ── Helpers ───────────────────────────────────────────────────────── */

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n) + "…" : s;

/* ── Main Component ────────────────────────────────────────────────── */

export default function AuditLog() {
  /* ── State ──────────────────────────────────────────────────────── */

  const { user } = useAuth();
  const [actionFilter, setActionFilter] = useState<ActionType>("ALL");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Workspace ID ───────────────────────────────────────────────── */

  const workspaceId = getWorkspaceId(user) ?? "";

  /* ── Fetch ──────────────────────────────────────────────────────── */

  const fetchLogs = useCallback(() => {
    if (!workspaceId) {
      setError("no_workspace");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("fiduciaire_token");
    if (!token) {
      setError("unauthorized");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (actionFilter !== "ALL") params.set("action", actionFilter);
    if (userIdFilter.trim()) params.set("userId", userIdFilter.trim());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);

    fetch(`/api/payroll/${workspaceId}/audit?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          setError("unauthorized");
          return null;
        }
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((json: AuditLogResponse | null) => {
        if (json) {
          setLogs(json.data);
          setTotalPages(json.totalPages);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [workspaceId, actionFilter, userIdFilter, fromDate, toDate, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* ── Handlers ───────────────────────────────────────────────────── */

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
  };

  const handlePrev = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  /* ── Guards ────────────────────────────────────────────────────── */

  if (error === "unauthorized") {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <Card className="p-8 border border-slate-200 dark:border-slate-700 bg-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 mx-auto mb-4">
              <FileSearch className="h-6 w-6 text-destructive" />
            </div>
            <h2
              className="text-xl font-bold text-primary mb-2"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Accès restreint
            </h2>
            <p className="text-muted-foreground mb-6">
              Vous devez être connecté pour consulter les logs d'audit.
            </p>
            <Link href="/">
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Retour à l'accueil
              </button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (error === "no_workspace") {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <Card className="p-6 border border-gold/30">
          <p className="text-gold">
            Aucun workspace sélectionné. Veuillez sélectionner un workspace
            depuis la navigation.
          </p>
        </Card>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <BackToTools />

      {/* Title */}
      <h1
        className="text-2xl sm:text-3xl font-bold text-primary mb-6"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Journal d'audit
      </h1>

      {/* Filters */}
      <Card className="border border-slate-200 dark:border-slate-700 mb-6">
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <Filter className="h-5 w-5 text-primary" />
          <CardTitle
            className="text-base font-semibold text-primary"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            {/* Action type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Action
              </label>
              <Select
                value={actionFilter}
                onValueChange={(v) => setActionFilter(v as ActionType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* UserId */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Utilisateur
              </label>
              <Input
                type="text"
                placeholder="ID utilisateur"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
              />
            </div>

            {/* From date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Du
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* To date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Au
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            {/* Apply button */}
            <Button onClick={handleFilter} className="gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4" />
              Filtrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && error !== "unauthorized" && error !== "no_workspace" && (
        <Card className="p-4 mb-6 border border-destructive/30">
          <p className="text-destructive text-sm">
            Erreur lors du chargement des logs : {error}
          </p>
        </Card>
      )}

      {/* Table */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center gap-3">
          <FileSearch className="h-5 w-5 text-primary" />
          <CardTitle
            className="text-base font-semibold text-primary"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Entrées d'audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground animate-pulse text-sm">
              Chargement…
            </p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune entrée trouvée
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entité</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        {entry.userName || entry.userId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            ACTION_BADGE_COLORS[entry.action] ??
                            "bg-muted text-muted-foreground"
                          }
                        >
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.entity}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncate(entry.entityId, 12)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {truncate(entry.details, 60)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    disabled={page <= 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={page >= totalPages}
                    className="gap-1"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
