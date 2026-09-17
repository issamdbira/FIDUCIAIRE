// =============================================================================
// Le Fiduciaire — Menu Compte (Lot 1 — sécurité)
// =============================================================================
// Bouton de déconnexion accessible depuis TOUTES les pages protégées :
// navbar desktop + menu mobile (Sheet). La déconnexion révoque la session
// côté serveur (middleware) puis efface le cookie HttpOnly ; la protection
// des routes (ProtectedRoute) redirige ensuite vers /login.
// =============================================================================

import { useLocation } from "wouter";
import { LogOut, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  if (!user) return null;

  const initiales = (user.fullName ?? user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");

  const handleLogout = async () => {
    try {
      await logout(); // révocation serveur + effacement cookie + purge locale
    } finally {
      navigate("/login");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-primary"
          aria-label="Menu du compte"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {initiales || "?"}
          </span>
          <span className="hidden xl:inline max-w-32 truncate">{user.fullName || user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium leading-none">{user.fullName || "Utilisateur"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <p className="text-[10px] text-muted-foreground/70">{user.role}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="size-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Variante compacte pour le menu mobile — entrée dédiée en pied de Sheet. */
export function MobileLogoutEntry() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80"
      aria-label="Déconnexion"
    >
      <UserCircle2 className="size-4" />
      Déconnexion
    </button>
  );
}
