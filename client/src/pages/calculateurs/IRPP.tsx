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
import { calculerFraisProfessionnels, calculerIRPPAnnuel } from "@/lib/payroll/irpp";

/**
 * Design: Minimaliste & Professionnel
 * Calculateur IRPP (Impôt sur le Revenu des Personnes Physiques)
 *
 * Barème, frais professionnels (10%) et taux CNSS centralisés dans
 * src/lib/payroll/ (source : référence CNSS-DS, cf. PLAN_MIGRATION_SECU_TN.md).
 * Ce fichier garde ses propres déductions spécifiques (intérêts crédit
 * immobilier, cotisations syndicales, crédits d'impôt) qui n'existent pas
 * ailleurs dans le projet.
 */

interface IRPPResult {
  revenuAnnuel: number;
  cotisationsCNSS: number;
  revenuImposable: number;
  fraisProfessionnels: number;
  deductions: number;
  assietteFiscale: number;
  irpp: number;
  creditsImpot: number;
  irppNet: number;
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
  const [handicapPersonnel, setHandicapPersonnel] = useState(false);
  const [result, setResult] = useState<IRPPResult | null>(null);

  const calculerDeductions = (): number => {
    let deductions = 0;

    // Chef de famille
    if (chefFamille) {
      deductions += 300 * 12; // Annuel
    }

    // Enfants (150 D/mois par enfant, sans plafond - cohérent avec lib/payroll/irpp.ts)
    deductions += enfants * 150 * 12;

    // Étudiants (1000 D par étudiant, max 4)
    deductions += Math.min(etudiants, 4) * 1000 * 12;

    // Enfants infirmes (2000 D par enfant)
    deductions += infirmes * 2000 * 12;

    // Intérêts crédit immobilier (max 2000 D/an)
    deductions += Math.min(interetsCredit, 2000);

    // Cotisations syndicales (max 5% du revenu)
    const maxCotisations = revenuAnnuel * 0.05;
    deductions += Math.min(cotisationsSyndicales, maxCotisations);

    return deductions;
  };

  const handleCalculer = () => {
    const cotisationsCNSS = calculerCotisationCNSS(revenuAnnuel, new Date().getFullYear());
    const revenuImposable = revenuAnnuel - cotisationsCNSS;
    const fraisProfessionnels = calculerFraisProfessionnels(revenuImposable);
    const deductions = calculerDeductions();
    const assietteFiscale = Math.max(revenuImposable - fraisProfessionnels - deductions, 0);
    const irpp = calculerIRPPAnnuel(assietteFiscale, 0);

    // Crédits d'impôt
    let creditsImpot = 0;
    creditsImpot += enfants * 50 * 12; // 50 D par enfant/mois
    if (handicapPersonnel) {
      creditsImpot += 500; // Crédit pour handicap
    }

    const irppNet = Math.max(irpp - creditsImpot, 0);
    const tauxEffectif = revenuAnnuel > 0 ? (irppNet / revenuAnnuel) * 100 : 0;

    setResult({
      revenuAnnuel: Math.round(revenuAnnuel * 100) / 100,
      cotisationsCNSS: Math.round(cotisationsCNSS * 100) / 100,
      revenuImposable: Math.round(revenuImposable * 100) / 100,
      fraisProfessionnels: Math.round(fraisProfessionnels * 100) / 100,
      deductions: Math.round(deductions * 100) / 100,
      assietteFiscale: Math.round(assietteFiscale * 100) / 100,
      irpp: Math.round(irpp * 100) / 100,
      creditsImpot: Math.round(creditsImpot * 100) / 100,
      irppNet: Math.round(irppNet * 100) / 100,
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
                            {n} enfant{n !== 1 ? "s" : ""} ({n * 1200} D/an)
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
                            {n} étudiant{n !== 1 ? "s" : ""} ({n * 12000} D/an)
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
                            {n} enfant{n !== 1 ? "s" : ""} ({n * 24000} D/an)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="handicap"
                      checked={handicapPersonnel}
                      onCheckedChange={(checked) => setHandicapPersonnel(checked as boolean)}
                    />
                    <Label htmlFor="handicap" className="cursor-pointer">
                      Vous êtes en situation de handicap (500 D crédit)
                    </Label>
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

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">IRPP Brut</span>
                  <span className="font-semibold text-red-600">{result.irpp.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <span className="text-gray-700">Crédits d'Impôt</span>
                  <span className="font-semibold text-green-600">-{result.creditsImpot.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-4 bg-gradient-to-r from-blue-50 to-blue-100 px-4 rounded-lg">
                  <span className="text-lg font-bold text-blue-900">IRPP Net Annuel</span>
                  <span className="text-2xl font-bold text-blue-700">{result.irppNet.toFixed(2)} D</span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gray-100 px-4 rounded">
                  <span className="text-gray-700">Taux Effectif</span>
                  <span className="font-semibold text-blue-900">{result.tauxEffectif.toFixed(2)}%</span>
                </div>

                <div className="flex justify-between items-center py-3 bg-gray-100 px-4 rounded">
                  <span className="text-gray-700">IRPP Mensuel</span>
                  <span className="font-semibold text-blue-900">{(result.irppNet / 12).toFixed(2)} D</span>
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
