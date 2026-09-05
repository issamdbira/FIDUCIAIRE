import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import BackToTools from "@/components/BackToTools";

/* ─── Types & Data ─── */

interface Formulaire {
  code: string;
  nomFr: string;
  nomAr: string;
  descriptionFr: string;
  descriptionAr: string;
  categorie: string;
  outilHref?: string;
}

const FORMULAIRES: Formulaire[] = [
  {
    code: "I3",
    nomFr: "État Récapitulatif des Salaires Déclarés",
    nomAr: "كشف إجمالي للأجور المصرح بها",
    descriptionFr:
      "Déclaration trimestrielle récapitulant l'ensemble des salaires déclarés par l'employeur au titre de chaque trimestre. Ce formulaire est obligatoire pour tout employeur affilié à la CNSS, même en l'absence de salariés (déclaration néant). Il sert de base au calcul des cotisations sociales dues auprès des différentes caisses : assurance maladie, assurance vieillesse, allocations familiales et accidents de travail.",
    descriptionAr:
      "كشف ثلاثي الأرباع يلخص جميع الأجور المصرح بها من قبل صاحب العمل لكل ربع سنة. هذا النموذج إلزامي لكل صاحب عمل مسجل بالصندوق الوطني للضمان الاجتماعي، حتى في غياب الأجراء (تصريح بالعدم).",
    categorie: "Déclarations trimestrielles",
    outilHref: "/calculateurs/declarations-cnss",
  },
  {
    code: "I16",
    nomFr: "Bordereau de Déclaration des Cotisations Sociales",
    nomAr: "كشف تصريح بالمساهمات الاجتماعية",
    descriptionFr:
      "Bordereau détaillé des cotisations sociales calculées pour chaque salarié au cours du trimestre. Il accompagne l'état I3 et précise la répartition des montants entre les différentes caisses de la CNSS. Ce document est généré automatiquement par la plateforme à partir des données salariales importées.",
    descriptionAr:
      "كشف مفصل بالمساهمات الاجتماعية المحسوبة لكل أجير خلال الربع السنة. يرافق كشف إجمالي الأجور ويوضح توزيع المبالغ بين مختلف صناديق الضمان الاجتماعي.",
    categorie: "Déclarations trimestrielles",
    outilHref: "/calculateurs/declarations-cnss",
  },
  {
    code: "TXT",
    nomFr: "Fichier d'Échange CNSS (Format 122 caractères)",
    nomAr: "ملف التبادل بالصيغة القياسية (122 حرفاً)",
    descriptionFr:
      "Fichier texte au format normalisé de 122 caractères par ligne, requis par la CNSS pour le télé-déclaratif. Chaque ligne représente un salarié avec l'ensemble des champs nécessaires au traitement automatisé : matricule employeur, matricule salarié, salaires bruts, cotisations par caisse et périodes de référence. Ce fichier est généré automatiquement après validation des données.",
    descriptionAr:
      "ملف نصي بالصيغة المعيارية المكونة من 122 حرفاً لكل سطر، مطلوب من الصندوق الوطني للضمان الاجتماعي للتصريح الإلكتروني. كل سطر يمثل أجيراً بجميع الحقول اللازمة للمعالجة الآلية.",
    categorie: "Fichiers d'échange",
    outilHref: "/calculateurs/testeur-txt-cnss",
  },
  {
    code: "FN",
    nomFr: "Déclaration Néant (I3 + I16)",
    nomAr: "تصريح بالعدم (كشف إجمالي + كشف مساهمات)",
    descriptionFr:
      "Ensemble des documents à produire lorsqu'un employeur n'a aucun salarié déclaré au cours d'un trimestre donné. Comprend un état I3 néant et un bordereau I16 néant, imprimables en PDF calibré avec les références de l'employeur (matricule, raison sociale, adresse) pré-remplies. La génération en lot permet de traiter plusieurs employeurs simultanément.",
    descriptionAr:
      "مجموعة الوثائق المنتجة عندما لا يتوفر لصاحب العمل أي أجير مصرح به خلال ربع سنة معين. يشمل كشفاً إجمالياً بالعدم وكشفاً بالمساهمات بالعدم، قابلين للطباعة بصيغة PDF مع بيانات صاحب العمل مملوءة مسبقاً.",
    categorie: "Déclarations particulières",
    outilHref: "/calculateurs/declarations-neant",
  },
  {
    code: "FP",
    nomFr: "Fiche de Paie Individualisée",
    nomAr: "كشف راتب فردي",
    descriptionFr:
      "Document de paie détaillé pour chaque salarié, incluant les éléments de rémunération brut, les déductions CNSS et IRPP, et le net à payer. La fiche intègre le calcul automatique des avantages exclus conformément au Décret n° 2003-1098 et aux barèmes SMIG en vigueur. Exportable en PDF avec logo de l'entreprise.",
    descriptionAr:
      "وثيقة رواتب مفصلة لكل أجير، تشمل عناصر الأجر الخام والخصومات المخصصة للضمان الاجتماعي والضريبة على الدخل وصافي الراتب المستحق. تتضمن الحساب الآلي للامتيازات المستثناة وفقاً للأمر number 2003-1098.",
    categorie: "Documents de paie",
    outilHref: "/fiche-de-paie",
  },
  {
    code: "RAE",
    nomFr: "Référentiel des Avantages Exclus de l'Assiette CNSS",
    nomAr: "مرجع الامتيازات المستثناة من وعاء المساهمات",
    descriptionFr:
      "Référentiel complet des 24 avantages exclus de l'assiette de calcul des cotisations sociales, tel que fixé par le Décret n° 2003-1098 du 19 mai 2003 (JORT n°41). Inclut les plafonds exprimés en multiples du SMIG avec historique des montants de 2020 à 2028, ainsi qu'un simulateur de conformité point par point avec calcul de l'écart de déclaration.",
    descriptionAr:
      "مرجع شامل للامتيازات الـ 24 المستثناة من وعاء حساب المساهمات الاجتماعية، حسبما تم تحديده بالأمر number 2003-1098 المؤرخ في 19 ماي 2003. يشمل السقوف المعبّر عنها بمضاعفات الأجر الأدنى مع تاريخ المبالغ من 2020 إلى 2028.",
    categorie: "Référentiels légaux",
    outilHref: "/referentiel-avantages-exclus",
  },
  {
    code: "IR",
    nomFr: "Calcul de l'Impôt sur le Revenu des Personnes Physiques (IRPP)",
    nomAr: "حساب الضريبة على دخل الأشخاص الطبيعيين",
    descriptionFr:
      "Simulateur d'IRPP annuel selon la législation tunisienne, prenant en compte la situation familiale (célibataire, marié, nombre d'enfants), les barèmes progressifs et les déductions légales. Permet d'estimer rapidement la charge fisnelle d'un salarié.",
    descriptionAr:
      "محاكي للضريبة السنوية على دخل الأشخاص الطبيعيين حسب التشريع التونسي، مع مراعاة الحالة العائلية والسلالم التصاعدية والخصومات القانونية.",
    categorie: "Simulateurs",
    outilHref: "/calculateurs/irpp",
  },
  {
    code: "RET",
    nomFr: "Estimation de la Pension de Retraite CNSS",
    nomAr: "تقدير منحة التقاعد",
    descriptionFr:
      "Outil d'estimation de la pension de retraite selon le régime CNSS du secteur privé. Prend en compte l'ancienneté, les salaires déclarés et les coefficients d'actualisation officiels pour projeter le montant futur de la pension.",
    descriptionAr:
      "أداة لتقدير منحة التقاعد حسب نظام الضمان الاجتماعي للقطاع الخاص. تأخذ بعين الاعتبار الأقدمية والأجور المصرح بها ومعاملات التحديث الرسمية لتقدير مبلغ المنحة المستقبلية.",
    categorie: "Simulateurs",
    outilHref: "/calculateurs/retraite-cnss",
  },
];

