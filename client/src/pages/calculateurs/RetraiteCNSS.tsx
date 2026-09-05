import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSmigPourAnnee } from "@/lib/payroll/cnss";
import { getCoefficientActualisation } from "@/lib/payroll/coefficients-actualisation";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";

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

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Estimer sa retraite
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Estimez votre pension de retraite (salariés du secteur privé) selon les règles CNSS. Le calcul utilise les coefficients d'actualisation officiels.
      </p>

      <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Simplification actuelle :</strong> ce calculateur suppose un salaire mensuel
          constant sur les 10 dernières années. Pour un calcul précis, il faudrait saisir le
          salaire réel de chacune des 10 dernières années.
        </p>
      </div>

      <Card className="p-6 rounded-lg shadow-sm border border-border bg-card mb-6">
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

      {result && !erreurSalaire && (
        <Card className="p-6 rounded-lg shadow-sm border border-border bg-card">
          <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Estimation de Pension
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Salaire de Référence Actualisé</span>
              <span className="font-semibold text-lg text-foreground">{formatMontantDT(result.salaireActualiseMoyen)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Durée de Cotisation</span>
              <span className="font-semibold text-lg text-foreground">{result.dureeeCotisation} ans</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Taux de Pension</span>
              <span className="font-semibold text-lg text-foreground">{result.tauxPension.toFixed(1)}%</span>
            </div>

            <div className="flex justify-between items-center py-4 bg-primary/5 px-4 rounded-lg">
              <span className="text-lg font-bold text-foreground">Pension Brute Mensuelle</span>
              <span className="text-2xl font-bold text-primary">{formatMontantDT(result.pensionBrute)}</span>
            </div>

            {result.pensionRetenue && (
              <p className="text-sm text-muted-foreground">
                Le montant calculé étant inférieur au minimum garanti, la pension minimale de{" "}
                {formatMontantDT(result.pensionMinimaleApplicable)} a été appliquée.
              </p>
            )}
          </div>

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
  );
}
