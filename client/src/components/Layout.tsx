import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Calculator,
  Home as HomeIcon,
  FileText,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ── Navigation Groups (keys for i18n) ──
interface NavChild {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  groupKey: string;
  items: NavChild[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: "nav.simulateurs",
    items: [
      { labelKey: "nav.simulateur-paie", href: "/calculateurs/calculer-salaire", icon: DollarSign },
      { labelKey: "nav.bareme-irpp", href: "/calculateurs/irpp", icon: BarChart3 },
      { labelKey: "nav.calculateur-retraite", href: "/calculateurs/retraite-cnss", icon: TrendingUp },
    ],
  },
  {
    groupKey: "nav.gestion-paie",
    items: [
      { labelKey: "nav.bulletin-paie", href: "/fiche-de-paie", icon: PenTool },
      { labelKey: "nav.actualisation-salariale", href: "/calculateurs/actualisation-salaire", icon: ArrowUpDown },
    ],
  },
  {
    groupKey: "nav.declarations-sociales",
    items: [
      { labelKey: "nav.declaration-salaires", href: "/calculateurs/declarations-cnss", icon: ClipboardList },
      { labelKey: "nav.declarations-neant", href: "/calculateurs/declarations-neant", icon: FileX },
      { labelKey: "nav.validation-fichier", href: "/calculateurs/testeur-txt-cnss", icon: FileSearch },
    ],
  },
  {
    groupKey: "nav.ressources",
    items: [
      { labelKey: "nav.avantages-exclus", href: "/referentiel-avantages-exclus", icon: BookOpen },
    ],
  },
];

// ── Sidebar Navigation (shared between sidebar & sheet) ──
function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { lang, isAr } = useLang();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {/* Home link */}
      <Link
        href="/"
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          location === "/"
            ? "bg-white/10 text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white"
        }`}
      >
        <HomeIcon className="size-5 shrink-0" />
        <span style={isAr ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : undefined}>
          {t("nav.accueil", lang)}
        </span>
      </Link>

      {NAV_GROUPS.map((group) => (
        <div key={group.groupKey} className="mt-3">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1"
             style={isAr ? { fontFamily: "'Noto Sans Arabic', sans-serif", direction: "rtl" } : undefined}>
            {t(group.groupKey as any, lang)}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span style={isAr ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : undefined}>
                  {t(item.labelKey as any, lang)}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// ── Main Layout ──
export default function Layout({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isAr } = useLang();

  const logoStyle = isAr
    ? { fontFamily: "'Noto Sans Arabic', Montserrat, sans-serif" }
    : { fontFamily: "Montserrat, sans-serif" };

  return (
    <div className="flex h-screen overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* ─── Desktop Sidebar (md+) ─── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-blue-950 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <Calculator className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight" style={logoStyle}>
            {isAr ? "الفيديسيار" : "LE FIDUCIAIRE"}
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <NavContent />
        </div>

        {/* Footer: lang + theme toggles */}
        <div className="border-t border-white/10 px-3 py-3 flex items-center justify-between">
          <LangToggle />
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
            <span className="text-base font-bold text-foreground" style={logoStyle}>
              {isAr ? "الفيديسيار" : "LE FIDUCIAIRE"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <LangToggle />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="size-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side={isAr ? "right" : "left"} className="w-72 bg-blue-950 border-blue-900 p-0">
                <SheetHeader className="px-5 py-5 border-b border-white/10">
                  <SheetTitle className="text-white text-left" style={logoStyle}>
                    {isAr ? "الفيديسيار" : "LE FIDUCIAIRE"}
                  </SheetTitle>
                </SheetHeader>
                <NavContent onNavigate={() => setSheetOpen(false)} />
                <div className="border-t border-white/10 px-3 py-3">
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Page content (scrollable) */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
