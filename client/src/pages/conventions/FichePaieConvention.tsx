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
  ArrowRightLeft,
  Building2,
  CalendarDays,
  Briefcase,
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

const MOIS_NOMS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const MOIS_NOMS_EXPORT = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

type CalculMode = "brut-to-net" | "net-to-brut";

// ─── Design tokens (matching maquette) ─────────────────────────────────
const NAVY = "#0B2545";
const NAVY_MID = "#13415C";
const GOLD = "#C5973E";
const GOLD_DIM = "#A07D2F";
const SLATE = "#5C6B7A";
const HAIRLINE = "#D9DDE3";

export default function FichePaieConvention() {
  const { slug } = useParams<{ slug: string }>();
  const convention = getConventionBySlug(slug ?? "");

  const [mode, setMode] = useState<CalculMode>("brut-to-net");

  // ─── Salarié (champs minimaux) ───────────────────────────────────
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

  // ─── Période ─────────────────────────────────────────────────────
  const [annee, setAnnee] = useState("2026");
  const [mois, setMois] = useState(String(new Date().getMonth() + 1));

  // ─── Options ─────────────────────────────────────────────────────
  const [heuresSup, setHeuresSup] = useState("");
  const [primesExceptionnelles, setPrimesExceptionnelles] = useState("");

  // ─── Net→Brut ───────────────────────────────────────────────────
  const [netSouhaite, setNetSouhaite] = useState("");

  // ─── Employeur ──────────────────────────────────────────────────
  const [employeurNom, setEmployeurNom] = useState("");
  const [employeurLogoDataUrl, setEmployeurLogoDataUrl] = useState<string | undefined>(undefined);

  // ─── Résultat ───────────────────────────────────────────────────
  const [resultat, setResultat] = useState<ResultatPaieConvention | null>(null);
  const [resultatNetToBrut, setResultatNetToBrut] = useState<ResultatNetToBrut | null>(null);

  // ─── Export ─────────────────────────────────────────────────────
  const ficheRef = useRef<HTMLDivElement>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  // ─── Données dérivées ───────────────────────────────────────────
  const echellesDisponibles = useMemo(() => {
    if (!convention) return [];
    return getEchellesPourCategorie(convention, categorieAgent);
  }, [convention, categorieAgent]);

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

  // ─── Handlers ───────────────────────────────────────────────────
  const clearResult = useCallback(() => {
    setResultat(null);
    setResultatNetToBrut(null);
  }, []);

  const handleCategorieChange = useCallback((cat: string) => {
    setCategorieAgent(cat);
    clearResult();
    if (convention) {
      const echelles = getEchellesPourCategorie(convention, cat);
      if (echelles.length > 0) setEchelle(String(echelles[0]));
    }
  }, [convention, clearResult]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEmployeurLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // ─── Calcul ─────────────────────────────────────────────────────
  const lancerCalcul = useCallback(() => {
    if (!convention) return;

    const salarie: SalarieConvention = {
      nom,
      prénom: prenom,
      categorieAgent: categorieDetectee?.code ?? categorieAgent,
      anciennete: parseInt(anciennete) || 0,
      regime,
      situationFamiliale: situationFamiliale as SalarieConvention["situationFamiliale"],
      nombreEnfants: parseInt(nombreEnfants) || 0,
    };

    if (mode === "net-to-brut") {
      const netVal = parseFloat(netSouhaite);
      if (!netVal || netVal <= 0 || !echelle) return;
      const res = calculerBrutPourNetConvention(
        netVal, convention, salarie,
        parseInt(echelle), echelonDetecte,
        parseInt(annee) || 2026, parseInt(mois) || 1,
        { heuresSup: parseFloat(heuresSup) || undefined, primesExceptionnelles: parseFloat(primesExceptionnelles) || undefined },
      );
      if (res) {
        setResultat(res.resultat);
        setResultatNetToBrut(res);
      }
    } else {
      const sb = salaireAuto;
      if (!sb || sb <= 0) return;
      const elements: ElementsPaieConvention = {
        salaireBrut: sb,
        annee: parseInt(annee) || 2026,
        mois: parseInt(mois) || 1,
        heuresSup: parseFloat(heuresSup) || undefined,
        primesExceptionnelles: parseFloat(primesExceptionnelles) || undefined,
      };
      setResultat(calculerPaieConvention(convention, salarie, elements));
      setResultatNetToBrut(null);
    }
  }, [
    convention, mode, nom, prenom, categorieAgent, categorieDetectee,
    anciennete, regime, situationFamiliale, nombreEnfants,
    echelle, echelonDetecte, salaireAuto, annee, mois,
    heuresSup, primesExceptionnelles, netSouhaite,
  ]);

  // ─── Export PDF ─────────────────────────────────────────────────
  const exporterPDF = useCallback(async () => {
    const el = ficheRef.current;
    if (!el) { toast.error("Aucun contenu à exporter"); return; }
    setExportEnCours(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const sanitizer = (s: string) =>
        s.trim().replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF_\- ]/g, "").replace(/\s+/g, "_").slice(0, 40);
      const filename = `Fiche_Paie_${sanitizer(nom) || "Salarie"}_${MOIS_NOMS_EXPORT[(parseInt(mois) || 1) - 1]}_${annee}.pdf`;
      await html2pdf()
        .set({
          margin: [8, 6, 8, 6],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .save();
      toast.success(`PDF exporté : ${filename}`);
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erreur lors de l'export PDF — réessayez");
    } finally {
      setExportEnCours(false);
    }
  }, [nom, mois, annee]);

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
              Retour
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canCalculate = mode === "brut-to-net"
    ? salaireAuto != null && salaireAuto > 0
    : parseFloat(netSouhaite) > 0 && echelle !== "";

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <BackToTools />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/conventions" className="hover:underline">Conventions</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/conventions/${convention.slug}`} className="hover:underline">{convention.sectorNameFr}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Fiche de paie</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Fiche de paie — {convention.sectorNameFr}</h1>

        <div className="grid lg:grid-cols-[400px_1fr] gap-6 mt-6">
          {/* ─── LEFT: FORM ─── */}
          <div className="space-y-4">
            {/* Mode */}
            <Card>
              <CardContent className="py-3">
                <Tabs value={mode} onValueChange={(v) => { setMode(v as CalculMode); clearResult(); }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="brut-to-net" className="flex-1 gap-1.5 text-xs">
                      <Banknote className="h-3.5 w-3.5" /> Brut → Net
                    </TabsTrigger>
                    <TabsTrigger value="net-to-brut" className="flex-1 gap-1.5 text-xs">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Net → Brut
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Employeur */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /> Employeur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                <div className="flex items-center gap-2">
                  {employeurLogoDataUrl && <img src={employeurLogoDataUrl} alt="Logo" className="h-10 w-10 object-contain border border-border rounded" />}
                  <div className="flex-1">
                    <Input value={employeurNom} onChange={(e) => setEmployeurNom(e.target.value)} placeholder="Raison sociale" className="h-8 text-sm" />
                  </div>
                </div>
                <label className="block">
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs h-7" />
                </label>
              </CardContent>
            </Card>

            {/* Salarié */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm"><User className="h-4 w-4" /> Salarié</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="h-8 text-sm" />
                  <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Régime</Label>
                    <Select value={regime} onValueChange={(v) => setRegime(v as "48h" | "40h")}>
                      <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="48h">48h / semaine</SelectItem>
                        <SelectItem value="40h">40h / semaine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Situation</Label>
                    <Select value={situationFamiliale} onValueChange={setSituationFamiliale}>
                      <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Célibataire">Célibataire</SelectItem>
                        <SelectItem value="Marié">Marié</SelectItem>
                        <SelectItem value="Marié + enfants">Marié + enfants</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {situationFamiliale !== "Célibataire" && (
                  <div>
                    <Label className="text-[10px]">Enfants à charge</Label>
                    <Input type="number" min="0" value={nombreEnfants} onChange={(e) => setNombreEnfants(e.target.value)} className="h-8 text-sm" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Classification grille */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4" /> Classification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                <div>
                  <Label className="text-[10px]">Catégorie</Label>
                  <Select value={categorieAgent} onValueChange={handleCategorieChange}>
                    <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {convention.categoriesAgents?.map((cat) => (
                        <SelectItem key={cat.code} value={cat.code}>{cat.labelFr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px]">Échelle (grade)</Label>
                  <Select value={echelle} onValueChange={(e) => { setEchelle(e); clearResult(); }}>
                    <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>
                      {echellesDisponibles.map((e) => (
                        <SelectItem key={e} value={String(e)}>Échelle {e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Ancienneté (ans)</Label>
                    <Input type="number" min="0" value={anciennete} onChange={(e) => { setAnciennete(e.target.value); clearResult(); }} className="h-8 text-sm" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="h-8 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Échelon :</span>
                      <span className="font-semibold text-sm text-foreground">{echelonDetecte}</span>
                    </div>
                  </div>
                </div>

                {/* Salaire auto-détecté */}
                <div className={`p-2.5 rounded-lg flex items-center justify-between ${salaireAuto ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted/40"}`}>
                  <span className="text-xs font-medium">Salaire de base</span>
                  {salaireAuto ? (
                    <span className="font-bold font-mono">{formatMontantDT(salaireAuto)}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Choisir échelle</span>
                  )}
                </div>

                {categorieDetectee && (
                  <p className="text-[10px] text-muted-foreground">Échelle {echelle} → {categorieDetectee.labelFr}</p>
                )}
              </CardContent>
            </Card>

            {/* Période & options */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4" /> Période</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">Mois</Label>
                    <Select value={mois} onValueChange={setMois}>
                      <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <SelectItem key={m} value={String(m)}>{MOIS_NOMS[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px]">Année</Label>
                    <Select value={annee} onValueChange={(v) => { setAnnee(v); clearResult(); }}>
                      <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["2024", "2025", "2026", "2027", "2028"].map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Net→Brut input */}
                {mode === "net-to-brut" && (
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <Label className="text-[10px] font-semibold text-blue-800 dark:text-blue-200">Net à payer souhaité (DT)</Label>
                    <Input
                      type="number" min="0" step="0.001"
                      value={netSouhaite}
                      onChange={(e) => { setNetSouhaite(e.target.value); clearResult(); }}
                      placeholder="Ex: 1000"
                      className="mt-0.5 h-9 font-mono text-base"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-[10px]">Heures supp. (optionnel)</Label>
                  <Input type="number" min="0" value={heuresSup} onChange={(e) => setHeuresSup(e.target.value)} placeholder="0" className="h-8 text-sm" />
                </div>

                <Button onClick={lancerCalcul} className="w-full gap-2" disabled={!canCalculate}>
                  <Banknote className="h-4 w-4" />
                  {mode === "brut-to-net" ? "Calculer" : "Calculer Net → Brut"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ─── RIGHT: RESULT ─── */}
          <div>
            {resultat ? (
              <FichePaiePrintable
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
                  <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Remplissez le formulaire puis cliquez « Calculer »</p>
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
// FICHE DE PAIE — Alignée sur la maquette HTML
// Deux colonnes : Gains (Exonéré / Soumis) | Retenues (Base / Montant)
// Net à Payer en bandeau doré
// Signature en bas
// ═══════════════════════════════════════════════════════════════════════

function FichePaiePrintable({
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

  const isNetToBrut = mode === "net-to-brut" && resultatNetToBrut;
  const salaireBaseGrille = isNetToBrut ? resultatNetToBrut.salaireBaseGrille : 0;
  const indemniteSupp = isNetToBrut ? resultatNetToBrut.indemniteSupplementaire : 0;

  // Build gains list for display
  const displayGains = isNetToBrut && indemniteSupp > 0
    ? [
        { label: `Salaire de base (éch. ${echelle}, échel. ${echelon})`, soumis: salaireBaseGrille, exonere: 0 },
        ...(indemniteSupp > 0 ? [{ label: "Indemnité supplémentaire", soumis: indemniteSupp, exonere: 0 }] : []),
        ...gains.filter((l) => l.code !== "SB").map((l) => ({ label: l.labelFr, soumis: l.montant, exonere: 0 })),
      ]
    : gains.map((l) => ({ label: l.labelFr, soumis: l.montant, exonere: 0 }));

  const totalExonere = displayGains.reduce((s, g) => s + g.exonere, 0);
  const totalSoumis = displayGains.reduce((s, g) => s + g.soumis, 0);

  return (
    <div className="space-y-3">
      {/* Net→Brut banner */}
      {isNetToBrut && indemniteSupp > 0 && (
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm">
          <div className="flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-200 mb-1">
            <ArrowRightLeft className="h-4 w-4" /> Décomposition Net → Brut
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-1.5 rounded bg-white/60 dark:bg-black/20">
              <span className="text-muted-foreground">Base grille</span>
              <p className="font-mono font-semibold">{formatMontantDT(salaireBaseGrille)}</p>
            </div>
            <div className="p-1.5 rounded bg-white/60 dark:bg-black/20">
              <span className="text-muted-foreground">Indemnité suppl.</span>
              <p className="font-mono font-semibold">{formatMontantDT(indemniteSupp)}</p>
            </div>
            <div className="p-1.5 rounded bg-white/60 dark:bg-black/20">
              <span className="text-muted-foreground">Brut total</span>
              <p className="font-mono font-semibold">{formatMontantDT(resultatNetToBrut!.brutTotal)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── FICHE DE PAIE (maquette format) ─── */}
      <div ref={ficheRef}>
        <div className="bg-white text-[#0B1D35] text-[13px] leading-[1.5] max-w-[780px] mx-auto border border-[#D9DDE3] shadow-sm rounded-lg overflow-hidden print:shadow-none">

          {/* Header */}
          <div className="flex justify-between items-start px-6 py-5 border-b-2" style={{ borderColor: NAVY }}>
            <div className="flex items-center gap-3">
              {employeurLogoDataUrl && <img src={employeurLogoDataUrl} alt="Logo" className="h-14 w-14 object-contain" />}
              <div>
                <h1 className="text-[15px] font-bold" style={{ fontFamily: "Montserrat, sans-serif", color: NAVY }}>
                  {employeurNom || "Employeur"}
                </h1>
                <p className="text-[11px]" style={{ color: SLATE }}>
                  Convention : {conventionName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-[14px] font-bold uppercase tracking-wider" style={{ fontFamily: "Montserrat, sans-serif", color: NAVY }}>
                Fiche de paie
              </h2>
              <p className="text-[12px] font-medium" style={{ color: SLATE }}>
                {resultat.periode.moisNom} {resultat.periode.annee}
              </p>
            </div>
          </div>

          {/* Salarie strip */}
          <div className="grid grid-cols-4 border-b text-[11px]" style={{ borderColor: HAIRLINE }}>
            {[
              { label: "Salarié", value: `${resultat.salarie.prénom} ${resultat.salarie.nom}` },
              { label: "Catégorie", value: resultat.salarie.categorieAgent },
              { label: "Échelle / Échelon", value: `${echelle} / ${echelon}` },
              { label: "Régime", value: resultat.salarie.regime },
            ].map((item, i) => (
              <div key={i} className="px-4 py-2 border-r last:border-r-0" style={{ borderColor: HAIRLINE }}>
                <span className="block text-[10px] uppercase tracking-wider font-semibold" style={{ color: SLATE }}>{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Body: 2 columns Gains | Retenues */}
          <div className="grid grid-cols-2 border-b" style={{ borderColor: HAIRLINE }}>
            {/* Gains column */}
            <div className="border-r" style={{ borderColor: HAIRLINE }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white px-5 py-1.5" style={{ background: NAVY }}>
                Gains
              </div>
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider font-semibold px-5 py-1.5 border-b" style={{ color: SLATE, borderColor: HAIRLINE }}>Élément</th>
                    <th className="text-right text-[10px] uppercase tracking-wider font-semibold px-5 py-1.5 border-b" style={{ color: SLATE, borderColor: HAIRLINE }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {displayGains.map((g, i) => (
                    <tr key={i}>
                      <td className="px-5 py-1.5 border-b" style={{ borderColor: "#ECEEF0" }}>{g.label}</td>
                      <td className="text-right px-5 py-1.5 border-b tabular-nums font-medium" style={{ borderColor: "#ECEEF0" }}>
                        {formatMontantDT(g.soumis + g.exonere)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold" style={{ background: "rgba(11,37,69,0.02)" }}>
                    <td className="px-5 py-1.5 border-t" style={{ borderColor: HAIRLINE }}>Total gains</td>
                    <td className="text-right px-5 py-1.5 border-t tabular-nums" style={{ borderColor: HAIRLINE }}>
                      {formatMontantDT(resultat.totalBrut)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Retenues column */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-white px-5 py-1.5" style={{ background: NAVY_MID }}>
                Retenues
              </div>
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider font-semibold px-5 py-1.5 border-b" style={{ color: SLATE, borderColor: HAIRLINE }}>Élément</th>
                    <th className="text-right text-[10px] uppercase tracking-wider font-semibold px-5 py-1.5 border-b" style={{ color: SLATE, borderColor: HAIRLINE }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {retenues.map((r) => (
                    <tr key={r.code}>
                      <td className="px-5 py-1.5 border-b" style={{ borderColor: "#ECEEF0", color: "#B91C1C" }}>
                        {r.labelFr}{r.taux != null ? ` (${(r.taux * 100).toFixed(2)}%)` : ""}
                      </td>
                      <td className="text-right px-5 py-1.5 border-b tabular-nums font-medium" style={{ borderColor: "#ECEEF0", color: "#B91C1C" }}>
                        {formatMontantDT(-r.montant)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold" style={{ background: "rgba(11,37,69,0.02)" }}>
                    <td className="px-5 py-1.5 border-t" style={{ borderColor: HAIRLINE, color: "#B91C1C" }}>Total retenues</td>
                    <td className="text-right px-5 py-1.5 border-t tabular-nums" style={{ borderColor: HAIRLINE, color: "#B91C1C" }}>
                      {formatMontantDT(-resultat.totalRetenues)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net à Payer — bandeau doré (maquette) */}
          <div className="flex items-baseline justify-between px-6 py-3 border-b-2" style={{ borderBottomColor: GOLD, background: "rgba(197,151,62,0.06)" }}>
            <span className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: "Montserrat, sans-serif", color: NAVY }}>
              Net à Payer
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold tabular-nums" style={{ color: NAVY }}>
                {new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(resultat.netAPayer).replace(/\u00A0/g, " ")}
              </span>
              <span className="text-[13px] font-semibold" style={{ color: GOLD_DIM }}>DT</span>
            </div>
          </div>

          {/* Footer: patronal info (no imprimés) */}
          <div className="grid grid-cols-2 gap-4 px-6 py-2 text-[10px] border-t" style={{ color: SLATE, borderColor: HAIRLINE }}>
            <div className="pt-1">
              {resultat.cotisationsPatronales.map((c, i) => (
                <span key={i}>
                  {i > 0 && " | "}
                  <strong>{c.label}</strong> : {formatMontantDT(c.montant)}
                </span>
              ))}
            </div>
            <div className="text-right pt-1">
              <strong>Coût total employeur</strong> : {formatMontantDT(resultat.totalBrut + resultat.totalCotisationsPatronales)}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 px-6 py-6 text-[11px]" style={{ color: SLATE }}>
            <div className="text-center">
              <strong>Employeur</strong>
              <div className="border-t mt-8 pt-1 text-[10px]" style={{ borderColor: HAIRLINE }}>Signature et cachet</div>
            </div>
            <div className="text-center">
              <strong>Salarié</strong>
              <div className="border-t mt-8 pt-1 text-[10px]" style={{ borderColor: HAIRLINE }}>Lu et approuvé</div>
            </div>
          </div>
        </div>
      </div>

      {/* Export PDF */}
      <div className="flex justify-end gap-2 no-print">
        <Button onClick={onExport} disabled={exportEnCours} className="gap-2">
          <Download className="w-4 h-4" /> {exportEnCours ? "Export..." : "Télécharger PDF"}
        </Button>
      </div>
    </div>
  );
}
