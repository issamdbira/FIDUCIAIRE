import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight } from "lucide-react";
import BackToTools from "@/components/BackToTools";
import { runPayrollEngine } from "@/lib/payroll/engine";
import { trouverBrutPourNet } from "@/lib/payroll/netToBrut";
import type { PayrollResult } from "@/lib/payroll/types";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";
import CalculationSource from "@/components/CalculationSource";

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

  // Calcul automatique au chargement avec les valeurs par défaut
  useEffect(() => {
    calculer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <BackToTools />
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Calculer un salaire
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Passez du brut au net, ou déterminez le brut nécessaire pour obtenir un net souhaité. Calcul basé sur la réglementation tunisienne en vigueur.
      </p>

      <div className="grid md:grid-cols-[380px_1fr] gap-6">
        {/* ── Inputs column ── */}
        <div>
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

          <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card space-y-6">
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
              <h3 className="font-semibold text-foreground mb-4">Situation familiale (pour l'impôt sur le revenu — IRPP)</h3>
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
        </div>

        {/* ── Results column ── */}
        <div>
          {resultat && !erreurMontant && (
            <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
              <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Détail du calcul
              </h2>

              <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[320px]">
                <tbody>
                  {mode === "net-vers-brut" && brutTrouve !== null && (
                    <tr className="bg-primary/5 border-t-2 border-primary">
                      <td className="py-3 px-4 text-sm font-semibold text-foreground">Salaire Brut Nécessaire</td>
                      <td className="py-3 px-4 text-right text-lg font-bold text-primary tabular-nums">{formatMontantDT(brutTrouve)}</td>
                    </tr>
                  )}

                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Rémunération brute</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(resultat.totalRemunerationBrute)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Cotisation sécurité sociale (CNSS)</td>
                    <td className="py-3 text-right tabular-nums font-medium text-destructive">{formatMontantDT(-resultat.cotisationCNSS)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Abattement frais professionnels (10 %, plafond 2 000 DT/an)</td>
                    <td className="py-3 text-right tabular-nums font-medium text-success">{formatMontantDT(-resultat.fraisProfessionnelsMensuel)}</td>
                  </tr>
                  {resultat.deductionsFamilialesMensuelles > 0 && (
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Déductions familiales</td>
                      <td className="py-3 text-right tabular-nums font-medium text-success">{formatMontantDT(-resultat.deductionsFamilialesMensuelles)}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Assiette imposable nette</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(resultat.assietteImposableNetteMensuelle)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">IRPP</td>
                    <td className="py-3 text-right tabular-nums font-medium text-destructive">{formatMontantDT(-resultat.irppMensuel)}</td>
                  </tr>
                  {resultat.css > 0 && (
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Contribution sociale de solidarité (CSS)</td>
                      <td className="py-3 text-right tabular-nums font-medium text-destructive">{formatMontantDT(-resultat.css)}</td>
                    </tr>
                  )}

                  <tr className="bg-primary/5 border-t-2 border-primary">
                    <td className="py-4 px-4 text-lg font-bold text-foreground">Salaire Net</td>
                    <td className="py-4 px-4 text-right text-lg font-bold text-primary tabular-nums">{formatMontantDT(resultat.netAPayer)}</td>
                  </tr>
                </tbody>
              </table>
              </div>

              <CalculationSource source="Barème IRPP 2025 (Loi de finances 2025, art. 3), taux CNSS 9,68 %/17,07 % (depuis janv. 2025)" reference="Décret n° 2003-1098 du 19 mai 2003 (JORT n° 41 du 23/05/2003)" limit="plafond global 5 % (art. 3) pour avantages exclus" verified="2025-01-01" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
