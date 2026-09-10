import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
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
  ShieldCheck,
  Upload,
  FileDown,
  ArrowRight,
  Mail,
  Building2,
  Shield,
} from "lucide-react";

/**
 * Home — Hub Central (Boîte à Outils)
 *
 * Point d'entrée unique de l'application. Tous les outils sont
 * accessibles depuis cette page. La Top Navbar (Layout) affiche
 * uniquement le logo + thème + admin.
 */

/* ─── Outils fonctionnels (tous ont une route réelle) ─── */

const OUTILS = [
  {
    id: "calculer-salaire",
    title: "Calculer un salaire",
    description: "Du brut au net ou inversement — cotisations sécurité sociale (CNSS), impôt sur le revenu (IRPP), contribution sociale de solidarité (CSS) et avantages exclus.",
    icon: DollarSign,
    href: "/calculateurs/calculer-salaire",
  },
  {
    id: "irpp",
    title: "Impôt sur le revenu (IRPP)",
    description: "Estimez votre impôt sur le revenu annuel selon le barème progressif tunisien.",
    icon: BarChart3,
    href: "/calculateurs/irpp",
  },
  {
    id: "retraite-cnss",
    title: "Estimer sa retraite",
    description: "Estimez votre pension de retraite selon les règles de la sécurité sociale (CNSS).",
    icon: TrendingUp,
    href: "/calculateurs/retraite-cnss",
  },
  {
    id: "fiche-de-paie",
    title: "Générer une fiche de paie",
    description: "Employeur, logo, salarié, éléments de rémunération, détail du calcul et export PDF.",
    icon: PenTool,
    href: "/fiche-de-paie",
  },
  {
    id: "actualisation-salaire",
    title: "Actualisation des salaires",
    description: "Actualisez un salaire par le coefficient CNSS de son année (calcul de retraite).",
    icon: ArrowUpDown,
    href: "/calculateurs/actualisation-salaire",
  },
  {
    id: "declarations-cnss",
    title: "Déclaration CNSS",
    description: "Saisie ou import CSV/Excel, contrôle des données, génération du fichier TXT.",
    icon: ClipboardList,
    href: "/calculateurs/declarations-cnss",
  },
  {
    id: "declarations-neant",
    title: "Déclarations Néant",
    description: "Générez par lot vos déclarations néant (État I3 + Bordereau I16) avec calibrage PDF.",
    icon: FileX,
    href: "/calculateurs/declarations-neant",
  },
  {
    id: "testeur-txt",
    title: "Testeur de fichier TXT",
    description: "Vérifiez la conformité d'un fichier TXT CNSS 122 caractères.",
    icon: FileSearch,
    href: "/calculateurs/testeur-txt-cnss",
  },
  {
    id: "referentiel-avantages",
    title: "Référentiel légal",
    description: "Consultez les plafonds des avantages exclus (Décret n° 2003-1098).",
    icon: BookOpen,
    href: "/referentiel-avantages-exclus",
  },
  {
    id: "formulaires-cnss",
    title: "Formulaires CNSS",
    description: "Formulaires officiels de déclaration CNSS avec aide au remplissage.",
    icon: ScrollText,
    href: "/formulaires-cnss",
  },
  {
    id: "regimes-sociaux",
    title: "Régimes sociaux",
    description: "CNSS, CNRPS, CNAM : cotisations, barème IRPP, salaire minimum garanti (SMIG) / salaire minimum agricole garanti (SMAG), prestations.",
    icon: Shield,
    href: "/regimes-sociaux",
  },
];

const POINTS_FORTS = [
  {
    icon: ShieldCheck,
    title: "Spécialité paie & CNSS",
    description:
      "Brut↔net, IRPP, retraite, déclarations CNSS — les calculs réglementaires tunisiens, sans erreur.",
  },
  {
    icon: Upload,
    title: "Conformité réglementaire",
    description:
      "Barèmes à jour, référentiel Décret 2003-1098, formulaires CNSS — chaque résultat cite sa source juridique.",
  },
  {
    icon: FileDown,
    title: "Export opérationnel",
    description:
      "Fiches de paie PDF, fichiers TXT CNSS, déclarations néant I3/I16 — prêts à déposer.",
  },
];

/* ─── Composant ─── */

export default function Home() {
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
              {OUTILS.length} outils disponibles
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

      {/* ═══════════════ POINTS FORTS ═══════════════ */}
      <section className="max-w-4xl mx-auto px-4 -mt-8 relative z-10 mb-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {POINTS_FORTS.map((pf) => {
            const Icon = pf.icon;
            return (
              <Card
                key={pf.title}
                className="rounded-xl shadow-md border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  {pf.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {pf.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ OUTILS — Hub Central ═══════════════ */}
      <section id="outils" className="max-w-5xl mx-auto px-4 pb-16">
        <h2
          className="text-2xl font-bold text-foreground mb-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Outils
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          Sélectionnez un outil pour commencer.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OUTILS.map((outil) => {
            const Icon = outil.icon;
            return (
              <Link key={outil.id} href={outil.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer rounded-lg shadow-sm border border-border bg-card group">
                  <div className="p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {outil.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {outil.description}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
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
