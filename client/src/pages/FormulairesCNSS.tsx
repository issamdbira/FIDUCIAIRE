import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, ExternalLink } from "lucide-react";
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
  categorieFr: string;
  categorieAr: string;
  outilHref?: string;
  fichierPdf?: string;
}

/**
 * Liste officielle des formulaires CNSS (source : Liste-Formulaires-CNSS.xlsx)
 * avec noms français et arabes officiels, classés par catégorie.
 * Les formulaires I3, I16 disposent d'un outilHref vers nos générateurs.
 */
const FORMULAIRES: Formulaire[] = [
  // ── Accès aux documents administratifs ──
  {
    code: "ADA",
    nomFr: "Accès aux documents administratifs",
    nomAr: "مطلب النفاذ إلى الوثائق الإدارية",
    descriptionFr: "Demande d'accès aux documents administratifs détenus par la CNSS.",
    descriptionAr: "مطلب النفاذ إلى الوثائق الإدارية المحفوظة لدى الصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Accès aux documents administratifs",
    categorieAr: "النفاذ إلى الوثائق الإدارية",
    fichierPdf: "Accès aux documents administratifs.pdf",
  },

  // ── Actions sociales ──
  {
    code: "P326",
    nomFr: "Demande de prise en charge des indemnités de licenciement et des droits légaux",
    nomAr: "مطلب التكفل بغرامات الطرد والحقوق القانونية",
    descriptionFr: "Formulaire P326 — prise en charge par la CNSS des indemnités de licenciement et droits légaux du salarié.",
    descriptionAr: "نموذج P326 — التكفل من قبل الصندوق الوطني للضمان الاجتماعي بغرامات الطرد والحقوق القانونية للأجير.",
    categorieFr: "Actions sociales",
    categorieAr: "الأعمال الاجتماعية",
    fichierPdf: "P326.pdf",
  },

  // ── Affiliation ──
  {
    code: "F1",
    nomFr: "Affiliation employeur",
    nomAr: "مطلب انخراط مؤجّر",
    descriptionFr: "Formulaire F1 — demande d'affiliation d'un employeur à la CNSS. Tout employeur doit s'affiler dès l'embauche de son premier salarié.",
    descriptionAr: "نموذج F1 — مطلب انخراط مؤجّر بالصندوق الوطني للضمان الاجتماعي. يجب على كل مؤجّر الانخراط فور توظيفه أول أجير.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "F1.pdf",
  },
  {
    code: "N40",
    nomFr: "Demande d'affiliation pour employeur de gens de maison",
    nomAr: "مطلب انخراط لمؤجّري عملة المنازل",
    descriptionFr: "Formulaire N40 — affiliation spécifique pour les employeurs de personnel de maison.",
    descriptionAr: "نموذج N40 — انخراط خاص بمؤجّري عملة المنازل.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "N40.pdf",
  },
  {
    code: "N41",
    nomFr: "Demande d'affiliation spéciale de l'État et des collectivités locales",
    nomAr: "مطلب انخراط خاص بالدولة والجماعات المحلية والمؤسسات العمومية ذات الصبغة الإدارية",
    descriptionFr: "Formulaire N41 — affiliation spéciale pour l'État, les collectivités locales et les établissements publics à caractère administratif.",
    descriptionAr: "نموذج N41 — انخراط خاص بالدولة والجماعات المحلية والمؤسسات العمومية ذات الصبغة الإدارية.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "N41.pdf",
  },
  {
    code: "N42",
    nomFr: "Demande d'affiliation spéciale pour les armateurs des barques (≤ 5 tonneaux)",
    nomAr: "مطلب انخراط خاص بمجهّزي المراكب التي لا تتجاوز حمولتها 5 أطنان",
    descriptionFr: "Formulaire N42 — affiliation spéciale pour les armateurs de barques dont la jauge est inférieure ou égale à 5 tonneaux.",
    descriptionAr: "نموذج N42 — انخراط خاص بمجهّزي المراكب التي لا تتجاوز حمولتها 5 أطنان.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "N42.pdf",
  },
  {
    code: "N43",
    nomFr: "Liste nominative des salariés",
    nomAr: "قائمة إسمية في الأجراء",
    descriptionFr: "Formulaire N43 — liste nominative des salariés à joindre à la demande d'affiliation.",
    descriptionAr: "نموذج N43 — قائمة إسمية في الأجراء ترفق بمطلب الانخراط.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "N43.pdf",
  },
  {
    code: "N44",
    nomFr: "Demande d'affiliation pour les personnes travaillant pour leur propre compte (loi n°2002-32)",
    nomAr: "مطلب انخراط للعاملين لحسابهم الخاص في القطاعين الفلاحي وغير الفلاحي (قانون عدد 32 لسنة 2002)",
    descriptionFr: "Formulaire N44 — affiliation des travailleurs non salariés (secteurs agricole et non agricole) selon la loi n°2002-32.",
    descriptionAr: "نموذج N44 — انخراط العاملين لحسابهم الخاص في القطاعين الفلاحي وغير الفلاحي حسب قانون عدد 32 لسنة 2002.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "N44.pdf",
  },
  {
    code: "N54",
    nomFr: "Demande d'affiliation des artistes, créateurs et intellectuels (loi n°2002-104)",
    nomAr: "مطلب انخراط الفنانين والمبدعين والمثقفين (قانون عدد 104 لسنة 2002)",
    descriptionFr: "Formulaire N54 — affiliation spécifique pour les artistes, créateurs et intellectuels selon la loi n°2002-104.",
    descriptionAr: "نموذج N54 — انخراط خاص بالفنانين والمبدعين والمثقفين حسب قانون عدد 104 لسنة 2002.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "N54.pdf",
  },
  {
    code: "P212",
    nomFr: "Demande d'affiliation au régime des travailleurs non salariés",
    nomAr: "مطلب الانخراط بنظام غير الأجراء في القطاعين الفلاحي وغير الفلاحي",
    descriptionFr: "Formulaire P212 — affiliation au régime des travailleurs non salariés dans les secteurs agricole et non agricole.",
    descriptionAr: "نموذج P212 — الانخراط بنظام غير الأجراء في القطاعين الفلاحي وغير الفلاحي.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "P212.pdf",
  },
  {
    code: "P304",
    nomFr: "Demande d'affiliation au régime de sécurité sociale des travailleurs tunisiens à l'étranger",
    nomAr: "مطلب الانخراط بنظام الضمان الاجتماعي للعملة التونسيين بالخارج",
    descriptionFr: "Formulaire P304 — affiliation au régime de sécurité sociale pour les travailleurs tunisiens expatriés.",
    descriptionAr: "نموذج P304 — الانخراط بنظام الضمان الاجتماعي للعملة التونسيين بالخارج.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "P304.pdf",
  },
  {
    code: "ATT",
    nomFr: "Attestation d'exercice d'une activité agricole",
    nomAr: "شهادة في ممارسة نشاط فلاحي مسلمة من الوزارة المكلفة بالفلاحة",
    descriptionFr: "Attestation délivrée par le Ministère chargé de l'agriculture certifiant l'exercice d'une activité agricole.",
    descriptionAr: "شهادة مسلمة من الوزارة المكلفة بالفلاحة تثبت ممارسة نشاط فلاحي.",
    categorieFr: "Affiliation",
    categorieAr: "الانخراط",
    fichierPdf: "attestation.pdf",
  },

  // ── Allocations familiales ──
  {
    code: "C084",
    nomFr: "Engagement relatif à la majoration pour salaire unique",
    nomAr: "الالتزام يتعلق بالزيادة في المنحة للأجر الوحيد",
    descriptionFr: "Formulaire C084 — engagement de l'employeur concernant la majoration pour salaire unique.",
    descriptionAr: "نموذج C084 — التزام صاحب العمل يتعلق بالزيادة في المنحة للأجر الوحيد.",
    categorieFr: "Allocations familiales",
    categorieAr: "المنح العائلية",
    fichierPdf: "C084.pdf",
  },
  {
    code: "N101",
    nomFr: "Engagement relatif à l'octroi de prestations familiales pour enfant handicapé",
    nomAr: "الالتزام يتعلق بإسناد المنح العائلية لفائدة طفل معوق",
    descriptionFr: "Formulaire N101 — engagement pour l'octroi des prestations familiales au bénéfice d'un enfant handicapé.",
    descriptionAr: "نموذج N101 — التزام يتعلق بإسناد المنح العائلية لفائدة طفل معوق.",
    categorieFr: "Allocations familiales",
    categorieAr: "المنح العائلية",
    fichierPdf: "N101.pdf",
  },

  // ── Assurances Sociales ──
  {
    code: "A144bis",
    nomFr: "Demande de capital décès et de pension de survivants",
    nomAr: "مطلب رأس مال الوفاة وجراية الباقين على قيد الحياة",
    descriptionFr: "Formulaire A144 bis — demande de capital décès et de pension de survivants auprès de la CNSS.",
    descriptionAr: "نموذج A144 مكرر — مطلب رأس مال الوفاة وجراية الباقين على قيد الحياة.",
    categorieFr: "Assurances Sociales",
    categorieAr: "التأمينات الاجتماعية",
    fichierPdf: "A144bis.pdf",
  },
  {
    code: "N66",
    nomFr: "Déclaration d'accident non professionnel",
    nomAr: "التصريح بحادث غير شغلي",
    descriptionFr: "Formulaire N66 — déclaration d'accident non professionnel auprès de la CNSS.",
    descriptionAr: "نموذج N66 — التصريح بحادث غير شغلي لدى الصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Assurances Sociales",
    categorieAr: "التأمينات الاجتماعية",
    fichierPdf: "N66.pdf",
  },
  {
    code: "P57",
    nomFr: "Demande d'indemnité de décès",
    nomAr: "مطلب منحة الوفاة",
    descriptionFr: "Formulaire P57 — demande d'indemnité de décès.",
    descriptionAr: "نموذج P57 — مطلب منحة الوفاة.",
    categorieFr: "Assurances Sociales",
    categorieAr: "التأمينات الاجتماعية",
    fichierPdf: "P57.pdf",
  },
  {
    code: "P58",
    nomFr: "Constat médical",
    nomAr: "معاينة طبية",
    descriptionFr: "Formulaire P58 — constat médical par le médecin conseil de la CNSS.",
    descriptionAr: "نموذج P58 — معاينة طبية من قبل الطبيب المستشار بالصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Assurances Sociales",
    categorieAr: "التأمينات الاجتماعية",
    fichierPdf: "P58.pdf",
  },

  // ── Attestations ──
  {
    code: "N74",
    nomFr: "Attestation contentieuse N74",
    nomAr: "مطلب شهادة اتفاق على حل نزاع",
    descriptionFr: "Attestation contentieuse N74 — certificat d'accord sur la résolution d'un litige.",
    descriptionAr: "شهادة اتفاق على حل نزاع N74.",
    categorieFr: "Attestations",
    categorieAr: "الشهادات",
    fichierPdf: "Attestation contentieuse N74.pdf",
  },
  {
    code: "N75",
    nomFr: "Attestation de solde N75",
    nomAr: "مطلب شهادة خلاص",
    descriptionFr: "Attestation de solde N75 — certificat de situation de solde auprès de la CNSS.",
    descriptionAr: "شهادة خلاص N75.",
    categorieFr: "Attestations",
    categorieAr: "الشهادات",
    fichierPdf: "Attestation de solde N75.pdf",
  },
  {
    code: "N124",
    nomFr: "Attestation de non assujettissement N124",
    nomAr: "مطلب شهادة في عدم الخضوع",
    descriptionFr: "Attestation de non assujettissement N124 — certificat de non-affiliation ou de non-assujettissement.",
    descriptionAr: "شهادة في عدم الخضوع N124.",
    categorieFr: "Attestations",
    categorieAr: "الشهادات",
    fichierPdf: "attestation de non assujettissement .N124.pdf",
  },

  // ── Déclaration des salaires ──
  {
    code: "I3",
    nomFr: "État récapitulatif des salaires déclarés",
    nomAr: "الجدول الجملي للأجور المصرّح بها",
    descriptionFr:
      "Formulaire I3 — déclaration trimestrielle récapitulant l'ensemble des salaires déclarés par l'employeur. Obligatoire pour tout employeur affilié à la CNSS, même en l'absence de salariés (déclaration néant).",
    descriptionAr:
      "نموذج I3 — التصريح الثلاثي بالأجور المصرح بها من قبل صاحب العمل. إلزامي لكل صاحب عمل مسجل بالصندوق الوطني للضمان الاجتماعي، حتى في غياب الأجراء (تصريح بالعدم).",
    categorieFr: "Déclaration des salaires",
    categorieAr: "التصريح بالأجور",
    fichierPdf: "I3.pdf",
    outilHref: "/calculateurs/declarations-cnss",
  },
  {
    code: "I16",
    nomFr: "Déclaration trimestrielle des salaires",
    nomAr: "التصريح الثلاثي بالأجور",
    descriptionFr:
      "Formulaire I16 — bordereau détaillé des cotisations sociales calculées pour chaque salarié au cours du trimestre. Il accompagne l'état I3.",
    descriptionAr:
      "نموذج I16 — كشف مفصل بالمساهمات الاجتماعية المحسوبة لكل أجير خلال الربع السنة. يرافق كشف إجمالي الأجور I3.",
    categorieFr: "Déclaration des salaires",
    categorieAr: "التصريح بالأجور",
    fichierPdf: "I16.pdf",
    outilHref: "/calculateurs/declarations-cnss",
  },
  {
    code: "I27",
    nomFr: "Déclaration trimestrielle des salaires (régime agricole)",
    nomAr: "التصريح الثلاثي بالأجور (النظام الفلاحي)",
    descriptionFr: "Formulaire I27 — déclaration trimestrielle des salaires pour le régime agricole.",
    descriptionAr: "نموذج I27 — التصريح الثلاثي بالأجور ضمن النظام الفلاحي.",
    categorieFr: "Déclaration des salaires",
    categorieAr: "التصريح بالأجور",
    fichierPdf: "I27.pdf",
  },
  {
    code: "I28",
    nomFr: "État récapitulatif des salaires (secteur agricole)",
    nomAr: "الجدول الجملي للأجور (القطاع الفلاحي)",
    descriptionFr: "Formulaire I28 — état récapitulatif des salaires déclarés pour le secteur agricole.",
    descriptionAr: "نموذج I28 — الجدول الجملي للأجور المصرح بها للقطاع الفلاحي.",
    categorieFr: "Déclaration des salaires",
    categorieAr: "التصريح بالأجور",
    fichierPdf: "I28.pdf",
  },

  // ── Immatriculation ──
  {
    code: "N45",
    nomFr: "Demande d'immatriculation d'un travailleur salarié",
    nomAr: "مطلب ترسيم أجير",
    descriptionFr: "Formulaire N45 — demande d'immatriculation d'un salarié auprès de la CNSS.",
    descriptionAr: "نموذج N45 — مطلب ترسيم أجير بالصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Immatriculation",
    categorieAr: "الترسيم",
    fichierPdf: "N45.pdf",
  },
  {
    code: "P100",
    nomFr: "Demande d'inscription d'ayants droit",
    nomAr: "مطلب تسجيل ذوي الحق",
    descriptionFr: "Formulaire P100 — demande d'inscription des ayants droit (conjoint, enfants) du salarié.",
    descriptionAr: "نموذج P100 — مطلب تسجيل ذوي الحق (الزوج/الزوجة، الأولاد) للأجير.",
    categorieFr: "Immatriculation",
    categorieAr: "الترسيم",
    fichierPdf: "P100.pdf",
  },
  {
    code: "P112",
    nomFr: "Demande d'immatriculation étudiant",
    nomAr: "مطلب ترسيم طالب",
    descriptionFr: "Formulaire P112 — demande d'immatriculation d'un étudiant auprès de la CNSS.",
    descriptionAr: "نموذج P112 — مطلب ترسيم طالب بالصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Immatriculation",
    categorieAr: "الترسيم",
    fichierPdf: "P112.pdf",
  },

  // ── Les Prêts ──
  {
    code: "F56bis",
    nomFr: "Demande de prêt logement",
    nomAr: "مطلب قرض سكن",
    descriptionFr: "Formulaire F 56 bis — demande de prêt logement auprès de la CNSS.",
    descriptionAr: "نموذج F 56 مكرر — مطلب قرض سكن من الصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Les Prêts",
    categorieAr: "القروض",
    fichierPdf: "F 56 bis.pdf",
  },
  {
    code: "F52",
    nomFr: "Demande de prêt universitaire",
    nomAr: "مطلب قرض جامعي",
    descriptionFr: "Formulaire F52 — demande de prêt universitaire auprès de la CNSS.",
    descriptionAr: "نموذج F52 — مطلب قرض جامعي من الصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Les Prêts",
    categorieAr: "القروض",
    fichierPdf: "F52.pdf",
  },

  // ── Pension alimentaire et rente de divorce ──
  {
    code: "P314",
    nomFr: "Demande d'intervention du Fonds de garantie de la pension alimentaire ou de la rente de divorce",
    nomAr: "مطلب تدخل صندوق ضمان النفقة وجراية الطلاق",
    descriptionFr: "Formulaire P314 — demande d'intervention du Fonds de garantie pour la pension alimentaire ou la rente de divorce.",
    descriptionAr: "نموذج P314 — مطلب تدخل صندوق ضمان النفقة وجراية الطلاق.",
    categorieFr: "Pension alimentaire et rente de divorce",
    categorieAr: "جراية النفقة وجراية الطلاق",
    fichierPdf: "P314.pdf",
  },
  {
    code: "P314bis",
    nomFr: "Engagement pour le bénéfice de l'intervention du Fonds de garantie",
    nomAr: "الالتزام للانتفاع بتدخل صندوق ضمان النفقة وجراية الطلاق",
    descriptionFr: "Formulaire P314 bis — engagement pour bénéficier de l'intervention du Fonds de garantie de la pension alimentaire.",
    descriptionAr: "نموذج P314 مكرر — الالتزام للانتفاع بتدخل صندوق ضمان النفقة وجراية الطلاق.",
    categorieFr: "Pension alimentaire et rente de divorce",
    categorieAr: "جراية النفقة وجراية الطلاق",
    fichierPdf: "P314bis.pdf",
  },

  // ── Pensions ──
  {
    code: "A144bisP",
    nomFr: "Demande de pension et capital décès de survivants",
    nomAr: "مطلب جراية ورأس المال للباقين بعد الوفاة",
    descriptionFr: "Formulaire A 144 bis — demande de pension et capital décès pour les survivants.",
    descriptionAr: "نموذج A 144 مكرر — مطلب جراية ورأس المال للباقين بعد الوفاة.",
    categorieFr: "Pensions",
    categorieAr: "الجرايات",
    fichierPdf: "A 144 bis.pdf",
  },
  {
    code: "A144",
    nomFr: "Demande de pension",
    nomAr: "مطلب جراية",
    descriptionFr: "Formulaire A 144 — demande de pension de retraite auprès de la CNSS.",
    descriptionAr: "نموذج A 144 — مطلب جراية من الصندوق الوطني للضمان الاجتماعي.",
    categorieFr: "Pensions",
    categorieAr: "الجرايات",
    fichierPdf: "A 144.pdf",
  },
  {
    code: "N104",
    nomFr: "Déclaration sur l'honneur — jeune fille sans revenu (PTO)",
    nomAr: "تصريح على الشرف — فتاة دون دخل",
    descriptionFr: "Formulaire N 104 — déclaration sur l'honneur pour jeune fille sans revenu (prestation tunisienne à l'étranger).",
    descriptionAr: "نموذج N 104 — تصريح على الشرف لفتاة دون دخل.",
    categorieFr: "Pensions",
    categorieAr: "الجرايات",
    fichierPdf: "N 104.pdf",
  },
  {
    code: "N102",
    nomFr: "Déclaration sur l'honneur — enfant handicapé (PTO)",
    nomAr: "تصريح على الشرف — طفل معوق",
    descriptionFr: "Formulaire N102 — déclaration sur l'honneur pour enfant handicapé (prestation tunisienne à l'étranger).",
    descriptionAr: "نموذج N102 — تصريح على الشرف لطفل معوق.",
    categorieFr: "Pensions",
    categorieAr: "الجرايات",
    fichierPdf: "N102.pdf",
  },

  // ── Régime complémentaire de pensions ──
  {
    code: "RCP",
    nomFr: "Demande d'affiliation employeur au Régime Complémentaire de Retraite",
    nomAr: "مطلب انخراط مؤجّر بالنظام التكميلي للتقاعد",
    descriptionFr: "Demande d'affiliation de l'employeur au Régime Complémentaire de Pensions (RCP).",
    descriptionAr: "مطلب انخراط مؤجّر بالنظام التكميلي للجرايات.",
    categorieFr: "Régime complémentaire de pensions",
    categorieAr: "النظام التكميلي للجرايات",
    fichierPdf: "DEMANDE AFFILIATION AU RCP.pdf",
  },

  // ── Télé déclaration et télépaiement ──
  {
    code: "ADH",
    nomFr: "Adhésion au service de télé déclaration et télépaiement de cotisations",
    nomAr: "مطلب انخراط بمنظومة التصريح بالأجور ودفع المساهمات عن بعد",
    descriptionFr: "Formulaire d'adhésion au service de télé-déclaration et de télépaiement des cotisations sociales.",
    descriptionAr: "مطلب انخراط بمنظومة التصريح بالأجور ودفع المساهمات عن بعد.",
    categorieFr: "Télé déclaration et télépaiement",
    categorieAr: "التصريح والدفع عن بعد",
    fichierPdf: "Adhésion.pdf",
  },
  {
    code: "AUT",
    nomFr: "Autorisation de débit",
    nomAr: "إذن بالاقتطاع من حساب بنكي أو بريدي",
    descriptionFr: "Formulaire d'autorisation de débit automatique depuis un compte bancaire ou postal pour le télépaiement.",
    descriptionAr: "إذن بالاقتطاع التلقائي من حساب بنكي أو بريدي لدفع المساهمات عن بعد.",
    categorieFr: "Télé déclaration et télépaiement",
    categorieAr: "التصريح والدفع عن بعد",
    fichierPdf: "Autorisation.pdf",
  },

  // ═══════════════════════════════════════════════════════════════════
  // ── Outils numériques Le Fiduciaire (génération automatique) ──
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "TXT",
    nomFr: "Fichier d'échange CNSS (Format 122 caractères)",
    nomAr: "ملف التبادل بالصيغة القياسية (122 حرفاً)",
    descriptionFr:
      "Générateur automatique du fichier TXT au format normalisé de 122 caractères par ligne, requis par la CNSS pour le télé-déclaratif. Chaque ligne représente un salarié avec l'ensemble des champs nécessaires au traitement automatisé.",
    descriptionAr:
      "مولّد آلي للملف النصي بالصيغة المعيارية المكونة من 122 حرفاً لكل سطر، مطلوب من الصندوق الوطني للضمان الاجتماعي للتصريح الإلكتروني. كل سطر يمثل أجيراً بجميع الحقول اللازمة للمعالجة الآلية.",
    categorieFr: "Outils numériques Le Fiduciaire",
    categorieAr: "الأدوات الرقمية — الكاتب العدلي",
    outilHref: "/calculateurs/testeur-txt-cnss",
  },
  {
    code: "FN",
    nomFr: "Déclaration Néant (I3 + I16)",
    nomAr: "تصريح بالعدم (كشف إجمالي + كشف مساهمات)",
    descriptionFr:
      "Générateur automatique des documents néant lorsqu'un employeur n'a aucun salarié déclaré au cours d'un trimestre. Comprend un état I3 néant et un bordereau I16 néant, imprimables en PDF calibré. La génération en lot permet de traiter plusieurs employeurs simultanément.",
    descriptionAr:
      "مولّد آلي لوثائق التصريح بالعدم عندما لا يتوفر لصاحب العمل أي أجير مصرح به خلال ربع سنة. يشمل كشفاً إجمالياً بالعدم وكشفاً بالمساهمات بالعدم، قابلين للطباعة بصيغة PDF.",
    categorieFr: "Outils numériques Le Fiduciaire",
    categorieAr: "الأدوات الرقمية — الكاتب العدلي",
    outilHref: "/calculateurs/declarations-neant",
  },
  {
    code: "FP",
    nomFr: "Fiche de Paie Individualisée",
    nomAr: "كشف راتب فردي",
    descriptionFr:
      "Générateur de fiche de paie détaillée pour chaque salarié, incluant les éléments de rémunération brut, les déductions CNSS et IRPP, et le net à payer. Intègre le calcul automatique des avantages exclus (Décret n° 2003-1098). Export PDF avec logo entreprise.",
    descriptionAr:
      "مولّد كشف رواتب مفصل لكل أجير، يشمل عناصر الأجر الخام والخصومات وصافي الراتب المستحق. يتضمن الحساب الآلي للامتيازات المستثناة وفقاً للأمر عدد 2003-1098. قابل للتصدير بصيغة PDF.",
    categorieFr: "Outils numériques Le Fiduciaire",
    categorieAr: "الأدوات الرقمية — الكاتب العدلي",
    outilHref: "/fiche-de-paie",
  },
  {
    code: "RAE",
    nomFr: "Référentiel des Avantages Exclus de l'Assiette CNSS",
    nomAr: "مرجع الامتيازات المستثناة من وعاء المساهمات",
    descriptionFr:
      "Référentiel complet des 24 avantages exclus de l'assiette de calcul des cotisations sociales (Décret n° 2003-1098). Inclut les plafonds en multiples du SMIG avec historique des montants, et un simulateur de conformité point par point.",
    descriptionAr:
      "مرجع شامل للامتيازات الـ 24 المستثناة من وعاء حساب المساهمات الاجتماعية (الأمر عدد 2003-1098). يشمل السقوف بمضاعفات الأجر الأدنى مع تاريخ المبالغ ومحاكي المطابقة.",
    categorieFr: "Outils numériques Le Fiduciaire",
    categorieAr: "الأدوات الرقمية — الكاتب العدلي",
    outilHref: "/referentiel-avantages-exclus",
  },
  {
    code: "IR",
    nomFr: "Calcul de l'Impôt sur le Revenu (IRPP)",
    nomAr: "حساب الضريبة على دخل الأشخاص الطبيعيين",
    descriptionFr:
      "Simulateur d'IRPP annuel selon la législation tunisienne, prenant en compte la situation familiale, les barèmes progressifs et les déductions légales. Permet d'estimer rapidement la charge fiscale d'un salarié.",
    descriptionAr:
      "محاكي للضريبة السنوية على دخل الأشخاص الطبيعيين حسب التشريع التونسي، مع مراعاة الحالة العائلية والسلالم التصاعدية والخصومات القانونية.",
    categorieFr: "Outils numériques Le Fiduciaire",
    categorieAr: "الأدوات الرقمية — الكاتب العدلي",
    outilHref: "/calculateurs/irpp",
  },
  {
    code: "RET",
    nomFr: "Estimation de la Pension de Retraite CNSS",
    nomAr: "تقدير منحة التقاعد",
    descriptionFr:
      "Outil d'estimation de la pension de retraite selon le régime CNSS du secteur privé. Prend en compte l'ancienneté, les salaires déclarés et les coefficients d'actualisation officiels.",
    descriptionAr:
      "أداة لتقدير منحة التقاعد حسب نظام الضمان الاجتماعي للقطاع الخاص. تأخذ بعين الاعتبار الأقدمية والأجور المصرح بها ومعاملات التحديث الرسمية.",
    categorieFr: "Outils numériques Le Fiduciaire",
    categorieAr: "الأدوات الرقمية — الكاتب العدلي",
    outilHref: "/calculateurs/retraite-cnss",
  },
];

