import { useParams, Link } from "wouter";
import { useState, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AlertCircle,
  Banknote,
  ChevronRight,
  Download,
  User,
  Calculator,
  Search,
  Info,
  ArrowRightLeft,
  Building2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackToTools from "@/components/BackToTools";
import { getConventionBySlug } from "@/lib/conventions/data/index";
import {
  calculerPaieConvention,
  calculerBrutPourNetConvention,
  detecterEchelon,
  detecterCategorie,
  getEchellesPourCategorie,
  getEchelonsPourEchelle,
  chercherSalaireGrille,
  type SalarieConvention,
  type ElementsPaieConvention,
  type ResultatPaieConvention,
  type ResultatNetToBrut,
} from "@/lib/conventions/engine";
import { formatMontantDT } from "@/lib/utils";
import { toast } from "sonner";

const MOIS_OPTIONS = [
  { value: "1", label: "Janvier" }, { value: "2", label: "Février" },
  { value: "3", label: "Mars" }, { value: "4", label: "Avril" },
  { value: "5", label: "Mai" }, { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" }, { value: "8", label: "Août" },
  { value: "9", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
];

const SITUATION_OPTIONS = [
  { value: "Célibataire", label: "Célibataire" },
  { value: "Marié", label: "Marié" },
  { value: "Marié + enfants", label: "Marié + enfants" },
];

const MOIS_NOMS_EXPORT = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

type CalculMode = "brut-to-net" | "net-to-brut";

export default function FichePaieConvention() {
  const { slug } = useParams<{ slug: string }>();
  const convention = getConventionBySlug(slug ?? "");

  // ─── Mode de calcul ──────────────────────────────────────────────
  const [mode, setMode] = useState<CalculMode>("brut-to-net");

  // ─── État du salarié ─────────────────────────────────────────────
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [categorieAgent, setCategorieAgent] = useState(
    convention?.categoriesAgents?.[0]?.code ?? "",
  );
  const [echelle, setEchelle] = useState("");
  const [anciennete, setAnciennete] = useState("5");
  const [regime, setRegime] = useState<"48h" | "40h">("48h");
  const [situationFamiliale, setSituationFamiliale] = useState("Célibataire");
  const [nombreEnfants, setNombreEnfants] = useState("0");

  // ─── Éléments de paie ────────────────────────────────────────────
  const [annee, setAnnee] = useState("2026");
  const [mois, setMois] = useState("1");
  const [heuresSup, setHeuresSup] = useState("");
  const [noteProfessionnelle, setNoteProfessionnelle] = useState("");
  const [primesExceptionnelles, setPrimesExceptionnelles] = useState("");

  // ─── Net→Brut : montant net souhaité ─────────────────────────────
  const [netSouhaite, setNetSouhaite] = useState("");

  // ─── Employeur (pour la fiche de paie, comme le moteur principal) ─
  const [employeurNom, setEmployeurNom] = useState("");
  const [employeurLogoDataUrl, setEmployeurLogoDataUrl] = useState<string | undefined>(undefined);

  // ─── Résultat ────────────────────────────────────────────────────
  const [resultat, setResultat] = useState<ResultatPaieConvention | null>(null);
  const [resultatNetToBrut, setResultatNetToBrut] = useState<ResultatNetToBrut | null>(null);

  // ─── Export ──────────────────────────────────────────────────────
  const ficheRef = useRef<HTMLDivElement>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  // ─── Données dérivées ────────────────────────────────────────────
  const echellesDisponibles = useMemo(() => {
    if (!convention) return [];
    return getEchellesPourCategorie(convention, categorieAgent);
  }, [convention, categorieAgent]);

  const echelonsDisponibles = useMemo(() => {
    if (!convention || !echelle) return [];
    return getEchelonsPourEchelle(convention, parseInt(echelle));
  }, [convention, echelle]);

  const echelonDetecte = useMemo(() => {
    if (!convention) return 1;
    return detecterEchelon(convention, parseInt(anciennete) || 0);
  }, [convention, anciennete]);

  const salaireAuto = useMemo(() => {
    if (!convention || !echelle) return null;
    return chercherSalaireGrille(
      convention,
      parseInt(echelle),
      echelonDetecte,
      parseInt(annee) || 2026,
    );
  }, [convention, echelle, echelonDetecte, annee]);

  const categorieDetectee = useMemo(() => {
    if (!convention || !echelle) return null;
    return detecterCategorie(convention, parseInt(echelle));
  }, [convention, echelle]);

  // Auto-set echelle when category changes
  const handleCategorieChange = useCallback((cat: string) => {
    setCategorieAgent(cat);
    setResultat(null);
    setResultatNetToBrut(null);
    if (convention) {
      const echelles = getEchellesPourCategorie(convention, cat);
      if (echelles.length > 0) setEchelle(String(echelles[0]));
    }
  }, [convention]);

  const handleEchelleChange = useCallback((e: string) => {
    setEchelle(e);
    setResultat(null);
    setResultatNetToBrut(null);
  }, []);

  // ─── Logo upload ─────────────────────────────────────────────────
  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEmployeurLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // ─── Calcul Brut → Net ───────────────────────────────────────────
  const calculerBrutToNet = useCallback(() => {
    if (!convention) return;
    const sb = salaireAuto;
    if (!sb || sb <= 0) return;

    const salarie: SalarieConvention = {
      nom,
      prénom: prenom,
      categorieAgent: categorieDetectee?.code ?? categorieAgent,
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
      primesExceptionnelles: parseFloat(primesExceptionnelles) || undefined,
    };

    const res = calculerPaieConvention(convention, salarie, elements);
    setResultat(res);
    setResultatNetToBrut(null);
  }, [
    convention, nom, prenom, categorieAgent, categorieDetectee,
    anciennete, regime, situationFamiliale, nombreEnfants,
    salaireAuto, annee, mois, heuresSup, noteProfessionnelle, primesExceptionnelles,
  ]);

  // ─── Calcul Net → Brut ───────────────────────────────────────────
  const calculerNetToBrut = useCallback(() => {
    if (!convention || !echelle) return;
    const netVal = parseFloat(netSouhaite);
    if (!netVal || netVal <= 0) return;

    const salarie: SalarieConvention = {
      nom,
      prénom: prenom,
      categorieAgent: categorieDetectee?.code ?? categorieAgent,
      anciennete: parseInt(anciennete) || 0,
      regime,
      situationFamiliale: situationFamiliale as SalarieConvention["situationFamiliale"],
      nombreEnfants: parseInt(nombreEnfants) || 0,
    };

    const res = calculerBrutPourNetConvention(
      netVal,
      convention,
      salarie,
      parseInt(echelle),
      echelonDetecte,
      parseInt(annee) || 2026,
      parseInt(mois) || 1,
      {
        heuresSup: parseFloat(heuresSup) || undefined,
        noteProfessionnelle: parseFloat(noteProfessionnelle) || undefined,
        primesExceptionnelles: parseFloat(primesExceptionnelles) || undefined,
      },
    );

    if (res) {
      setResultat(res.resultat);
      setResultatNetToBrut(res);
    }
  }, [
    convention, echelle, netSouhaite, nom, prenom, categorieAgent, categorieDetectee,
    anciennete, regime, situationFamiliale, nombreEnfants,
    echelonDetecte, annee, mois, heuresSup, noteProfessionnelle, primesExceptionnelles,
  ]);

  // ─── Export PDF ──────────────────────────────────────────────────
  const exporterPDF = useCallback(async () => {
    if (!ficheRef.current) return;
    setExportEnCours(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const sanitizer = (s: string) =>
        s.trim().replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40);
      const nomFichier = sanitizer(nom);
      const prenomFichier = sanitizer(prenom);
      const moisNom = MOIS_NOMS_EXPORT[(parseInt(mois) || 1) - 1];
      const anneeVal = annee || "2026";
      const filename = `Fiche_Paie_${nomFichier || "Salarie"}${prenomFichier ? "_" + prenomFichier : ""}_${moisNom}_${anneeVal}.pdf`;
      await html2pdf()
        .set({
          margin: 10,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(ficheRef.current)
        .save();
      toast.success(`PDF exporté : ${filename}`);
    } catch {
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExportEnCours(false);
    }
  }, [nom, prenom, mois, annee]);

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
          <Link href="/conventions" className="hover:underline">Conventions</Link>
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

        {/* Layout: inputs left, result right */}
        <div className="grid lg:grid-cols-[440px_1fr] gap-6 mt-6">
          {/* LEFT COLUMN — Inputs */}
          <div className="space-y-5">
            {/* Mode de calcul */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowRightLeft className="h-5 w-5" />
                  Mode de calcul
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={mode}
                  onValueChange={(v) => {
                    setMode(v as CalculMode);
                    setResultat(null);
                    setResultatNetToBrut(null);
                  }}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="brut-to-net" className="flex-1">
                      Brut → Net
                    </TabsTrigger>
                    <TabsTrigger value="net-to-brut" className="flex-1">
                      Net → Brut
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {mode === "net-to-brut" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Entrez le net souhaité — le moteur calcule le brut et décompose en base grille + indemnité supplémentaire.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Employeur */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5" />
                  Employeur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {employeurLogoDataUrl && (
                    <img
                      src={employeurLogoDataUrl}
                      alt="Logo"
                      className="h-12 w-12 object-contain border border-border rounded"
                    />
                  )}
                  <div className="flex-1">
                    <Label className="text-xs">Raison sociale</Label>
                    <Input
                      value={employeurNom}
                      onChange={(e) => setEmployeurNom(e.target.value)}
                      placeholder="Nom de l'entreprise"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Logo (optionnel)</Label>
                  <label className="block mt-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-xs"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

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

                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div>
                  <Label className="text-xs">Enfants à charge</Label>
                  <Input type="number" min="0" value={nombreEnfants} onChange={(e) => setNombreEnfants(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Classification & Grille */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-5 w-5" />
                  Classification dans la grille
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Catégorie */}
                <div>
                  <Label className="text-xs">Catégorie d'agent</Label>
                  <Select value={categorieAgent} onValueChange={handleCategorieChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {convention.categoriesAgents?.map((cat) => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.labelFr} (éch. {cat.echelleMin}–{cat.echelleMax})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Échelle */}
                <div>
                  <Label className="text-xs">Échelle</Label>
                  <Select value={echelle} onValueChange={handleEchelleChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {echellesDisponibles.map((e) => (
                        <SelectItem key={e} value={String(e)}>
                          Échelle {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Ancienneté → Échelon auto */}
                <div>
                  <Label className="text-xs">Ancienneté (années)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={anciennete}
                    onChange={(e) => { setAnciennete(e.target.value); setResultat(null); setResultatNetToBrut(null); }}
                  />
                </div>

                {/* Échelon détecté automatiquement */}
                <div className="p-3 rounded-lg bg-muted/40 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Échelon détecté</span>
                  <span className="font-semibold text-lg">{echelonDetecte}</span>
                </div>

                {/* Salaire de base auto-détecté */}
                <div className={`p-3 rounded-lg flex items-center justify-between ${salaireAuto ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"}`}>
                  <span className="text-sm font-medium">Salaire de base (grille)</span>
                  {salaireAuto ? (
                    <span className="font-bold text-lg font-mono">{formatMontantDT(salaireAuto)}</span>
                  ) : (
                    <span className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Sélectionner échelle
                    </span>
                  )}
                </div>

                {/* Info catégorie détectée */}
                {categorieDetectee && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Échelle {echelle} → {categorieDetectee.labelFr}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Éléments complémentaires / Net souhaité */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-5 w-5" />
                  {mode === "brut-to-net" ? "Éléments complémentaires" : "Net souhaité & options"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Net→Brut: input du net souhaité */}
                {mode === "net-to-brut" && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <Label className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                      Net à payer souhaité (DT)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={netSouhaite}
                      onChange={(e) => { setNetSouhaite(e.target.value); setResultat(null); setResultatNetToBrut(null); }}
                      placeholder="Ex: 1000"
                      className="mt-1 font-mono text-lg"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Le moteur calcule le brut nécessaire, puis décompose en base grille + indemnité supplémentaire.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Année</Label>
                    <Select value={annee} onValueChange={(v) => { setAnnee(v); setResultat(null); setResultatNetToBrut(null); }}>
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

                <div>
                  <Label className="text-xs">Heures supplémentaires</Label>
                  <Input
                    type="number" min="0" value={heuresSup}
                    onChange={(e) => setHeuresSup(e.target.value)}
                    placeholder="0"
                  />
                </div>

                {mode === "brut-to-net" && (
                  <div>
                    <Label className="text-xs">Primes exceptionnelles (DT)</Label>
                    <Input
                      type="number" min="0" step="0.001" value={primesExceptionnelles}
                      onChange={(e) => setPrimesExceptionnelles(e.target.value)}
                      placeholder="0"
                      className="font-mono"
                    />
                  </div>
                )}

                <Button
                  onClick={mode === "brut-to-net" ? calculerBrutToNet : calculerNetToBrut}
                  className="w-full mt-2 gap-2"
                  disabled={
                    mode === "brut-to-net"
                      ? !salaireAuto || salaireAuto <= 0
                      : !netSouhaite || parseFloat(netSouhaite) <= 0 || !echelle
                  }
                >
                  <Banknote className="h-4 w-4" />
                  {mode === "brut-to-net" ? "Calculer la fiche de paie" : "Calculer Net → Brut"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN — Results */}
          <div>
            {resultat ? (
              <FichePaieResult
                resultat={resultat}
                resultatNetToBrut={resultatNetToBrut}
                echelle={parseInt(echelle)}
                echelon={echelonDetecte}
                employeurNom={employeurNom}
                employeurLogoDataUrl={employeurLogoDataUrl}
                conventionName={convention.sectorNameFr}
                ficheRef={ficheRef}
                onExport={exporterPDF}
                exportEnCours={exportEnCours}
                mode={mode}
              />
            ) : (
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>
                    {mode === "brut-to-net"
                      ? "Sélectionnez la classification du salarié"
                      : "Entrez le net souhaité et la classification"}
                  </p>
                  <p className="text-sm">
                    puis cliquez sur « {mode === "brut-to-net" ? "Calculer la fiche de paie" : "Calculer Net → Brut"} »
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPOSANT RÉSULTAT — Format aligné sur le moteur principal
// ═══════════════════════════════════════════════════════════════════════

function FichePaieResult({
  resultat,
  resultatNetToBrut,
  echelle,
  echelon,
  employeurNom,
  employeurLogoDataUrl,
  conventionName,
  ficheRef,
  onExport,
  exportEnCours,
  mode,
}: {
  resultat: ResultatPaieConvention;
  resultatNetToBrut: ResultatNetToBrut | null;
  echelle: number;
  echelon: number;
  employeurNom: string;
  employeurLogoDataUrl?: string;
  conventionName: string;
  ficheRef: React.RefObject<HTMLDivElement | null>;
  onExport: () => void;
  exportEnCours: boolean;
  mode: CalculMode;
}) {
  const gains = resultat.lignes.filter((l) => l.type === "gain");
  const retenues = resultat.lignes.filter((l) => l.type === "retenue");

  // Net→Brut decomposition info
  const isNetToBrut = mode === "net-to-brut" && resultatNetToBrut;
  const salaireBaseGrille = isNetToBrut ? resultatNetToBrut.salaireBaseGrille : 0;
  const indemniteSupp = isNetToBrut ? resultatNetToBrut.indemniteSupplementaire : 0;

  return (
    <div className="space-y-4">
      {/* Net→Brut decomposition banner */}
      {isNetToBrut && indemniteSupp > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="py-4">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Décomposition Net → Brut
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded bg-white/60 dark:bg-black/20">
                <p className="text-xs text-muted-foreground">Base grille</p>
                <p className="font-mono font-semibold">{formatMontantDT(salaireBaseGrille)}</p>
              </div>
              <div className="p-2 rounded bg-white/60 dark:bg-black/20">
                <p className="text-xs text-muted-foreground">Indemnité suppl.</p>
                <p className="font-mono font-semibold">{formatMontantDT(indemniteSupp)}</p>
              </div>
              <div className="p-2 rounded bg-white/60 dark:bg-black/20">
                <p className="text-xs text-muted-foreground">Brut total</p>
                <p className="font-mono font-semibold">{formatMontantDT(resultatNetToBrut!.brutTotal)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Le brut est décomposé conformément à la réglementation : le salaire de base correspond à la grille
              (échelle {echelle}, échelon {echelon}), l'excédent est classé en indemnité supplémentaire.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fiche de paie — même format que le moteur principal */}
      <div ref={ficheRef} className="print:bg-white print:text-black">
        <Card className="p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-card print:bg-white print:text-black">
          {/* Header — aligné sur le moteur principal */}
          <div className="flex justify-between items-start border-b-2 border-primary pb-4 mb-6">
            <div className="flex items-center gap-4">
              {employeurLogoDataUrl && (
                <img src={employeurLogoDataUrl} alt="Logo" className="h-14 w-14 object-contain" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Fiche de Paie
                </h2>
                {employeurNom && (
                  <p className="text-sm text-muted-foreground font-medium">{employeurNom}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Convention : {conventionName}
                </p>
                <p className="text-sm text-muted-foreground">
                  Période : {resultat.periode.mois}/{resultat.periode.annee}
                </p>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p className="font-semibold">{resultat.salarie.prénom} {resultat.salarie.nom}</p>
              <p>Catégorie : {resultat.salarie.categorieAgent}</p>
              <p>Échelle {echelle} / Échelon {echelon}</p>
              <p>Régime : {resultat.salarie.regime}</p>
              <p>Ancienneté : {resultat.salarie.anciennete} ans</p>
            </div>
          </div>

          {/* Table gains + retenues — même format que le moteur principal */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm mb-6 border-collapse print:border-collapse min-w-[320px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Désignation</th>
                  <th className="text-right py-2">Montant</th>
                </tr>
              </thead>
              <tbody>
                {/* Net→Brut: show decomposed base + indemnité suppl. */}
                {isNetToBrut && indemniteSupp > 0 ? (
                  <>
                    <tr className="border-b border-border">
                      <td className="py-2">Salaire de base (grille — éch. {echelle}, échel. {echelon})</td>
                      <td className="text-right py-2 tabular-nums">{formatMontantDT(salaireBaseGrille)}</td>
                    </tr>
                    {indemniteSupp > 0 && (
                      <tr className="border-b border-border">
                        <td className="py-2">Indemnité supplémentaire</td>
                        <td className="text-right py-2 tabular-nums">{formatMontantDT(indemniteSupp)}</td>
                      </tr>
                    )}
                    {/* Primes convention (skip the first "SB" line which is the brut total) */}
                    {gains.filter((l) => l.code !== "SB").map((l) => (
                      <tr key={l.code} className="border-b border-border">
                        <td className="py-2">{l.labelFr}</td>
                        <td className="text-right py-2 tabular-nums">{formatMontantDT(l.montant)}</td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <>
                    {gains.map((l) => (
                      <tr key={l.code} className="border-b border-border">
                        <td className="py-2">{l.labelFr}</td>
                        <td className="text-right py-2 tabular-nums">{formatMontantDT(l.montant)}</td>
                      </tr>
                    ))}
                  </>
                )}

                <tr className="border-b border-border font-semibold">
                  <td className="py-2">Rémunération brute</td>
                  <td className="text-right py-2 tabular-nums">{formatMontantDT(resultat.totalBrut)}</td>
                </tr>

                {/* Retenues */}
                {retenues.map((l) => (
                  <tr key={l.code} className="border-b border-border text-destructive">
                    <td className="py-2">
                      {l.labelFr}
                      {l.taux != null && ` (${(l.taux * 100).toFixed(2)}%)`}
                    </td>
                    <td className="text-right py-2 tabular-nums">{formatMontantDT(-l.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Net à payer — même format que le moteur principal */}
          <div className="flex justify-between items-center py-4 bg-primary text-primary-foreground px-6 rounded-lg">
            <span className="text-lg font-bold">Net à Payer</span>
            <span className="text-2xl font-bold tabular-nums">{formatMontantDT(resultat.netAPayer)}</span>
          </div>

          {/* Cotisations patronales — affichées (pas imprimés) */}
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

          {/* Pied de page */}
          <p className="text-xs text-muted-foreground mt-6">
            Document généré par Le Fiduciaire — Moteur de paie par convention collective le {new Date().toLocaleDateString("fr-TN")}.
          </p>
        </Card>
      </div>

      {/* Export PDF — même format que le moteur principal */}
      <div className="flex justify-end pt-2 no-print">
        <Button onClick={onExport} disabled={exportEnCours} className="gap-2">
          <Download className="w-4 h-4" /> {exportEnCours ? "Export en cours..." : "Exporter en PDF"}
        </Button>
      </div>
    </div>
  );
}
