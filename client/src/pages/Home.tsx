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
  Calculator,
  ArrowRight,
} from "lucide-react";

/* ─── Outils fonctionnels (tous ont une route réelle) ─── */

const OUTILS = [
  {
    id: "calculer-salaire",
    title: "Calculer un salaire",
    description: "Brut → Net ou Net → Brut, avec CNSS, IRPP, CSS et avantages exclus (Décret 2003-1098).",
    icon: DollarSign,
    href: "/calculateurs/calculer-salaire",
  },
  {
    id: "irpp",
    title: "Impôt sur le revenu (IRPP)",
    description: "Estimez votre IRPP annuel selon le barème progressif et votre situation familiale.",
    icon: BarChart3,
    href: "/calculateurs/irpp",
  },
  {
    id: "retraite-cnss",
    title: "Estimer sa retraite",
    description: "Estimez votre pension de retraite selon votre ancienneté et salaire actualisé.",
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
];

const POINTS_FORTS = [
  {
    icon: ShieldCheck,
    title: "Conformité Légale",
    description:
      "Textes de loi à jour, gestion des avantages exclus selon le Décret n° 2003-1098 et les barèmes CNSS officiels.",
  },
  {
    icon: Upload,
    title: "Zéro Saisie Manuelle",
    description:
      "Import Excel robuste pour les déclarations de masse. Glissez votre fichier et tout est pré-rempli.",
  },
  {
    icon: FileDown,
    title: "Documents Prêts à l'Emploi",
    description:
      "Génération de PDF I3 et I16 normés, fiches de paie exportables et fichiers TXT conformes CNSS.",
  },
];

/* ─── Composant ─── */

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-blue-950">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
              <Calculator className="size-4 text-white" />
            </div>
            <span
              className="text-base font-bold text-white tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              LE FIDUCIAIRE
            </span>
          </div>
          <Link href="/calculateurs/calculer-salaire">
            <Button
              size="sm"
              className="bg-white text-blue-950 hover:bg-white/90 font-semibold"
            >
              Commencer
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-background">
        <div className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Paie et déclarations sociales tunisiennes, simplifiées.
          </h1>
          <p className="text-blue-100/80 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Calculez vos salaires, générez vos fiches de paie et exportez vos
            déclarations CNSS — sans erreur et en quelques clics.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-950 hover:bg-white/90 font-semibold px-8"
            onClick={() =>
              document
                .getElementById("outils")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Accéder aux outils
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
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

      {/* ═══════════════ OUTILS ═══════════════ */}
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

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Le Fiduciaire — Plateforme de gestion de paie et conformité sociale tunisienne.
          </p>
          <div className="flex items-center gap-4">
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
