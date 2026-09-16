// =============================================================================
// Le Fiduciaire — Workspace Selector (Phase 10 — modèle espaces)
// =============================================================================
// Sélecteur d'espace actif, groupé par type :
//   - Mes espaces Entreprise (accès direct)
//   - Mes espaces Cabinet (accès direct)
//   - Dossiers clients — accès délégués (espaces Entreprise des clients du
//     cabinet, viaCabinet renseigné)
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
import { Building2, Briefcase, Check, ChevronsUpDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "@/lib/workspace";
import type { AccessibleWorkspace } from "@/lib/api";

/** Changer le workspace actif et recharger la page pour rafraîchir toutes les données */
function switchWorkspace(workspaceId: string) {
  setActiveWorkspaceId(workspaceId);
  // Rechargement complet pour que toutes les pages relisent
  // le workspace actif depuis localStorage
  window.location.reload();
}

function WsIcon({ ws }: { ws: AccessibleWorkspace }) {
  if (ws.viaCabinetId) {
    return <Link2 className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />;
  }
  if (ws.type === "ENTREPRISE") {
    return <Building2 className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  return <Briefcase className="size-3.5 shrink-0 text-primary/70" />;
}

export default function WorkspaceSelector() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Ne rien afficher si pas connecté ou pas de workspaces
  if (!user?.workspaces || user.workspaces.length === 0) {
    return null;
  }

  // ── Groupes (Phase 10) ──
  const directs = user.workspaces.filter((ws) => !ws.viaCabinetId);
  const entreprises = directs.filter((ws) => ws.type !== "CABINET");
  const cabinets = directs.filter((ws) => ws.type === "CABINET");
  const delegues = user.workspaces.filter((ws) => ws.viaCabinetId);

  // Un seul workspace → afficher juste le nom + badge (pas de dropdown)
  if (user.workspaces.length === 1) {
    const ws = user.workspaces[0];
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <WsIcon ws={ws} />
        <span className="truncate max-w-[120px]">{ws.name}</span>
        {ws.viaCabinetName && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate max-w-[80px]">
            via {ws.viaCabinetName}
          </span>
        )}
      </div>
    );
  }

  // Plusieurs workspaces → dropdown groupé
  const activeId = getActiveWorkspaceId();
  const activeWs = user.workspaces.find((ws) => ws.id === activeId) ?? user.workspaces[0];

  const renderItem = (ws: AccessibleWorkspace) => {
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
          <WsIcon ws={ws} />
          <div className="flex flex-col min-w-0">
            <span className="truncate text-sm">{ws.name}</span>
            {ws.viaCabinetName && (
              <span className="text-[10px] text-muted-foreground truncate">
                via {ws.viaCabinetName}
              </span>
            )}
          </div>
        </div>
        {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-primary max-w-[220px] px-2"
        >
          <WsIcon ws={activeWs} />
          <span className="truncate text-xs">{activeWs.name}</span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {entreprises.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Mes espaces Entreprise
            </DropdownMenuLabel>
            {entreprises.map(renderItem)}
            <DropdownMenuSeparator />
          </>
        )}
        {cabinets.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Mes espaces Cabinet
            </DropdownMenuLabel>
            {cabinets.map(renderItem)}
            <DropdownMenuSeparator />
          </>
        )}
        {delegues.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs text-amber-600 dark:text-amber-400">
              Dossiers clients — accès délégués
            </DropdownMenuLabel>
            {delegues.map(renderItem)}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
