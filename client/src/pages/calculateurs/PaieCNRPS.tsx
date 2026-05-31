import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

/**
 * Design: Minimaliste & Professionnel
 * Calculateur de Paie CNRPS (Fonctionnaires Publics)
 * Formules extraites de secu.tn
 */

interface PayeCNRPSResult {
  salaireBrut: number;
  cotisationsCNRPS: number;
  salaireImposable: number;
  irpp: number;
  css: number;
  salaireNet: number;
}

const TAUX_COTISATION_CNRPS = 0.085; // 8.5% pour CNRPS
const TAUX_CSS = 0.005; // 0.5% pour 2023-2025

// Barème IRPP 2025
const BAREME_IRPP = [
  { min: 0, max: 5000, taux: 0 },
  { min: 5000, max: 10000, taux: 0.15 },
  { min: 10000, max: 20000, taux: 0.25 },
  { min: 20000, max: 30000, taux: 0.30 },
  { min: 30000, max: 40000, taux: 0.33 },
  { min: 40000, max: 50000, taux: 0.36 },
  { min: 50000, max: 70000, taux: 0.38 },
  { min: 70000, max: Infinity, taux: 0.40 }
];

export default function PaieCNRPS() {
  const [salaireBrut, setSalaireBrut] = useState<number>(2000);
  const [chefFamille, setChefFamille] = useState(false);
  const [enfants, setEnfants] = useState(0);
  const [etudiants, setEtudiants] = useState(0);
  const [infirmes, setInfirmes] = useState(0);
  const [autresDeductions, setAutresDeductions] = useState(0);
  const [result, setResult] = useState<PayeCNRPSResult | null>(null);

  const calculerIRPP = (assiette: number, deductions: number): number => {
    const assietteFiscale = assiette - deductions;
    if (assietteFiscale <= 0) return 0;

    let irpp = 0;
    for (const tranche of BAREME_IRPP) {
      if (assietteFiscale > tranche.min) {
        const montantTranche = Math.min(assietteFiscale, tranche.max) - tranche.min;
        irpp += montantTranche * tranche.taux;
      }
    }
    return Math.round(irpp * 100) / 100;
  };

  const calculerDeductions = (): number => {
    let deductions = 0;

    // Chef de famille
    if (chefFamille) {
      deductions += 300;
    }

    // Enfants (100 D par enfant, max 4)
    deductions += Math.min(enfants, 4) * 100;

    // Étudiants (1000 D par étudiant, max 4)
    deductions += Math.min(etudiants, 4) * 1000;

    // Enfants infirmes (2000 D par enfant)
    deductions += infirmes * 2000;

    // Autres déductions annuelles (convertir en mensuel)
    deductions += autresDeductions / 12;

    return deductions;
  };

  const handleCalculer = () => {
    const cotisationsCNRPS = salaireBrut * TAUX_COTISATION_CNRPS;
    const salaireImposable = salaireBrut - cotisationsCNRPS;
    
    const deductions = calculerDeductions();
    const irpp = calculerIRPP(salaireImposable * 12, deductions) / 12;
    
    const css = salaireImposable * TAUX_CSS;
    const salaireNet = salaireBrut - cotisationsCNRPS - irpp - css;

    setResult({
      salaireBrut: Math.round(salaireBrut * 100) / 100,
      cotisationsCNRPS: Math.round(cotisationsCNRPS * 100) / 100,
      salaireImposable: Math.round(salaireImposable * 100) / 100,
      irpp: Math.round(irpp * 100) / 100,
      css: Math.round(css * 100) / 100,
      salaireNet: Math.round(salaireNet * 100) / 100
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
            Calculateur de Paie CNRPS
          </h1>
          <p className="text-gray-600 mb-8">
            Calculez votre salaire net en tant que fonctionnaire public affilié à la CNRPS.
          </p>

          <Card className="p-8 border-0 shadow-sm mb-8">
            <div className="space-y-6">
              {/* Salaire Brut */}
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Salaire Brut Mensuel (D)
                </Label>
                <Input
                  type="number"
                  value={salaireBrut}
                  onChange={(e) => setSalaireBrut(parseFloat(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                />
              </div>

              {/* Situation Familiale */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-blue-900 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Situation Familiale
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="chef"
                      checked={chefFamille}
                      onCheckedChange={(checked) => setChefFamille(checked as boolean)}
                    />
                    <Label htmlFor="chef" className="cursor-pointer">
                      Chef de famille (300 D)
                    </Label>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Nombre d'enfants (moins de 20 ans)
                    </Label>
                    <Select value={enfants.toString()} onValueChange={(v) => setEnfants(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} enfant{n !== 1 ? "s" : ""} ({n * 100} D)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Étudiants sans bourse
                    </Label>
                    <Select value={etudiants.toString()} onValueChange={(v) => setEtudiants(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} étudiant{n !== 1 ? "s" : ""} ({n * 1000} D)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Enfants handicapés
                    </Label>
                    <Select value={infirmes.toString()} onValueChange={(v) => setInfirmes(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} enfant{n !== 1 ? "s" : ""} ({n * 2000} D)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Autres déductions annuelles (D)
                    </Label>
                    <Input
                      type="number"
                      value={autresDeductions}
                      onChange={(e) => setAutresDeductions(parseFloat(e.target.value) || 0)}
                      placeholder="Ex: intérêts de crédit..."
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Info CNRPS */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>CNRPS (Caisse Nationale de Retraite et de Prévoyance Sociale)</strong><br/>
                  Taux de cotisation: 8.5% (vs 9.68% pour CNSS)
                </p>
              </div>

              {/* Bouton Calculer */}
              <Button
                onClick={handleCalculer}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 text-lg"
              >
                Calculer
              </Button>
            </div>
          </Card>

          {/* Résultats */}
          {result && (
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Bulletin de Paie CNRPS
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Brut</span>
                  <span className="font-semibold text-lg text-blue-900">{result.salaireBrut.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Cotisations CNRPS (8.5%)</span>
                  <span className="font-semibold text-red-600">-{result.cotisationsCNRPS.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Imposable</span>
                  <span className="font-semibold text-blue-900">{result.salaireImposable.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">IRPP</span>
                  <span className="font-semibold text-red-600">-{result.irpp.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">CSS (0.5%)</span>
                  <span className="font-semibold text-red-600">-{result.css.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">Salaire Net</span>
                  <span className="text-2xl font-bold text-blue-700">{result.salaireNet.toFixed(2)} D</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600">
                  <strong>Note :</strong> Ce calculateur est basé sur la réglementation CNRPS 2025. 
                  La CSS a été supprimée à partir de janvier 2026. 
                  Consultez votre employeur pour les détails exacts de votre paie.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
