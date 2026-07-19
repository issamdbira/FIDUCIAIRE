import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

/**
 * Design: Minimaliste & Professionnel
 * Calculateur d'actualisation des salaires CNSS
 *
 * SOURCE UNIQUE ET OFFICIELLE : https://secu.tn/fr/calculateur-actualisation-salaire-cnss.html
 * Coefficients publiés par le ministère des affaires sociales le 19/07/2024,
 * applicables aux salariés mis à la retraite en 2024 et années suivantes
 * (en attente de la publication des coefficients 2025+).
 *
 * Formule : Salaire actualisé = Min(Salaire brut, 6 x SMIG de l'année du salaire) x Coefficient de l'année du salaire
 */

// Mêmes coefficients que RetraiteCNSS.tsx - à garder synchronisés (même source)
const COEFFICIENTS_ACTUALISATION_2024: Record<number, number> = {
  2004: 2.64701,
  2005: 2.59417,
  2006: 2.49096,
  2007: 2.40817,
  2008: 2.29539,
  2009: 2.21712,
  2010: 2.1235,
  2011: 2.05087,
  2012: 1.94286,
  2013: 1.83102,
  2014: 1.73582,
  2015: 1.65758,
  2016: 1.59801,
  2017: 1.51728,
  2018: 1.41202,
  2019: 1.32216,
  2020: 1.25163,
  2021: 1.18406,
  2022: 1.09323,
  2023: 1.0,
};

// SMIG par année - à compléter (2016-2019 manquants, cf. PLAN_MIGRATION_SECU_TN.md)
const SMIG_PAR_ANNEE: Record<number, number> = {
  2015: 325.0,
  2020: 372.0,
  2021: 385.0,
  2022: 406.0,
  2023: 441.6,
  2024: 472.6,
  2025: 508.0,
};

function getSmigPourAnnee(annee: number): number {
  const annees = Object.keys(SMIG_PAR_ANNEE).map(Number).sort((a, b) => a - b);
  let smig = SMIG_PAR_ANNEE[annees[0]];
  for (const a of annees) {
    if (a <= annee) smig = SMIG_PAR_ANNEE[a];
  }
  return smig;
}

interface LigneResultat {
  annee: number;
  salaireBrut: number;
  salairePlafonne: number;
  coefficient: number;
  salaireActualise: number;
}

export default function ActualisationSalaire() {
  const anneesDisponibles = Object.keys(COEFFICIENTS_ACTUALISATION_2024).map(Number).sort((a, b) => b - a);
  const [annee, setAnnee] = useState<number>(2023);
  const [salaireBrut, setSalaireBrut] = useState<number>(1500);
  const [resultat, setResultat] = useState<LigneResultat | null>(null);

  const handleCalculer = () => {
    const coefficient = COEFFICIENTS_ACTUALISATION_2024[annee] ?? 1;
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
              </div>

              <Button
                onClick={handleCalculer}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-lg"
              >
                Actualiser
              </Button>
            </div>
          </Card>

          {resultat && (
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Résultat
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Brut Saisi ({resultat.annee})</span>
                  <span className="font-semibold text-blue-900">{resultat.salaireBrut.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Plafonné (6x SMIG {resultat.annee})</span>
                  <span className="font-semibold text-blue-900">{resultat.salairePlafonne.toFixed(2)} D</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Coefficient d'Actualisation</span>
                  <span className="font-semibold text-blue-900">{resultat.coefficient}</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">Salaire Actualisé</span>
                  <span className="text-2xl font-bold text-blue-700">{resultat.salaireActualise.toFixed(2)} D</span>
                </div>
              </div>
              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600">
                  <strong>Source :</strong> coefficients publiés par le ministère des affaires
                  sociales le 19/07/2024 (secu.tn/fr/calculateur-actualisation-salaire-cnss.html).
                  Répétez ce calcul pour les 10 dernières années puis faites la moyenne pour obtenir
                  le salaire de référence utilisé dans le calculateur de retraite CNSS.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
