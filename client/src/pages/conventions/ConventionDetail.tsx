import { useParams, Link } from "wouter";
import { useState } from "react";
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
  TableProperties,
  Eye,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type {
  ConventionCollective,
  PrimeMensuelleStructuree,
  PrimeAnnuelleStructuree,
  PrimeSocialeStructuree,
  CategorieAgent,
  GrilleSalarialeLigne,
} from "@/lib/conventions/types";
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
  const hasGrille = (convention.grilleDetaillee?.length ?? 0) > 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
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

        {/* Status + CTA */}
        <div className="mt-4 mb-6 flex items-center gap-4 flex-wrap">
          <Badge variant={convention.engineStatus === "complete" ? "default" : convention.engineStatus === "partial" ? "secondary" : "outline"}>
            {convention.engineStatus === "complete" ? "Moteur complet" : convention.engineStatus === "partial" ? "Moteur partiel" : "Données structurelles uniquement"}
          </Badge>
          {hasCalculablePrimes ? (
            <Link href={`/conventions/${convention.slug}/fiche-paie`}>
              <Button size="lg" className="gap-2">
                <Banknote className="h-5 w-5" />
                Générer une fiche de paie
              </Button>
            </Link>
          ) : (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Le moteur de paie n'est pas encore disponible — les primes chiffrées sont dans les conventions sectorielles.
            </div>
          )}
        </div>

        {/* ═══ ONGLETS PRINCIPAUX (style PAIE-TUNISIE) ═══ */}
        <Tabs defaultValue="recap" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="recap" className="gap-1.5">
              <Banknote className="h-4 w-4" />
              Droits accordés
            </TabsTrigger>
            {hasGrille && (
              <TabsTrigger value="grille" className="gap-1.5">
                <TableProperties className="h-4 w-4" />
                Grille salariale
              </TabsTrigger>
            )}
            <TabsTrigger value="jort" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Historique JORT
            </TabsTrigger>
            <TabsTrigger value="smig" className="gap-1.5">
              <AlertCircle className="h-4 w-4" />
              SMIG
            </TabsTrigger>
          </TabsList>

          {/* ═══ ONGLET 1 : TABLEAU RÉCAP DES DROITS ACCORDÉS ═══ */}
          <TabsContent value="recap">
            <DroitsAccordesTab convention={convention} />
          </TabsContent>

          {/* ═══ ONGLET 2 : GRILLE SALARIALE ═══ */}
          {hasGrille && (
            <TabsContent value="grille">
              <GrilleSalarialeTab
                grille={convention.grilleDetaillee!}
                categories={convention.categoriesAgents ?? []}
                reglesAvancement={convention.reglesAvancement}
              />
            </TabsContent>
          )}

          {/* ═══ ONGLET 3 : HISTORIQUE JORT ═══ */}
          <TabsContent value="jort">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5" />
                  Historique JORT — {convention.sectorNameFr}
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
                        <TableHead>Référence JORT</TableHead>
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
          </TabsContent>

          {/* ═══ ONGLET 4 : SMIG ═══ */}
          <TabsContent value="smig">
            <Card>
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
          </TabsContent>
        </Tabs>

        {/* PDF Documents (always visible) */}
        {convention.pdfDocuments.length > 0 && (
          <Card className="mt-6">
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

// ═══════════════════════════════════════════════════════════════════════
// ONGLET : DROITS ACCORDÉS — Tableau récapitulatif (style PAIE-TUNISIE)
// ═══════════════════════════════════════════════════════════════════════

function DroitsAccordesTab({ convention }: { convention: ConventionCollective }) {
  const categories = convention.categoriesAgents ?? [];
  const primesM = convention.primesMensuelles ?? [];
  const primesA = convention.primesAnnuelles ?? [];
  const primesS = convention.primesSociales ?? [];

  const hasAnyData = primesM.length > 0 || primesA.length > 0 || primesS.length > 0;

  if (!hasAnyData) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Info className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Aucun droit chiffré propre</p>
          <p className="text-sm mt-1">
            Cette convention cadre ne contient pas de primes ou indemnités chiffrées.
            Les montants sont définis dans les conventions sectorielles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── TABLEAU RÉCAP MENSUEL (style PAIE-TUNISIE) ── */}
      {primesM.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5" />
              Primes & Indemnités mensuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DroitsMensuelsRecap primes={primesM} categories={categories} />
          </CardContent>
        </Card>
      )}

      {/* ── Primes annuelles ── */}
      {primesA.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" />
              Primes annuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PrimesAnnuellesRecap primes={primesA} />
          </CardContent>
        </Card>
      )}

      {/* ── Avantages sociaux ── */}
      {primesS.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="h-5 w-5" />
              Avantages sociaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PrimesSocialesRecap primes={primesS} />
          </CardContent>
        </Card>
      )}

      {/* ── Catégories de personnel ── */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Catégories de personnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <Badge key={cat.code} variant="secondary" className="px-4 py-2 text-sm">
                  {cat.labelFr}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPOSANT : Tableau récap mensuel (style PAIE-TUNISIE)
// Une seule table avec toutes les primes × catégories × années
// ═══════════════════════════════════════════════════════════════════════

function DroitsMensuelsRecap({
  primes,
  categories,
}: {
  primes: PrimeMensuelleStructuree[];
  categories: CategorieAgent[];
}) {
  // Collect all available years across all primes and categories
  const allYears = new Set<string>();
  for (const prime of primes) {
    for (const catCode of Object.keys(prime.montants)) {
      for (const year of Object.keys(prime.montants[catCode])) {
        if (year !== "default") allYears.add(year);
      }
    }
  }
  const years = Array.from(allYears).sort();

  // Get latest year for default display
  const latestYear = years.length > 0 ? years[years.length - 1] : "2026";

  return (
    <div className="space-y-6">
      {primes.map((prime) => {
        // Check if this prime has year-based or default-based data
        const hasYearData = Object.keys(prime.montants).some(catCode =>
          Object.keys(prime.montants[catCode]).some(y => y !== "default")
        );
        const relevantCats = categories.filter((c) => prime.montants[c.code]);

        if (!hasYearData) {
          // Default-based prime (like prime de caisse)
          return (
            <div key={prime.code} className="mb-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {prime.labelFr}
                {prime.posteRequis && (
                  <Badge variant="outline" className="text-[10px] font-normal border-amber-400 text-amber-700">
                    Poste : {prime.posteRequis}
                  </Badge>
                )}
              </h3>
              {prime.description && <p className="text-sm text-muted-foreground mb-2">{prime.description}</p>}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Montant (DT)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relevantCats.map((cat) => (
                      <TableRow key={cat.code}>
                        <TableCell className="font-medium">{cat.labelFr}</TableCell>
                        <TableCell className="text-right font-mono">
                          {prime.montants[cat.code]?.["default"] != null
                            ? formatMontantDT(prime.montants[cat.code]["default"])
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        }

        // Year-based prime table
        const primeYears = new Set<string>();
        for (const catCode of Object.keys(prime.montants)) {
          for (const y of Object.keys(prime.montants[catCode])) {
            if (y !== "default") primeYears.add(y);
          }
        }
        const sortedPrimeYears = Array.from(primeYears).sort();

        return (
          <div key={prime.code} className="mb-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              {prime.labelFr}
              {prime.posteRequis && (
                <Badge variant="outline" className="text-[10px] font-normal border-amber-400 text-amber-700">
                  Poste : {prime.posteRequis}
                </Badge>
              )}
            </h3>
            {prime.description && <p className="text-sm text-muted-foreground mb-2">{prime.description}</p>}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    {sortedPrimeYears.map((y) => (
                      <TableHead key={y} className="text-right min-w-[90px]">{y}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relevantCats.map((cat) => (
                    <TableRow key={cat.code}>
                      <TableCell className="font-medium">{cat.labelFr}</TableCell>
                      {sortedPrimeYears.map((y) => (
                        <TableCell key={y} className="text-right font-mono">
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
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Primes annuelles recap
// ═══════════════════════════════════════════════════════════════════════

function PrimesAnnuellesRecap({ primes }: { primes: PrimeAnnuelleStructuree[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prime</TableHead>
            <TableHead>Mode de calcul</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {primes.map((prime) => (
            <TableRow key={prime.code}>
              <TableCell className="font-medium">{prime.labelFr}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {prime.modeCalcul === "pourcentage_salaire"
                    ? "% du salaire"
                    : prime.modeCalcul === "forfaitaire"
                    ? "Forfaitaire"
                    : prime.modeCalcul === "note_dependante"
                    ? "Selon note"
                    : prime.modeCalcul ?? "—"}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {prime.description ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Primes sociales recap
// ═══════════════════════════════════════════════════════════════════════

function PrimesSocialesRecap({ primes }: { primes: PrimeSocialeStructuree[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Avantage</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {primes.map((prime) => (
            <TableRow key={prime.code}>
              <TableCell className="font-medium">{prime.labelFr}</TableCell>
              <TableCell className="text-right font-mono">
                {prime.montant != null ? formatMontantDT(prime.montant) : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {prime.description ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ONGLET : GRILLE SALARIALE — échelle × échelon × année
// ═══════════════════════════════════════════════════════════════════════

function GrilleSalarialeTab({
  grille,
  categories,
  reglesAvancement,
}: {
  grille: GrilleSalarialeLigne[];
  categories: CategorieAgent[];
  reglesAvancement?: { periodeAvancement: number; tableAnciennete: { ancienneteMin: number; ancienneteMax: number; echelon: number }[] };
}) {
  const [showHistorique, setShowHistorique] = useState(false);
  const currentYear = new Date().getFullYear();

  // Collect all years
  const allYears = new Set<string>();
  for (const ligne of grille) {
    for (const y of Object.keys(ligne.montants)) {
      allYears.add(y);
    }
  }
  const sortedAllYears = Array.from(allYears).sort();
  const years = showHistorique
    ? sortedAllYears
    : sortedAllYears.filter((y) => parseInt(y) >= currentYear);

  return (
    <div className="space-y-6">
      {/* Toggle historique */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {showHistorique ? "Toutes les années" : `Années applicables (${currentYear}+)`}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistorique(!showHistorique)}
          className="gap-1.5"
        >
          {showHistorique ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showHistorique ? "Masquer historique" : "Afficher historique"}
        </Button>
      </div>

      {/* Avancement rules */}
      {reglesAvancement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Règles d'avancement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Avancement normal tous les <strong>{reglesAvancement.periodeAvancement} ans</strong> d'ancienneté.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ancienneté</TableHead>
                    <TableHead className="text-right">Échelon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reglesAvancement.tableAnciennete.map((rule, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        {rule.ancienneteMax >= 999
                          ? `${rule.ancienneteMin} ans et plus`
                          : `${rule.ancienneteMin} – ${rule.ancienneteMax} ans`}
                      </TableCell>
                      <TableCell className="text-right font-mono">{rule.echelon}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grille par catégorie */}
      {categories.map((cat) => {
        const echellesRange = Array.from(
          { length: cat.echelleMax - cat.echelleMin + 1 },
          (_, i) => cat.echelleMin + i,
        );
        // Only show échelles that have data
        const echellesWithData = echellesRange.filter((e) =>
          grille.some((l) => l.echelle === e),
        );
        if (echellesWithData.length === 0) return null;

        return (
          <Card key={cat.code}>
            <CardHeader>
              <CardTitle className="text-lg">
                {cat.labelFr} — Échelles {cat.echelleMin} à {cat.echelleMax}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {echellesWithData.map((echelle) => {
                const lignes = grille
                  .filter((l) => l.echelle === echelle)
                  .sort((a, b) => a.echelon - b.echelon);
                if (lignes.length === 0) return null;

                return (
                  <div key={echelle} className="mb-5">
                    <h4 className="font-semibold text-sm mb-2 text-muted-foreground">
                      Échelle {echelle}
                    </h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Échelon</TableHead>
                            {years.map((y) => (
                              <TableHead key={y} className="text-right min-w-[100px]">{y}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lignes.map((ligne) => (
                            <TableRow key={ligne.echelon}>
                              <TableCell className="font-medium">{ligne.echelon}</TableCell>
                              {years.map((y) => (
                                <TableCell key={y} className="text-right font-mono">
                                  {ligne.montants[y] != null ? formatMontantDT(ligne.montants[y]) : "—"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
