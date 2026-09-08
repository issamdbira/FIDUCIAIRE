/**
 * Convention Collective — Commerce de gros, demi-gros et en détails (ID=21)
 * تجارة الجملة ونصف الجملة والتقسيط
 *
 * Convention signée le 08/04/1976
 * 9 avenants (dernier : Avenant n°9 du 28/01/2009)
 */

import type { ConventionCollective } from "../types";

export const CONVENTION_COMMERCE_GROS: ConventionCollective = {
  sectorId: 21,
  slug: "commerce-gros",
  sectorNameFr: "Commerce de gros, demi-gros et en détails",
  sectorNameAr: "تجارة الجملة ونصف الجملة والتقسيط",
  sourceUrl: "https://paie-tunisie.com/387/fr/21/publications/",

  jortHistory: [
    {
      documentType: "Convention",
      signatureDate: "08/04/1976",
      arreteAgrementDate: "23/07/1976",
      jortReference: "n°48 des 30/07 et 03/08/1976",
      applicationStart: "23/07/1976",
    },
    {
      documentType: "Avenant n°1",
      signatureDate: "16/03/1983",
      arreteAgrementDate: "28/04/1983",
      jortReference: "n°44 du 14/06/1983",
      applicationStart: "28/04/1983",
    },
    {
      documentType: "Avenant n°2",
      signatureDate: "22/02/1989",
      arreteAgrementDate: "17/03/1989",
      jortReference: "n°22 du 28/03/1989",
      applicationStart: "17/03/1989",
    },
    {
      documentType: "Avenant n°3",
      signatureDate: "02/07/1991",
      arreteAgrementDate: "27/07/1991",
      jortReference: "n°55 du 06/08/1991",
      applicationStart: "27/07/1991",
    },
    {
      documentType: "Avenant n°4",
      signatureDate: "12/08/1993",
      arreteAgrementDate: "07/09/1993",
      jortReference: "n°69 du 14/09/1993",
      applicationStart: "07/09/1993",
    },
    {
      documentType: "Avenant n°5",
      signatureDate: "23/07/1996",
      arreteAgrementDate: "24/07/1996",
      jortReference: "n°60 du 26/07/1996 (VO)",
      applicationStart: "24/07/1996",
    },
    {
      documentType: "Avenant n°6",
      signatureDate: "30/06/1999",
      arreteAgrementDate: "14/07/1999",
      jortReference: "n°59 du 23/07/1999 (VO)",
      applicationStart: "14/07/1999",
    },
    {
      documentType: "Avenant n°7",
      signatureDate: "14/11/2002",
      arreteAgrementDate: "25/11/2002",
      jortReference: "n°100 du 10/12/2002 (VO)",
      applicationStart: "25/11/2002",
    },
    {
      documentType: "Avenant n°8",
      signatureDate: "29/12/2005",
      arreteAgrementDate: "17/01/2006",
      jortReference: "n°8 du 27/01/2006 (VO)",
      applicationStart: "17/01/2006",
    },
    {
      documentType: "Avenant n°9",
      signatureDate: "28/01/2009",
      arreteAgrementDate: "17/02/2009",
      jortReference: "n°16 du 24/02/2009 (VO)",
      applicationStart: "17/02/2009",
    },
  ],

  primesIndemnites: [
    // ── Mensuelles ──
    {
      frequency: "Mensuelle",
      name: "Indemnité de transport",
      description:
        "Incluant 5D/mois pour l'exécution et 10D/mois pour les cadres (décret 503/1982). Exécution : 65,826D (01/12/2021), 70,269D (01/12/2023), 75,012D (2024), 78,762D (01/01/2026), 82,700D (01/01/2027), 86,835D (01/01/2028). Cadres : 72,612D (01/12/2021), 77,514D (01/01/2023), 82,746D (2024), 86,883D (01/01/2026), 91,227D (01/01/2027), 95,788D (01/01/2028)",
      montant: null,
      dateEffet: "01/01/2026",
    },
    {
      frequency: "Mensuelle",
      name: "Prime de présence",
      description:
        "12,400D/mois (2021), 13,237D/mois (2023), 14,130D/mois (2024). 01/01/2026 : 14,836D, 01/01/2027 : 15,578D, 01/01/2028 : 16,357D",
      montant: 14.836,
      dateEffet: "01/01/2026",
    },
    {
      frequency: "Mensuelle",
      name: "Prime de caisse",
      description:
        "Ancienneté < 5 ans = 5D/mois, 5 < Ancienneté < 10 ans = 10D/mois, Ancienneté > 10 ans = 15D/mois",
      montant: null,
      dateEffet: null,
    },
    // ── Annuelles ──
    {
      frequency: "Annuelle",
      name: "Note professionnelle",
      description:
        "De 0 à 10/20, 10 à 13/20, 13 à 16/20, 16 à 18/20, 18 à 20/20",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Annuelle",
      name: "Prime de productivité",
      description:
        "50% de la prime (salaire 0,5 mois), 60%, 75%, 90%, Salaire d'un mois — selon la note professionnelle",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Annuelle",
      name: "Prime de fin d'année",
      description:
        "Servie à la fin de l'année, fixée au salaire de base de 0,5 mois",
      montant: null,
      dateEffet: null,
    },
    // ── Frais employeur ──
    {
      frequency: "Frais employeur",
      name: "Frais des vêtements de travail",
      description: "L'employeur assure l'achat de ces vêtements à sa charge",
      montant: null,
      dateEffet: null,
    },
    // ── Sociales ──
    {
      frequency: "Sociale",
      name: "Indemnité de scolarité",
      description:
        "Enseignement de base : 20D/élève, Enseignement secondaire : 30D/élève, Enseignement supérieur : 40D/étudiant",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Sociale",
      name: "Indemnité de la mise en retraite",
      description:
        "Accordée au salarié partant à la retraite, fixée au salaire de 4 mois",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Sociale",
      name: "Assistance décès",
      description:
        "150 dinars en cas du décès du salarié (octroyée à la famille du défunt). 100 dinars en cas du décès du père, de la mère, du conjoint ou d'un enfant",
      montant: 150,
      dateEffet: null,
    },
  ],

  categoriesSalariales: [],

  grillesSalariales: [],

  allowances: [],

  pdfDocuments: [
    {
      text: "Cliquez ici pour charger le document",
      url: "https://paie-tunisie.com/docs/relatedInfo/arrete2022-3802arabe-21.pdf",
    },
  ],

  resume:
    "Commerce de gros, demi-gros et en détails — Convention collective signée le 08/04/1976, 9 avenants. Primes mensuelles : indemnité de transport (différenciée exécution/cadres), prime de présence, prime de caisse. Primes annuelles : note professionnelle, prime de productivité, prime de fin d'année (0,5 mois). Avantages sociaux : scolarité, retraite, décès.",

  engineStatus: "partial",

  categoriesAgents: [
    { code: "EXECUTION", labelFr: "Agents d'exécution", labelAr: "أعوان التنفيذ" },
    { code: "MAITRISE", labelFr: "Maîtrise", labelAr: "أعوان التسيير" },
    { code: "CADRES", labelFr: "Cadres", labelAr: "الإطارات" },
  ],

  primesMensuelles: [
    {
      code: "TRANSPORT",
      labelFr: "Indemnité de transport",
      labelAr: "منحة النقل",
      montants: {
        EXECUTION: {
          "2021": 65.826,
          "2023": 70.269,
          "2024": 75.012,
          "2026": 78.762,
          "2027": 82.7,
          "2028": 86.835,
        },
        CADRES: {
          "2021": 72.612,
          "2023": 77.514,
          "2024": 82.746,
          "2026": 86.883,
          "2027": 91.227,
          "2028": 95.788,
        },
      },
      description:
        "Incluant 5D/mois (exécution) et 10D/mois (cadres) — décret 503/1982",
    },
    {
      code: "PRESENCE",
      labelFr: "Prime de présence",
      labelAr: "منحة الحضور",
      montants: {
        EXECUTION: { "2021": 12.4, "2023": 13.237, "2024": 14.13, "2026": 14.836, "2027": 15.578, "2028": 16.357 },
        MAITRISE: { "2021": 12.4, "2023": 13.237, "2024": 14.13, "2026": 14.836, "2027": 15.578, "2028": 16.357 },
        CADRES: { "2021": 12.4, "2023": 13.237, "2024": 14.13, "2026": 14.836, "2027": 15.578, "2028": 16.357 },
      },
      description: "Même montant pour toutes les catégories",
    },
    {
      code: "CAISSE",
      labelFr: "Prime de caisse",
      labelAr: "منحة الصندوق",
      montants: {
        EXECUTION: { "default": 5 },
        MAITRISE: { "default": 10 },
        CADRES: { "default": 15 },
      },
      description: "Selon ancienneté : <5ans=5D, 5-10ans=10D, >10ans=15D",
    },
  ],

  primesAnnuelles: [
    {
      code: "NOTE_PROFESSIONNELLE",
      labelFr: "Note professionnelle",
      labelAr: "الرتبة المهنية",
      description: "De 0 à 10/20, 10 à 13/20, 13 à 16/20, 16 à 18/20, 18 à 20/20",
      modeCalcul: "note_dependante",
    },
    {
      code: "PRODUCTIVITE",
      labelFr: "Prime de productivité",
      labelAr: "منحة الإنتاجية",
      description:
        "50% (0,5 mois) → 60% → 75% → 90% → Salaire d'un mois — selon la note professionnelle",
      modeCalcul: "note_dependante",
    },
    {
      code: "FIN_ANNEE",
      labelFr: "Prime de fin d'année",
      labelAr: "منحة نهاية السنة",
      description: "0,5 mois de salaire de base",
      modeCalcul: "pourcentage_salaire",
    },
  ],

  primesSociales: [
    {
      code: "SCOLARITE",
      labelFr: "Indemnité de scolarité",
      labelAr: "منحة التمدرس",
      description: "Base: 20D, Secondaire: 30D, Supérieur: 40D",
    },
    {
      code: "RETRAITE",
      labelFr: "Indemnité de mise en retraite",
      labelAr: "منحة الإحالة على التقاعد",
      description: "4 mois de salaire",
    },
    {
      code: "DECES",
      labelFr: "Assistance décès",
      labelAr: "إعانة الوفاة",
      description: "150 DT (salarié), 100 DT (famille)",
      montant: 150,
    },
  ],
};
