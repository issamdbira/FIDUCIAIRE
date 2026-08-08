import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { CONFIG_PAR_DEFAUT, getPayrollConfig, reinitialiserPayrollConfig, setPayrollConfig, type PayrollConfig } from "@/lib/payroll/config";

/**
 * Panneau d'administration — paramétrage centralisé du moteur de paie.
 * Tous les simulateurs du site (Calculer un salaire, Générer une fiche de
 * paie, PaieCNSS, IRPP) lisent leurs taux/barèmes/déductions depuis cette
 * configuration unique (lib/payroll/config.ts), stockée localement.
 *
 * ATTENTION : accessible sans authentification pour le MVP (traitement
 * 100% local, pas de compte utilisateur) — à protéger si le site évolue
 * vers un usage multi-utilisateurs.
 */
export default function Admin() {
  const [config, setConfig] = useState<PayrollConfig>(CONFIG_PAR_DEFAUT);
  const [sauvegarde, setSauvegarde] = useState(false);

  useEffect(() => {
    setConfig(getPayrollConfig());
  }, []);

  const champ = <K extends keyof PayrollConfig>(cle: K, valeur: PayrollConfig[K]) => {
    setConfig((prev) => ({ ...prev, [cle]: valeur }));
    setSauvegarde(false);
  };

  const sauvegarder = () => {
    setPayrollConfig(config);
    setSauvegarde(true);
    setTimeout(() => setSauvegarde(false), 2500);
  };

  const reinitialiser = () => {
    if (!confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) return;
    setConfig(reinitialiserPayrollConfig());
  };

  const modifierTranche = (index: number, patch: Partial<PayrollConfig["baremeIRPP"][number]>) => {
    const bareme = [...config.baremeIRPP];
    bareme[index] = { ...bareme[index], ...patch };
    champ("baremeIRPP", bareme);
  };

  const ajouterTranche = () => {
    champ("baremeIRPP", [...config.baremeIRPP, { min: 0, max: null, taux: 0 }]);
  };

  const supprimerTranche = (index: number) => {
    champ("baremeIRPP", config.baremeIRPP.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-primary">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reinitialiser} className="gap-2 text-red-600 border-red-200">
              <RotateCcw className="w-4 h-4" /> Réinitialiser
            </Button>
            <Button onClick={sauvegarder} className="gap-2 ">
              <Save className="w-4 h-4" /> {sauvegarde ? "Enregistré ✓" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Paramétrage centralisé
            </h1>
            <p className="text-gray-600">
              Tous les simulateurs du site utilisent ces valeurs. Une modification ici s'applique
              immédiatement à tous les calculateurs (moteur unifié).
            </p>
          </div>

          {/* CNSS */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Cotisations CNSS</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Salarial non-agricole (%)</Label>
                <Input type="number" step="0.01" value={config.cnssSalarialNonAgricole * 100} onChange={(e) => champ("cnssSalarialNonAgricole", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Patronal non-agricole (%)</Label>
                <Input type="number" step="0.01" value={config.cnssPatronalNonAgricole * 100} onChange={(e) => champ("cnssPatronalNonAgricole", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Salarial agricole (%)</Label>
                <Input type="number" step="0.01" value={config.cnssSalarialAgricole * 100} onChange={(e) => champ("cnssSalarialAgricole", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Patronal agricole (%)</Label>
                <Input type="number" step="0.01" value={config.cnssPatronalAgricole * 100} onChange={(e) => champ("cnssPatronalAgricole", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
            </div>
          </Card>

          {/* CSS */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Contribution Sociale de Solidarité (CSS)</h2>
            <div className="flex items-center gap-3">
              <Checkbox id="css-active" checked={config.cssActive} onCheckedChange={(c) => champ("cssActive", c as boolean)} />
              <Label htmlFor="css-active" className="cursor-pointer">CSS active (décochez pour la désactiver complètement)</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Taux (%)</Label>
                <Input type="number" step="0.01" disabled={!config.cssActive} value={config.cssTaux * 100} onChange={(e) => champ("cssTaux", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Seuil d'exonération annuel (D)</Label>
                <Input type="number" disabled={!config.cssActive} value={config.cssSeuilExonerationAnnuel} onChange={(e) => champ("cssSeuilExonerationAnnuel", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </Card>

          {/* Barème IRPP */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Barème IRPP</h2>
            <div className="space-y-2">
              {config.baremeIRPP.map((tranche, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Min (D)</Label>
                    <Input type="number" value={tranche.min} onChange={(e) => modifierTranche(i, { min: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Max (D, vide = infini)</Label>
                    <Input type="number" value={tranche.max ?? ""} placeholder="∞" onChange={(e) => modifierTranche(i, { max: e.target.value === "" ? null : parseFloat(e.target.value) })} />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Taux (%)</Label>
                    <Input type="number" step="0.1" value={tranche.taux * 100} onChange={(e) => modifierTranche(i, { taux: (parseFloat(e.target.value) || 0) / 100 })} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => supprimerTranche(i)} className="text-red-500 mt-5">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={ajouterTranche} className="gap-2 ">
              <Plus className="w-4 h-4" /> Ajouter une tranche
            </Button>
          </Card>

          {/* Frais professionnels */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Frais professionnels</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Taux actifs (%)</Label>
                <Input type="number" step="0.1" value={config.fraisProTauxActifs * 100} onChange={(e) => champ("fraisProTauxActifs", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Plafond actifs (D/an)</Label>
                <Input type="number" value={config.fraisProPlafondActifsAnnuel} onChange={(e) => champ("fraisProPlafondActifsAnnuel", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Taux retraités (%, sans plafond)</Label>
                <Input type="number" step="0.1" value={config.fraisProTauxRetraites * 100} onChange={(e) => champ("fraisProTauxRetraites", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Loi de finances 2026 : le taux retraités doit progresser à 30% (2027), 40% (2028), 50% (2029) — ajuster manuellement chaque année depuis ce panneau.
            </p>
          </Card>

          {/* Déductions familiales */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Déductions familiales (annuelles)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Chef de famille (D)</Label>
                <Input type="number" value={config.deductionChefFamille} onChange={(e) => champ("deductionChefFamille", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Par enfant &lt;20 ans (D)</Label>
                <Input type="number" value={config.deductionEnfant} onChange={(e) => champ("deductionEnfant", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Par étudiant sans bourse &lt;25 ans (D)</Label>
                <Input type="number" value={config.deductionEtudiant} onChange={(e) => champ("deductionEtudiant", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Plafond enfants+étudiants (nombre)</Label>
                <Input type="number" value={config.plafondNombreEnfantsEtudiants} onChange={(e) => champ("plafondNombreEnfantsEtudiants", parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Par enfant handicapé, sans plafond (D)</Label>
                <Input type="number" value={config.deductionInfirme} onChange={(e) => champ("deductionInfirme", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </Card>

          {/* Parents à charge */}
          <Card className="p-6 border-0 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-blue-900">Parents à charge</h2>
            <p className="text-xs text-gray-500">
              Applicable uniquement lors de la déclaration annuelle, pas à la retenue à la source mensuelle — désactivé par défaut pour les calculateurs de paie mensuelle.
            </p>
            <div className="flex items-center gap-3">
              <Checkbox id="parents-active" checked={config.parentsEnChargeActif} onCheckedChange={(c) => champ("parentsEnChargeActif", c as boolean)} />
              <Label htmlFor="parents-active" className="cursor-pointer">Activer (à utiliser pour un calcul de déclaration annuelle uniquement)</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1 block">Taux par parent (%)</Label>
                <Input type="number" step="0.1" disabled={!config.parentsEnChargeActif} value={config.parentsEnChargeTaux * 100} onChange={(e) => champ("parentsEnChargeTaux", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Plafond par parent (D/an)</Label>
                <Input type="number" disabled={!config.parentsEnChargeActif} value={config.parentsEnChargePlafondParAnnuel} onChange={(e) => champ("parentsEnChargePlafondParAnnuel", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={reinitialiser} className="gap-2 text-red-600 border-red-200">
              <RotateCcw className="w-4 h-4" /> Réinitialiser tout
            </Button>
            <Button onClick={sauvegarder} className="gap-2 ">
              <Save className="w-4 h-4" /> {sauvegarde ? "Enregistré ✓" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
