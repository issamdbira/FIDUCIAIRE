import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Calculator,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
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

          {/* Right side : Theme toggle + Admin (desktop) */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-primary">
                  <ShieldCheck className="size-4" />
                  <span className="hidden md:inline">Admin</span>
                </Button>
              </Link>
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
          </div>

          <div className="border-t border-border px-3 py-3 flex items-center justify-between">
            <Link
              href="/admin"
              onClick={() => setSheetOpen(false)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <ShieldCheck className="size-4" />
              Admin
            </Link>
            <ThemeToggle />
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
