import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Calculator,
  Menu,
  ShieldCheck,
  LayoutDashboard,
  BarChart3,
  FileSearch,
  Building2,
  FileText,
  Banknote,
  BookOpen,
  FileDown,
  Shield,
  Clock,
  UserPlus,
  Users,
  Settings,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import WorkspaceSelector from "./WorkspaceSelector";
import UserMenu, { MobileLogoutEntry } from "./UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspaceId, setActiveWorkspaceId } from "@/lib/workspace";
import { can, roleInWorkspace } from "@/lib/permissions";
import { useConfigSync } from "@/hooks/useConfigSync";
import { ArrowLeftRight, CornerUpLeft } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Layout — Modèle Hub & Spoke (Boîte à outils)
 *
 * La Top Navbar est ultra-minimale : logo seulement.
 * La page d'accueil (/) sert de Hub central avec toutes les cartes d'outils.
 * Chaque page d'outil a un bouton "← Retour à l'accueil" (BackToTools).
 *
 * Le menu mobile (Sheet) conserve l'accès aux outils pour la navigation
 * sur petit écran, mais le desktop n'affiche aucun lien dans la navbar.
 */

// ── Main Layout ──
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { user } = useAuth();

  // Lot 5 — config paie des calculateurs synchronisée sur le workspace actif
  // (source de vérité serveur) à chaque montage de page ; fin de l'écart
  // multi-postes relevé par l'audit de données.
  useConfigSync();

  // Rôle dans le workspace ACTIF — pilote l'affichage du menu (miroir du backend)
  const wsId = getWorkspaceId(user);
  const role = useMemo(() => roleInWorkspace(user, wsId), [user, wsId]);

  // Phase 10 : contexte délégué — l'espace actif est un dossier client accédé
  // via un cabinet → bannière de contexte + retour au cabinet d'un clic
  const activeWs = user?.workspaces?.find((ws) => ws.id === wsId);
  const contexteDelegue = activeWs?.viaCabinetId ? activeWs : null;
  const retourCabinet = () => {
    if (contexteDelegue?.viaCabinetId) {
      setActiveWorkspaceId(contexteDelegue.viaCabinetId);
      window.location.reload();
    }
  };

  // Liens de navigation desktop, filtrés par rôle.
  // Réévaluation §9 : libellés orientés PROCESSUS (fin des 11 entrées
  // « objets » équivalentes) + concept client masqué dans les espaces
  // Entreprise (une seule société : la leur).
  const typeEspaceActif = activeWs?.type;
  const liensDesktop = useMemo(() => {
    const base = [
      { href: "/dashboard/workspace", label: "Accueil", icon: LayoutDashboard, visible: can(role, "read") },
      {
        href: "/gestion/clients",
        label: typeEspaceActif === "ENTREPRISE" ? "Ma société" : "Clients",
        icon: Building2,
        visible: can(role, "read"),
      },
      { href: "/gestion/employes", label: "Salariés", icon: UserPlus, visible: can(role, "read") },
      { href: "/gestion/contrats", label: "Contrats", icon: FileText, visible: can(role, "read") },
      { href: "/gestion/paie", label: "Paie du mois", icon: Banknote, visible: can(role, "read") },
      { href: "/gestion/pointage", label: "Temps & absences", icon: Clock, visible: can(role, "read") },
      { href: "/gestion/cnss", label: "Déclarations CNSS", icon: Shield, visible: can(role, "read") },
      { href: "/gestion/documents", label: "Documents", icon: FileDown, visible: can(role, "read") },
      // Paramètres (fonctions de configuration, hors processus)
      { href: "/gestion/conventions", label: "Conventions", icon: BookOpen, visible: can(role, "read") },
      { href: "/gestion/membres", label: "Membres", icon: Users, visible: can(role, "manageMembers") },
      { href: "/admin", label: "Config", icon: Settings, visible: can(role, "configWrite") },
      // Lot 4 — messages du formulaire public : niveau APPLICATION (rôle
      // global du compte), pas du workspace actif
      { href: "/gestion/messages", label: "Messages", icon: Inbox, visible: user?.role === "PROPRIETAIRE" },
    ];
    return base.filter((l) => l.visible);
  }, [role, user?.role, typeEspaceActif]);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden max-w-[100vw]">
      {/* ─── Top Navbar — minimaliste ─── */}
      <nav className="sticky top-0 z-50 h-12 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto flex h-full items-center justify-between px-4">
          {/* Logo → retour à l'accueil */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Calculator className="size-5 text-primary" />
            <span
              className="text-base font-bold text-primary tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              <span className="text-muted-foreground">LE </span><span className="text-gold">FIDUCIAIRE</span>
            </span>
          </Link>

          {/* Workspace selector — visible si l'utilisateur a des workspaces */}
          <div className="hidden sm:flex items-center">
            <WorkspaceSelector />
          </div>

          {/* Right side : Theme toggle + navigation filtrée par rôle (desktop) + Compte */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              {liensDesktop.map((lien) => (
                <Link key={lien.href} href={lien.href}>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-primary">
                    <lien.icon className="size-4" />
                    <span className="hidden xl:inline">{lien.label}</span>
                  </Button>
                </Link>
              ))}
            </div>

            {/* Lot 1 — Menu Compte : déconnexion visible depuis toute page protégée */}
            <div className="flex items-center gap-1">
              <UserMenu />
              <div className="lg:hidden">
                <ThemeToggle />
              </div>
            </div>

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-muted-foreground"
              onClick={() => setSheetOpen(true)}
            >
              <Menu className="size-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Bannière de contexte délégué (Phase 10) ─── */}
      {contexteDelegue && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 py-1.5 text-xs">
            <span className="flex items-center gap-2 text-amber-800 dark:text-amber-300 min-w-0">
              <ArrowLeftRight className="size-3.5 shrink-0" />
              <span className="truncate">
                Espace <strong>{contexteDelegue.name}</strong> — accédé via{" "}
                <strong>{contexteDelegue.viaCabinetName}</strong>
              </span>
            </span>
            <button
              onClick={retourCabinet}
              className="flex items-center gap-1.5 shrink-0 rounded-md px-2 py-1 font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <CornerUpLeft className="size-3.5" />
              Retour au cabinet
            </button>
          </div>
        </div>
      )}

      {/* ─── Mobile Sheet (conserve accès outils sur mobile) ─── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-72 bg-card p-0">
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="text-left text-primary" style={{ fontFamily: "Montserrat, sans-serif" }}>
              <span className="text-muted-foreground">LE </span><span className="text-gold">FIDUCIAIRE</span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-3 py-4 overflow-y-auto">
            <Link
              href="/"
              onClick={() => setSheetOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                location === "/"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-primary"
              }`}
            >
              Accueil
            </Link>

            {/* Workspace selector mobile */}
            <div className="px-3 py-1">
              <WorkspaceSelector />
            </div>

            <div className="pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pilotage</div>
            {can(role, "cabinetDashboard") && (
              <Link
                href="/dashboard/cabinet"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
              >
                <LayoutDashboard className="size-4" /> Tableau de bord cabinet
              </Link>
            )}
            {can(role, "read") && (
              <Link
                href="/dashboard/workspace"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
              >
                <BarChart3 className="size-4" /> Accueil de l&apos;espace
              </Link>
            )}
            {can(role, "audit") && (
              <Link
                href="/dashboard/audit"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
              >
                <FileSearch className="size-4" /> Journal d'audit
              </Link>
            )}
            <div className="pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gestion</div>
            {can(role, "read") && (
              <>
                <Link href="/gestion/clients" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <Building2 className="size-4" /> {typeEspaceActif === "ENTREPRISE" ? "Ma société" : "Clients"}
                </Link>
                <Link href="/gestion/employes" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <UserPlus className="size-4" /> Salariés
                </Link>
                <Link href="/gestion/contrats" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <FileText className="size-4" /> Contrats
                </Link>
                <Link href="/gestion/paie" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <Banknote className="size-4" /> Paie du mois
                </Link>
                <Link href="/gestion/pointage" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <Clock className="size-4" /> Temps & absences
                </Link>
                <Link href="/gestion/cnss" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <Shield className="size-4" /> Déclarations CNSS
                </Link>
                <Link href="/gestion/documents" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                  <FileDown className="size-4" /> Documents
                </Link>
              </>
            )}
            <div className="pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paramètres</div>
            {can(role, "read") && (
              <Link href="/gestion/conventions" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                <BookOpen className="size-4" /> Conventions collectives
              </Link>
            )}
            {can(role, "manageMembers") && (
              <Link href="/gestion/membres" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                <Users className="size-4" /> Membres & invitations
              </Link>
            )}
            {user?.role === "PROPRIETAIRE" && (
              <Link href="/gestion/messages" onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-primary transition-colors">
                <Inbox className="size-4" /> Messages de contact
              </Link>
            )}
          </div>

          <div className="border-t border-border px-3 py-3 flex items-center justify-between">
            {can(role, "configWrite") ? (
              <Link
                href="/admin"
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Settings className="size-4" />
                Configuration
              </Link>
            ) : (
              <span className="text-xs text-muted-foreground">
                {role ? role.charAt(0) + role.slice(1).toLowerCase() : ""} — accès lecture
              </span>
            )}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {/* Lot 1 — déconnexion visible sur mobile */}
              <MobileLogoutEntry />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Main content ─── */}
      <main className="flex-1 bg-background min-h-[calc(100vh-48px)]">
        {children}
      </main>
    </div>
  );
}
