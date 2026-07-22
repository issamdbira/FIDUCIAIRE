import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Link } from "wouter";
import { runPayrollEngine } from "@/lib/payroll/engine";
import { trouverBrutPourNet } from "@/lib/payroll/netToBrut";
import type { PayrollResult } from "@/lib/payroll/types";

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
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Calculer un salaire
          </h1>
          <p className="text-gray-600 mb-8">
            Passez du brut au net, ou déterminez le brut nécessaire pour obtenir un net souhaité.
          </p>

          {/* Toggle mode */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => { setMode("brut-vers-net"); setResultat(null); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition ${mode === "brut-vers-net" ? "bg-blue-700 text-white" : "text-gray-600"}`}
            >
              Brut → Net
            </button>
            <button
              onClick={() => { setMode("net-vers-brut"); setResultat(null); }}
              className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition flex items-center justify-center gap-1 ${mode === "net-vers-brut" ? "bg-blue-700 text-white" : "text-gray-600"}`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Net → Brut
            </button>
          </div>

          <Card className="p-8 border-0 shadow-sm mb-8 space-y-6">
            <div>
              <Label className="text-base font-semibold text-blue-900 mb-2 block">
                {mode === "brut-vers-net" ? "Salaire Brut Mensuel (D)" : "Salaire Net Souhaité (D)"}
              </Label>
              <Input type="number" value={montant} onChange={(e) => setMontant(parseFloat(e.target.value) || 0)} className="text-lg p-3" min="0" />
            </div>

            <div>
              <Label className="text-base font-semibold text-blue-900 mb-2 block">Année</Label>
              <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-blue-900 mb-4">Situation familiale (pour l'IRPP)</h3>
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

            <Button onClick={calculer} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-lg">
              Calculer
            </Button>
          </Card>

          {resultat && (
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Détail du calcul
              </h2>

              <div className="space-y-3">
                {mode === "net-vers-brut" && brutTrouve !== null && (
                  <div className="flex justify-between items-center py-3 bg-blue-50 px-4 rounded-lg mb-2">
                    <span className="font-semibold text-blue-900">Salaire Brut Nécessaire</span>
                    <span className="text-xl font-bold text-blue-700">{brutTrouve.toFixed(2)} D</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Rémunération brute</span>
                  <span className="font-semibold text-blue-900">{resultat.totalRemunerationBrute.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Cotisation CNSS</span>
                  <span className="font-semibold text-red-600">-{resultat.cotisationCNSS.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Base fiscale</span>
                  <span className="font-semibold text-blue-900">{resultat.baseFiscaleMensuelle.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">IRPP</span>
                  <span className="font-semibold text-red-600">-{resultat.irppMensuel.toFixed(2)} D</span>
                </div>
                {resultat.css > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">CSS</span>
                    <span className="font-semibold text-red-600">-{resultat.css.toFixed(2)} D</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">Salaire Net</span>
                  <span className="text-2xl font-bold text-blue-700">{resultat.netAPayer.toFixed(2)} D</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
