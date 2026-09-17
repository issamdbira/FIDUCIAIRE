// =============================================================================
// Le Fiduciaire — Synchronisation de la config paie client ↔ serveur (Lot 5)
// =============================================================================
// Écart corrigé (relevé de l'audit de données) : les calculateurs publics
// lisaient UNIQUEMENT le localStorage — une sauvegarde du paramétrage sur un
// autre poste (ou dans un autre espace) n'était jamais vue ici. Désormais,
// dès qu'un utilisateur authentifié dispose d'un workspace actif, la config
// du workspace (source de vérité : table payroll_config côté serveur) est
// rapatriée au montage de chaque page et posée dans la copie locale
// (mémoire + localStorage) — les calculateurs recalculent avec les taux à
// jour à leur prochaine interaction.
//
// Comportement inchangé pour le visiteur anonyme : config par défaut, aucun
// appel réseau. Échec de l'appel : silencieux, copie locale conservée.
// =============================================================================

import { api, type AuthUser } from "@/lib/api";
import { getWorkspaceId } from "@/lib/workspace";
import { CONFIG_PAR_DEFAUT, setPayrollConfig, type PayrollConfig } from "./config";

/** Réponse GET /api/config/:ws (champs DB + tranchesIrpp) */
export interface RemoteConfig {
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

/** Convertit la réponse API vers la forme utilisée par le moteur client.
 *  Tout champ absent retombe sur la valeur par défaut (repli sûr). */
export function remoteVersLocale(r: RemoteConfig): PayrollConfig {
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

/** Rapatrie la config du workspace actif vers la copie locale des
 *  calculateurs. Retourne true si la copie locale a été mise à jour.
 *  - utilisateur anonyme / sans workspace → aucune action (false) ;
 *  - échec réseau ou API → silencieux, copie locale conservée (false). */
export async function synchroniserConfigAvecServeur(user: AuthUser | null): Promise<boolean> {
  const workspaceId = getWorkspaceId(user);
  if (!workspaceId) return false;
  try {
    const remote = await api.get<RemoteConfig>(`/config/${workspaceId}`);
    setPayrollConfig(remoteVersLocale(remote));
    return true;
  } catch {
    // Silencieux par design : les calculateurs restent utilisables avec la
    // dernière copie locale connue (ou la config par défaut).
    return false;
  }
}
