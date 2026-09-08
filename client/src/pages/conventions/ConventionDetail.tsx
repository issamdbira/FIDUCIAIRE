import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Users,
  CalendarDays,
  Banknote,
  Heart,
  Briefcase,
  AlertCircle,
  ExternalLink,
  Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BackToTools from "@/components/BackToTools";
import { getConventionBySlug, getLatestSmigYear, getSmig } from "@/lib/conventions/data/index";
import { getResumeConvention } from "@/lib/conventions/engine";
import type { ConventionCollective, PrimeMensuelleStructuree } from "@/lib/conventions/types";
import { formatMontantDT } from "@/lib/utils";

export default function ConventionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const convention = getConventionBySlug(slug ?? "");

  if (!convention) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <BackToTools />
        <div className="mt-10 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Convention non trouvée</h2>
          <p className="text-muted-foreground mt-2">
            La convention collective demandée n'existe pas encore.
          </p>
          <Link href="/conventions">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux conventions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const resume = getResumeConvention(convention);
  const latestYear = getLatestSmigYear();

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
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/conventions" className="hover:underline">
              Conventions Collectives
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{convention.sectorNameFr}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            {convention.sectorNameFr}
          </h1>
          <p className="text-lg text-muted-foreground" dir="rtl">
            {convention.sectorNameAr}
          </p>
          {resume.dernierAvenant && (
            <p className="text-sm text-muted-foreground mt-2">
              Dernier texte applicable :{" "}
              <span className="font-medium">{resume.dernierAvenant}</span>
            </p>
          )}
        </div>

        {/* CTA Fiche de paie */}
        <div className="mb-8">
          <Link href={`/conventions/${convention.slug}/fiche-paie`}>
            <Button size="lg" className="gap-2">
              <Banknote className="h-5 w-5" />
              Générer une fiche de paie — {convention.sectorNameFr}
            </Button>
          </Link>
        </div>

        {/* JORT History */}
        {convention.jortHistory.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Historique JORT — Convention & Avenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date signature</TableHead>
                      <TableHead>Arrêté/Agrément</TableHead>
                      <TableHead>Réf. JORT</TableHead>
                      <TableHead>Date d'application</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {convention.jortHistory.map((j, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{j.documentType}</TableCell>
                        <TableCell>{j.signatureDate}</TableCell>
                        <TableCell>{j.arreteAgrementDate}</TableCell>
                        <TableCell className="text-xs">{j.jortReference}</TableCell>
                        <TableCell>{j.applicationStart}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Catégories d'agents */}
        {convention.categoriesAgents && convention.categoriesAgents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Catégories d'agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {convention.categoriesAgents.map((cat) => (
                  <Badge key={cat.code} variant="secondary" className="px-4 py-2 text-sm">
                    {cat.labelFr}
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span dir="rtl">{cat.labelAr}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Primes mensuelles */}
        {convention.primesMensuelles && convention.primesMensuelles.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5" />
                Primes & Indemnités mensuelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {convention.primesMensuelles.map((prime) => (
                <PrimeMensuelleBlock key={prime.code} prime={prime} categories={convention.categoriesAgents ?? []} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Primes annuelles */}
        {convention.primesAnnuelles && convention.primesAnnuelles.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5" />
                Primes annuelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {convention.primesAnnuelles.map((prime) => (
                <div key={prime.code} className="p-4 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{prime.labelFr}</span>
                    {prime.labelAr && (
                      <span className="text-sm text-muted-foreground" dir="rtl">
                        ({prime.labelAr})
                      </span>
                    )}
                  </div>
                  {prime.description && (
                    <p className="text-sm text-muted-foreground">{prime.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Primes sociales */}
        {convention.primesSociales && convention.primesSociales.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5" />
                Avantages sociaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {convention.primesSociales.map((prime) => (
                <div key={prime.code} className="p-4 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{prime.labelFr}</span>
                    {prime.labelAr && (
                      <span className="text-sm text-muted-foreground" dir="rtl">
                        ({prime.labelAr})
                      </span>
                    )}
                    {prime.montant && (
                      <Badge variant="outline" className="ml-auto">
                        {formatMontantDT(prime.montant)}
                      </Badge>
                    )}
                  </div>
                  {prime.description && (
                    <p className="text-sm text-muted-foreground">{prime.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* SMIG applicable */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5" />
              SMIG applicable ({latestYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/40 text-center">
                <p className="text-sm text-muted-foreground mb-1">Régime 48h (Mensuel)</p>
                <p className="text-2xl font-bold">{formatMontantDT(resume.smigMensuel48h)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/40 text-center">
                <p className="text-sm text-muted-foreground mb-1">Régime 40h (Mensuel)</p>
                <p className="text-2xl font-bold">{formatMontantDT(resume.smigMensuel40h)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Documents */}
        {convention.pdfDocuments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Documents officiels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {convention.pdfDocuments.map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  {doc.text}
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Résumé */}
        {convention.resume && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Résumé</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{convention.resume}</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

// ─── Sous-composant : Bloc prime mensuelle ────────────────────────────

function PrimeMensuelleBlock({
  prime,
  categories,
}: {
  prime: PrimeMensuelleStructuree;
  categories: { code: string; labelFr: string; labelAr: string }[];
}) {
  const availableYears = new Set<string>();
  for (const catCode of Object.keys(prime.montants)) {
    for (const year of Object.keys(prime.montants[catCode])) {
      availableYears.add(year);
    }
  }
  const years = Array.from(availableYears).sort();

  if (years.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{prime.labelFr}</span>
          {prime.labelAr && (
            <span className="text-sm text-muted-foreground" dir="rtl">
              ({prime.labelAr})
            </span>
          )}
        </div>
        {prime.description && (
          <p className="text-sm text-muted-foreground">{prime.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        {prime.labelFr}
        {prime.labelAr && (
          <span className="text-sm text-muted-foreground font-normal" dir="rtl">
            ({prime.labelAr})
          </span>
        )}
      </h3>
      {prime.description && (
        <p className="text-sm text-muted-foreground mb-3">{prime.description}</p>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Catégorie</TableHead>
              {years.map((y) => (
                <TableHead key={y} className="text-right">
                  {y === "default" ? "Forfait" : y}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories
              .filter((c) => prime.montants[c.code])
              .map((cat) => (
                <TableRow key={cat.code}>
                  <TableCell className="font-medium">{cat.labelFr}</TableCell>
                  {years.map((y) => (
                    <TableCell key={y} className="text-right">
                      {prime.montants[cat.code]?.[y] != null
                        ? formatMontantDT(prime.montants[cat.code][y])
                        : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
