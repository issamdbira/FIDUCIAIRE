import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { useMemo } from "react";
import {
  DollarSign,
  BarChart3,
  TrendingUp,
  PenTool,
  ArrowUpDown,
  ClipboardList,
  FileX,
  FileSearch,
  BookOpen,
  ScrollText,
  Shield,
  ArrowRight,
  Mail,
  Building2,
  Calculator,
  FileText,
  Landmark,
} from "lucide-react";
import { runPayrollEngine } from "@/lib/payroll/engine";
import type { PayrollInput } from "@/lib/payroll/types";

/**
 * Home — Hub Central (Boîte à Outils)
 *
 * Point d'entrée unique de l'application. Tous les outils sont
 * accessibles depuis cette page. La Top Navbar (Layout) affiche
 * uniquement le logo + thème + admin.
 */

/* ─── Groupes d'outils (MOD1 + MOD2) ─── */

interface Outil {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface GroupeOutils {
  titre: string;
  icon: React.ComponentType<{ className?: string }>;
  outils: Outil[];
}

const GROUPES_OUTILS: GroupeOutils[] = [
  {
    titre: "Calculs & simulations",
    icon: Calculator,
    outils: [
      {
        id: "calculer-salaire",
        title: "Calculer un salaire",
        description: "Obtenir le net à payer avec le détail CNSS, IRPP et CSS.",
        icon: DollarSign,
        href: "/calculateurs/calculer-salaire",
      },
      {
        id: "irpp",
        title: "Impôt sur le revenu (IRPP)",
        description: "Calculer l'IRPP exact selon le barème 2025 en vigueur.",
        icon: BarChart3,
        href: "/calculateurs/irpp",
      },
      {
        id: "retraite-cnss",
        title: "Estimer sa retraite",
        description: "Connaître sa pension estimée selon les règles CNSS actuelles.",
        icon: TrendingUp,
        href: "/calculateurs/retraite-cnss",
      },
      {
        id: "actualisation-salaire",
        title: "Actualisation des salaires",
        description: "Recalculer un salaire ancien aux coefficients CNSS en vigueur.",
        icon: ArrowUpDown,
        href: "/calculateurs/actualisation-salaire",
      },
    ],
  },
  {
    titre: "Documents & déclarations",
    icon: FileText,
    outils: [
      {
        id: "fiche-de-paie",
        title: "Générer une fiche de paie",
        description: "Produire un bulletin conforme et exportable en PDF.",
        icon: PenTool,
        href: "/fiche-de-paie",
      },
      {
        id: "declarations-cnss",
        title: "Déclaration CNSS",
        description: "Contrôler les salariés et produire le fichier CNSS prêt à transmettre.",
        icon: ClipboardList,
        href: "/calculateurs/declarations-cnss",
      },
      {
        id: "declarations-neant",
        title: "Déclarations Néant",
        description: "Générer par lot les déclarations néant, sans ressaisie.",
        icon: FileX,
        href: "/calculateurs/declarations-neant",
      },
      {
        id: "testeur-txt",
        title: "Testeur de fichier TXT",
        description: "Vérifier que votre fichier CNSS est conforme avant transmission.",
        icon: FileSearch,
        href: "/calculateurs/testeur-txt-cnss",
      },
      {
        id: "formulaires-cnss",
        title: "Formulaires CNSS",
        description: "Accéder au bon formulaire CNSS immédiatement, sans recherche.",
        icon: ScrollText,
        href: "/formulaires-cnss",
      },
    ],
  },
  {
    titre: "Références",
    icon: Landmark,
    outils: [
      {
        id: "referentiel-avantages",
        title: "Référentiel légal",
        description: "Vérifier les plafonds et conditions avant d'appliquer un avantage.",
        icon: BookOpen,
        href: "/referentiel-avantages-exclus",
      },
      {
        id: "regimes-sociaux",
        title: "Régimes sociaux",
        description: "Comparer les cotisations et prestations des principaux régimes tunisiens.",
        icon: Shield,
        href: "/regimes-sociaux",
      },
    ],
  },
];

const TOTAL_OUTILS = GROUPES_OUTILS.reduce((n, g) => n + g.outils.length, 0);

/* ─── Aperçu de calcul réel (MOD3) ─── */

function useApercuCalcul() {
  return useMemo(() => {
    const input: PayrollInput = {
      employeur: { nom: "Exemple", secteur: "non_agricole" },
      salarie: {
        nom: "Dupont",
        prenom: "Ahmed",
        chefFamille: false,
        enfants: 0,
        etudiants: 0,
        infirmes: 0,
      },
      periode: { mois: 1, annee: 2026 },
      elements: [
        {
          id: "salaire-base",
          type: "salaire_base",
          label: "Salaire de base",
          montant: 2500,
          traitement: "standard",
        },
      ],
    };
    return runPayrollEngine(input);
  }, []);
}

/* ─── Composant ─── */

export default function Home() {
  const apercu = useApercuCalcul();

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary to-primary/80">
        <div className="max-w-3xl mx-auto px-4 pt-16 pb-14 text-center">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            La boîte à outils de gestion tunisienne.
          </h1>
          <p className="text-white/80 text-base sm:text-lg max-w-2xl mx-auto mb-6">
            Paie, CNSS et IRPP — la spécialité maison — réunis dans des outils prêts à l'emploi.
          </p>
          {/* Proof line */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="text-sm font-medium text-gold">
              {TOTAL_OUTILS} outils disponibles
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          </div>
          <Button
            size="lg"
            variant="outline"
            className="border-gold text-gold hover:bg-gold hover:text-primary font-semibold px-8"
            onClick={() =>
              document
                .getElementById("outils")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Accéder aux outils
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {/* Gold decorative line */}
          <div className="mt-10 mx-auto w-24 h-px bg-gold" />
        </div>
      </section>

      {/* ═══════════════ OUTILS — Groupes (MOD1 + MOD2) ═══════════════ */}
      <section id="outils" className="max-w-5xl mx-auto px-4 pt-14 pb-10">
        <h2
          className="text-2xl font-bold text-foreground mb-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Outils
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          Sélectionnez un outil pour commencer.
        </p>

        {GROUPES_OUTILS.map((groupe) => {
          const GroupeIcon = groupe.icon;
          return (
            <div key={groupe.titre} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <GroupeIcon className="h-4 w-4 text-primary" />
                </div>
                <h3
                  className="text-base font-semibold text-foreground"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {groupe.titre}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupe.outils.map((outil) => {
                  const Icon = outil.icon;
                  return (
                    <Link key={outil.id} href={outil.href}>
                      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer rounded-lg shadow-sm border border-border bg-card group">
                        <div className="p-5">
                          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Icon className="h-4.5 w-4.5 text-primary" />
                          </div>
                          <h4 className="text-sm font-semibold text-foreground mb-1">
                            {outil.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {outil.description}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* ═══════════════ APERÇU CALCUL RÉEL (MOD3) ═══════════════ */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <h2
          className="text-2xl font-bold text-foreground mb-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Aperçu d'un calcul de paie
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Exemple réel pour un salaire brut de 2 500 DT — célibataire, secteur non agricole, 2026.
          Calculé par le moteur de l'application, pas des valeurs statiques.
        </p>
        <Card className="rounded-xl shadow-md border border-border bg-card overflow-hidden">
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Élément</th>
                    <th className="text-right py-3 text-muted-foreground font-medium">Valeur</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 font-medium">Salaire brut</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">
                      {apercu.totalRemunerationBrute.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-muted-foreground">CNSS salarié (9,68 %)</td>
                    <td className="py-2.5 text-right text-red-600 dark:text-red-400 tabular-nums">
                      −{apercu.cotisationCNSS.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-muted-foreground">CSS (supprimée 2026)</td>
                    <td className="py-2.5 text-right tabular-nums">
                      0,000 DT
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-muted-foreground">IRPP mensuel</td>
                    <td className="py-2.5 text-right text-red-600 dark:text-red-400 tabular-nums">
                      −{apercu.irppMensuel.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
                    </td>
                  </tr>
                  <tr className="border-b-0 bg-primary/5">
                    <td className="py-3 pr-4 font-bold text-primary">Net à payer</td>
                    <td className="py-3 text-right font-bold text-primary text-base tabular-nums">
                      {apercu.netAPayer.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Coût employeur */}
            <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Coût total employeur (brut + patronal 17,07 %)</span>
              <span className="font-semibold text-foreground tabular-nums">
                {(
                  apercu.totalRemunerationBrute + apercu.cotisationPatronale
                ).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
              </span>
            </div>
            {/* Détail cascade */}
            <div className="mt-4 pt-3 border-t border-border/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground/70">Base CNSS</span>
                {apercu.baseCNSS.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
              </div>
              <div>
                <span className="block font-medium text-foreground/70">Frais pro (10 %)</span>
                {apercu.fraisProfessionnelsMensuel.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
              </div>
              <div>
                <span className="block font-medium text-foreground/70">Assiette IRPP/mois</span>
                {apercu.assietteImposableNetteMensuelle.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
              </div>
              <div>
                <span className="block font-medium text-foreground/70">Patronal CNSS</span>
                {apercu.cotisationPatronale.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ═══════════════ CONVENTIONS COLLECTIVES ═══════════════ */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <h2
          className="text-2xl font-bold text-foreground mb-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Conventions Collectives
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Moteur de paie professionnel par convention collective sectorielle.
        </p>
        <Link href="/conventions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-lg shadow-sm border border-primary/30 bg-card group">
            <div className="p-6 flex items-center gap-5">
              <div className="shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Building2 className="h-7 w-7 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Conventions Collectives — Moteur de Paie
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Sélectionnez votre convention collective (Cadre, Commerce gros/demi-gros, etc.)
                  et générez des fiches de paie avec les primes, indemnités et grilles salariales
                  spécifiques à votre secteur.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Card>
        </Link>
      </section>

      {/* ═══════════════ RESSOURCES ═══════════════ */}
      <section className="max-w-5xl mx-auto px-4 pb-10">
        <h2
          className="text-lg font-semibold text-foreground mb-4"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Ressources
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/guides">
            <Button variant="outline" size="sm" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Guides
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="sm" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact
            </Button>
          </Link>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Le Fiduciaire — La boîte à outils de gestion tunisienne.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/conventions">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Conventions
              </span>
            </Link>
            <Link href="/guides">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Guides
              </span>
            </Link>
            <Link href="/contact">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Contact
              </span>
            </Link>
            <Link href="/formulaires-cnss">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Formulaires CNSS
              </span>
            </Link>
            <Link href="/referentiel-avantages-exclus">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Référentiel légal
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
