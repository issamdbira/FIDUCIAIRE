import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Calculator,
  Home as HomeIcon,
  FileText,
  ClipboardList,
  BookOpen,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ── Navigation Items ──
const NAV_ITEMS = [
  {
    label: "Accueil",
    href: "/",
    icon: HomeIcon,
  },
  {
    label: "Calculateurs",
    href: "/calculateurs/calculer-salaire",
    icon: Calculator,
    children: [
      { label: "Calculer un salaire", href: "/calculateurs/calculer-salaire" },
      { label: "Impôt sur le revenu", href: "/calculateurs/irpp" },
      { label: "Estimer sa retraite", href: "/calculateurs/retraite-cnss" },
      { label: "Actualiser un salaire", href: "/calculateurs/actualisation-salaire" },
      { label: "Fiche de paie", href: "/fiche-de-paie" },
    ],
  },
  {
    label: "Déclarations",
    href: "/calculateurs/declarations-cnss",
    icon: ClipboardList,
    children: [
      { label: "Déclaration CNSS", href: "/calculateurs/declarations-cnss" },
      { label: "Déclarations Néant", href: "/calculateurs/declarations-neant" },
      { label: "Testeur TXT", href: "/calculateurs/testeur-txt-cnss" },
    ],
  },
  {
    label: "Référentiel légal",
    href: "/referentiel-avantages-exclus",
    icon: BookOpen,
  },
];

// ── Sidebar Navigation (shared between sidebar & sheet) ──
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? location === "/"
            : location.startsWith(item.href) && item.href !== "/";

        return (
          <div key={item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {Icon && <Icon className="size-5 shrink-0" />}
              {item.label}
            </Link>

            {item.children && (
              <div className="ml-8 mt-1 flex flex-col gap-1">
                {item.children.map((child) => {
                  const childActive = location === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={`rounded-md px-3 py-2 text-sm transition-colors ${
                        childActive
                          ? "bg-white/10 text-white"
                          : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ── Main Layout ──
export default function Layout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Desktop Sidebar (md+) ─── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-blue-950 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <Calculator className="size-5 text-white" />
          </div>
          <span
            className="text-lg font-bold text-white tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            LE FIDUCIAIRE
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>

        {/* Footer: theme toggle */}
        <div className="border-t border-white/10 px-3 py-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* ─── Main workspace ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Topbar (< md) */}
        <header className="md:hidden flex h-16 shrink-0 items-center justify-between px-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Calculator className="size-4 text-primary-foreground" />
            </div>
            <span
              className="text-base font-bold text-foreground"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              LE FIDUCIAIRE
            </span>
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-blue-950 border-blue-900 p-0">
              <SheetHeader className="px-5 py-5 border-b border-white/10">
                <SheetTitle className="text-white text-left" style={{ fontFamily: "Montserrat, sans-serif" }}>
                  LE FIDUCIAIRE
                </SheetTitle>
              </SheetHeader>
              <NavContent onNavigate={() => setSheetOpen(false)} />
              <div className="border-t border-white/10 px-3 py-3">
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page content (scrollable) */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
