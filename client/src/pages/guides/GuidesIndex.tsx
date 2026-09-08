import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookOpen, ArrowRight, Calculator, BarChart3, FileSearch, ShieldCheck } from "lucide-react";
import BackToTools from "@/components/BackToTools";

/**
 * Index des Guides SEO — /guides
 *
 * Espace éditorial pour le trafic organique Google.
 * Chaque guide cible une requête longue traîne et renvoie
 * vers le calculateur interactif correspondant (CTA).
 * Anonymat total : signé au nom de la marque.
 */

const GUIDES = [
  {
    slug: "calculer-salaire-brut-net-tunisie",
    title: "Comment calculer un salaire brut en net en Tunisie ?",
    description:
      "Méthode complète pour passer du salaire brut au salaire net en appliquant les retenues CNSS, IRPP et CSS. Barèmes 2025-2026, exemples chiffrés et simulateur interactif.",
    icon: Calculator,
    outilLabel: "Calculer un salaire",
    outilHref: "/calculateurs/calculer-salaire",
  },
  {
    slug: "comprendre-calculer-irpp-tunisie",
    title: "Comprendre et calculer l'IRPP en Tunisie",
    description:
      "Barème progressif de l'impôt sur le revenu, déductions familiales, frais professionnels. Guide pas-à-pas avec exemples et lien vers le calculateur IRPP.",
    icon: BarChart3,
    outilLabel: "Calculateur IRPP",
    outilHref: "/calculateurs/irpp",
  },
  {
    slug: "controle-fichier-declaration-cnss-txt",
    title: "Contrôle des fichiers de déclaration CNSS (Format TXT)",
    description:
      "Spécifications du fichier TXT 122 caractères, contrôles de validité, erreurs courantes et lien vers le testeur de fichiers CNSS.",
    icon: FileSearch,
    outilLabel: "Testeur TXT CNSS",
    outilHref: "/calculateurs/testeur-txt-cnss",
  },
  {
    slug: "cotisations-cnss-taux-salariaux-patronaux",
    title: "Cotisations CNSS : Taux salariaux et patronaux",
    description:
      "Taux de cotisation CNSS salarié (6,68 %) et employeur (16,57 %), plafond mensuel, répartition par branche et impact sur le net à payer.",
    icon: ShieldCheck,
    outilLabel: "Référentiel légal",
    outilHref: "/referentiel-avantages-exclus",
  },
];

export default function GuidesIndex() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <BackToTools />
      <div className="flex items-center gap-3 mb-1">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Guides
        </h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8">
        Articles de référence sur la paie et les déclarations sociales tunisiennes.
        Chaque guide inclut un lien direct vers l'outil interactif correspondant.
      </p>

      <div className="grid gap-5">
        {GUIDES.map((guide) => {
          const Icon = guide.icon;
          return (
            <Link key={guide.slug} href={`/guides/${guide.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer rounded-lg shadow-sm border border-border bg-card group">
                <div className="p-5 flex gap-4">
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {guide.title}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {guide.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Lire le guide
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
