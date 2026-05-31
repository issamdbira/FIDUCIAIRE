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
 * Calculateur de Retraite CNSS
 * Formules extraites de secu.tn
 */

interface RetraiteResult {
  salaireMoyen: number;
  salaireActualise: number;
  dureeeCotisation: number;
  tauxPension: number;
  pensionBrute: number;
  pensionNet: number;
}

// Indices d'actualisation par année (exemple 2024-2025)
const INDICES_ACTUALISATION: Record<number, number> = {
  2015: 0.75,
  2016: 0.77,
  2017: 0.79,
  2018: 0.81,
  2019: 0.83,
  2020: 0.85,
  2021: 0.87,
  2022: 0.89,
  2023: 0.91,
  2024: 0.93,
  2025: 1.0
};

// Barème de taux de pension selon durée de cotisation
const BAREME_TAUX_PENSION = [
  { min: 10, max: 14, taux: 0.30 },
  { min: 15, max: 19, taux: 0.40 },
  { min: 20, max: 24, taux: 0.50 },
  { min: 25, max: 29, taux: 0.60 },
  { min: 30, max: 34, taux: 0.70 },
  { min: 35, max: Infinity, taux: 0.80 }
];

const MINIMUM_PENSION = 200; // Dinars

export default function RetraiteCNSS() {
  const [salaireMoyen, setSalaireMoyen] = useState<number>(1500);
  const [dureeeCotisation, setDureeCotisation] = useState<number>(30);
  const [anneeDepart, setAnneeDepart] = useState<number>(2025);
  const [result, setResult] = useState<RetraiteResult | null>(null);

  const calculerTauxPension = (duree: number): number => {
    for (const tranche of BAREME_TAUX_PENSION) {
      if (duree >= tranche.min && duree <= tranche.max) {
        return tranche.taux;
      }
    }
    return 0.80; // Maximum 80%
  };

  const calculerSalaireActualise = (): number => {
    const indice = INDICES_ACTUALISATION[anneeDepart] || 1.0;
    return salaireMoyen * indice;
  };

  const handleCalculer = () => {
    const salaireActualise = calculerSalaireActualise();
    const tauxPension = calculerTauxPension(dureeeCotisation);
    const pensionBrute = salaireActualise * tauxPension;
    const pensionNet = Math.max(pensionBrute, MINIMUM_PENSION);

    setResult({
      salaireMoyen: Math.round(salaireMoyen * 100) / 100,
      salaireActualise: Math.round(salaireActualise * 100) / 100,
      dureeeCotisation,
      tauxPension: Math.round(tauxPension * 10000) / 100,
      pensionBrute: Math.round(pensionBrute * 100) / 100,
      pensionNet: Math.round(pensionNet * 100) / 100
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Calculateur de Retraite CNSS
          </h1>
          <p className="text-gray-600 mb-8">
            Estimez votre pension de retraite en fonction de votre salaire moyen et votre durée de cotisation.
          </p>

          <Card className="p-8 border-0 shadow-sm mb-8">
            <div className="space-y-6">
              {/* Salaire Moyen */}
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Salaire Moyen des 10 Dernières Années (D)
                </Label>
                <Input
                  type="number"
                  value={salaireMoyen}
                  onChange={(e) => setSalaireMoyen(parseFloat(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Moyenne des 10 dernières années de salaires bruts
                </p>
              </div>

              {/* Durée de Cotisation */}
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Durée de Cotisation (Années)
                </Label>
                <Input
                  type="number"
                  value={dureeeCotisation}
                  onChange={(e) => setDureeCotisation(parseInt(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="10"
                  max="50"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Nombre d'années de cotisation à la CNSS
                </p>
              </div>

              {/* Année de Départ */}
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Année de Départ à la Retraite
                </Label>
                <Select value={anneeDepart.toString()} onValueChange={(v) => setAnneeDepart(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(INDICES_ACTUALISATION).map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-2">
                  Les salaires sont actualisés selon l'indice de l'année choisie
                </p>
              </div>

              {/* Barème Taux de Pension */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-blue-900 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Barème de Taux de Pension
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-medium text-blue-900">10-14 ans</p>
                    <p className="text-gray-600">30%</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-medium text-blue-900">15-19 ans</p>
                    <p className="text-gray-600">40%</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-medium text-blue-900">20-24 ans</p>
                    <p className="text-gray-600">50%</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-medium text-blue-900">25-29 ans</p>
                    <p className="text-gray-600">60%</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-medium text-blue-900">30-34 ans</p>
                    <p className="text-gray-600">70%</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="font-medium text-blue-900">35+ ans</p>
                    <p className="text-gray-600">80%</p>
                  </div>
                </div>
              </div>

              {/* Bouton Calculer */}
              <Button
                onClick={handleCalculer}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-lg"
              >
                Calculer ma Pension
              </Button>
            </div>
          </Card>

          {/* Résultats */}
          {result && (
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Estimation de Pension
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Moyen</span>
                  <span className="font-semibold text-lg text-blue-900">{result.salaireMoyen.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Actualisé</span>
                  <span className="font-semibold text-lg text-blue-900">{result.salaireActualise.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Durée de Cotisation</span>
                  <span className="font-semibold text-lg text-blue-900">{result.dureeeCotisation} ans</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Taux de Pension</span>
                  <span className="font-semibold text-lg text-blue-900">{result.tauxPension.toFixed(1)}%</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Pension Brute Mensuelle</span>
                  <span className="font-semibold text-lg text-blue-900">{result.pensionBrute.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">Pension Nette Mensuelle</span>
                  <span className="text-2xl font-bold text-blue-700">{result.pensionNet.toFixed(2)} D</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600">
                  <strong>Note :</strong> Cette estimation est basée sur les réglementations CNSS 2025. 
                  Le minimum garanti de pension est de {MINIMUM_PENSION} D. 
                  Les indices d'actualisation peuvent varier selon les années. Consultez la CNSS pour une estimation officielle.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
