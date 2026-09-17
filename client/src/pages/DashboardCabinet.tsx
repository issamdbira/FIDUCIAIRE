import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import BackToTools from "@/components/BackToTools";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspaceId } from "@/lib/workspace";

/* ── Types ─────────────────────────────────────────────────────────── */

interface CnssDeclarations {
  aJour: number;
  enRetard: number;
  manquantes: number;
}

interface BulletinMonth {
  mois: number;
  annee: number;
  count: number;
}

interface AuditEntry {
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

interface CabinetData {
  totalWorkspaces: number;
  activeClients: number;
  newClientsThisMonth: number;
  totalMasseSalariale: number;
  totalBulletins: number;
  cnssDeclarations: CnssDeclarations;
  inactiveClients: number;
  bulletinsLast12Months: BulletinMonth[];
  recentAuditLogs: AuditEntry[];
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const formatTND = (amount: number): string =>
  new Intl.NumberFormat("fr-TN", {
    style: "decimal",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount) + " TND";

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

// P0-2 : null-safe — entityId/details peuvent être NULL en base (audits legacy) ;
// un dashboard ne doit JAMAIS crasher sur des données.
const truncate = (s: string | null | undefined, n: number): string => {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
};

/* ── Unauthorized View ─────────────────────────────────────────────── */

function Unauthorized() {
  return (
    <div className="max-w-md mx-auto py-20 px-4 text-center">
      <Card className="p-8 border border-slate-200 dark:border-slate-700 bg-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2
          className="text-xl font-bold text-primary mb-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Accès restreint
        </h2>
        <p className="text-muted-foreground mb-6">
          Accès réservé au propriétaire du cabinet.
        </p>
        <Link href="/">
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Retour à l'accueil
          </button>
        </Link>
      </Card>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */

export default function DashboardCabinet() {
  const { user } = useAuth();
  const [data, setData] = useState<CabinetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Phase 10 : dashboard scopé au CABINET ACTIF (anti-fuite inter-espaces)
    // Lot 1 : session par cookie HttpOnly — plus de jeton localStorage
    const wsId = getWorkspaceId(user);
    if (!wsId) {
      setError("unauthorized");
      setLoading(false);
      return;
    }

    fetch(`/api/dashboard/cabinet/${wsId}`, {
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          setError("unauthorized");
          return null;
        }
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json) setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [user]);

  /* ── Guards ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <p className="text-muted-foreground animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <Unauthorized />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <Card className="p-6 border border-destructive/30">
          <p className="text-destructive">
            Impossible de charger le tableau de bord cabinet.
            {error ? ` (${error})` : ""}
          </p>
        </Card>
      </div>
    );
  }

  /* ── Derived ───────────────────────────────────────────────────── */

  const maxBulletins = Math.max(
    ...data.bulletinsLast12Months.map((m) => m.count),
    1,
  );

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <BackToTools />

      {/* Title */}
      <h1
        className="text-2xl sm:text-3xl font-bold text-primary mb-6"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Tableau de bord — Cabinet
      </h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* 1. Workspaces actifs */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Dossiers suivis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {data.totalWorkspaces}
            </p>
          </CardContent>
        </Card>

        {/* 2. Clients actifs */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Clients actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">
                {data.activeClients}
              </p>
              {data.newClientsThisMonth > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                  +{data.newClientsThisMonth} Nouveaux
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Masse salariale gérée */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Masse salariale gérée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatTND(data.totalMasseSalariale)}
            </p>
          </CardContent>
        </Card>

        {/* 4. Bulletins générés */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Bulletins générés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {data.totalBulletins}
            </p>
          </CardContent>
        </Card>

        {/* 5. Déclarations CNSS */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Déclarations CNSS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
              >
                À jour : {data.cnssDeclarations.aJour}
              </Badge>
              <Badge
                className={
                  data.cnssDeclarations.enRetard > 0
                    ? "bg-gold/20 text-gold-foreground border border-gold/40"
                    : "bg-muted text-muted-foreground"
                }
              >
                En retard : {data.cnssDeclarations.enRetard}
              </Badge>
              <Badge
                className={
                  data.cnssDeclarations.manquantes > 0
                    ? "bg-destructive/15 text-destructive border border-destructive/30"
                    : "bg-muted text-muted-foreground"
                }
              >
                Manquantes : {data.cnssDeclarations.manquantes}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 6. Clients inactifs */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Clients inactifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {data.inactiveClients}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tendance bulletins 12 mois */}
      <Card className="border border-slate-200 dark:border-slate-700 mb-8">
        <CardHeader>
          <CardTitle
            className="text-lg font-bold text-primary"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Tendance bulletins (12 mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.bulletinsLast12Months.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="flex items-end gap-1 sm:gap-2 h-48">
              {data.bulletinsLast12Months.map((m, i) => {
                const heightPct = (m.count / maxBulletins) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <span className="text-[10px] sm:text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                    <div
                      className="w-full rounded-t-sm bg-primary group-hover:bg-gold transition-colors"
                      style={{ height: `${heightPct}%`, minHeight: "4px" }}
                    />
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      {String(m.mois).padStart(2, "0")}/{String(m.annee).slice(-2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journal d'audit récent */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle
            className="text-lg font-bold text-primary"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Journal d'audit récent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAuditLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune entrée d'audit
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Entité
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      ID
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Détails
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAuditLogs.map((entry, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2 px-3">{entry.action}</td>
                      <td className="py-2 px-3">{entry.entity}</td>
                      <td className="py-2 px-3 font-mono text-xs">
                        {truncate(entry.entityId, 12)}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {truncate(entry.details, 50)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
