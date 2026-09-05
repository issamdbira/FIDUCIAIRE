import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { calculerCotisationCNSS } from "@/lib/payroll/cnss";
import { calculerDeductionsAnnuelles, calculerFraisProfessionnels, calculerIRPPAnnuel } from "@/lib/payroll/irpp";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";
import BackToTools from "@/components/BackToTools";

/**
 * Calculateur IRPP (Impôt sur le Revenu des Personnes Physiques)
 *
 * Barème, frais professionnels et déductions familiales : centralisés dans
 * lib/payroll/irpp.ts, vérifiés directement contre secu.tn/fr/calculateur-irpp-tunisie.html
 * le 19/07/2026 (voir PLAN_MIGRATION_SECU_TN.md pour le détail des corrections).
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

  const erreurRevenu = validerMontantSalaire(revenuAnnuel);

  const calculerAutresDeductions = (): number => {
    let deductions = 0;
    deductions += Math.min(interetsCredit, 2000);
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

  // Calcul automatique au chargement avec les valeurs par défaut
  useEffect(() => {
    handleCalculer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <BackToTools />
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Calculateur IRPP
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Calculez votre impôt annuel sur le revenu selon votre situation familiale et vos déductions. Barème IRPP officiel tunisien.
      </p>

      <div className="grid md:grid-cols-[380px_1fr] gap-6">
        {/* ── Inputs column ── */}
        <div>
          <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card mb-6">
            <div className="space-y-6">
              <div>
                <Label className="text-base font-semibold text-foreground mb-2 block">
                  Revenu Annuel Brut (D)
                </Label>
                <Input
                  type="number"
                  value={revenuAnnuel}
                  onChange={(e) => setRevenuAnnuel(parseFloat(e.target.value) || 0)}
                  className="text-lg p-3"
                  min="0"
                />
                {erreurRevenu && <p className="text-sm text-destructive mt-2">{erreurRevenu}</p>}
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-semibold text-foreground mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
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
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Nombre d'enfants (moins de 20 ans)
                    </Label>
                    <Select value={enfants.toString()} onValueChange={(v) => setEnfants(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} enfant{n !== 1 ? "s" : ""} ({formatMontantDT(n * 100)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Étudiants sans bourse
                    </Label>
                    <Select value={etudiants.toString()} onValueChange={(v) => setEtudiants(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} étudiant{n !== 1 ? "s" : ""} ({formatMontantDT(n * 1000)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Enfants handicapés
                    </Label>
                    <Select value={infirmes.toString()} onValueChange={(v) => setInfirmes(parseInt(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} enfant{n !== 1 ? "s" : ""} ({formatMontantDT(n * 2000)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="font-semibold text-foreground mb-4" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  Déductions Supplémentaires
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">
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
                    <Label className="text-sm font-medium text-muted-foreground mb-2 block">
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

              <Button
                onClick={handleCalculer}
                disabled={!!erreurRevenu}
                className="w-full py-3 text-lg font-semibold"
              >
                Calculer mon IRPP
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Results column ── */}
        <div>
          {result && !erreurRevenu && (
            <Card className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
              <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
                Détail de l'Impôt
              </h2>

              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Revenu Annuel Brut</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(result.revenuAnnuel)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Cotisations CNSS (9.68%)</td>
                    <td className="py-3 text-right tabular-nums font-medium text-destructive">{formatMontantDT(-result.cotisationsCNSS)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Revenu Imposable</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(result.revenuImposable)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Abattement frais professionnels (10 %, plafond 2 000 DT/an)</td>
                    <td className="py-3 text-right tabular-nums font-medium text-success">{formatMontantDT(-result.fraisProfessionnels)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Déductions Fiscales</td>
                    <td className="py-3 text-right tabular-nums font-medium text-success">{formatMontantDT(-result.deductions)}</td>
                  </tr>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <td className="py-3 text-sm text-slate-600 dark:text-slate-400">Assiette imposable nette</td>
                    <td className="py-3 text-right tabular-nums font-medium">{formatMontantDT(result.assietteFiscale)}</td>
                  </tr>

                  <tr className="bg-primary/5 border-t-2 border-primary">
                    <td className="py-4 px-4 text-lg font-bold text-foreground">IRPP Annuel</td>
                    <td className="py-4 px-4 text-right text-lg font-bold text-primary tabular-nums">{formatMontantDT(result.irpp)}</td>
                  </tr>

                  <tr className="bg-muted">
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">Taux Effectif</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{result.tauxEffectif.toFixed(2)}%</td>
                  </tr>
                  <tr className="bg-muted">
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">IRPP Mensuel</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{formatMontantDT(result.irpp / 12)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
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
