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
    <div className="max-w-3xl mx-auto py-8 px-4">
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

      <Card className="p-6 rounded-lg shadow-sm border border-border bg-card mb-6">
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

      {resultat && !erreurSalaire && (
        <Card className="p-6 rounded-lg shadow-sm border border-border bg-card">
          <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Résultat
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Salaire Brut Saisi ({resultat.annee})</span>
              <span className="font-semibold text-foreground">{formatMontantDT(resultat.salaireBrut)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Salaire Plafonné (6× SMIG {resultat.annee})</span>
              <span className="font-semibold text-foreground">{formatMontantDT(resultat.salairePlafonne)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Coefficient d'Actualisation</span>
              <span className="font-semibold text-foreground">{resultat.coefficient}</span>
            </div>
            <div className="flex justify-between items-center py-4 bg-primary/5 px-4 rounded-lg">
              <span className="text-lg font-bold text-foreground">Salaire Actualisé</span>
              <span className="text-2xl font-bold text-primary">{formatMontantDT(resultat.salaireActualise)}</span>
            </div>
          </div>
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
  );
}
