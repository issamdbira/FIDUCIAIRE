import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { runPayrollEngine } from "@/lib/payroll/engine";
import { getPayrollConfig } from "@/lib/payroll/config";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";
import type { PayrollResult } from "@/lib/payroll/types";

/**
 * Calculateur de Paie CNSS (Salariés du secteur privé)
 *
 * Utilise le moteur central runPayrollEngine() — aucune formule
 * dupliquée ici. Les taux/barèmes/règles métier restent définis
 * exclusivement dans lib/payroll/.
 */

export default function PaieCNSS() {
  const [salaireBrut, setSalaireBrut] = useState<number>(1000);
  const [annee, setAnnee] = useState<number>(2026);
  const [chefFamille, setChefFamille] = useState(false);
  const [enfants, setEnfants] = useState(0);
  const [etudiants, setEtudiants] = useState(0);
  const [infirmes, setInfirmes] = useState(0);
  const [autresDeductions, setAutresDeductions] = useState(0);
  const [result, setResult] = useState<PayrollResult | null>(null);

  const erreurSalaire = validerMontantSalaire(salaireBrut);

  const config = getPayrollConfig();

  const handleCalculer = () => {
    const resultat = runPayrollEngine({
      employeur: { nom: "", secteur: "non_agricole" },
      salarie: { nom: "", prenom: "", chefFamille, enfants, etudiants, infirmes },
      periode: { mois: 1, annee: annee },
      elements: [
        { id: "salaire_base", type: "salaire_base", label: "Salaire de base", montant: salaireBrut, traitement: "standard" },
      ],
      autresDeductionsFiscalesAnnuelles: autresDeductions,
    });
    setResult(resultat);
  };

  // Taux CNSS effectif pour l'affichage
  const tauxCNSS = annee < 2025 ? 9.18 : (config.cnssSalarialNonAgricole * 100);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Calculateur de Paie CNSS
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Calculez votre salaire net à partir du brut selon la réglementation tunisienne. CNSS, IRPP et CSS inclus.
      </p>

      <Card className="p-6 rounded-lg shadow-sm border border-border bg-card mb-6">
        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold text-foreground mb-2 block">
              Salaire Brut Mensuel (D)
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

          <div>
            <Label className="text-base font-semibold text-foreground mb-2 block">
              Année
            </Label>
            <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025 (CSS 0.5% applicable)</SelectItem>
                <SelectItem value="2026">2026 (CSS 0.5% maintenue, LF2026)</SelectItem>
              </SelectContent>
            </Select>
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
                  Chef de famille ({formatMontantDT(config.deductionChefFamille)})
                </Label>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Nombre d'enfants (moins de 20 ans)
                </Label>
                <Select value={enfants.toString()} onValueChange={(v) => setEnfants(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} enfant{n !== 1 ? "s" : ""} ({formatMontantDT(n * config.deductionEnfant)})
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
                        {n} étudiant{n !== 1 ? "s" : ""} ({formatMontantDT(n * config.deductionEtudiant)})
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
                        {n} enfant{n !== 1 ? "s" : ""} ({formatMontantDT(n * config.deductionInfirme)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">
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

          <Button
            onClick={handleCalculer}
            disabled={!!erreurSalaire}
            className="w-full py-3 text-lg font-semibold"
          >
            Calculer
          </Button>
        </div>
      </Card>

      {result && !erreurSalaire && (
        <Card className="p-6 rounded-lg shadow-sm border border-border bg-card">
          <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Bulletin de Paie
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Salaire Brut</span>
              <span className="font-semibold text-lg text-foreground">{formatMontantDT(result.totalRemunerationBrute)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Cotisations CNSS ({tauxCNSS.toFixed(2)}%)</span>
              <span className="font-semibold text-destructive">{formatMontantDT(-result.cotisationCNSS)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Salaire Imposable</span>
              <span className="font-semibold text-foreground">{formatMontantDT(result.baseFiscaleMensuelle)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Abattement frais professionnels ({(config.fraisProTauxActifs * 100).toFixed(0)} %, plafond {formatMontantDT(config.fraisProPlafondActifsAnnuel)}/an)</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMontantDT(-result.fraisProfessionnelsMensuel)}</span>
            </div>
            {result.deductionsFamilialesMensuelles > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Déductions familiales</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMontantDT(-result.deductionsFamilialesMensuelles)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Assiette imposable nette</span>
              <span className="font-semibold text-foreground">{formatMontantDT(result.assietteImposableNetteMensuelle)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">IRPP</span>
              <span className="font-semibold text-destructive">{formatMontantDT(-result.irppMensuel)}</span>
            </div>
            {result.css > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">CSS ({(config.cssTaux * 100).toFixed(1)}%)</span>
                <span className="font-semibold text-destructive">{formatMontantDT(-result.css)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-4 bg-primary/5 px-4 rounded-lg">
              <span className="text-lg font-bold text-foreground">Salaire Net</span>
              <span className="text-2xl font-bold text-primary">{formatMontantDT(result.netAPayer)}</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <strong>Note :</strong> La CSS (0.5%) s'applique de 2023 à 2026 inclus (loi de
              finances 2026, article 87 — mesure exceptionnelle prolongée), avec exonération
              totale si le revenu net imposable annuel ne dépasse pas {formatMontantDT(config.cssSeuilExonerationAnnuel)}.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