const CATEGORIES = [...new Set(FORMULAIRES.map((f) => f.categorie))];

/* ─── Component ─── */

export default function FormulairesCNSS() {
  const [recherche, setRecherche] = useState("");

  const formulairesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return FORMULAIRES;
    return FORMULAIRES.filter(
      (f) =>
        f.code.toLowerCase().includes(q) ||
        f.nomFr.toLowerCase().includes(q) ||
        f.nomAr.includes(q) ||
        f.categorie.toLowerCase().includes(q)
    );
  }, [recherche]);

  const categoriesFiltrees = useMemo(() => {
    return CATEGORIES.filter((cat) =>
      formulairesFiltres.some((f) => f.categorie === cat)
    );
  }, [formulairesFiltres]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <BackToTools />
      {/* ─── H1 SEO ─── */}
      <h1
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Formulaires CNSS Tunisie — Répertoire bilingue des déclarations sociales
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Découvrez tous les formulaires CNSS, documents de paie et outils de simulation.
        Noms officiels en français et en arabe, descriptions détaillées et accès direct
        aux outils de génération automatique.
      </p>

      {/* ─── Barre de recherche ─── */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un formulaire (ex: I3, salaire, retraite, كشف...)"
          className="pl-10"
        />
      </div>

      {/* ─── Grille de fiches par catégorie ─── */}
      {categoriesFiltrees.map((cat) => {
        const items = formulairesFiltres.filter((f) => f.categorie === cat);
        return (
          <section key={cat} className="mb-10">
            <h2 className="text-lg font-semibold text-foreground mb-4">{cat}</h2>
            <div className="grid grid-cols-1 gap-4">
              {items.map((f) => (
                <Card
                  key={f.code}
                  className="rounded-lg shadow-sm border border-border bg-card overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-0">
                    {/* Code badge */}
                    <div className="flex items-center justify-center p-5 bg-primary/5 border-b md:border-b-0 md:border-r border-border">
                      <Badge variant="secondary" className="text-base font-mono px-3 py-1">
                        {f.code}
                      </Badge>
                    </div>

                    {/* Contenu bilingue */}
                    <div className="p-5">
                      {/* Nom Français */}
                      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1">
                        {f.nomFr}
                      </h3>
                      {/* Nom Arabe */}
                      <p
                        dir="rtl"
                        lang="ar"
                        className="text-sm font-medium text-muted-foreground mb-3 leading-relaxed"
                      >
                        {f.nomAr}
                      </p>
                      {/* Description FR */}
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                        {f.descriptionFr}
                      </p>
                      {/* Description AR */}
                      <p
                        dir="rtl"
                        lang="ar"
                        className="text-xs text-muted-foreground/70 leading-[2]"
                      >
                        {f.descriptionAr}
                      </p>
                    </div>

                    {/* CTA */}
                    {f.outilHref && (
                      <div className="flex items-center justify-center p-5 border-t md:border-t-0 md:border-l border-border">
                        <Link href={f.outilHref}>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer">
                            Ouvrir
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {formulairesFiltres.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucun formulaire ne correspond à cette recherche. / لا توجد نتائج.
        </p>
      )}

      {/* ─── Section informative SEO ─── */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Qu'est-ce que la CNSS en Tunisie ?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          La Caisse Nationale de Sécurité Sociale (CNSS) est l'organisme public tunisien
          chargé de la gestion des régimes de sécurité sociale pour le secteur privé.
          Tout employeur affilié doit effectuer des déclarations trimestrielles (états I3
          et I16) et verser les cotisations correspondantes pour garantir la couverture
          sociale de ses salariés : assurance maladie, assurance vieillesse, allocations
          familiales et accidents de travail.
        </p>

        <h2 className="text-lg font-semibold text-foreground mb-3">
          Comment remplir les formulaires CNSS ?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Le Fiduciaire automatise la génération de l'ensemble des formulaires CNSS à
          partir des données salariales de votre entreprise. Importez votre fichier
          Excel, vérifiez les montants, et exportez les documents PDF et fichiers TXT
          prêts à être déposés auprès de la CNSS. Tous les calculs respectent la
          législation tunisienne en vigueur, y compris les plafonds du Décret
          n° 2003-1098 relatif aux avantages exclus de l'assiette de cotisations.
        </p>

        <h2 className="text-lg font-semibold text-foreground mb-3">
          ما هي الصندوق الوطني للضمان الاجتماعي في تونس؟
        </h2>
        <p dir="rtl" lang="ar" className="text-sm text-muted-foreground leading-[2] mb-6">
          الصندوق الوطني للضمان الاجتماعي هو الهيكل العمومي التونسي المكلف بتدبير أنظمة الضمان الاجتماعي للقطاع الخاص. يجب على كل صاحب عمل مسجل القيام بتصاريح ثلاثية الأرباع (كشف I3 وكشف I16) ودفع المساهمات المقابلة لضمان التغطية الاجتماعية لأجرائه.
        </p>

        <h2 className="text-lg font-semibold text-foreground mb-3">
          قائمة نماذج الصندوق الوطني للضمان الاجتماعي
        </h2>
        <p dir="rtl" lang="ar" className="text-sm text-muted-foreground leading-[2]">
          يجمع هذا القسم جميع النماذج والوثائق المتعلقة بالتصاريح الاجتماعية في تونس، مع تسمياتها الرسمية بالعربية والفرنسية، وأدوات التوليد الآلي المباشرة.
        </p>
      </section>
    </div>
  );
}