import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  TrendingUp,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import BackToTools from "@/components/BackToTools";

/* ── Types ─────────────────────────────────────────────────────────── */

interface PeriodeOuverte {
  mois: number;
  annee: number;
}

interface WorkspaceData {
  effectifActif: number;
  entreesMois: number;
  sortiesMois: number;
  masseSalarialeMois: number;
  variationMasseSalariale: number;
  repartitionCnss: {
    salarial: number;
    patronal: number;
  };
  periodesOuvertes: PeriodeOuverte[];
}

interface ContratExpirant {
  employeNom: string;
  dateFin: string;
}

interface PeriodeNonCloturee {
  mois: number;
  annee: number;
  joursOuverts: number;
}

interface DeclarationCnssEnRetard {
  periode: string;
}

interface WorkspaceAlerts {
  matriculesCnssManquants: string[];
  contratsExpirant: ContratExpirant[];
  periodesNonCloturees: PeriodeNonCloturee[];
  declarationsCnssEnRetard: DeclarationCnssEnRetard[];
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const formatTND = (amount: number): string =>
  new Intl.NumberFormat("fr-TN", {
    style: "decimal",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount) + " TND";

const MOIS_NOMS = [
  "Janv.", "Fév.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

const periodeLabel = (mois: number, annee: number): string =>
  `${MOIS_NOMS[mois - 1] ?? mois} ${annee}`;

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
          Vous n'êtes pas autorisé à consulter ce tableau de bord.
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

export default function DashboardWorkspace() {
  const [, navigate] = useLocation();

  const [workspaceId, setWorkspaceId] = useState<string>(() => {
    try {
      return localStorage.getItem("fiduciaire_workspace") ?? "";
    } catch {
      return "";
    }
  });

  const [data, setData] = useState<WorkspaceData | null>(null);
  const [alerts, setAlerts] = useState<WorkspaceAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch ──────────────────────────────────────────────────────── */

  useEffect(() => {
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

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`/api/dashboard/workspace/${workspaceId}`, { headers }).then(
        (res) => {
          if (res.status === 401 || res.status === 403)
            throw new Error("unauthorized");
          if (!res.ok) throw new Error(`Erreur ${res.status}`);
          return res.json();
        },
      ),
      fetch(`/api/dashboard/workspace/${workspaceId}/alerts`, { headers }).then(
        (res) => {
          if (res.status === 401 || res.status === 403)
            throw new Error("unauthorized");
          if (!res.ok) throw new Error(`Erreur ${res.status}`);
          return res.json();
        },
      ),
    ])
      .then(([wsData, wsAlerts]) => {
        setData(wsData);
        setAlerts(wsAlerts);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [workspaceId]);

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

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <Card className="p-6 border border-destructive/30">
          <p className="text-destructive">
            Impossible de charger le tableau de bord workspace.
            {error ? ` (${error})` : ""}
          </p>
        </Card>
      </div>
    );
  }

  /* ── Derived ───────────────────────────────────────────────────── */

  const cnssTotal =
    data.repartitionCnss.salarial + data.repartitionCnss.patronal || 1;
  const salarialPct = (data.repartitionCnss.salarial / cnssTotal) * 100;
  const patronalPct = (data.repartitionCnss.patronal / cnssTotal) * 100;

  const variationPct = data.variationMasseSalariale;

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <BackToTools />

      {/* Title */}
      <h1
        className="text-2xl sm:text-3xl font-bold text-primary mb-6"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Tableau de bord — Workspace
      </h1>

      {/* Workspace selector info */}
      <p className="text-sm text-muted-foreground mb-4">
        Workspace : <span className="font-mono text-foreground">{workspaceId}</span>
      </p>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 1. Effectif actif */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Effectif actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {data.effectifActif}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Entrées : {data.entreesMois} / Sorties : {data.sortiesMois}
            </p>
          </CardContent>
        </Card>

        {/* 2. Masse salariale du mois */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Masse salariale du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">
                {formatTND(data.masseSalarialeMois)}
              </p>
              <Badge
                className={
                  variationPct > 0
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
                    : variationPct < 0
                      ? "bg-destructive/15 text-destructive text-xs"
                      : "bg-muted text-muted-foreground text-xs"
                }
              >
                {variationPct > 0 ? "+" : ""}
                {variationPct.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 3. Répartition CNSS */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Répartition CNSS (T-1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 mb-2">
              <p className="text-xs text-muted-foreground">
                Salarial : {formatTND(data.repartitionCnss.salarial)}
              </p>
              <p className="text-xs text-muted-foreground">
                Patronal : {formatTND(data.repartitionCnss.patronal)}
              </p>
            </div>
            {/* Stacked horizontal bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
              <div
                className="bg-primary transition-all"
                style={{ width: `${salarialPct}%` }}
              />
              <div
                className="bg-gold transition-all"
                style={{ width: `${patronalPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Salarial</span>
              <span>Patronal</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Périodes ouvertes */}
        <Card className="border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">
              Périodes ouvertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {data.periodesOuvertes.length}
            </p>
            {data.periodesOuvertes.length > 0 && (
              <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                {data.periodesOuvertes.slice(0, 5).map((p, i) => (
                  <li key={i}>{periodeLabel(p.mois, p.annee)}</li>
                ))}
                {data.periodesOuvertes.length > 5 && (
                  <li className="italic">
                    +{data.periodesOuvertes.length - 5} autres…
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
            <AlertTriangle className="h-5 w-5 text-gold" />
          </div>
          <CardTitle
            className="text-lg font-bold text-primary"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Alertes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Matricules CNSS manquants */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Matricules CNSS manquants
            </h3>
            {alerts?.matriculesCnssManquants.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun matricule manquant
              </p>
            ) : (
              <ul className="space-y-1">
                {alerts?.matriculesCnssManquants.map((nom, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-gold shrink-0" />
                    {nom}
                    <Badge className="bg-gold/20 text-gold-foreground text-[10px] border border-gold/40">
                      CNSS manquant
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Contrats expirant */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Contrats expirant (&lt; 30 jours)
            </h3>
            {alerts?.contratsExpirant.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun contrat proche de l'expiration
              </p>
            ) : (
              <ul className="space-y-1">
                {alerts?.contratsExpirant.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <FileText className="h-3.5 w-3.5 text-gold shrink-0" />
                    {c.employeNom}
                    <Badge className="bg-gold/20 text-gold-foreground text-[10px] border border-gold/40">
                      Fin : {c.dateFin}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Périodes non clôturées */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Périodes non clôturées (&gt; 15 jours)
            </h3>
            {alerts?.periodesNonCloturees.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Toutes les périodes sont clôturées
              </p>
            ) : (
              <ul className="space-y-1">
                {alerts?.periodesNonCloturees.map((p, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <Clock className="h-3.5 w-3.5 text-destructive shrink-0" />
                    {periodeLabel(p.mois, p.annee)}
                    <Badge className="bg-destructive/15 text-destructive text-[10px] border border-destructive/30">
                      {p.joursOuverts}j ouverts
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Déclarations CNSS en retard */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Déclarations CNSS en retard
            </h3>
            {alerts?.declarationsCnssEnRetard.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune déclaration en retard
              </p>
            ) : (
              <ul className="space-y-1">
                {alerts?.declarationsCnssEnRetard.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-destructive shrink-0" />
                    {d.periode}
                    <Badge className="bg-destructive/15 text-destructive text-[10px] border border-destructive/30">
                      En retard
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
