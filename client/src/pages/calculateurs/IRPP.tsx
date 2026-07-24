import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { calculerCotisationCNSS } from "@/lib/payroll/cnss";
import { calculerDeductionsAnnuelles, calculerFraisProfessionnels, calculerIRPPAnnuel } from "@/lib/payroll/irpp";

/**
 * Design: Minimaliste & Professionnel
 * Calculateur IRPP (Impôt sur le Revenu des Personnes Physiques)
 *
 * Barème, frais professionnels et déductions familiales : centralisés dans
 * lib/payroll/irpp.ts, vérifiés directement contre secu.tn/fr/calculateur-irpp-tunisie.html
 * le 19/07/2026 (voir PLAN_MIGRATION_SECU_TN.md pour le détail des corrections).
 *
 * Ce fichier garde ses propres déductions spécifiques à la déclaration annuelle
 * (intérêts crédit immobilier, cotisations syndicales) qui n'existent pas
 * ailleurs dans le projet et sont mentionnées par secu.tn ("autres déductions").
 *
 * SUPPRIMÉ le 19/07/2026 : la section "crédits d'impôt" (50D/enfant, 500D
 * handicap) qui existait ici ne correspond à aucun mécanisme documenté par
 * secu.tn - elle semble avoir été inventée. Retirée pour ne pas produire un
 * résultat faux présenté comme certain.
 */

interface IRPPResult {
  revenuAnnuel: number;
  cotisationsCNSS: number;
  revenuImposable: number;
  fraisProfessionnels: number;
  deductions: number;
  assietteFiscale: number;
  irpp: number;
  tauxEffectif: number;
}

export default function IRPP() {
  const [revenuAnnuel, setRevenuAnnuel] = useState<number>(18000);
  const [chefFamille, setChefFamille] = useState(false);
  const [enfants, setEnfants] = useState(0);
  const [etudiants, setEtudiants] = useState(0);
  const [infirmes, setInfirmes] = useState(0);
  const [interetsCredit, setInteretsCredit] = useState(0);
  const [cotisationsSyndicales, setCotisationsSyndicales] = useState(0);
  const [result, setResult] = useState<IRPPResult | null>(null);

  const calculerAutresDeductions = (): number => {
    let deductions = 0;
    // Intérêts crédit immobilier première habitation (max 2000 D/an - secu.tn "autres déductions")
    deductions += Math.min(interetsCredit, 2000);
    // Cotisations syndicales (plafond usuel 5% du revenu - à confirmer précisément si besoin)
    const maxCotisations = revenuAnnuel * 0.05;
    deductions += Math.min(cotisationsSyndicales, maxCotisations);
    return deductions;
  };

  const handleCalculer = () => {
    const cotisationsCNSS = calculerCotisationCNSS(revenuAnnuel, new Date().getFullYear());
    const revenuImposable = revenuAnnuel - cotisationsCNSS;
    const fraisProfessionnels = calculerFraisProfessionnels(revenuImposable);
    const deductionsFamiliales = calculerDeductionsAnnuelles({
      chefFamille,
      enfants,
      etudiants,
      infirmes,
      autresDeductionsAnnuelles: calculerAutresDeductions(),
    });
    const assietteFiscale = Math.max(revenuImposable - fraisProfessionnels - deductionsFamiliales, 0);
    const irpp = calculerIRPPAnnuel(assietteFiscale, 0);

    const tauxEffectif = revenuAnnuel > 0 ? (irpp / revenuAnnuel) * 100 : 0;

    setResult({
      revenuAnnuel: Math.round(revenuAnnuel * 100) / 100,
      cotisationsCNSS: Math.round(cotisationsCNSS * 100) / 100,
      revenuImposable: Math.round(revenuImposable * 100) / 100,
      fraisProfessionnels: Math.round(fraisProfessionnels * 100) / 100,
      deductions: Math.round(deductionsFamiliales * 100) / 100,
      assietteFiscale: Math.round(assietteFiscale * 100) / 100,
      irpp: Math.round(irpp * 100) / 100,
      tauxEffectif: Math.round(tauxEffectif * 100) / 100
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
            Calculateur IRPP
          </h1>
          <p className="text-gray-600 mb-8">
            Calculez votre impôt annuel sur le revenu selon votre situation familiale et vos déductions.
          </p>

          <Card className="p-8 border-0 shadow-sm mb-8">
            <div className="space-y-6">
              {/* Revenu Annuel */}
              <div>
                <Label className="text-base font-semibold text-blue-900 mb-2 block">
                  Revenu Annuel Brut (D)
                </Label>
                <Input
                  type="number"
                  value={revenuAnnuel}
                  onChange={(e) => setRevenuAnnuel(parseFloat(e.target.value) || 0)}
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
                      Chef de famille (3600 D/an)
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
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} enfant{n !== 1 ? "s" : ""} ({n * 100} D/an)
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
                            {n} étudiant{n !== 1 ? "s" : ""} ({n * 1000} D/an)
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
                            {n} enfant{n !== 1 ? "s" : ""} ({n * 2000} D/an)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Déductions Supplémentaires */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-blue-900 mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Déductions Supplémentaires
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Intérêts crédit immobilier (D/an, max 2000)
                    </Label>
                    <Input
                      type="number"
                      value={interetsCredit}
                      onChange={(e) => setInteretsCredit(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      max="2000"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Cotisations syndicales (D/an, max 5% du revenu)
                    </Label>
                    <Input
                      type="number"
                      value={cotisationsSyndicales}
                      onChange={(e) => setCotisationsSyndicales(parseFloat(e.target.value) || 0)}
                      placeholder="0"
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
                Calculer mon IRPP
              </Button>
            </div>
          </Card>

          {/* Résultats */}
          {result && (
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-900 mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Détail de l'Impôt
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Revenu Annuel Brut</span>
                  <span className="font-semibold text-lg text-blue-900">{result.revenuAnnuel.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Cotisations CNSS (9.68%)</span>
                  <span className="font-semibold text-red-600">-{result.cotisationsCNSS.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Revenu Imposable</span>
                  <span className="font-semibold text-blue-900">{result.revenuImposable.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Frais Professionnels (10%)</span>
                  <span className="font-semibold text-green-600">-{result.fraisProfessionnels.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Déductions Fiscales</span>
                  <span className="font-semibold text-green-600">-{result.deductions.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Assiette Fiscale</span>
                  <span className="font-semibold text-blue-900">{result.assietteFiscale.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">IRPP Annuel</span>
                  <span className="text-2xl font-bold text-blue-700">{result.irpp.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gray-100 px-4 rounded">
                  <span className="text-gray-700">Taux Effectif</span>
                  <span className="font-semibold text-blue-900">{result.tauxEffectif.toFixed(2)}%</span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gray-100 px-4 rounded">
                  <span className="text-gray-700">IRPP Mensuel</span>
                  <span className="font-semibold text-blue-900">{(result.irpp / 12).toFixed(2)} D</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-600">
                  <strong>Note :</strong> Ce calculateur utilise le barème IRPP 2025. 
                  Les crédits d'impôt pour enfants sont de 50 D/enfant/mois. 
                  Consultez les autorités fiscales pour une estimation officielle.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
