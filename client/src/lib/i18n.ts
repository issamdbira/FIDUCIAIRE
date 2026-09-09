/**
 * Dictionnaire bilingue FR / AR
 * Terminologie arabe alignée sur cnss.tn, secu.tn et paie-tunisie.com
 */

const dict = {
  // ── Navigation groups ──
  "nav.simulateurs": { fr: "Simulateurs", ar: "المحاكاة" },
  "nav.gestion-paie": { fr: "Gestion de la Paie", ar: "تصرف في الأجر" },
  "nav.declarations-sociales": { fr: "Déclarations Sociales", ar: "التصريحات الاجتماعية" },
  "nav.ressources": { fr: "Ressources", ar: "الموارد" },
  "nav.accueil": { fr: "Accueil", ar: "الاستقبال" },

  // ── Navigation items ──
  "nav.simulateur-paie": { fr: "Simulateur de Paie", ar: "محاكاة الأجر" },
  "nav.bareme-irpp": { fr: "Barème IRPP", ar: "جدول الضريبة على الدخل" },
  "nav.calculateur-retraite": { fr: "Calculateur de Retraite", ar: "حاسبة التقاعد" },
  "nav.bulletin-paie": { fr: "Bulletin de Paie", ar: "قسيمة الراتب" },
  "nav.actualisation-salariale": { fr: "Actualisation salariale", ar: "تحديث الأجور" },
  "nav.declaration-salaires": { fr: "Déclaration salaires CNSS", ar: "تصريح الأجور" },
  "nav.declarations-neant": { fr: "Déclarations Néant (I3/I16)", ar: "تصريحات العدم" },
  "nav.validation-fichier": { fr: "Validation fichier CNSS", ar: "التحقق من الملف" },
  "nav.avantages-exclus": { fr: "Avantages exclus CNSS", ar: "المزايا المستثناة" },

  // ── Hero ──
  "hero.title": {
    fr: "Paie & déclarations sociales en Tunisie",
    ar: "الأجر والتصريحات الاجتماعية في تونس",
  },
  "hero.subtitle": {
    fr: "Simulateurs CNSS/IRPP, bulletins de paie, déclarations TXT — tout en quelques clics, sans erreur.",
    ar: "محاكاة الضمان الاجتماعي والضريبة، قسائم الراتب، تصريحات TXT — كل شيء بنقرة واحدة دون خطأ.",
  },
  "hero.cta": { fr: "Accéder aux outils", ar: "الدخول إلى الأدوات" },

  // ── Section titles ──
  "section.outils": { fr: "Outils & simulateurs", ar: "الأدوات والمحاكاة" },
  "section.points-forts": { fr: "Points Forts", ar: "نقاط القوة" },

  // ── Points forts ──
  "pf.conformite": { fr: "Conformité Légale",
    ar: "موافقة قانونية",
  },
  "pf.zero-saisie": { fr: "Zéro Saisie Manuelle", ar: "بدون إدخال يدوي" },
  "pf.documents-prets": { fr: "Documents Prêts à l'Emploi", ar: "وثائق جاهزة للاستعمال" },

  // ── Home outil cards ──
  "outil.simulateur-paie.title": { fr: "Simulateur de Paie", ar: "محاكاة الأجر" },
  "outil.simulateur-paie.desc": {
    fr: "Brut → Net ou Net → Brut — salaires du secteur privé (CNSS, IRPP, CSS)",
    ar: "من الخام إلى الصافي أو العكس — أجور القطاع الخاص (الضمان الاجتماعي، الضريبة، التضامن)",
  },
  "outil.bareme-irpp.title": { fr: "Barème IRPP", ar: "جدول الضريبة على الدخل" },
  "outil.bareme-irpp.desc": {
    fr: "Calculez votre impôt annuel sur le revenu selon le barème officiel tunisien et votre situation familiale",
    ar: "احسبوا ضريبتكم السنوية على الدخل حسب الجدول الرسمي التونسي ووضعكم العائلي",
  },
  "outil.calculateur-retraite.title": { fr: "Calculateur de Retraite", ar: "حاسبة التقاعد" },
  "outil.calculateur-retraite.desc": {
    fr: "Estimez votre pension de retraite CNSS selon votre ancienneté et salaire de référence",
    ar: "قدّروا معاش تقاعدكم حسب أقدميتكم وأجركم المرجعي",
  },
  "outil.bulletin-paie.title": { fr: "Bulletin de Paie", ar: "قسيمة الراتب" },
  "outil.bulletin-paie.desc": {
    fr: "Générez un bulletin de paie complet : employeur, salarié, éléments de rémunération, détail du calcul et export PDF",
    ar: "إنتاج قسيمة راتب كاملة: المشغل، الأجير، عناصر الأجر، تفصيل الحساب وتصدير PDF",
  },
  "outil.actualisation.title": { fr: "Actualisation salariale", ar: "تحديث الأجور" },
  "outil.actualisation.desc": {
    fr: "Actualisez un salaire par le coefficient CNSS de son année (pour le calcul de la pension de retraite)",
    ar: "حدّثوا أجراً بمعامل الصندوق الوطني للسنة المعنية (لحساب معاش التقاعد)",
  },
  "outil.declaration-salaires.title": { fr: "Déclaration salaires CNSS", ar: "تصريح الأجور" },
  "outil.declaration-salaires.desc": {
    fr: "Saisie ou import CSV/Excel, contrôle des données, génération du fichier TXT 122 caractères",
    ar: "إدخال أو استيراد CSV/Excel، مراقبة البيانات، إنتاج ملف TXT بـ 122 حرفاً",
  },
  "outil.declarations-neant.title": { fr: "Déclarations Néant (I3/I16)", ar: "تصريحات العدم" },
  "outil.declarations-neant.desc": {
    fr: "Générez par lot vos déclarations néant — État récapitulatif I3 + Bordereau I16 — avec calibrage PDF",
    ar: "إنتاج تصريحات العدم بالجملة — حالة تلخيص I3 + جدول I16 — بمعايرة PDF",
  },
  "outil.validation-fichier.title": { fr: "Validation fichier CNSS", ar: "التحقق من الملف" },
  "outil.validation-fichier.desc": {
    fr: "Vérifiez la conformité d'un fichier TXT CNSS au format 122 caractères par ligne",
    ar: "تحققوا من مطابقة ملف TXT للصندوق الوطني للضمان الاجتماعي بتنسيق 122 حرفاً في السطر",
  },
  "outil.avantages-exclus.title": { fr: "Avantages exclus CNSS", ar: "المزايا المستثناة" },
  "outil.avantages-exclus.desc": {
    fr: "Consultez les plafonds des avantages exclus de l'assiette CNSS (Décret n° 2003-1098) avec simulateur intégré",
    ar: "اطلعوا على سقوف المزايا المستثناة من قاعدة احتساب اشتراكات الضمان الاجتماعي (أمر عدد 2003-1098) مع محاكاة مدمجة",
  },

  // ── Lang toggle ──
  "lang.fr": { fr: "FR", ar: "فر" },
  "lang.ar": { fr: "AR", ar: "عر" },
} as const;

export type DictKey = keyof typeof dict;

export function t(key: DictKey, lang: "fr" | "ar"): string {
  return dict[key]?.[lang] ?? dict[key]?.fr ?? key;
}

export default dict;
