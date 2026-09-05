import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Lock, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { CONFIG_PAR_DEFAUT, getPayrollConfig, reinitialiserPayrollConfig, setPayrollConfig, type PayrollConfig } from "@/lib/payroll/config";

/**
 * Panneau d'administration — paramétrage centralisé du moteur de paie.
 * Tous les simulateurs du site (Calculer un salaire, Générer une fiche de
 * paie, PaieCNSS, IRPP) lisent leurs taux/barèmes/déductions depuis cette
 * configuration unique (lib/payroll/config.ts), stockée localement.
 *
 * Sécurité client-side : l'accès est protégé par un mot de passe configurable
 * via VITE_ADMIN_PASSWORD (variable d'environnement). La session est conservée
 * dans sessionStorage pour éviter de re-saisir le mot de passe à chaque
 * navigation. ATTENTION : cette protection est côté client uniquement —
 * le code source et le mot de passe sont accessibles dans le navigateur.
 * Ce mécanisme empêche l'accès accidentel, pas un attaquant déterminé.
 */

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "fiduciaire2026";
const SESSION_KEY = "fiduciaire_admin_auth";

function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function authenticateAdmin(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "true");
  } catch {
    // sessionStorage indisponible
  }
}

function AdminLogin({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      authenticateAdmin();
      onAuth();
    } else {
      setError(true);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-20 px-4">
      <Card className="p-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-primary" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Accès administrateur
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Ce panneau permet de modifier les paramètres du moteur de paie.
          L'accès est restreint pour éviter les modifications accidentelles.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="admin-pwd">Mot de passe</Label>
            <Input
              id="admin-pwd"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Entrez le mot de passe"
              className="mt-1"
            />
            {error && <p className="text-xs text-destructive mt-1">Mot de passe incorrect</p>}
          </div>
          <Button type="submit" className="w-full gap-2">
            <Lock className="w-4 h-4" /> Connexion
          </Button>
        </form>
      </Card>
    </div>
  );
}
export default function Admin() {
  const [authed, setAuthed] = useState(isAdminAuthenticated);

  if (!authed) {
    return <AdminLogin onAuth={() => setAuthed(true)} />;
  }

  return <AdminPanel />;
}

function AdminPanel() {
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
              Retour aux outils
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reinitialiser} className="gap-2 text-destructive border-destructive/30">
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
            <h1 className="text-3xl font-bold text-primary mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
              Paramétrage centralisé
            </h1>
            <p className="text-muted-foreground">
              Tous les simulateurs du site utilisent ces valeurs. Une modification ici s'applique
              immédiatement à tous les calculateurs (moteur unifié).
            </p>
          </div>

          {/* CNSS */}
          <Card className="p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-primary">Cotisations CNSS</h2>
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
          <Card className="p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-primary">Contribution Sociale de Solidarité (CSS)</h2>
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
          <Card className="p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-primary">Barème IRPP</h2>
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
                  <Button variant="ghost" size="icon" onClick={() => supprimerTranche(i)} className="text-destructive mt-5">
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
          <Card className="p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-primary">Frais professionnels</h2>
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
            <p className="text-xs text-muted-foreground">
              Loi de finances 2026 : le taux retraités doit progresser à 30% (2027), 40% (2028), 50% (2029) — ajuster manuellement chaque année depuis ce panneau.
            </p>
          </Card>

          {/* Déductions familiales */}
          <Card className="p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-primary">Déductions familiales (annuelles)</h2>
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
          <Card className="p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <h2 className="text-lg font-bold text-primary">Parents à charge</h2>
            <p className="text-xs text-muted-foreground">
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
            <Button variant="outline" onClick={reinitialiser} className="gap-2 text-destructive border-destructive/30">
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
