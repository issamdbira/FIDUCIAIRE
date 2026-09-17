// =============================================================================
// Le Fiduciaire — Hook de synchronisation de la config paie (Lot 5)
// =============================================================================
// Monté UNE fois dans le Layout (toutes les pages, calculateurs publics
// compris) : dès qu'un utilisateur authentifié a un workspace actif, la
// config serveur de CE workspace devient la copie locale des calculateurs.
// Se re-déclenche au changement de workspace actif (le sélecteur recharge la
// page → remontage du hook) — fin de l'écart multi-postes / multi-espaces.
//
// Un événement DOM `fiduciaire:config-paye-maj` est émis après une synchro
// réussie : les composants qui le souhaitent peuvent se recalculer sans
// attendre la prochaine interaction.
// =============================================================================

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { synchroniserConfigAvecServeur } from "@/lib/payroll/config-sync";

export const EVENEMENT_CONFIG_MAJ = "fiduciaire:config-paye-maj";

export function useConfigSync(): void {
  const { user, isLoading } = useAuth();
  const enCours = useRef(false);

  useEffect(() => {
    if (isLoading || !user || enCours.current) return;
    enCours.current = true;
    let annule = false;

    synchroniserConfigAvecServeur(user).then((miseAJour) => {
      if (!annule && miseAJour && typeof window !== "undefined") {
        window.dispatchEvent(new Event(EVENEMENT_CONFIG_MAJ));
      }
      enCours.current = false;
    });

    return () => {
      annule = true;
    };
  }, [user, isLoading]);
}
