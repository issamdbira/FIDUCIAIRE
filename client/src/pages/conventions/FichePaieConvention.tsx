import { useParams, Link } from "wouter";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  Banknote,
  ChevronRight,
  Printer,
  Download,
  User,
  Building2,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getConventionBySlug } from "@/lib/conventions/data/index";
import {
  calculerPaieConvention,
  type SalarieConvention,
  type ElementsPaieConvention,
  type ResultatPaieConvention,
} from "@/lib/conventions/engine";
import { formatMontantDT } from "@/lib/utils";

const MOIS_OPTIONS = [
  { value: "1", label: "Janvier" },
  { value: "2", label: "Février" },
  { value: "3", label: "Mars" },
  { value: "4", label: "Avril" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" },
  { value: "8", label: "Août" },
  { value: "9", label: "Septembre" },
  { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Décembre" },
];

const SITUATION_OPTIONS = [
  { value: "Célibataire", label: "Célibataire" },
  { value: "Marié", label: "Marié" },
  { value: "Marié + enfants", label: "Marié + enfants" },
];

export default function FichePaieConvention() {
  const { slug } = useParams<{ slug: string }>();
  const convention = getConventionBySlug(slug ?? "");

  // ─── État du salarié ─────────────────────────────────────────────
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [categorieAgent, setCategorieAgent] = useState(
    convention?.categoriesAgents?.[0]?.code ?? "CADRES",
  );
  const [anciennete, setAnciennete] = useState("5");
  const [regime, setRegime] = useState<"48h" | "40h">("48h");
  const [situationFamiliale, setSituationFamiliale] = useState("Célibataire");
  const [nombreEnfants, setNombreEnfants] = useState("0");

  // ─── Éléments de paie ────────────────────────────────────────────
  const [salaireBrut, setSalaireBrut] = useState("");
  const [annee, setAnnee] = useState("2026");
  const [mois, setMois] = useState("1");
  const [heuresSup, setHeuresSup] = useState("");
  const [noteProfessionnelle, setNoteProfessionnelle] = useState("");

  // ─── Résultat ────────────────────────────────────────────────────
  const [resultat, setResultat] = useState<ResultatPaieConvention | null>(null);

  const calculer = useCallback(() => {
    if (!convention) return;
    const sb = parseFloat(salaireBrut);
    if (isNaN(sb) || sb <= 0) return;

    const salarie: SalarieConvention = {
      nom,
      prénom: prenom,
      categorieAgent,
      anciennete: parseInt(anciennete) || 0,
      regime,
      situationFamiliale: situationFamiliale as SalarieConvention["situationFamiliale"],
      nombreEnfants: parseInt(nombreEnfants) || 0,
    };

    const elements: ElementsPaieConvention = {
      salaireBrut: sb,
      annee: parseInt(annee) || 2026,
      mois: parseInt(mois) || 1,
      heuresSup: parseFloat(heuresSup) || undefined,
      noteProfessionnelle: parseFloat(noteProfessionnelle) || undefined,
    };

    const res = calculerPaieConvention(convention, salarie, elements);
    setResultat(res);
  }, [
    convention,
    nom,
    prenom,
    categorieAgent,
    anciennete,
    regime,
    situationFamiliale,
    nombreEnfants,
    salaireBrut,
    annee,
    mois,
    heuresSup,

    noteProfessionnelle,
  ]);

  if (!convention) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <BackToTools />
        <div className="mt-10 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Convention non trouvée</h2>
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
          <Link href="/conventions" className="hover:underline">
            Conventions
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/conventions/${convention.slug}`} className="hover:underline">
            {convention.sectorNameFr}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Fiche de paie</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Fiche de paie — {convention.sectorNameFr}
        </h1>
        <p className="text-sm text-muted-foreground" dir="rtl">
          {convention.sectorNameAr}
        </p>

        {/* Layout: inputs left, result right */}
        <div className="grid lg:grid-cols-[420px_1fr] gap-6 mt-6">
          {/* LEFT COLUMN — Inputs */}
          <div className="space-y-6">
            {/* Salarié */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5" />
                  Salarié
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nom</Label>
                    <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
                  </div>
                  <div>
                    <Label className="text-xs">Prénom</Label>
                    <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Catégorie d'agent</Label>
                  <Select value={categorieAgent} onValueChange={setCategorieAgent}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {convention.categoriesAgents?.map((cat) => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.labelFr} — {cat.labelAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Ancienneté (années)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={anciennete}
                      onChange={(e) => setAnciennete(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Régime</Label>
                    <Select value={regime} onValueChange={(v) => setRegime(v as "48h" | "40h")}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="48h">48h / semaine</SelectItem>
                        <SelectItem value="40h">40h / semaine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Situation familiale</Label>
                    <Select value={situationFamiliale} onValueChange={setSituationFamiliale}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SITUATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Enfants à charge</Label>
                    <Input
                      type="number"
                      min="0"
                      value={nombreEnfants}
                      onChange={(e) => setNombreEnfants(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Éléments de paie */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-5 w-5" />
                  Éléments de paie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Salaire brut mensuel (DT)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    value={salaireBrut}
                    onChange={(e) => setSalaireBrut(e.target.value)}
                    placeholder="Ex: 1500"
                    className="font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Année</Label>
                    <Select value={annee} onValueChange={setAnnee}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                        <SelectItem value="2028">2028</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Mois</Label>
                    <Select value={mois} onValueChange={setMois}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MOIS_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Heures supplémentaires</Label>
                    <Input
                      type="number"
                      min="0"
                      value={heuresSup}
                      onChange={(e) => setHeuresSup(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                </div>
                <div>
                  <Label className="text-xs">Note professionnelle (0-20)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={noteProfessionnelle}
                    onChange={(e) => setNoteProfessionnelle(e.target.value)}
                    placeholder="Optionnel"
                  />
                </div>

                <Button onClick={calculer} className="w-full mt-2 gap-2">
                  <Banknote className="h-4 w-4" />
                  Calculer la fiche de paie
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN — Results */}
          <div>
            {resultat ? (
              <FichePaieResult resultat={resultat} />
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Remplissez les informations du salarié</p>
                  <p className="text-sm">puis cliquez sur « Calculer la fiche de paie »</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Composant résultat ──────────────────────────────────────────────

function FichePaieResult({ resultat }: { resultat: ResultatPaieConvention }) {
  const gains = resultat.lignes.filter((l) => l.type === "gain");
  const retenues = resultat.lignes.filter((l) => l.type === "retenue");

  const handlePrint = () => window.print();

  return (
    <Card className="print:shadow-none" id="fiche-paie-result">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Fiche de paie — {resultat.periode.moisNom} {resultat.periode.annee}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1 print:hidden">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {resultat.convention.nameFr}
        </p>
      </CardHeader>
      <CardContent>
        {/* Info salarié */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4 p-3 rounded-lg bg-muted/30">
          <div>
            <span className="text-muted-foreground">Salarié : </span>
            <span className="font-medium">
              {resultat.salarie.nom} {resultat.salarie.prénom}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Catégorie : </span>
            <span className="font-medium">{resultat.salarie.categorieAgent}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Régime : </span>
            <span className="font-medium">{resultat.salarie.regime}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Ancienneté : </span>
            <span className="font-medium">{resultat.salarie.anciennete} ans</span>
          </div>
        </div>

        {/* Table gains + retenues */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Code</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Gains */}
              {gains.map((l) => (
                <TableRow key={l.code}>
                  <TableCell className="font-mono text-xs">{l.code}</TableCell>
                  <TableCell>
                    {l.labelFr}
                    {l.labelAr && (
                      <span className="text-xs text-muted-foreground ml-2" dir="rtl">
                        {l.labelAr}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {l.base != null ? l.base : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {l.taux != null ? `${(l.taux * 100).toFixed(2)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatMontantDT(l.montant)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Séparateur */}
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Separator />
                </TableCell>
              </TableRow>

              {/* Retenues */}
              {retenues.map((l) => (
                <TableRow key={l.code}>
                  <TableCell className="font-mono text-xs">{l.code}</TableCell>
                  <TableCell>
                    {l.labelFr}
                    {l.labelAr && (
                      <span className="text-xs text-muted-foreground ml-2" dir="rtl">
                        {l.labelAr}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {l.base != null ? formatMontantDT(l.base) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {l.taux != null ? `${(l.taux * 100).toFixed(2)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-red-600 dark:text-red-400">
                    -{formatMontantDT(l.montant)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totaux */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm p-2 rounded bg-muted/30">
            <span>Total brut</span>
            <span className="font-mono font-medium">{formatMontantDT(resultat.totalBrut)}</span>
          </div>
          <div className="flex justify-between text-sm p-2 rounded bg-muted/30">
            <span>Cotisations salariales</span>
            <span className="font-mono font-medium text-red-600 dark:text-red-400">
              -{formatMontantDT(resultat.totalCotisationsSalariales)}
            </span>
          </div>
          <div className="flex justify-between text-sm p-2 rounded bg-muted/30">
            <span>Total retenues</span>
            <span className="font-mono font-medium text-red-600 dark:text-red-400">
              -{formatMontantDT(resultat.totalRetenues)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between p-3 rounded-lg bg-primary/10 text-lg font-bold">
            <span>Net à payer</span>
            <span className="font-mono">{formatMontantDT(resultat.netAPayer)}</span>
          </div>
        </div>

        {/* Cotisations patronales */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
            Cotisations patronales
          </h3>
          <div className="space-y-1">
            {resultat.cotisationsPatronales.map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-mono">{formatMontantDT(c.montant)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Total patronal</span>
              <span className="font-mono">
                {formatMontantDT(resultat.totalCotisationsPatronales)}
              </span>
            </div>
          </div>
        </div>

        {/* Coût total employeur */}
        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <div className="flex justify-between font-medium">
            <span>Coût total employeur</span>
            <span className="font-mono">
              {formatMontantDT(resultat.totalBrut + resultat.totalCotisationsPatronales)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
