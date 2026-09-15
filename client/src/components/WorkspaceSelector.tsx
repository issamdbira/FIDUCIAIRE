// =============================================================================
// Le Fiduciaire — Workspace Selector
// =============================================================================
// Composant de sélection de workspace/dossier. Visible uniquement quand
// l'utilisateur connecté a accès à plus d'un workspace.
// Utilise les workspaces retournés par l'API login/me — pas de nouvelle route.
// =============================================================================

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "@/lib/workspace";

// Ré-export temporaire : GestionEmployes importe getActiveWorkspaceId depuis
// ce composant. Sera redirigé vers @/lib/workspace lors de l'unification des pages.
export { getActiveWorkspaceId } from "@/lib/workspace";

/** Changer le workspace actif et recharger la page pour rafraîchir toutes les données */
function switchWorkspace(workspaceId: string) {
  setActiveWorkspaceId(workspaceId);
  // Rechargement complet pour que toutes les pages relisent
  // le workspace actif depuis localStorage
  window.location.reload();
}

export default function WorkspaceSelector() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Ne rien afficher si pas connecté ou pas de workspaces
  if (!user?.workspaces || user.workspaces.length === 0) {
    return null;
  }

  // Un seul workspace → afficher juste le nom (pas de dropdown)
  if (user.workspaces.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="size-3.5" />
        <span className="truncate max-w-[120px]">{user.workspaces[0].name}</span>
      </div>
    );
  }

  // Plusieurs workspaces → dropdown
  const activeId = getActiveWorkspaceId();
  const activeWs = user.workspaces.find((ws) => ws.id === activeId) ?? user.workspaces[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-primary max-w-[200px] px-2"
        >
          <Building2 className="size-3.5 shrink-0" />
          <span className="truncate text-xs">{activeWs.name}</span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Dossiers / Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.workspaces.map((ws) => {
          const isActive = ws.id === activeId;
          return (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => {
                if (!isActive) {
                  switchWorkspace(ws.id);
                }
                setOpen(false);
              }}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{ws.name}</span>
              </div>
              {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
