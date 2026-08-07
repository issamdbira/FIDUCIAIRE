import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { calculerCotisationCNSS, calculerCSSAnnuelle } from "@/lib/payroll/cnss";
import { calculerDeductionsAnnuelles, calculerFraisProfessionnels, calculerIRPPAnnuel } from "@/lib/payroll/irpp";
import { formatMontantDT } from "@/lib/utils";
import { validerMontantSalaire } from "@/lib/validation-salaire";

/**
 * Calculateur de Paie CNSS (Salariés du secteur privé)
 *
 * Les formules (CNSS, CSS, IRPP) sont centralisées dans src/lib/payroll/
 * pour être réutilisées par le futur moteur de paie (PayrollEngine) sans
 * duplication.
 */

interface PayeResult {
  salaireBrut: number;
  cotisationsCNSS: number;
  salaireImposable: number;
  fraisProfessionnels: number;
  deductionsFamiliales: number;
  assietteImposableNette: number;
  irpp: number;
  css: number;
  salaireNet: number;
}

export default function PaieCNSS() {
  const [salaireBrut, setSalaireBrut] = useState<number>(1000);
  const [annee, setAnnee] = useState<number>(2026);
  const [chefFamille, setChefFamille] = useState(false);
  const [enfants, setEnfants] = useState(0);
  const [etudiants, setEtudiants] = useState(0);
  const [infirmes, setInfirmes] = useState(0);
  const [autresDeductions, setAutresDeductions] = useState(0);
  const [result, setResult] = useState<PayeResult | null>(null);

  const erreurSalaire = validerMontantSalaire(salaireBrut);

  const handleCalculer = () => {
    const cotisationsCNSS = calculerCotisationCNSS(salaireBrut, annee);
    const salaireImposable = salaireBrut - cotisationsCNSS;

    const deductions = calculerDeductionsAnnuelles({
      chefFamille,
      enfants,
      etudiants,
      infirmes,
      autresDeductionsAnnuelles: autresDeductions,
    });
    const fraisPro = calculerFraisProfessionnels(salaireImposable * 12);
    const irpp = calculerIRPPAnnuel(salaireImposable * 12, deductions + fraisPro) / 12;

    const assietteFiscaleAnnuelle = Math.max(salaireImposable * 12 - deductions - fraisPro, 0);
    const css = calculerCSSAnnuelle(assietteFiscaleAnnuelle) / 12;
    const salaireNet = salaireBrut - cotisationsCNSS - irpp - css;

    setResult({
      salaireBrut: Math.round(salaireBrut * 100) / 100,
      cotisationsCNSS: Math.round(cotisationsCNSS * 100) / 100,
      salaireImposable: Math.round(salaireImposable * 100) / 100,
      fraisProfessionnels: Math.round((fraisPro / 12) * 100) / 100,
      deductionsFamiliales: Math.round((deductions / 12) * 100) / 100,
      assietteImposableNette: Math.round((assietteFiscaleAnnuelle / 12) * 100) / 100,
      irpp: Math.round(irpp * 100) / 100,
      css: Math.round(css * 100) / 100,
      salaireNet: Math.round(salaireNet * 100) / 100
    });
  };

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
                  Chef de famille (300 D)
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
              <span className="font-semibold text-lg text-foreground">{formatMontantDT(result.salaireBrut)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Cotisations CNSS (9.68%)</span>
              <span className="font-semibold text-destructive">{formatMontantDT(-result.cotisationsCNSS)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Salaire Imposable</span>
              <span className="font-semibold text-foreground">{formatMontantDT(result.salaireImposable)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Abattement frais professionnels (10 %, plafond 2 000 DT/an)</span>
              <span className="font-semibold text-green-600">{formatMontantDT(-result.fraisProfessionnels)}</span>
            </div>
            {result.deductionsFamiliales > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Déductions familiales</span>
                <span className="font-semibold text-green-600">{formatMontantDT(-result.deductionsFamiliales)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">Assiette imposable nette</span>
              <span className="font-semibold text-foreground">{formatMontantDT(result.assietteImposableNette)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-muted-foreground">IRPP</span>
              <span className="font-semibold text-destructive">{formatMontantDT(-result.irpp)}</span>
            </div>
            {result.css > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">CSS (0.5%)</span>
                <span className="font-semibold text-destructive">{formatMontantDT(-result.css)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-4 bg-primary/5 px-4 rounded-lg">
              <span className="text-lg font-bold text-foreground">Salaire Net</span>
              <span className="text-2xl font-bold text-primary">{formatMontantDT(result.salaireNet)}</span>
            </div>
          </div>
          <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              <strong>Note :</strong> La CSS (0.5%) s'applique de 2023 à 2026 inclus (loi de
              finances 2026, article 87 — mesure exceptionnelle prolongée), avec exonération
              totale si le revenu net imposable annuel ne dépasse pas 5000 D.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
