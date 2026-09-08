import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Building2,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  FileText,
  Users,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BackToTools from "@/components/BackToTools";
import { CONVENTIONS } from "@/lib/conventions/data/index";
import type { ConventionCollective } from "@/lib/conventions/types";

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  cadre: <Building2 className="h-8 w-8 text-amber-500" />,
  "commerce-gros": <ShoppingBag className="h-8 w-8 text-blue-500" />,
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  complete: { label: "Moteur complet", variant: "default" },
  partial: { label: "En développement", variant: "secondary" },
  planned: { label: "Planifié", variant: "outline" },
};

export default function ConventionsList() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <BackToTools />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Conventions Collectives
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Sélectionnez la convention collective applicable à votre activité.
            Le moteur de paie professionnel utilisera les primes, indemnités et
            grilles salariales spécifiques à votre secteur.
          </p>
        </div>

        {/* Convention Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {CONVENTIONS.map((conv) => (
            <ConventionCard key={conv.sectorId} convention={conv} />
          ))}
        </div>

        {/* Info box */}
        <div className="mt-10 p-6 rounded-xl bg-muted/50 border">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Conventions à venir
          </h3>
          <p className="text-sm text-muted-foreground">
            D'autres conventions collectives seront ajoutées progressivement :
            BTP, Banques, Textile, Hôtellerie, etc. Chaque convention sera
            intégrée dès que son traitement est maîtrisé et validé.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ConventionCard({ convention }: { convention: ConventionCollective }) {
  const icon = SECTOR_ICONS[convention.slug] ?? (
    <FileText className="h-8 w-8 text-muted-foreground" />
  );
  const status = STATUS_LABELS[convention.engineStatus];
  const nbPrimes =
    (convention.primesMensuelles?.length ?? 0) +
    (convention.primesAnnuelles?.length ?? 0) +
    (convention.primesSociales?.length ?? 0);
  const nbAvenants = convention.jortHistory.filter((j) =>
    j.documentType.startsWith("Avenant"),
  ).length;

  return (
    <Link href={`/conventions/${convention.slug}`}>
      <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-lg truncate">
                  {convention.sectorNameFr}
                </h2>
                <Badge variant={status.variant} className="shrink-0">
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3" dir="rtl">
                {convention.sectorNameAr}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {convention.categoriesAgents?.length ?? 0} catégories
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {nbPrimes} primes/indemnités
                </span>
                {nbAvenants > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    {nbAvenants} avenants
                  </span>
                )}
              </div>

              {/* CTA */}
              <div className="mt-4 flex items-center gap-1 text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                Voir les détails
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
