import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Download, Plus, Trash2, Upload } from "lucide-react";
import { Link } from "wouter";
import { runPayrollEngine } from "@/lib/payroll/engine";
import {
  PRIME_PRESENCE_DEFAUT,
  PRIME_TRANSPORT_DEFAUT,
  TAUX_HORAIRE_PAR_REGIME,
} from "@/lib/payroll/constantes-complementaires";
import type { Employeur, PayrollItem, PayrollItemType, PayrollResult, Salarie } from "@/lib/payroll/types";

/**
 * Générateur de fiche de paie — MVP (couches 2 et 3).
 * 1 employeur, 1 salarié, 1 période, 1 fiche. Parcours guidé en 7 étapes.
 * Réutilise le PayrollEngine (lib/payroll/engine.ts) - aucune formule
 * dupliquée ici. Les taux/barèmes/règles métier restent définis exclusivement
 * dans lib/payroll/ - ce fichier ne fait qu'orchestrer l'UI.
 */

const TYPES_ELEMENT: { value: PayrollItemType; label: string }[] = [
  { value: "salaire_base", label: "Salaire de base" },
  { value: "prime", label: "Prime" },
  { value: "indemnite", label: "Indemnité" },
  { value: "absence", label: "Absence (retenue)" },
  { value: "retenue", label: "Retenue" },
  { value: "avantage", label: "Avantage en nature" },
  { value: "autre", label: "Autre élément" },
];

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `item-${idCounter}`;
}

const ETAPES = ["Employeur", "Salarié", "Période", "Éléments", "Vérification", "Résultat", "Fiche de paie"];

