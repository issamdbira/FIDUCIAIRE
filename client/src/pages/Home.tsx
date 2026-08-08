import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import {
  DollarSign,
  FileText,
  ClipboardCheck,
  FileX,
  TrendingUp,
  ShieldCheck,
  Upload,
  FileDown,
  Calculator,
  BookOpen,
  PenTool,
  BarChart3,
} from "lucide-react";

const OUTILS = [
  {
    id: "calculer-salaire",
    title: "Calculer un salaire",
    description: "Brut → Net ou Net → Brut, pour les salariés du secteur privé (CNSS)",
    icon: DollarSign,
    href: "/calculateurs/calculer-salaire",
  },
  {
    id: "irpp",
    title: "Impôt sur le revenu (IRPP)",
    description: "Estimez votre IRPP annuel selon votre situation familiale",
    icon: BarChart3,
    href: "/calculateurs/irpp",
  },
  {
    id: "retraite-cnss",
    title: "Estimer sa retraite",
    description: "Estimez votre pension de retraite selon votre ancienneté et salaire",
    icon: TrendingUp,
    href: "/calculateurs/retraite-cnss",
  },
  {
    id: "fiche-de-paie",
    title: "Générer une fiche de paie",
    description: "Employeur, logo, salarié, éléments de rémunération, détail du calcul et export PDF",
    icon: PenTool,
    href: "/fiche-de-paie",
  },
  {
    id: "actualisation-salaire",
    title: "Actualisation des salaires",
    description: "Actualisez un salaire par le coefficient CNSS de son année (pour le calcul de retraite)",
    icon: Calculator,
    href: "/calculateurs/actualisation-salaire",
  },
  {
    id: "declarations-cnss",
    title: "Déclaration CNSS",
    description: "Saisie ou import CSV/Excel, contrôle des données, génération et test du fichier TXT",
    icon: ClipboardCheck,
    href: "/calculateurs/declarations-cnss",
  },
  {
    id: "declarations-neant",
    title: "Déclarations Néant",
    description: "Générez par lot vos déclarations néant (État I3 + Bordereau I16) avec calibrage PDF",
    icon: FileX,
    href: "/calculateurs/declarations-neant",
  },
  {
    id: "testeur-txt-cnss",
    title: "Testeur de fichier TXT",
    description: "Vérifiez la conformité d'un fichier TXT CNSS 122 caractères",
    icon: FileText,
    href: "/calculateurs/testeur-txt-cnss",
  },
  {
    id: "referentiel-avantages-exclus",
    title: "Référentiel légal",
    description: "Consultez les plafonds des avantages exclus de l'assiette CNSS (Décret n° 2003-1098)",
    icon: BookOpen,
    href: "/referentiel-avantages-exclus",
  },
];

const POINTS_FORTS = [
  {
    icon: ShieldCheck,
    title: "Conformité Légale",
    description: "Textes de loi à jour, gestion des avantages exclus selon le Décret n° 2003-1098 et les barèmes CNSS officiels.",
  },
  {
    icon: Upload,
    title: "Zéro Saisie Manuelle",
    description: "Import Excel robuste pour les déclarations de masse. Glissez votre fichier et tout est pré-rempli automatiquement.",
  },
  {
    icon: FileDown,
    title: "Documents Prêts à l'Emploi",
    description: "Génération de PDF I3 et I16 normés, fiches de paie exportables et fichiers TXT conformes au format CNSS.",
  },
];

export default function Home() {
  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Simplifiez votre gestion de paie et vos déclarations sociales en
            Tunisie.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Générez vos fiches de paie, simulez vos impôts et exportez vos
            déclarations CNSS sans erreur et en quelques clics.
          </p>
          <Button
            size="lg"
            className="text-base px-8 py-6"
            onClick={() =>
              document
                .getElementById("outils")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Accéder à l'espace de travail
          </Button>
        </div>
      </section>

      {/* ─── PROBLÈME / SOLUTION ─── */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {POINTS_FORTS.map((pf) => {
            const Icon = pf.icon;
            return (
              <Card
                key={pf.title}
                className="rounded-lg shadow-sm border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {pf.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pf.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ─── OUTILS ─── */}
      <section id="outils" className="max-w-4xl mx-auto px-4 pb-16">
        <h2
          className="text-2xl font-bold text-foreground mb-2"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Outils
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          Sélectionnez un outil pour commencer.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OUTILS.map((outil) => {
            const Icon = outil.icon;
            return (
              <Link key={outil.id} href={outil.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer rounded-lg shadow-sm border border-border bg-card">
                  <div className="p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
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
    </div>
  );
}
