import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Calculator,
  Home as HomeIcon,
  ClipboardList,
  BookOpen,
  Menu,
  DollarSign,
  BarChart3,
  TrendingUp,
  PenTool,
  ArrowUpDown,
  FileSearch,
  FileX,
  ScrollText,
  ShieldCheck,
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

// ── Navigation Groups ──
interface NavChild {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  groupLabel: string;
  items: NavChild[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: "Simulateurs RH",
    items: [
      { label: "Calculer un salaire (Brut/Net)", href: "/calculateurs/calculer-salaire", icon: DollarSign },
      { label: "Impôt sur le revenu (IRPP)", href: "/calculateurs/irpp", icon: BarChart3 },
      { label: "Estimer sa retraite", href: "/calculateurs/retraite-cnss", icon: TrendingUp },
    ],
  },
  {
    groupLabel: "Gestion de la Paie",
    items: [
      { label: "Générer une fiche de paie", href: "/fiche-de-paie", icon: PenTool },
      { label: "Actualisation des salaires", href: "/calculateurs/actualisation-salaire", icon: ArrowUpDown },
    ],
  },
  {
    groupLabel: "Déclarations Sociales",
    items: [
      { label: "Déclaration CNSS (Saisie & Import)", href: "/calculateurs/declarations-cnss", icon: ClipboardList },
      { label: "Déclarations Néant", href: "/calculateurs/declarations-neant", icon: FileX },
      { label: "Testeur de fichier TXT", href: "/calculateurs/testeur-txt-cnss", icon: FileSearch },
    ],
  },
  {
    groupLabel: "Ressources",
    items: [
      { label: "Référentiel légal", href: "/referentiel-avantages-exclus", icon: BookOpen },
      { label: "Formulaires CNSS", href: "/formulaires-cnss", icon: ScrollText },
    ],
  },
];

// ── Main Layout ──
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden max-w-[100vw]">
      {/* ─── Top Navbar ─── */}
      <nav className="sticky top-0 z-50 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto flex h-full items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Calculator className="size-5 text-primary" />
            <span
              className="text-base font-bold text-primary tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              LE FIDUCIAIRE
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 mx-4">
            <Link
              href="/"
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                location === "/"
                  ? "text-primary font-semibold border-b-2 border-primary"
                  : "text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
              }`}
            >
              <HomeIcon className="inline size-4 mr-1.5 -mt-0.5" />
              Accueil
            </Link>

            {NAV_GROUPS.map((group, gi) => (
              <div key={group.groupLabel} className="flex items-center">
                {gi > 0 && (
                  <span className="mx-2 text-slate-300 dark:text-slate-600 select-none">|</span>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? "text-primary font-semibold border-b-2 border-primary"
                          : "text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right side: Theme toggle + Admin */}
          <div className="hidden lg:flex items-center gap-2">
            <ThemeToggle />
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-primary">
                <ShieldCheck className="size-4" />
                Admin
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-600 dark:text-slate-300"
            onClick={() => setSheetOpen(true)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </nav>

      {/* ─── Mobile Sheet ─── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-72 bg-white dark:bg-slate-900 p-0">
          <SheetHeader className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <SheetTitle className="text-left text-primary" style={{ fontFamily: "Montserrat, sans-serif" }}>
              LE FIDUCIAIRE
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-1 px-3 py-4 overflow-y-auto">
            <Link
              href="/"
              onClick={() => setSheetOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                location === "/"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary"
              }`}
            >
              <HomeIcon className="size-5 shrink-0" />
              Accueil
            </Link>

            {NAV_GROUPS.map((group) => (
              <div key={group.groupLabel} className="mt-3">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  {group.groupLabel}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-slate-600 hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-primary"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-3 flex items-center justify-between">
            <Link
              href="/admin"
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary dark:text-slate-300"
            >
              <ShieldCheck className="size-4" />
              Admin
            </Link>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Main content ─── */}
      <main className="flex-1 bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-56px)]">
        {children}
      </main>
    </div>
  );
}
