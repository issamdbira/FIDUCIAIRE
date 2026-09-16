// =============================================================================
// Le Fiduciaire — Permissions frontend (miroir de la matrice backend)
// =============================================================================
// Rôle du workspace ACTIF (workspace_members.role — jamais le rôle global) →
// droits d'affichage. Le backend reste la seule source de vérité : ce helper
// ne fait que masquer/bloquer l'UI, chaque route API re-vérifie.
// =============================================================================

export type RoleWs = "PROPRIETAIRE" | "GESTIONNAIRE" | "LECTEUR";

export type Permission =
  | "read" // consultations (tout)
  | "write" // écritures métier (clients, salariés, contrats, conventions, pointage, documents)
  | "writePayroll" // créer/modifier/valider bulletins
  | "closePeriod" // clôturer une période
  | "generateCnss" // générer déclarations/export CNSS
  | "submitCnss" // valider/transmettre/archiver CNSS
  | "archive" // archiver/réactiver client ou salarié
  | "configRead" // lire la configuration
  | "configWrite" // écrire/réinitialiser la configuration
  | "manageMembers" // gérer membres, rôles, invitations, transfert
  | "audit" // consulter le journal d'audit
  | "cabinetDashboard"; // dashboard cabinet consolidé

const MATRIX: Record<RoleWs, Permission[]> = {
  PROPRIETAIRE: [
    "read", "write", "writePayroll", "closePeriod", "generateCnss", "submitCnss",
    "archive", "configRead", "configWrite", "manageMembers", "audit", "cabinetDashboard",
  ],
  GESTIONNAIRE: [
    "read", "write", "writePayroll", "generateCnss", "configRead",
  ],
  LECTEUR: ["read", "configRead"],
};

/** L'utilisateur actif peut-il effectuer cette action sur le workspace actif ? */
export function can(role: RoleWs | string | null | undefined, action: Permission): boolean {
  if (!role) return false;
  const perms = MATRIX[role as RoleWs];
  return !!perms && perms.includes(action);
}

/** Rôle dans le workspace actif, depuis user.workspaces (renvoyé par login/me) */
export function roleInWorkspace(
  user: { workspaces?: { id: string; role: string }[] } | null | undefined,
  workspaceId: string | null | undefined
): RoleWs | null {
  if (!user || !workspaceId) return null;
  const ws = user.workspaces?.find((w) => w.id === workspaceId);
  return (ws?.role as RoleWs) ?? null;
}
