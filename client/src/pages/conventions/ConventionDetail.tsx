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
  Info,
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
  const hasCalculablePrimes = (convention.primesMensuelles?.length ?? 0) > 0;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <BackToTools />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/conventions" className="hover:underline">Conventions Collectives</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{convention.sectorNameFr}</span>
        </div>

        {/* Header */}
        <h1 className="text-3xl font-bold tracking-tight mb-1">{convention.sectorNameFr}</h1>
        <p className="text-lg text-muted-foreground" dir="rtl">{convention.sectorNameAr}</p>

        {/* CTA */}
        <div className="mt-4 mb-8">
          {hasCalculablePrimes ? (
            <Link href={`/conventions/${convention.slug}/fiche-paie`}>
              <Button size="lg" className="gap-2">
                <Banknote className="h-5 w-5" />
                Générer une fiche de paie
              </Button>
            </Link>
          ) : (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Le moteur de paie pour cette convention n'est pas encore disponible.
                Les primes chiffrées sont définies dans les conventions sectorielles.
              </p>
            </div>
          )}
        </div>

        {/* ═══ TABLEAU RÉCAPITULatif DES PRIMES (comme PAIE-TUNISIE) ═══ */}
        {convention.primesMensuelles && convention.primesMensuelles.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Banknote className="h-5 w-5" />
                Primes & Indemnités mensuelles — Tableau récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent>
              {convention.primesMensuelles.map((prime) => (
                <PrimeMensuelleRecap key={prime.code} prime={prime} categories={convention.categoriesAgents ?? []} />
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
            <CardContent className="space-y-3">
              {convention.primesAnnuelles.map((prime) => (
                <div key={prime.code} className="p-4 rounded-lg bg-muted/40">
                  <span className="font-medium">{prime.labelFr}</span>
                  {prime.labelAr && <span className="text-sm text-muted-foreground ml-2" dir="rtl">({prime.labelAr})</span>}
                  {prime.description && <p className="text-sm text-muted-foreground mt-1">{prime.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Avantages sociaux */}
        {convention.primesSociales && convention.primesSociales.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5" />
                Avantages sociaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {convention.primesSociales.map((prime) => (
                <div key={prime.code} className="p-4 rounded-lg bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{prime.labelFr}</span>
                    {prime.labelAr && <span className="text-sm text-muted-foreground" dir="rtl">({prime.labelAr})</span>}
                    {prime.montant && <Badge variant="outline" className="ml-auto">{formatMontantDT(prime.montant)}</Badge>}
                  </div>
                  {prime.description && <p className="text-sm text-muted-foreground mt-1">{prime.description}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Catégories d'agents */}
        {convention.categoriesAgents && convention.categoriesAgents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Catégories de personnel
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

        {/* SMIG */}
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

        {/* JORT History */}
        {convention.jortHistory.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5" />
                Historique JORT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Signature</TableHead>
                      <TableHead>Agrément</TableHead>
                      <TableHead>JORT</TableHead>
                      <TableHead>Application</TableHead>
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

        {/* Grilles salariales refs */}
        {convention.grillesSalariales.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Grilles salariales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {convention.grillesSalariales.map((g) => (
                  <Badge key={g.tableNum} variant="outline" className="px-3 py-1">
                    Grille {g.tableNum} — {g.note || g.applicationDate}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF */}
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
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline text-sm">
                  <ExternalLink className="h-4 w-4" />{doc.text}
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

// ─── Tableau récapitulatif d'une prime (comme PAIE-TUNISIE) ──────────

function PrimeMensuelleRecap({
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
  const relevantCats = categories.filter((c) => prime.montants[c.code]);

  if (years.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 mb-4">
        <span className="font-medium">{prime.labelFr}</span>
        {prime.labelAr && <span className="text-sm text-muted-foreground ml-2" dir="rtl">({prime.labelAr})</span>}
        {prime.description && <p className="text-sm text-muted-foreground mt-1">{prime.description}</p>}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2">{prime.labelFr}</h3>
      {prime.description && <p className="text-sm text-muted-foreground mb-3">{prime.description}</p>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Catégorie</TableHead>
              {years.map((y) => (
                <TableHead key={y} className="text-right">{y === "default" ? "Forfait" : y}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {relevantCats.map((cat) => (
              <TableRow key={cat.code}>
                <TableCell className="font-medium">{cat.labelFr}</TableCell>
                {years.map((y) => (
                  <TableCell key={y} className="text-right font-mono">
                    {prime.montants[cat.code]?.[y] != null ? formatMontantDT(prime.montants[cat.code][y]) : "—"}
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
