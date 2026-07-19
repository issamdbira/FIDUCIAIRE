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
 * Calculateur de Retraite CNSS - Salariés du secteur privé
 *
 * SOURCE UNIQUE ET OFFICIELLE : https://secu.tn/fr/calculateur-retraite-cnss.html
 * (dernière mise à jour secu.tn : 30-03-2025)
 * Coefficients d'actualisation : https://secu.tn/fr/calculateur-actualisation-salaire-cnss.html
 * (coefficients publiés le 19-07-2024, applicables aux retraites 2024 et suivantes)
 *
 * Formule officielle :
 * Pension brute = Salaire de référence x Taux de pension
 * - Salaire de référence = moyenne des 10 dernières années de salaire brut,
 *   chaque salaire annuel étant (1) plafonné à 6x le SMIG en vigueur l'année
 *   où il a été perçu, puis (2) actualisé par le coefficient CNSS de cette année.
 * - Taux de pension = 40% pour les 10 premières années de cotisation,
 *   + 2%/an au-delà, plafonné à 80%. En dessous de 10 ans : pension
 *   proportionnelle (5 à 10 ans) ou aucune pension (< 5 ans, remboursement
 *   des cotisations salariales).
 * - Pension minimale garantie (>= 10 ans de cotisation) : 2/3 du SMIG
 * - Pension minimale garantie (5 à 10 ans de cotisation) : 50% du SMIG
 */

interface RetraiteResult {
  salaireActualiseMoyen: number;
  dureeeCotisation: number;
  tauxPension: number;
  pensionBrute: number;
  pensionMinimaleApplicable: number;
  pensionRetenue: boolean;
}

// SMIG (régime 48h) par année - Journal Officiel / secu.tn
// SOURCE: https://secu.tn/fr/smig-smag-tunisie.html (à revérifier - page non encore migrée)
const SMIG_PAR_ANNEE: Record<number, number> = {
  2015: 325.0,
  2020: 372.0,
  2021: 385.0,
  2022: 406.0,
  2023: 441.6,
  2024: 472.6,
  2025: 508.0,
};

// Coefficients d'actualisation publiés par le ministère des affaires sociales le 19/07/2024
// SOURCE: https://secu.tn/fr/calculateur-actualisation-salaire-cnss.html
// Applicables aux salariés mis à la retraite en 2024 et années suivantes (en attente des coefficients 2025+)
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

function getSmigPourAnnee(annee: number): number {
  const annees = Object.keys(SMIG_PAR_ANNEE).map(Number).sort((a, b) => a - b);
  let smig = SMIG_PAR_ANNEE[annees[0]];
  for (const a of annees) {
    if (a <= annee) smig = SMIG_PAR_ANNEE[a];
  }
  return smig;
}

export default function RetraiteCNSS() {
  const [salaireBrutMensuel, setSalaireBrutMensuel] = useState<number>(1000);
  const [dureeeCotisation, setDureeCotisation] = useState<number>(25);
  const [anneeDepart, setAnneeDepart] = useState<number>(2025);
  const [result, setResult] = useState<RetraiteResult | null>(null);

  // Taux de pension: 40% (10 premières années) + 2%/an au-delà, plafonné à 80%
  // SOURCE: secu.tn/fr/calculateur-retraite-cnss.html, section "Quel est la taux de la pension de retraite"
  const calculerTauxPension = (duree: number): number => {
    if (duree < 10) return 0; // pension proportionnelle ou nulle - cas non couvert par ce calculateur simplifié
    const taux = 0.4 + (duree - 10) * 0.02;
    return Math.min(taux, 0.8);
  };

  // Approximation du salaire de référence : le salaire mensuel saisi est supposé
  // constant sur les 10 dernières années puis actualisé avec le coefficient de
  // l'année (année de départ - 10), plafonné à 6x le SMIG de cette année-là.
  // Pour un calcul exact, il faut saisir le salaire réel de chacune des 10 dernières
  // années (cf. tableau secu.tn) - à implémenter en Phase 1 bis si besoin d'un
  // simulateur ligne par ligne.
  const calculerSalaireActualiseMoyen = (): number => {
    const anneeReference = anneeDepart - 5; // année médiane des 10 dernières années
    const smigAnnee = getSmigPourAnnee(anneeReference);
    const plafond = smigAnnee * 6;
    const salairePlafonne = Math.min(salaireBrutMensuel, plafond);
    const coefficient = COEFFICIENTS_ACTUALISATION_2024[anneeReference] ?? 1;
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
            Estimez votre pension de retraite (salariés du secteur privé) selon les règles CNSS.
          </p>

          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Simplification actuelle :</strong> ce calculateur suppose un salaire mensuel
              constant sur les 10 dernières années. Pour un calcul précis, il faudrait saisir le
              salaire réel de chacune des 10 dernières années (voir le tableau détaillé sur secu.tn).
              Un mode "10 salaires réels" est prévu en Phase 1 bis du plan de migration.
            </p>
          </div>

          <Card className="p-8 border-0 shadow-sm mb-8">
            <div className="space-y-6">
              {/* Salaire mensuel */}
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Salaire Brut Mensuel Moyen (D)
                </Label>
                <Input
                  type="number"
                  value={salaireBrutMensuel}
                  onChange={(e) => setSalaireBrutMensuel(parseFloat(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                />
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
                  min="0"
                  max="50"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Moins de 5 ans : pas de pension (remboursement des cotisations). 5 à 10 ans : pension
                  proportionnelle. 10 ans et plus : 40% + 2%/an au-delà de 10 ans, plafonné à 80%.
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
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  <span className="text-gray-700">Salaire de Référence Actualisé</span>
                  <span className="font-semibold text-lg text-blue-900">{result.salaireActualiseMoyen.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Durée de Cotisation</span>
                  <span className="font-semibold text-lg text-blue-900">{result.dureeeCotisation} ans</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Taux de Pension</span>
                  <span className="font-semibold text-lg text-blue-900">{result.tauxPension.toFixed(1)}%</span>
                </div>

                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">Pension Brute Mensuelle</span>
                  <span className="text-2xl font-bold text-blue-700">{result.pensionBrute.toFixed(2)} D</span>
                </div>

                {result.pensionRetenue && (
                  <p className="text-sm text-gray-600">
                    Le montant calculé étant inférieur au minimum garanti, la pension minimale de{" "}
                    {result.pensionMinimaleApplicable.toFixed(2)} D a été appliquée.
                  </p>
                )}
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600">
                  <strong>Source :</strong> formules et coefficients d'actualisation issus de secu.tn
                  (coefficients publiés le 19/07/2024, page retraite CNSS mise à jour le 30/03/2025).
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
