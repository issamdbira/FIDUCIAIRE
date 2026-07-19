import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { calculerCotisationCNSS, calculerCSS } from "@/lib/payroll/cnss";
import { calculerDeductionsMensuelles, calculerIRPPAnnuel } from "@/lib/payroll/irpp";

/**
 * Design: Minimaliste & Professionnel
 * Calculateur de Paie CNSS (Salariés du secteur privé)
 *
 * Les formules (CNSS, CSS, IRPP) sont centralisées dans src/lib/payroll/
 * pour être réutilisées par le futur moteur de paie (PayrollEngine) sans
 * duplication. Ne pas recopier de constantes ici — importer depuis lib/payroll.
 */

interface PayeResult {
  salaireBrut: number;
  cotisationsCNSS: number;
  salaireImposable: number;
  irpp: number;
  css: number;
  salaireNet: number;
}


const SMIG_2025 = 508; // Dinars

export default function PaieCNSS() {
  const [salaireBrut, setSalaireBrut] = useState<number>(1000);
  const [annee, setAnnee] = useState<number>(2026);
  const [chefFamille, setChefFamille] = useState(false);
  const [enfants, setEnfants] = useState(0);
  const [etudiants, setEtudiants] = useState(0);
  const [infirmes, setInfirmes] = useState(0);
  const [autresDeductions, setAutresDeductions] = useState(0);
  const [result, setResult] = useState<PayeResult | null>(null);

  const handleCalculer = () => {
    const cotisationsCNSS = calculerCotisationCNSS(salaireBrut, annee);
    const salaireImposable = salaireBrut - cotisationsCNSS;

    const deductions = calculerDeductionsMensuelles({
      chefFamille,
      enfants,
      etudiants,
      infirmes,
      autresDeductionsAnnuelles: autresDeductions,
    });
    const irpp = calculerIRPPAnnuel(salaireImposable * 12, deductions * 12) / 12;

    const css = calculerCSS(salaireImposable, annee);
    const salaireNet = salaireBrut - cotisationsCNSS - irpp - css;

    setResult({
      salaireBrut: Math.round(salaireBrut * 100) / 100,
      cotisationsCNSS: Math.round(cotisationsCNSS * 100) / 100,
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
            Calculateur de Paie CNSS
          </h1>
          <p className="text-gray-600 mb-8">
            Calculez votre salaire net à partir du brut selon la réglementation tunisienne.
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

              {/* Année */}
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Année
                </Label>
                <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025 (CSS 0.5% applicable)</SelectItem>
                    <SelectItem value="2026">2026 (CSS supprimée)</SelectItem>
                  </SelectContent>
                </Select>
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
                        {[0, 1, 2, 3, 4].map((n) => (
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
                      placeholder="Ex: intérêts de crédit, épargne..."
                      min="0"
                    />
                  </div>
                </div>
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
                Bulletin de Paie
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Brut</span>
                  <span className="font-semibold text-lg text-blue-900">{result.salaireBrut.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Cotisations CNSS (9.68%)</span>
                  <span className="font-semibold text-red-600">-{result.cotisationsCNSS.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Salaire Imposable</span>
                  <span className="font-semibold text-blue-900">{result.salaireImposable.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">IRPP</span>
                  <span className="font-semibold text-red-600">-{result.irpp.toFixed(2)} D</span>
                </div>

                {result.css > 0 && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">CSS (0.5%)</span>
                    <span className="font-semibold text-red-600">-{result.css.toFixed(2)} D</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">Salaire Net</span>
                  <span className="text-2xl font-bold text-blue-700">{result.salaireNet.toFixed(2)} D</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600">
                  <strong>Note :</strong> La CSS (0.5%) s'applique en 2023-2025 et a été supprimée à partir de
                  janvier 2026 (loi de finances 2026). Ce calculateur applique automatiquement la bonne règle
                  selon l'année choisie ci-dessus. Source : secu.tn.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
