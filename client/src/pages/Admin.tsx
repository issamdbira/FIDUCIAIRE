import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, RotateCcw, Save, ShieldAlert, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/workspace";
import { CONFIG_PAR_DEFAUT, getPayrollConfig, setPayrollConfig, type PayrollConfig } from "@/lib/payroll/config";

/**
 * Panneau d'administration — paramétrage centralisé du moteur de paie.
 *
 * Sécurité (P0, correction) : l'ancienne porte mot de passe côté client
 * (VITE_ADMIN_PASSWORD avec fallback en dur) a été supprimée — elle était
 * lisible dans le bundle de production. L'accès est désormais réservé au
 * PROPRIETAIRE du workspace actif, et le paramétrage est lu/écrit dans la
 * base via GET/PUT /api/config/:ws.
 *
 * Les calculateurs publics du navigateur continuent de lire la config locale
 * (localStorage) : à chaque sauvegarde serveur, la copie locale est
 * synchronisée pour rester cohérente.
 */

/** Réponse GET /api/config/:ws (champs DB + tranchesIrpp) */
interface RemoteConfig {
  source?: string;
  cnssSalarialNonAgricole?: number;
  cnssPatronalNonAgricole?: number;
  cnssSalarialAgricole?: number;
  cnssPatronalAgricole?: number;
  cssActive?: boolean;
  cssTaux?: number;
  cssSeuilExonerationAnnuel?: number;
  fraisProTauxActifs?: number;
  fraisProPlafondActifsAnnuel?: number;
  fraisProTauxRetraites?: number;
  deductionChefFamille?: number;
  deductionEnfant?: number;
  deductionEtudiant?: number;
  plafondNombreEnfantsEtudiants?: number;
  deductionInfirme?: number;
  parentsEnChargeActif?: boolean;
  parentsEnChargeTaux?: number;
  parentsEnChargePlafondParAnnuel?: number;
  tranchesIrpp?: { min: number; max: number | null; taux: number }[];
}

/** Convertit la réponse API vers la forme utilisée par le moteur client */
function remoteVersLocale(r: RemoteConfig): PayrollConfig {
  return {
    cnssSalarialNonAgricole: r.cnssSalarialNonAgricole ?? CONFIG_PAR_DEFAUT.cnssSalarialNonAgricole,
    cnssPatronalNonAgricole: r.cnssPatronalNonAgricole ?? CONFIG_PAR_DEFAUT.cnssPatronalNonAgricole,
    cnssSalarialAgricole: r.cnssSalarialAgricole ?? CONFIG_PAR_DEFAUT.cnssSalarialAgricole,
    cnssPatronalAgricole: r.cnssPatronalAgricole ?? CONFIG_PAR_DEFAUT.cnssPatronalAgricole,
    cssActive: r.cssActive ?? CONFIG_PAR_DEFAUT.cssActive,
    cssTaux: r.cssTaux ?? CONFIG_PAR_DEFAUT.cssTaux,
    cssSeuilExonerationAnnuel: r.cssSeuilExonerationAnnuel ?? CONFIG_PAR_DEFAUT.cssSeuilExonerationAnnuel,
    fraisProTauxActifs: r.fraisProTauxActifs ?? CONFIG_PAR_DEFAUT.fraisProTauxActifs,
    fraisProPlafondActifsAnnuel: r.fraisProPlafondActifsAnnuel ?? CONFIG_PAR_DEFAUT.fraisProPlafondActifsAnnuel,
    fraisProTauxRetraites: r.fraisProTauxRetraites ?? CONFIG_PAR_DEFAUT.fraisProTauxRetraites,
    deductionChefFamille: r.deductionChefFamille ?? CONFIG_PAR_DEFAUT.deductionChefFamille,
    deductionEnfant: r.deductionEnfant ?? CONFIG_PAR_DEFAUT.deductionEnfant,
    deductionEtudiant: r.deductionEtudiant ?? CONFIG_PAR_DEFAUT.deductionEtudiant,
    plafondNombreEnfantsEtudiants: r.plafondNombreEnfantsEtudiants ?? CONFIG_PAR_DEFAUT.plafondNombreEnfantsEtudiants,
    deductionInfirme: r.deductionInfirme ?? CONFIG_PAR_DEFAUT.deductionInfirme,
    parentsEnChargeActif: r.parentsEnChargeActif ?? CONFIG_PAR_DEFAUT.parentsEnChargeActif,
    parentsEnChargeTaux: r.parentsEnChargeTaux ?? CONFIG_PAR_DEFAUT.parentsEnChargeTaux,
    parentsEnChargePlafondParAnnuel: r.parentsEnChargePlafondParAnnuel ?? CONFIG_PAR_DEFAUT.parentsEnChargePlafondParAnnuel,
    baremeIRPP: (r.tranchesIrpp && r.tranchesIrpp.length > 0)
      ? r.tranchesIrpp.map((t) => ({ min: t.min, max: t.max, taux: t.taux }))
      : CONFIG_PAR_DEFAUT.baremeIRPP,
  };
}

/** Charge la config du workspace actif (base de données), avec repli local */
async function chargerConfigServeur(workspaceId: string): Promise<PayrollConfig> {
  const remote = await api.get<RemoteConfig>(`/config/${workspaceId}`);
  return remoteVersLocale(remote);
}