const CATEGORIES = [...new Set(FORMULAIRES.map((f) => f.categorieFr))];

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
        f.categorieFr.toLowerCase().includes(q) ||
        f.categorieAr.includes(q)
    );
  }, [recherche]);

  const categoriesFiltrees = useMemo(() => {
    return CATEGORIES.filter((cat) =>
      formulairesFiltres.some((f) => f.categorieFr === cat)
    );
  }, [formulairesFiltres]);

  const categorieArFor = (catFr: string): string => {
    const f = FORMULAIRES.find((f) => f.categorieFr === catFr);
    return f?.categorieAr ?? "";
  };

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
        Découvrez tous les formulaires CNSS avec leurs noms officiels en français et en arabe,
        descriptions détaillées et accès direct aux outils de génération automatique.
      </p>

      {/* ─── Barre de recherche ─── */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher (ex: I3, affiliation, تقاعد, انخراط...)"
          className="pl-10"
        />
      </div>

      {/* ─── Grille de fiches par catégorie ─── */}
      {categoriesFiltrees.map((cat) => {
        const items = formulairesFiltres.filter((f) => f.categorieFr === cat);
        return (
          <section key={cat} className="mb-10">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">{cat}</h2>
              <span dir="rtl" lang="ar" className="text-sm text-muted-foreground">
                {categorieArFor(cat)}
              </span>
            </div>
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
                    <div className="flex items-center justify-center p-5 border-t md:border-t-0 md:border-l border-border">
                      {f.outilHref ? (
                        <Link href={f.outilHref}>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer">
                            Ouvrir
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          PDF
                        </span>
                      )}
                    </div>
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
