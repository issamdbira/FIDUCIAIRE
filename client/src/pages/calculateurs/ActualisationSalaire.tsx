import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { getSmigPourAnnee } from "@/lib/payroll/cnss";
import { COEFFICIENTS_ACTUALISATION, getCoefficientActualisation } from "@/lib/payroll/coefficients-actualisation";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";

/**
 * Design: Minimaliste & Professionnel
 * Calculateur d'actualisation des salaires CNSS
 *
 * Coefficients et table SMIG centralisés dans lib/payroll/ (mêmes modules
 * que RetraiteCNSS.tsx — les deux outils sont désormais liés via une source
 * unique, table de coefficients complète 1961-2029, aucune duplication).
 *
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
            Actualisation des Salaires CNSS
          </h1>
          <p className="text-gray-600 mb-8">
            Pour calculer le salaire de référence de la pension, chaque salaire annuel des 10
            dernières années est plafonné à 6x le SMIG puis actualisé par un coefficient.
          </p>

          <Card className="p-8 border-0 shadow-sm mb-8">
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Année du Salaire
                </Label>
                <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anneesDisponibles.map((a) => (
                      <SelectItem key={a} value={a.toString()}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Salaire Brut Mensuel Perçu Cette Année-là (D)
                </Label>
                <Input
                  type="number"
                  value={salaireBrut}
                  onChange={(e) => setSalaireBrut(parseFloat(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                />
                {erreurSalaire && <p className="text-sm text-red-600 mt-2">{erreurSalaire}</p>}
              </div>

              <Button
                onClick={handleCalculer}
                disabled={!!erreurSalaire}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Actualiser
              </Button>
            </div>
          </Card>

          {resultat && !erreurSalaire && (
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Résultat
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Brut Saisi ({resultat.annee})</span>
                  <span className="font-semibold text-blue-900">{formatMontantDT(resultat.salaireBrut)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Plafonné (6x SMIG {resultat.annee})</span>
                  <span className="font-semibold text-blue-900">{formatMontantDT(resultat.salairePlafonne)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Coefficient d'Actualisation</span>
                  <span className="font-semibold text-blue-900">{resultat.coefficient}</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">Salaire Actualisé</span>
                  <span className="text-2xl font-bold text-blue-700">{formatMontantDT(resultat.salaireActualise)}</span>
                </div>
              </div>
              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600">
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
