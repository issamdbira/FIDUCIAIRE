import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";
import { runPayrollEngine } from "@/lib/payroll/engine";
import { trouverBrutPourNet } from "@/lib/payroll/netToBrut";
import type { PayrollResult } from "@/lib/payroll/types";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";

/**
 * Calculer un salaire — Brut → Net ou Net → Brut.
 * Réutilise exclusivement le moteur central (runPayrollEngine) : aucune
 * formule dupliquée, un seul moteur de calcul pour les deux sens.
 */

type Mode = "brut-vers-net" | "net-vers-brut";

export default function CalculerSalaire() {
  const [mode, setMode] = useState<Mode>("brut-vers-net");
  const [montant, setMontant] = useState(1000);
  const [annee, setAnnee] = useState(2026);
  const [chefFamille, setChefFamille] = useState(false);
  const [enfants, setEnfants] = useState(0);
  const [etudiants, setEtudiants] = useState(0);
  const [infirmes, setInfirmes] = useState(0);

  const [resultat, setResultat] = useState<PayrollResult | null>(null);
  const [brutTrouve, setBrutTrouve] = useState<number | null>(null);

  const erreurMontant = validerMontantSalaire(montant);

  const situationCommune = {
    employeur: { nom: "" },
    salarie: { nom: "", prenom: "", chefFamille, enfants, etudiants, infirmes },
    periode: { mois: 1, annee },
  };

  const calculer = () => {
    if (mode === "brut-vers-net") {
      const res = runPayrollEngine({
        ...situationCommune,
        elements: [{ id: "brut", type: "salaire_base", label: "Salaire de base", montant, traitement: "standard" }],
      });
      setResultat(res);
      setBrutTrouve(null);
    } else {
      const { brut, resultat: res } = trouverBrutPourNet(montant, situationCommune);
      setBrutTrouve(brut);
      setResultat(res);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Calculer un salaire
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Passez du brut au net, ou déterminez le brut nécessaire pour obtenir un net souhaité. Calcul basé sur la réglementation tunisienne en vigueur.
      </p>

      {/* Toggle mode */}
      <div className="flex bg-muted rounded-lg p-1 mb-6">
        <button
          onClick={() => { setMode("brut-vers-net"); setResultat(null); }}
          className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition ${mode === "brut-vers-net" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Brut → Net
        </button>
        <button
          onClick={() => { setMode("net-vers-brut"); setResultat(null); }}
          className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition flex items-center justify-center gap-1 ${mode === "net-vers-brut" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" /> Net → Brut
        </button>
      </div>

      <Card className="p-6 rounded-lg shadow-sm border border-border bg-card mb-6 space-y-6">
        <div>
          <Label className="text-base font-semibold text-foreground mb-2 block">
            {mode === "brut-vers-net" ? "Salaire Brut Mensuel (D)" : "Salaire Net Souhaité (D)"}
          </Label>
          <Input type="number" value={montant} onChange={(e) => setMontant(parseFloat(e.target.value) || 0)} className="text-lg p-3" min="0" />
          {erreurMontant && <p className="text-sm text-destructive mt-2">{erreurMontant}</p>}
        </div>

        <div>
          <Label className="text-base font-semibold text-foreground mb-2 block">Année</Label>
          <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="font-semibold text-foreground mb-4">Situation familiale (pour l'IRPP)</h3>
          <div className="flex items-center gap-3 mb-4">
            <Checkbox id="chef" checked={chefFamille} onCheckedChange={(c) => setChefFamille(c as boolean)} />
            <Label htmlFor="chef" className="cursor-pointer">Chef de famille</Label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm mb-2 block">Enfants</Label>
              <Input type="number" min="0" value={enfants} onChange={(e) => setEnfants(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Étudiants</Label>
              <Input type="number" min="0" value={etudiants} onChange={(e) => setEtudiants(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Enfants handicapés</Label>
              <Input type="number" min="0" value={infirmes} onChange={(e) => setInfirmes(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        <Button onClick={calculer} disabled={!!erreurMontant} className="w-full py-3 text-lg font-semibold">
          Calculer
        </Button>
      </Card>

      {resultat && !erreurMontant && (
        <Card className="p-6 rounded-lg shadow-sm border border-border bg-card">
          <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Détail du calcul
          </h2>

          <div className="space-y-3">
            {mode === "net-vers-brut" && brutTrouve !== null && (
              <div className="flex justify-between items-center py-3 bg-primary/5 px-4 rounded-lg mb-2">
                <span className="font-semibold text-foreground">Salaire Brut Nécessaire</span>
                <span className="text-xl font-bold text-primary">{formatMontantDT(brutTrouve)}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Rémunération brute</span>
              <span className="font-semibold text-foreground">{formatMontantDT(resultat.totalRemunerationBrute)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Cotisation CNSS</span>
              <span className="font-semibold text-destructive">{formatMontantDT(-resultat.cotisationCNSS)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Abattement frais professionnels (10 %, plafond 2 000 DT/an)</span>
              <span className="font-semibold text-green-600">{formatMontantDT(-resultat.fraisProfessionnelsMensuel)}</span>
            </div>
            {resultat.deductionsFamilialesMensuelles > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Déductions familiales</span>
                <span className="font-semibold text-green-600">{formatMontantDT(-resultat.deductionsFamilialesMensuelles)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Assiette imposable nette</span>
              <span className="font-semibold text-foreground">{formatMontantDT(resultat.assietteImposableNetteMensuelle)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">IRPP</span>
              <span className="font-semibold text-destructive">{formatMontantDT(-resultat.irppMensuel)}</span>
            </div>
            {resultat.css > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">CSS</span>
                <span className="font-semibold text-destructive">{formatMontantDT(-resultat.css)}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-4 bg-primary/5 px-4 rounded-lg">
              <span className="text-lg font-bold text-foreground">Salaire Net</span>
              <span className="text-2xl font-bold text-primary">{formatMontantDT(resultat.netAPayer)}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
