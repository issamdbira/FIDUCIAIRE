import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSmigPourAnnee } from "@/lib/payroll/cnss";
import { getCoefficientActualisation } from "@/lib/payroll/coefficients-actualisation";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";
import BackToTools from "@/components/BackToTools";
import CalculationSource from "@/components/CalculationSource";

/**
 * Calculateur de Retraite CNSS - Salariés du secteur privé
 *
 * SOURCE UNIQUE ET OFFICIELLE : https://secu.tn/fr/calculateur-retraite-cnss.html
 * Coefficients d'actualisation : centralisés dans lib/payroll/coefficients-actualisation.ts
 * Table SMIG : centralisée dans lib/payroll/cnss.ts
 */

interface RetraiteResult {
  salaireActualiseMoyen: number;
  dureeeCotisation: number;
  tauxPension: number;
  pensionBrute: number;
  pensionMinimaleApplicable: number;
  pensionRetenue: boolean;
}

export default function RetraiteCNSS() {
  const [salaireBrutMensuel, setSalaireBrutMensuel] = useState<number>(1000);
  const [dureeeCotisation, setDureeCotisation] = useState<number>(25);
  const [anneeDepart, setAnneeDepart] = useState<number>(2025);
  const [result, setResult] = useState<RetraiteResult | null>(null);

  const erreurSalaire = validerMontantSalaire(salaireBrutMensuel);

  const calculerTauxPension = (duree: number): number => {
    if (duree < 10) return 0;
    const taux = 0.4 + (duree - 10) * 0.02;
    return Math.min(taux, 0.8);
  };

  const calculerSalaireActualiseMoyen = (): number => {
    const anneeReference = anneeDepart - 5;
    const smigAnnee = getSmigPourAnnee(anneeReference);
    const plafond = smigAnnee * 6;
    const salairePlafonne = Math.min(salaireBrutMensuel, plafond);
    const coefficient = getCoefficientActualisation(anneeReference);
    return salairePlafonne * coefficient;
  };

  const handleCalculer = () => {
    const salaireActualiseMoyen = calculerSalaireActualiseMoyen();
    const tauxPension = calculerTauxPension(dureeeCotisation);
    const pensionBrute = salaireActualiseMoyen * tauxPension;

    const smigActuel = getSmigPourAnnee(anneeDepart);
    let pensionMinimaleApplicable = 0;
    if (dureeeCotisation >= 10) {
      pensionMinimaleApplicable = (2 / 3) * smigActuel;
    } else if (dureeeCotisation >= 5) {
      pensionMinimaleApplicable = 0.5 * smigActuel;
    }

    const pensionRetenue = pensionMinimaleApplicable > pensionBrute;
    const pensionFinale = Math.max(pensionBrute, pensionMinimaleApplicable);

    setResult({
      salaireActualiseMoyen: Math.round(salaireActualiseMoyen * 100) / 100,
      dureeeCotisation,
      tauxPension: Math.round(tauxPension * 10000) / 100,
      pensionBrute: Math.round(pensionFinale * 100) / 100,
      pensionMinimaleApplicable: Math.round(pensionMinimaleApplicable * 100) / 100,
      pensionRetenue,
    });
  };

  // Calcul automatique au chargement avec les valeurs par défaut
  useEffect(() => {
    handleCalculer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <BackToTools />
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Estimer sa retraite
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Estimez votre pension de retraite (salariés du secteur privé) selon les règles de la sécurité sociale (CNSS). Le calcul utilise les coefficients d'actualisation officiels.
      </p>

      <div className="grid md:grid-cols-[380px_1fr] gap-6">
        {/* ── Inputs column ── */}
        <div>
          <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <strong>Simplification actuelle :</strong> ce calculateur suppose un salaire mensuel
              constant sur les 10 dernières années. Pour un calcul précis, il faudrait saisir le
              salaire réel de chacune des 10 dernières années.
            </p>
          </div>

          <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card mb-6">
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold text-foreground mb-2 block">
                  Salaire Brut Mensuel Moyen (D)
                </Label>
                <Input
                  type="number"
                  value={salaireBrutMensuel}
                  onChange={(e) => setSalaireBrutMensuel(parseFloat(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                />
                {erreurSalaire && <p className="text-sm text-destructive mt-2">{erreurSalaire}</p>}
              </div>

              <div>
                <Label className="text-base font-semibold text-foreground mb-2 block">
                  Durée de Cotisation (Années)
                </Label>
                <Input
                  type="number"
                  value={dureeeCotisation}
                  onChange={(e) => setDureeCotisation(parseInt(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                  max="50"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Moins de 5 ans : pas de pension (remboursement des cotisations). 5 à 10 ans : pension
                  proportionnelle. 10 ans et plus : 40% + 2%/an au-delà de 10 ans, plafonné à 80%.
                </p>
              </div>

              <div>
                <Label className="text-base font-semibold text-foreground mb-2 block">
                  Année de Départ à la Retraite
                </Label>
                <Select value={anneeDepart.toString()} onValueChange={(v) => setAnneeDepart(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCalculer}
                disabled={!!erreurSalaire}
                className="w-full py-3 text-lg font-semibold"
              >
                Calculer ma Pension
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Results column ── */}
        <div>
          {result && !erreurSalaire && (
            <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
              <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Estimation de Pension
              </h2>

              <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[320px]">
                <tbody>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Salaire de Référence Actualisé</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(result.salaireActualiseMoyen)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Durée de Cotisation</td>
                    <td className="py-3 text-right tabular-nums font-medium">{result.dureeeCotisation} ans</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Taux de Pension</td>
                    <td className="py-3 text-right tabular-nums font-medium">{result.tauxPension.toFixed(1)}%</td>
                  </tr>

                  <tr className="bg-primary/5 border-t-2 border-primary">
                    <td className="py-4 px-4 text-lg font-bold text-foreground">Pension Brute Mensuelle</td>
                    <td className="py-4 px-4 text-right text-lg font-bold text-primary tabular-nums">{formatMontantDT(result.pensionBrute)}</td>
                  </tr>
                </tbody>
              </table>
              </div>

              {result.pensionRetenue && (
                <p className="text-sm text-muted-foreground mt-4">
                  Le montant calculé étant inférieur au minimum garanti, la pension minimale de{" "}
                  <span className="tabular-nums">{formatMontantDT(result.pensionMinimaleApplicable)}</span> a été appliquée.
                </p>
              )}

              <CalculationSource source="Règles CNSS — taux 4 %/an (10 prem. ans) puis 2 %/an, max 80 %" reference="Circulaire CNSS — calcul de pension, réf. coefficients 19/07/2024" limit="plafond 6 × SMIG, durée validée max 80 %" verified="2025-03-30" />

              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong>Source :</strong> formules et coefficients d'actualisation officiels
                  (coefficients publiés le 19/07/2024, barème retraite mis à jour le 30/03/2025).
                  Cette estimation ne remplace pas un calcul officiel de la CNSS.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