export default function Admin() {
  const { user, isLoading } = useAuth();
  const workspaceId = user ? getWorkspaceId(user) : null;
  const roleWs = workspaceId
    ? user?.workspaces?.find((ws) => ws.id === workspaceId)?.role ?? null
    : null;

  // Vérification initiale en cours
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-r-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Accès réservé au propriétaire du workspace actif (contrôle réel, côté serveur aussi)
  if (!user || roleWs !== "PROPRIETAIRE" || !workspaceId) {
    return (
      <div className="min-h-[calc(100vh-48px)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 mx-auto mb-4">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Accès réservé au propriétaire</h2>
          <p className="text-sm text-muted-foreground">
            Le paramétrage du moteur de paie ne peut être modifié que par le
            propriétaire de ce cabinet. Contactez-le si vous pensez qu'il s'agit
            d'une erreur.
          </p>
          <Link href="/dashboard/workspace" className="inline-block mt-6">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <AdminPanel workspaceId={workspaceId} />;
}

function AdminPanel({ workspaceId }: { workspaceId: string }) {
  const [config, setConfig] = useState<PayrollConfig>(CONFIG_PAR_DEFAUT);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [source, setSource] = useState<"chargement" | "serveur" | "locale">("chargement");

  useEffect(() => {
    let annule = false;
    chargerConfigServeur(workspaceId)
      .then((c) => {
        if (!annule) {
          setConfig(c);
          setSource("serveur");
        }
      })
      .catch(() => {
        // Repli : config locale du navigateur (calculateurs publics)
        if (!annule) {
          setConfig(getPayrollConfig());
          setSource("locale");
          toast.info("Config locale affichée — serveur injoignable");
        }
      });
    return () => {
      annule = true;
    };
  }, [workspaceId]);

  const champ = <K extends keyof PayrollConfig>(cle: K, valeur: PayrollConfig[K]) => {
    setConfig((prev) => ({ ...prev, [cle]: valeur }));
    setSauvegarde(false);
  };

  const sauvegarder = async () => {
    setEnregistrement(true);
    try {
      // 1. Écrire dans la base (source de vérité, utilisée par le moteur serveur)
      await api.put(`/config/${workspaceId}`, {
        cnssSalarialNonAgricole: config.cnssSalarialNonAgricole,
        cnssPatronalNonAgricole: config.cnssPatronalNonAgricole,
        cnssSalarialAgricole: config.cnssSalarialAgricole,
        cnssPatronalAgricole: config.cnssPatronalAgricole,
        cssActive: config.cssActive,
        cssTaux: config.cssTaux,
        cssSeuilExonerationAnnuel: config.cssSeuilExonerationAnnuel,
        fraisProTauxActifs: config.fraisProTauxActifs,
        fraisProPlafondActifsAnnuel: config.fraisProPlafondActifsAnnuel,
        fraisProTauxRetraites: config.fraisProTauxRetraites,
        deductionChefFamille: config.deductionChefFamille,
        deductionEnfant: config.deductionEnfant,
        deductionEtudiant: config.deductionEtudiant,
        plafondNombreEnfantsEtudiants: config.plafondNombreEnfantsEtudiants,
        deductionInfirme: config.deductionInfirme,
        parentsEnChargeActif: config.parentsEnChargeActif,
        parentsEnChargeTaux: config.parentsEnChargeTaux,
        parentsEnChargePlafondParAnnuel: config.parentsEnChargePlafondParAnnuel,
        tranchesIrpp: config.baremeIRPP.map((t, i) => ({
          min: t.min,
          max: t.max,
          taux: t.taux,
          ordre: i + 1,
        })),
      });
      // 2. Synchroniser la copie locale (calculateurs publics du navigateur)
      setPayrollConfig(config);
      setSource("serveur");
      setSauvegarde(true);
      toast.success("Paramètres enregistrés dans la base de données");
      setTimeout(() => setSauvegarde(false), 2500);
    } catch (err) {
      // Repli : préserver l'ancien comportement (sauvegarde locale seule)
      setPayrollConfig(config);
      setSource("locale");
      toast.error("Serveur injoignable — sauvegardé localement uniquement");
    } finally {
      setEnregistrement(false);
    }
  };

  const reinitialiser = async () => {
    if (!confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) return;
    setEnregistrement(true);
    try {
      const remote = await api.post<RemoteConfig>(`/config/${workspaceId}/reset`);
      const c = remoteVersLocale(remote);
      setConfig(c);
      setPayrollConfig(c); // garder les calculateurs locaux cohérents
      setSource("serveur");
      toast.success("Paramètres réinitialisés aux valeurs par défaut");
    } catch {
      // Repli local si le serveur est injoignable
      setConfig({ ...CONFIG_PAR_DEFAUT });
      setPayrollConfig({ ...CONFIG_PAR_DEFAUT });
      setSource("locale");
      toast.error("Serveur injoignable — réinitialisation locale uniquement");
    } finally {
      setEnregistrement(false);
    }
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
            <Button variant="outline" className="gap-2 text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reinitialiser} disabled={enregistrement} className="gap-2 text-destructive border-destructive/30">
              <RotateCcw className="w-4 h-4" /> Réinitialiser
            </Button>
            <Button onClick={sauvegarder} disabled={enregistrement} className="gap-2 ">
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
            {source === "chargement" && (
              <p className="text-xs text-muted-foreground mt-2">Chargement de la configuration…</p>
            )}
            {source === "serveur" && (
              <p className="text-xs text-muted-foreground mt-2">Configuration chargée depuis la base de données du cabinet.</p>
            )}
            {source === "locale" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Serveur injoignable — configuration locale du navigateur affichée. Les modifications ne seront
                appliquées qu'à ce navigateur.
              </p>
            )}
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
            <Button variant="outline" onClick={reinitialiser} disabled={enregistrement} className="gap-2 text-destructive border-destructive/30">
              <RotateCcw className="w-4 h-4" /> Réinitialiser tout
            </Button>
            <Button onClick={sauvegarder} disabled={enregistrement} className="gap-2 ">
              <Save className="w-4 h-4" /> {sauvegarde ? "Enregistré ✓" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
