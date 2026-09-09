import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import {
  DollarSign,
  FileText,
  ClipboardCheck,
  FileX,
  TrendingUp,
  ShieldCheck,
  Upload,
  FileDown,
  Calculator,
  BookOpen,
  PenTool,
  BarChart3,
} from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { t } from "@/lib/i18n";

// ── Outil keys for i18n ──
const OUTILS = [
  { id: "calculer-salaire", titleKey: "outil.simulateur-paie.title" as const, descKey: "outil.simulateur-paie.desc" as const, icon: DollarSign, href: "/calculateurs/calculer-salaire" },
  { id: "irpp", titleKey: "outil.bareme-irpp.title" as const, descKey: "outil.bareme-irpp.desc" as const, icon: BarChart3, href: "/calculateurs/irpp" },
  { id: "retraite-cnss", titleKey: "outil.calculateur-retraite.title" as const, descKey: "outil.calculateur-retraite.desc" as const, icon: TrendingUp, href: "/calculateurs/retraite-cnss" },
  { id: "fiche-de-paie", titleKey: "outil.bulletin-paie.title" as const, descKey: "outil.bulletin-paie.desc" as const, icon: PenTool, href: "/fiche-de-paie" },
  { id: "actualisation-salaire", titleKey: "outil.actualisation.title" as const, descKey: "outil.actualisation.desc" as const, icon: Calculator, href: "/calculateurs/actualisation-salaire" },
  { id: "declarations-cnss", titleKey: "outil.declaration-salaires.title" as const, descKey: "outil.declaration-salaires.desc" as const, icon: ClipboardCheck, href: "/calculateurs/declarations-cnss" },
  { id: "declarations-neant", titleKey: "outil.declarations-neant.title" as const, descKey: "outil.declarations-neant.desc" as const, icon: FileX, href: "/calculateurs/declarations-neant" },
  { id: "testeur-txt-cnss", titleKey: "outil.validation-fichier.title" as const, descKey: "outil.validation-fichier.desc" as const, icon: FileText, href: "/calculateurs/testeur-txt-cnss" },
  { id: "referentiel-avantages-exclus", titleKey: "outil.avantages-exclus.title" as const, descKey: "outil.avantages-exclus.desc" as const, icon: BookOpen, href: "/referentiel-avantages-exclus" },
];

const POINTS_FORTS = [
  {
    icon: ShieldCheck,
    titleKey: "pf.conformite" as const,
    descriptionFr: "Textes de loi à jour, gestion des avantages exclus selon le Décret n° 2003-1098 et les barèmes CNSS officiels.",
    descriptionAr: "نصوص قانونية محدّثة، تصرف في المزايا المستثناة حسب الأمر عدد 2003-1098 والجداول الرسمية للصندوق الوطني.",
  },
  {
    icon: Upload,
    titleKey: "pf.zero-saisie" as const,
    descriptionFr: "Import Excel robuste pour les déclarations de masse. Glissez votre fichier et tout est pré-rempli automatiquement.",
    descriptionAr: "استيراد Excel متين للتصريحات الجماعية. اسحبوا ملفكم وكل شيء يملأ تلقائياً.",
  },
  {
    icon: FileDown,
    titleKey: "pf.documents-prets" as const,
    descriptionFr: "Génération de PDF I3 et I16 normés, bulletins de paie exportables et fichiers TXT conformes au format CNSS.",
    descriptionAr: "إنتاج PDF معياري I16 وI3، قسائم راتب قابلة للتصدير وملفات TXT مطابقة لتنسيق الصندوق الوطني.",
  },
];

export default function Home() {
  const { lang, isAr } = useLang();

  const arFont = isAr ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : undefined;
  const frFont = !isAr ? { fontFamily: "Montserrat, sans-serif" } : undefined;

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4"
            style={isAr ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : { fontFamily: "Montserrat, sans-serif" }}
          >
            {t("hero.title", lang)}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8" style={arFont}>
            {t("hero.subtitle", lang)}
          </p>
          <Button
            size="lg"
            className="text-base px-8 py-6"
            onClick={() =>
              document
                .getElementById("outils")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            {t("hero.cta", lang)}
          </Button>
        </div>
      </section>

      {/* ─── POINTS FORTS ─── */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {POINTS_FORTS.map((pf) => {
            const Icon = pf.icon;
            return (
              <Card
                key={pf.titleKey}
                className="rounded-lg shadow-sm border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2" style={arFont}>
                  {t(pf.titleKey, lang)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed" style={arFont}>
                  {isAr ? pf.descriptionAr : pf.descriptionFr}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ─── OUTILS ─── */}
      <section id="outils" className="max-w-4xl mx-auto px-4 pb-16">
        <h2
          className="text-2xl font-bold text-foreground mb-2"
          style={isAr ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : { fontFamily: "Montserrat, sans-serif" }}
        >
          {t("section.outils", lang)}
        </h2>
        <p className="text-muted-foreground text-sm mb-6" style={arFont}>
          {isAr ? "اختروا أداة للبدء." : "Sélectionnez un outil pour commencer."}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {OUTILS.map((outil) => {
            const Icon = outil.icon;
            return (
              <Link key={outil.id} href={outil.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer rounded-lg shadow-sm border border-border bg-card">
                  <div className="p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1" style={arFont}>
                      {t(outil.titleKey, lang)}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed" style={arFont}>
                      {t(outil.descKey, lang)}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
