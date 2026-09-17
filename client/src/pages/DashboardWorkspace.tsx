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
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import BackToTools from "@/components/BackToTools";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspaceId } from "@/lib/workspace";

// P2-3 : libellé lisible du type d'espace
const TYPE_LABEL: Record<string, string> = {
  CABINET: "Cabinet",
  ENTREPRISE: "Entreprise",
};

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
  // P2-6 : parcours guidé — état réel des étapes du cycle de paie
  parcours?: {
    salariesActifs: number;
    salariesAvecContratActif: number;
    dernierePeriode: { mois: number; annee: number; statut: string } | null;
    pointageDernierePeriode: boolean;
    bulletinsDernierePeriode: number;
    declarationCnssDernierePeriode: boolean;
  };
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

/* ── P2-6 : Parcours guidé — le test des 30 secondes ────────────────── */
/* « Je sais où j'en suis, ce qui reste à faire, et par où continuer. »  */

interface EtapeParcours {
  label: string;
  fait: boolean;
  href?: string; // lien « continuer » de l'étape
  cta?: string;
}

function calculerEtapes(data: WorkspaceData): EtapeParcours[] {
  const p = data.parcours;
  if (!p) return [];
  const periode = p.dernierePeriode;
  const statutCalcule = periode !== null && ["CALCULATED", "TO_REVIEW", "VALIDATED", "CLOSED"].includes(periode.statut);
  const statutValide = periode !== null && ["VALIDATED", "CLOSED"].includes(periode.statut);
  const statutCloture = periode?.statut === "CLOSED";

  const etapes: EtapeParcours[] = [
    {
      label: "Créer les salariés",
      fait: p.salariesActifs > 0,
      href: "/gestion/employes",
      cta: "Créer un salarié",
    },
    {
      label: "Établir leurs contrats",
      fait: p.salariesAvecContratActif > 0,
      href: "/gestion/contrats",
      cta: "Créer un contrat",
    },
    {
      label: "Ouvrir la période de paie",
      fait: periode !== null,
      href: "/gestion/paie",
      cta: "Ouvrir la période",
    },
    {
      label: "Saisir le pointage du mois",
      fait: periode !== null && p.pointageDernierePeriode,
      href: "/gestion/pointage",
      cta: "Saisir / importer le pointage",
    },
    {
      label: "Calculer la paie",
      fait: statutCalcule && p.bulletinsDernierePeriode > 0,
      href: "/gestion/paie",
      cta: "Calculer la paie",
    },
    {
      label: "Valider les bulletins",
      fait: statutValide,
      href: "/gestion/paie",
      cta: "Valider les bulletins",
    },
    {
      label: "Clôturer la période",
      fait: statutCloture,
      href: "/gestion/paie",
      cta: "Clôturer la période",
    },
    {
      label: "Déclarer à la CNSS",
      fait: statutCloture === true && p.declarationCnssDernierePeriode,
      href: "/gestion/cnss",
      cta: "Créer la déclaration",
    },
  ];
  return etapes;
}

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
  const { user } = useAuth();

  const [workspaceId, setWorkspaceId] = useState<string>(() => getWorkspaceId(user) ?? "");

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

    // Lot 1 : session par cookie HttpOnly — plus de jeton localStorage
    setLoading(true);
    setError(null);

    const fetchOpts = { credentials: "include" as RequestCredentials };

    Promise.all([
      fetch(`/api/dashboard/workspace/${workspaceId}`, fetchOpts).then(
        (res) => {
          if (res.status === 401 || res.status === 403)
            throw new Error("unauthorized");
          if (!res.ok) throw new Error(`Erreur ${res.status}`);
          return res.json();
        },
      ),
      fetch(`/api/dashboard/workspace/${workspaceId}/alerts`, fetchOpts).then(
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

  // P2-3 : afficher le NOM de l'espace (et son type) — l'ID technique
  // (cuid) n'a aucun sens pour un utilisateur métier.
  const activeWs = user?.workspaces?.find((w) => w.id === workspaceId);
  const nomEspace = activeWs?.name ?? workspaceId;
  const typeEspace = activeWs?.type ? (TYPE_LABEL[activeWs.type] ?? activeWs.type) : "";

  // P2-6 : parcours guidé — étapes réelles + prochaine étape à faire
  const etapesParcours = data ? calculerEtapes(data) : [];
  const prochaineEtapeIndex = etapesParcours.findIndex((e) => !e.fait);
  const prochaineEtape = prochaineEtapeIndex >= 0 ? etapesParcours[prochaineEtapeIndex] : null;
  const periodeParcours = data?.parcours?.dernierePeriode;

  // Défensif : si l'API omet repartitionCnss (forme inattendue), on dégrade
  // l'affichage plutôt que de crasher toute la page.
  const repartition = data.repartitionCnss ?? { salarial: 0, patronal: 0 };
  const cnssTotal = repartition.salarial + repartition.patronal || 1;
  const salarialPct = (repartition.salarial / cnssTotal) * 100;
  const patronalPct = (repartition.patronal / cnssTotal) * 100;

  const variationPct = data.variationMasseSalariale ?? 0;

  // Listes d'alertes — toujours des tableaux, même si l'API renvoie une forme
  // inattendue (évite .length / .map sur undefined).
  const matriculesManquants = alerts?.matriculesCnssManquants ?? [];
  const contratsExpirantListe = alerts?.contratsExpirant ?? [];
  const periodesNonClotureesListe = alerts?.periodesNonCloturees ?? [];
  const declarationsEnRetard = alerts?.declarationsCnssEnRetard ?? [];

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <BackToTools />

      {/* Title */}
      <h1
        className="text-2xl sm:text-3xl font-bold text-primary mb-2"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Tableau de bord — {nomEspace}
      </h1>

      {/* Espace info (P2-3 : nom lisible, plus jamais l'ID brut) */}
      <p className="text-sm text-muted-foreground mb-4">
        {typeEspace ? `Espace ${typeEspace}` : "Espace de travail"}
      </p>

      {/* P2-6 : Parcours guidé — où suis-je, quoi faire ensuite */}
      {etapesParcours.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-700 mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
            <CardTitle className="text-sm font-semibold text-primary">
              Parcours de paie — où en êtes-vous ?
            </CardTitle>
            {prochaineEtape && (
              <Link href={prochaineEtape.href ?? "/gestion/paie"}>
                <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap">
                  {prochaineEtape.cta}
                  <ArrowRight className="size-3.5" />
                </button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-2">
              {etapesParcours.map((etape, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {etape.fait ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle
                      className={
                        "size-4 shrink-0 " +
                        (prochaineEtapeIndex === i ? "text-primary" : "text-muted-foreground/40")
                      }
                    />
                  )}
                  <span
                    className={
                      etape.fait
                        ? "text-muted-foreground line-through decoration-muted-foreground/40"
                        : prochaineEtapeIndex === i
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                    }
                  >
                    {etape.label}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              {prochaineEtape ? (
                <>
                  Prochaine étape :{" "}
                  <span className="font-medium text-foreground">{prochaineEtape.label}</span>
                  {periodeParcours && " — période " + periodeLabel(periodeParcours.mois, periodeParcours.annee)}
                </>
              ) : (
                "Cycle de paie complet — salariés, contrats, pointage, calcul, validation, clôture et déclaration CNSS à jour."
              )}
            </p>
          </CardContent>
        </Card>
      )}

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
                Salarial : {formatTND(repartition.salarial)}
              </p>
              <p className="text-xs text-muted-foreground">
                Patronal : {formatTND(repartition.patronal)}
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
            {matriculesManquants.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun matricule manquant
              </p>
            ) : (
              <ul className="space-y-1">
                {matriculesManquants.map((nom, i) => (
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
            {contratsExpirantListe.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun contrat proche de l'expiration
              </p>
            ) : (
              <ul className="space-y-1">
                {contratsExpirantListe.map((c, i) => (
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
            {periodesNonClotureesListe.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Toutes les périodes sont clôturées
              </p>
            ) : (
              <ul className="space-y-1">
                {periodesNonClotureesListe.map((p, i) => (
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
            {declarationsEnRetard.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune déclaration en retard
              </p>
            ) : (
              <ul className="space-y-1">
                {declarationsEnRetard.map((d, i) => (
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
