import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSmigPourAnnee } from "@/lib/payroll/cnss";
import { COEFFICIENTS_ACTUALISATION, getCoefficientActualisation } from "@/lib/payroll/coefficients-actualisation";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";

/**
 * Calculateur d'actualisation des salaires CNSS
 *
 * Coefficients et table SMIG centralisés dans lib/payroll/
 * Formule : Salaire actualisé = Min(Salaire brut, 6 x SMIG de l'année du salaire) x Coefficient de l'année du salaire
 */

interface LigneResultat {
  annee: number;
  salaireBrut: number;
  salairePlafonne: number;
  coefficient: number;
  salaireActualise: number;
}

export default function ActualisationSalaire() {
  const anneesDisponibles = Object.keys(COEFFICIENTS_ACTUALISATION).map(Number).sort((a, b) => b - a);
  const [annee, setAnnee] = useState<number>(2023);
  const [salaireBrut, setSalaireBrut] = useState<number>(1500);
  const [resultat, setResultat] = useState<LigneResultat | null>(null);

  const erreurSalaire = validerMontantSalaire(salaireBrut);

  const handleCalculer = () => {
    const coefficient = getCoefficientActualisation(annee);
    const plafond = getSmigPourAnnee(annee) * 6;
    const salairePlafonne = Math.min(salaireBrut, plafond);
    const salaireActualise = salairePlafonne * coefficient;

    setResultat({
      annee,
      salaireBrut,
      salairePlafonne: Math.round(salairePlafonne * 100) / 100,
      coefficient,
      salaireActualise: Math.round(salaireActualise * 100) / 100,
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Actualisation des Salaires
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Pour calculer le salaire de référence de la pension, chaque salaire annuel des 10
        dernières années est plafonné à 6× le SMIG puis actualisé par un coefficient.
      </p>

      <div className="grid md:grid-cols-[380px_1fr] gap-6">
        {/* ── Inputs column ── */}
        <div>
          <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card mb-6">
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold text-foreground mb-2 block">
                  Année du Salaire
                </Label>
                <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anneesDisponibles.map((a) => (
                      <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-semibold text-foreground mb-2 block">
                  Salaire Brut Mensuel Perçu Cette Année-là (D)
                </Label>
                <Input
                  type="number"
                  value={salaireBrut}
                  onChange={(e) => setSalaireBrut(parseFloat(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                />
                {erreurSalaire && <p className="text-sm text-destructive mt-2">{erreurSalaire}</p>}
              </div>

              <Button
                onClick={handleCalculer}
                disabled={!!erreurSalaire}
                className="w-full py-3 text-lg font-semibold"
              >
                Actualiser
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Results column ── */}
        <div>
          {resultat && !erreurSalaire && (
            <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
              <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Résultat
              </h2>

              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Salaire Brut Saisi ({resultat.annee})</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(resultat.salaireBrut)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Salaire Plafonné (6× SMIG {resultat.annee})</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(resultat.salairePlafonne)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Coefficient d'Actualisation</td>
                    <td className="py-3 text-right tabular-nums font-medium">{resultat.coefficient}</td>
                  </tr>

                  <tr className="bg-primary/5 border-t-2 border-primary">
                    <td className="py-4 px-4 text-lg font-bold text-foreground">Salaire Actualisé</td>
                    <td className="py-4 px-4 text-right text-lg font-bold text-primary tabular-nums">{formatMontantDT(resultat.salaireActualise)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Source :</strong> coefficients publiés par le ministère des affaires
                  sociales le 19/07/2024. Répétez ce calcul pour les 10 dernières années puis faites
                  la moyenne pour obtenir le salaire de référence utilisé dans le calculateur de
                  retraite CNSS.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
