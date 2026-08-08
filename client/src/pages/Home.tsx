import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2, Briefcase, Scale, FileStack, ShieldCheck, ArrowRight } from "lucide-react";

const PILIERS = [
  {
    icon: Scale,
    title: "Moteur de paie 100% conforme",
    description:
      "Calculs automatiques selon la législation tunisienne en vigueur : CNSS, IRPP, avantages exclus (Décret n° 2003-1098) et barèmes officiels mis à jour régulièrement.",
  },
  {
    icon: FileStack,
    title: "Déclarations CNSS automatisées",
    description:
      "Génération en lot des états I3 et bordereaux I16, import Excel massif, contrôle de conformité et export du fichier TXT 122 caractères prêt à dépôt.",
  },
  {
    icon: ShieldCheck,
    title: "Évaluation des risques juridiques",
    description:
      "Audit automatique des plafonds d’avantages exclus, détection des écarts de conformité et recommandations d’optimisation pour chaque dossier client.",
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
            La gestion de paie et la conformité sociale tunisienne, simplifiées.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Une plateforme conçue pour les PME et les experts-comptables.
            Automatisez vos calculs, générez vos déclarations et restez
            conforme en quelques clics.
          </p>
        </div>
      </section>

      {/* ─── DOUBLE ENTRÉE ─── */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="relative overflow-hidden rounded-xl shadow-sm border border-border bg-card p-8 flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Pour les Entreprises (PME)
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gérez votre paie, éditez vos fiches et suivez votre
                trésorerie en toute simplicité.
              </p>
            </div>
            <Button className="mt-6 w-fit" size="lg">
              Espace Entreprise
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>

          <Card className="relative overflow-hidden rounded-xl shadow-sm border border-border bg-card p-8 flex flex-col justify-between min-h-[260px]">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Pour les Experts-Comptables
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gérez tous vos dossiers clients, auditez les plafonds et
                exportez les déclarations CNSS en lot.
              </p>
            </div>
            <Button className="mt-6 w-fit" size="lg">
              Espace Fiduciaire
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </div>
      </section>

      {/* ─── FONCTIONS DE FORCE ─── */}
      <section className="max-w-4xl mx-auto px-4 py-10 pb-16">
        <h2
          className="text-2xl font-bold text-foreground mb-8 text-center"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Fonctions de force
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILIERS.map((pilier) => {
            const Icon = pilier.icon;
            return (
              <Card
                key={pilier.title}
                className="rounded-lg shadow-sm border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {pilier.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pilier.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