export default function GenerateurFichePaie() {
  const [etape, setEtape] = useState(0);
  const ficheRef = useRef<HTMLDivElement>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  const [employeur, setEmployeur] = useState<Employeur>({
    nom: "",
    logoDataUrl: undefined,
    adresse: "",
    telephone: "",
    email: "",
    matriculeCNSS: "",
    secteur: "non_agricole",
  });

  const [regime, setRegime] = useState<40 | 48>(40);
  const [heuresSup, setHeuresSup] = useState(0);
  const [majorationHS, setMajorationHS] = useState(25);

  const [salarie, setSalarie] = useState<Salarie>({
    nom: "",
    prenom: "",
    matricule: "",
    dateEmbauche: "",
    chefFamille: false,
    enfants: 0,
    etudiants: 0,
    infirmes: 0,
    modePaiement: "espece",
    banque: "",
    rib: "",
  });

  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const [elements, setElements] = useState<PayrollItem[]>([
    { id: nextId(), type: "salaire_base", label: "Salaire de base", montant: 1000, traitement: "standard" },
  ]);

  const [resultat, setResultat] = useState<PayrollResult | null>(null);

  const handleLogoUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEmployeur((prev) => ({ ...prev, logoDataUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const ajouterElement = () => {
    setElements([
      ...elements,
      { id: nextId(), type: "prime", label: "", montant: 0, traitement: "standard" },
    ]);
  };

  const supprimerElement = (id: string) => {
    setElements(elements.filter((e) => e.id !== id));
  };

  const modifierElement = (id: string, patch: Partial<PayrollItem>) => {
    setElements(elements.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const lancerCalcul = () => {
    const res = runPayrollEngine({
      employeur,
      salarie,
      periode: { mois, annee },
      elements: elements.map((e) => ({
        ...e,
        // les absences/retenues sont saisies en montant positif mais réduisent le brut
        montant: e.type === "absence" || e.type === "retenue" ? -Math.abs(e.montant) : e.montant,
      })),
    });
    setResultat(res);
    setEtape(5);
  };

  const exporterPDF = async () => {
    if (!ficheRef.current) return;
    setExportEnCours(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 10,
          filename: `fiche_paie_${salarie.nom || "salarie"}_${mois}-${annee}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(ficheRef.current)
        .save();
    } finally {
      setExportEnCours(false);
    }
  };

  const canAdvanceFromEmployeur = employeur.nom.trim() !== "";
  const canAdvanceFromSalarie = salarie.nom.trim() !== "" && salarie.prenom.trim() !== "";
  const canAdvanceFromElements = elements.length > 0 && elements.every((e) => e.label.trim() !== "");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Générer une Fiche de Paie
          </h1>
          <p className="text-gray-600 mb-8">
            Gratuit pour 1 salarié et 1 période. Le calcul détaillé est entièrement transparent.
          </p>

          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            {ETAPES.map((label, i) => (
              <div
                key={label}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  i === etape
                    ? "bg-blue-700 text-white"
                    : i < etape
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i + 1}. {label}
              </div>
            ))}
          </div>

          {/* Étape 1 : Employeur */}
          {etape === 0 && (
            <Card className="p-8 border-0 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Informations de l'employeur
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Nom / Raison sociale *</Label>
                  <Input value={employeur.nom} onChange={(e) => setEmployeur({ ...employeur, nom: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Matricule CNSS employeur</Label>
                  <Input value={employeur.matriculeCNSS} onChange={(e) => setEmployeur({ ...employeur, matriculeCNSS: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Secteur d'activité</Label>
                  <Select value={employeur.secteur} onValueChange={(v) => setEmployeur({ ...employeur, secteur: v as "non_agricole" | "agricole" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_agricole">Non agricole (9.68% / 17.07%)</SelectItem>
                      <SelectItem value="agricole">Agricole (6.99% / 12.48%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Régime hebdomadaire</Label>
                  <Select value={regime.toString()} onValueChange={(v) => setRegime(parseInt(v) as 40 | 48)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="40">40h/semaine</SelectItem>
                      <SelectItem value="48">48h/semaine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Adresse</Label>
                  <Input value={employeur.adresse} onChange={(e) => setEmployeur({ ...employeur, adresse: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Téléphone</Label>
                  <Input value={employeur.telephone} onChange={(e) => setEmployeur({ ...employeur, telephone: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Email</Label>
                  <Input type="email" value={employeur.email} onChange={(e) => setEmployeur({ ...employeur, email: e.target.value })} />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <Label className="mb-2 block font-semibold text-blue-900">Logo de l'entreprise</Label>
                <div className="flex items-center gap-4">
                  {employeur.logoDataUrl && (
                    <img src={employeur.logoDataUrl} alt="Logo" className="h-16 w-16 object-contain border border-gray-200 rounded" />
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-blue-300 rounded-lg cursor-pointer text-blue-700 hover:bg-blue-50">
                    <Upload className="w-4 h-4" />
                    {employeur.logoDataUrl ? "Changer le logo" : "Ajouter un logo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Le logo reste dans votre navigateur (aucun envoi vers un serveur) et sera inclus dans la fiche PDF.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button disabled={!canAdvanceFromEmployeur} onClick={() => setEtape(1)} className="bg-blue-700 hover:bg-blue-800 gap-2">
                  Suivant <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Étape 2 : Salarié */}
          {etape === 1 && (
            <Card className="p-8 border-0 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Informations du salarié
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Prénom *</Label>
                  <Input value={salarie.prenom} onChange={(e) => setSalarie({ ...salarie, prenom: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Nom *</Label>
                  <Input value={salarie.nom} onChange={(e) => setSalarie({ ...salarie, nom: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Matricule</Label>
                  <Input value={salarie.matricule} onChange={(e) => setSalarie({ ...salarie, matricule: e.target.value })} />
                </div>
                <div>
                  <Label className="mb-2 block">Date d'embauche</Label>
                  <Input type="date" value={salarie.dateEmbauche} onChange={(e) => setSalarie({ ...salarie, dateEmbauche: e.target.value })} />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-blue-900 mb-3">Situation familiale (pour l'IRPP)</h3>
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox
                    id="chef"
                    checked={salarie.chefFamille}
                    onCheckedChange={(c) => setSalarie({ ...salarie, chefFamille: c as boolean })}
                  />
                  <Label htmlFor="chef" className="cursor-pointer">Chef de famille</Label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2 block text-sm">Enfants</Label>
                    <Input type="number" min="0" value={salarie.enfants} onChange={(e) => setSalarie({ ...salarie, enfants: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Étudiants</Label>
                    <Input type="number" min="0" value={salarie.etudiants} onChange={(e) => setSalarie({ ...salarie, etudiants: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Enfants handicapés</Label>
                    <Input type="number" min="0" value={salarie.infirmes} onChange={(e) => setSalarie({ ...salarie, infirmes: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-blue-900 mb-3">Mode de paiement</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2 block text-sm">Mode</Label>
                    <Select value={salarie.modePaiement} onValueChange={(v) => setSalarie({ ...salarie, modePaiement: v as "espece" | "virement" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="espece">Espèce</SelectItem>
                        <SelectItem value="virement">Virement bancaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {salarie.modePaiement === "virement" && (
                    <>
                      <div>
                        <Label className="mb-2 block text-sm">Banque</Label>
                        <Input value={salarie.banque} onChange={(e) => setSalarie({ ...salarie, banque: e.target.value })} />
                      </div>
                      <div>
                        <Label className="mb-2 block text-sm">RIB</Label>
                        <Input value={salarie.rib} onChange={(e) => setSalarie({ ...salarie, rib: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setEtape(0)}>Retour</Button>
                <Button disabled={!canAdvanceFromSalarie} onClick={() => setEtape(2)} className="bg-blue-700 hover:bg-blue-800 gap-2">
                  Suivant <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Étape 3 : Période */}
          {etape === 2 && (
            <Card className="p-8 border-0 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Période de paie
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Mois</Label>
                  <Select value={mois.toString()} onValueChange={(v) => setMois(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"].map((m, i) => (
                        <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Année</Label>
                  <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2025, 2026].map((a) => (
                        <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setEtape(1)}>Retour</Button>
                <Button onClick={() => setEtape(3)} className="bg-blue-700 hover:bg-blue-800 gap-2">
                  Suivant <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Étape 4 : Éléments de rémunération */}
          {etape === 3 && (
            <Card className="p-8 border-0 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Éléments de rémunération
              </h2>

              <div className="space-y-3">
                {elements.map((el) => (
                  <div key={el.id} className="flex items-end gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="w-40">
                      <Label className="text-xs mb-1 block">Type</Label>
                      <Select value={el.type} onValueChange={(v) => modifierElement(el.id, { type: v as PayrollItemType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TYPES_ELEMENT.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">Libellé</Label>
                      <Input value={el.label} onChange={(e) => modifierElement(el.id, { label: e.target.value })} placeholder="Ex: Prime d'ancienneté" />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs mb-1 block">Montant (D)</Label>
                      <Input type="number" value={el.montant} onChange={(e) => modifierElement(el.id, { montant: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => supprimerElement(el.id)} className="text-red-500 hover:text-red-700 mb-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {elements.some((e) => e.type === "avantage") && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-gray-700">
                  <strong>Avantages en nature :</strong> les règles de valorisation (décret n° 1098-2003)
                  ne sont pas encore intégrées dans ce calculateur — elles doivent être validées contre
                  une source officielle avant implémentation. Le montant saisi ici sera exclu du calcul
                  et signalé séparément dans le résultat.
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Ajouts rapides</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setElements([...elements, { id: nextId(), type: "prime", label: "Prime de transport", montant: PRIME_TRANSPORT_DEFAUT, traitement: "standard" }])
                    }
                  >
                    + Transport ({PRIME_TRANSPORT_DEFAUT} D)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setElements([...elements, { id: nextId(), type: "prime", label: "Prime de présence", montant: PRIME_PRESENCE_DEFAUT, traitement: "standard" }])
                    }
                  >
                    + Présence ({PRIME_PRESENCE_DEFAUT} D)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setElements([...elements, { id: nextId(), type: "retenue", label: "Avance sur salaire", montant: 0, traitement: "standard" }])
                    }
                  >
                    + Avance
                  </Button>
                </div>

                <div className="flex items-end gap-2 pt-2 border-t border-gray-200">
                  <div className="w-24">
                    <Label className="text-xs mb-1 block">Heures sup</Label>
                    <Input type="number" min="0" value={heuresSup} onChange={(e) => setHeuresSup(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs mb-1 block">Majoration</Label>
                    <Select value={majorationHS.toString()} onValueChange={(v) => setMajorationHS(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-500 flex-1">
                    Taux horaire {regime}h : {TAUX_HORAIRE_PAR_REGIME[regime]} D/h → {(heuresSup * TAUX_HORAIRE_PAR_REGIME[regime] * (1 + majorationHS / 100)).toFixed(2)} D
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (heuresSup <= 0) return;
                      const montant = Math.round(heuresSup * TAUX_HORAIRE_PAR_REGIME[regime] * (1 + majorationHS / 100) * 100) / 100;
                      setElements([...elements, { id: nextId(), type: "indemnite", label: `Heures supplémentaires (${heuresSup}h × ${majorationHS}%)`, montant, traitement: "standard" }]);
                      setHeuresSup(0);
                    }}
                  >
                    Ajouter
                  </Button>
                </div>
              </div>

              <Button variant="outline" onClick={ajouterElement} className="gap-2 border-blue-300 text-blue-700">
                <Plus className="w-4 h-4" /> Ajouter un élément vide
              </Button>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setEtape(2)}>Retour</Button>
                <Button disabled={!canAdvanceFromElements} onClick={() => setEtape(4)} className="bg-blue-700 hover:bg-blue-800 gap-2">
                  Suivant <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Étape 5 : Vérification */}
          {etape === 4 && (
            <Card className="p-8 border-0 shadow-sm space-y-5">
              <h2 className="text-xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Vérification avant calcul
              </h2>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>Employeur :</strong> {employeur.nom} {employeur.matriculeCNSS && `(CNSS: ${employeur.matriculeCNSS})`}
                  {" — "}Secteur {employeur.secteur === "agricole" ? "agricole" : "non agricole"}
                </p>
                <p><strong>Salarié :</strong> {salarie.prenom} {salarie.nom} {salarie.matricule && `(${salarie.matricule})`}</p>
                <p><strong>Période :</strong> {mois}/{annee}</p>
                <p>
                  <strong>Paiement :</strong> {salarie.modePaiement === "virement" ? `Virement${salarie.banque ? ` — ${salarie.banque}` : ""}` : "Espèce"}
                </p>
                <div className="pt-2">
                  <strong>Éléments :</strong>
                  <ul className="list-disc list-inside mt-1">
                    {elements.map((e) => (
                      <li key={e.id}>
                        {e.label} — {e.type === "absence" || e.type === "retenue" ? "-" : ""}{e.montant} D
                        {e.type === "avantage" && <span className="text-amber-600"> (en attente de règle validée)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setEtape(3)}>Retour</Button>
                <Button onClick={lancerCalcul} className="bg-blue-700 hover:bg-blue-800 gap-2">
                  Calculer <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Étape 6 : Résultat détaillé (avec détail technique par élément) */}
          {etape === 5 && resultat && (
            <Card className="p-8 border-0 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Détail technique du traitement
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-500 text-left">
                      <th className="py-2 pr-2">Désignation</th>
                      <th className="py-2 pr-2">Montant</th>
                      <th className="py-2 pr-2">Brut</th>
                      <th className="py-2 pr-2">Base CNSS</th>
                      <th className="py-2 pr-2">Base fiscale</th>
                      <th className="py-2 pr-2">Règle appliquée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultat.elements.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="py-2 pr-2">{e.label}</td>
                        <td className="py-2 pr-2">{e.montant.toFixed(2)} D</td>
                        <td className="py-2 pr-2">{e.inclusDansBrut ? "Oui" : "Non"}</td>
                        <td className="py-2 pr-2">{e.inclusBaseCNSS ? "Oui" : "Non"}</td>
                        <td className="py-2 pr-2">{e.inclusBaseFiscale ? "Oui" : "Non"}</td>
                        <td className="py-2 pr-2 text-gray-500">{e.regleAppliquee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>Rémunération brute</span>
                  <span>{resultat.totalRemunerationBrute.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Base CNSS</span>
                  <span>{resultat.baseCNSS.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Cotisation CNSS (salarié)</span>
                  <span>-{resultat.cotisationCNSS.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs">
                  <span>Cotisation patronale (à la charge de l'employeur, n'affecte pas le net)</span>
                  <span>{resultat.cotisationPatronale.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Base fiscale</span>
                  <span>{resultat.baseFiscaleMensuelle.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>IRPP</span>
                  <span>-{resultat.irppMensuel.toFixed(2)} D</span>
                </div>
                {resultat.css > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>CSS</span>
                    <span>-{resultat.css.toFixed(2)} D</span>
                  </div>
                )}
              </div>

              {resultat.elementsEnAttente.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <strong>Éléments non calculés (règle en attente de validation) :</strong>
                  <ul className="list-disc list-inside mt-1">
                    {resultat.elementsEnAttente.map((e) => (
                      <li key={e.id}>
                        {e.label} — {e.montant.toFixed(2)} D — {e.noteReglementaire || "règle non sourcée"}
                        <br />
                        <span className="text-xs text-gray-500">Calcul automatique : non — {e.regleAppliquee}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                <span className="text-lg font-bold text-blue-900">Net à Payer</span>
                <span className="text-2xl font-bold text-blue-700">{resultat.netAPayer.toFixed(2)} D</span>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setEtape(3)}>Modifier les éléments</Button>
                <Button onClick={() => setEtape(6)} className="bg-blue-700 hover:bg-blue-800 gap-2">
                  Voir la fiche de paie <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          {/* Étape 7 : Fiche de paie */}
          {etape === 6 && resultat && (
            <>
              <div ref={ficheRef}>
              <Card className="p-10 border-0 shadow-sm bg-white">
                <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-6">
                  <div className="flex items-center gap-4">
                    {employeur.logoDataUrl && (
                      <img src={employeur.logoDataUrl} alt="Logo" className="h-14 w-14 object-contain" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-blue-900" style={{ fontFamily: "Montserrat, sans-serif" }}>
                        Fiche de Paie
                      </h2>
                      <p className="text-sm text-gray-600 font-medium">{employeur.nom}</p>
                      {employeur.adresse && <p className="text-xs text-gray-400">{employeur.adresse}</p>}
                      <p className="text-sm text-gray-500">Période : {mois}/{annee}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p className="font-semibold">{salarie.prenom} {salarie.nom}</p>
                    {salarie.matricule && <p>Matricule : {salarie.matricule}</p>}
                  </div>
                </div>

                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-500">
                      <th className="text-left py-2">Désignation</th>
                      <th className="text-right py-2">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultat.elements.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100">
                        <td className="py-2">{e.label}</td>
                        <td className="text-right py-2">{e.montant.toFixed(2)} D</td>
                      </tr>
                    ))}
                    <tr className="border-b border-gray-100 font-semibold">
                      <td className="py-2">Rémunération brute</td>
                      <td className="text-right py-2">{resultat.totalRemunerationBrute.toFixed(2)} D</td>
                    </tr>
                    <tr className="border-b border-gray-100 text-red-600">
                      <td className="py-2">Cotisation CNSS</td>
                      <td className="text-right py-2">-{resultat.cotisationCNSS.toFixed(2)} D</td>
                    </tr>
                    <tr className="border-b border-gray-100 text-red-600">
                      <td className="py-2">IRPP</td>
                      <td className="text-right py-2">-{resultat.irppMensuel.toFixed(2)} D</td>
                    </tr>
                    {resultat.css > 0 && (
                      <tr className="border-b border-gray-100 text-red-600">
                        <td className="py-2">CSS</td>
                        <td className="text-right py-2">-{resultat.css.toFixed(2)} D</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="flex justify-between items-center py-4 bg-blue-900 text-white px-6 rounded-lg">
                  <span className="text-lg font-bold">Net à Payer</span>
                  <span className="text-2xl font-bold">{resultat.netAPayer.toFixed(2)} D</span>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  <strong>Paiement :</strong> {salarie.modePaiement === "virement" ? "Virement bancaire" : "Espèce"}
                  {salarie.modePaiement === "virement" && salarie.banque && ` — ${salarie.banque}`}
                  {salarie.modePaiement === "virement" && salarie.rib && ` — RIB : ${salarie.rib}`}
                </div>

                <p className="text-xs text-gray-400 mt-6">
                  Document généré par Le Fiduciaire le {new Date().toLocaleDateString("fr-TN")}.
                </p>
              </Card>
              </div>

              <div className="flex justify-between pt-6">
                <Button variant="ghost" onClick={() => setEtape(5)}>Retour au détail</Button>
                <Button onClick={exporterPDF} disabled={exportEnCours} className="bg-blue-700 hover:bg-blue-800 gap-2">
                  <Download className="w-4 h-4" /> {exportEnCours ? "Export en cours..." : "Exporter en PDF"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
