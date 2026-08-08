import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Building2,
  Briefcase,
  Scale,
  FileStack,
  ShieldCheck,
  ArrowRight,
  Calculator,
  Users,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

/* ─── Data ─── */

const PILIERS_PME = [
  {
    icon: Scale,
    title: "Moteur de paie 100% conforme",
    description:
      "Calculs automatiques selon la législation tunisienne : CNSS, IRPP, avantages exclus (Décret n° 2003-1098) et barèmes à jour.",
    cta: "Calculer un salaire",
    href: "/calculateurs/calculer-salaire",
  },
  {
    icon: FileStack,
    title: "Fiches de paie individualisées",
    description:
      "Générez des fiches de paie PDF avec logo, détail des cotisations et net à payer. Importez vos données et exportez en un clic.",
    cta: "Générer une fiche de paie",
    href: "/fiche-de-paie",
  },
  {
    icon: ShieldCheck,
    title: "Multi-organisations",
    description:
      "Gérez plusieurs entités sous un même compte. Basculez entre vos sociétés et centralisez votre suivi de paie.",
    cta: "Démarrer",
    href: "/calculateurs/declarations-cnss",
  },
];

const PILIERS_FIDUCIAIRE = [
  {
    icon: FileStack,
    title: "Import en masse et déclarations lot",
    description:
      "Génération en lot des états I3 et bordereaux I16, import Excel massif, export du fichier TXT 122 caractères prêt à dépôt CNSS.",
    cta: "Déclarations CNSS",
    href: "/calculateurs/declarations-cnss",
  },
  {
    icon: ShieldCheck,
    title: "Audit des plafonds légaux",
    description:
      "Détection automatique des écarts de conformité sur les avantages exclus, avec recommandations d'optimisation par dossier.",
    cta: "Référentiel légal",
    href: "/referentiel-avantages-exclus",
  },
  {
    icon: Users,
    title: "Gestion multi-dossiers clients",
    description:
      "Centralisez tous vos clients, générez leurs déclarations en lot et suivez la conformité de chaque dossier en temps réel.",
    cta: "Voir l'espace Fiduciaire",
    href: "/calculateurs/declarations-neant",
  },
];

/* ─── Component ─── */

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════ NAVIGATION BAR (QuickBooks-inspired, dark) ═══════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-blue-950">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
              <Calculator className="size-4 text-white" />
            </div>
            <span
              className="text-base font-bold text-white tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              LE FIDUCIAIRE
            </span>
          </div>

          {/* Desktop menus */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/calculateurs/calculer-salaire">
              <span className="px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer">
                Solutions pour Entreprises
              </span>
            </Link>
            <Link href="/calculateurs/declarations-cnss">
              <span className="px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer">
                Solutions pour Experts-Comptables
              </span>
            </Link>
            <Link href="/formulaires-cnss">
              <span className="px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer">
                Formulaires CNSS
              </span>
            </Link>
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-2">
            <Link href="/calculateurs/declarations-cnss">
              <Button
                size="sm"
                className="hidden sm:inline-flex bg-white text-blue-950 hover:bg-white/90 font-semibold"
              >
                Commencer gratuitement
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-blue-950 px-4 pb-4 pt-2 space-y-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1">
              Solutions
            </p>
            <Link href="/calculateurs/calculer-salaire" onClick={() => setMobileMenuOpen(false)}>
              <span className="block px-3 py-2 text-sm text-white/70 hover:text-white rounded-md">
                Solutions pour Entreprises
                <span className="block text-[10px] text-white/40">Simplify business for smalls</span>
              </span>
            </Link>
            <Link href="/calculateurs/declarations-cnss" onClick={() => setMobileMenuOpen(false)}>
              <span className="block px-3 py-2 text-sm text-white/70 hover:text-white rounded-md">
                Solutions pour Experts-Comptables
                <span className="block text-[10px] text-white/40">Ledger Business — Gestion multi-dossiers</span>
              </span>
            </Link>
            <Link href="/formulaires-cnss" onClick={() => setMobileMenuOpen(false)}>
              <span className="block px-3 py-2 text-sm text-white/70 hover:text-white rounded-md">
                Formulaires CNSS
              </span>
            </Link>
          </div>
        )}
      </header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-background">
        <div className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            La gestion de paie et la conformité sociale tunisienne, simplifiées.
          </h1>
          <p className="text-blue-100/80 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Une plateforme conçue pour les PME et les experts-comptables.
            Automatisez vos calculs, générez vos déclarations et restez conforme en quelques clics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/calculateurs/calculer-salaire">
              <Button size="lg" className="bg-white text-blue-950 hover:bg-white/90 font-semibold px-8">
                Espace Entreprise
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/calculateurs/declarations-cnss">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                Espace Fiduciaire
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ DOUBLE ENTRÉE ═══════════════ */}
      <section className="max-w-5xl mx-auto px-4 -mt-8 relative z-10 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-xl shadow-md border border-border bg-card p-8 flex flex-col justify-between min-h-[240px]">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Pour les Entreprises (PME)
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Simplify business for smalls — Gérez votre paie, éditez vos fiches et suivez
                votre trésorerie en toute simplicité.
              </p>
            </div>
            <Link href="/calculateurs/calculer-salaire">
              <Button className="mt-6 w-fit" size="lg">
                Espace Entreprise
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>

          <Card className="rounded-xl shadow-md border border-border bg-card p-8 flex flex-col justify-between min-h-[240px]">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Pour les Experts-Comptables
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ledger Business — Gérez tous vos dossiers clients, auditez les plafonds et
                exportez les déclarations CNSS en lot.
              </p>
            </div>
            <Link href="/calculateurs/declarations-cnss">
              <Button className="mt-6 w-fit" size="lg">
                Espace Fiduciaire
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* ═══════════════ FONCTIONS DE FORCE — PME ═══════════════ */}
      <section className="max-w-5xl mx-auto px-4 mb-14">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Fonctions de force — Entreprises
            </h2>
            <p className="text-xs text-muted-foreground">Simplify business for smalls</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILIERS_PME.map((pilier) => {
            const Icon = pilier.icon;
            return (
              <Card key={pilier.title} className="rounded-lg shadow-sm border border-border bg-card p-6 flex flex-col">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{pilier.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{pilier.description}</p>
                <Link href={pilier.href} className="mt-4">
                  <Button variant="outline" size="sm" className="text-xs">
                    {pilier.cta}
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ FONCTIONS DE FORCE — FIDUCIAIRES ═══════════════ */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Fonctions de force — Experts-Comptables
            </h2>
            <p className="text-xs text-muted-foreground">Ledger Business</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILIERS_FIDUCIAIRE.map((pilier) => {
            const Icon = pilier.icon;
            return (
              <Card key={pilier.title} className="rounded-lg shadow-sm border border-border bg-card p-6 flex flex-col">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-2">{pilier.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{pilier.description}</p>
                <Link href={pilier.href} className="mt-4">
                  <Button variant="outline" size="sm" className="text-xs">
                    {pilier.cta}
                    <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ FOOTER MINIMAL ═══════════════ */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Le Fiduciaire — Plateforme de gestion de paie et conformité sociale tunisienne.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/formulaires-cnss">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Formulaires CNSS
              </span>
            </Link>
            <Link href="/referentiel-avantages-exclus">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Référentiel légal
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
