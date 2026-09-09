/**
 * Convention Collective — Commerce de gros, demi-gros et en détails (ID=21)
 * تجارة الجملة ونصف الجملة والتقسيط
 *
 * Toutes les données proviennent de secteurs_donnees.json (secteur[3])
 * Aucun montant inventé.
 */

import type { ConventionCollective } from "../types";

export const CONVENTION_COMMERCE_GROS: ConventionCollective = {
  sectorId: 21,
  slug: "commerce-gros",
  sectorNameFr: "Commerce de gros, demi-gros et en détails",
  sectorNameAr: "تجارة الجملة ونصف الجملة والتقسيط",
  sourceUrl: "https://paie-tunisie.com/387/fr/21/publications/commerce-de-gros-demi-gros-et-en-details",

  jortHistory: [
    { documentType: "Convention", signatureDate: "08/04/1976", arreteAgrementDate: "23/07/1976", jortReference: "n°48 des 30/07 et 03/08/1976", applicationStart: "23/07/1976" },
    { documentType: "Avenant n°1", signatureDate: "16/03/1983", arreteAgrementDate: "28/04/1983", jortReference: "n°44 du 14/06/1983", applicationStart: "28/04/1983" },
    { documentType: "Avenant n°2", signatureDate: "22/02/1989", arreteAgrementDate: "17/03/1989", jortReference: "n°22 du 28/03/1989", applicationStart: "17/03/1989" },
    { documentType: "Avenant n°3", signatureDate: "02/07/1991", arreteAgrementDate: "27/07/1991", jortReference: "n°55 du 06/08/1991", applicationStart: "27/07/1991" },
    { documentType: "Avenant n°4", signatureDate: "12/08/1993", arreteAgrementDate: "07/09/1993", jortReference: "n°69 du 14/09/1993", applicationStart: "07/09/1993" },
    { documentType: "Avenant n°5", signatureDate: "23/07/1996", arreteAgrementDate: "24/07/1996", jortReference: "n°60 du 26/07/1996 (VO)", applicationStart: "24/07/1996" },
    { documentType: "Avenant n°6", signatureDate: "30/06/1999", arreteAgrementDate: "14/07/1999", jortReference: "n°59 du 23/07/1999 (VO)", applicationStart: "14/07/1999" },
    { documentType: "Avenant n°7", signatureDate: "14/11/2002", arreteAgrementDate: "25/11/2002", jortReference: "n°100 du 10/12/2002 (VO)", applicationStart: "25/11/2002" },
    { documentType: "Avenant n°8", signatureDate: "29/12/2005", arreteAgrementDate: "17/01/2006", jortReference: "n°8 du 27/01/2006 (VO)", applicationStart: "17/01/2006" },
    { documentType: "Avenant n°9", signatureDate: "28/01/2009", arreteAgrementDate: "17/02/2009", jortReference: "n°16 du 24/02/2009 (VO)", applicationStart: "17/02/2009" },
  ],

  primesIndemnites: [
    // ── Mensuelles ──
    {
      frequency: "Mensuelle",
      name: "Indemnité de transport",
      description: "Inclut décret 503/1982 : 5D/mois (exécution), 10D/mois (cadres). Voir tableau par catégorie.",
      montant: null,
      dateEffet: "2021-12-01",
    },
    {
      frequency: "Mensuelle",
      name: "Prime de présence",
      description: "Montant unique, non différencié cadre/exécution.",
      montant: null,
      dateEffet: "2021-01-01",
    },
    {
      frequency: "Mensuelle",
      name: "Prime de caisse",
      description: "Selon ancienneté : < 5 ans = 5D, 5 à 10 ans = 10D, > 10 ans = 15D",
      montant: null,
      dateEffet: null,
    },
    // ── Annuelles ──
    {
      frequency: "Annuelle",
      name: "Prime de productivité",
      description: "Selon note professionnelle : 0-10/20 → 50% (0,5 mois), 10-13 → 60%, 13-16 → 75%, 16-18 → 90%, 18-20 → 1 mois. Non accordée si sanction 2ème degré.",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Annuelle",
      name: "Prime de fin d'année",
      description: "0,5 mois de salaire de base",
      montant: null,
      dateEffet: null,
    },
    // ── Frais employeur ──
    {
      frequency: "Frais employeur",
      name: "Vêtements de travail",
      description: "Achat entièrement à la charge de l'employeur",
      montant: null,
      dateEffet: null,
    },
    // ── Sociales ──
    {
      frequency: "Sociale",
      name: "Indemnité de scolarité",
      description: "Enseignement de base : 20D/élève, Secondaire : 30D/élève, Supérieur : 40D/étudiant",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Sociale",
      name: "Indemnité de mise en retraite",
      description: "4 mois de salaire",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Sociale",
      name: "Assistance décès",
      description: "150D (décès salarié → famille), 100D (décès père/mère → salarié)",
      montant: 150,
      dateEffet: null,
    },
  ],

  categoriesSalariales: [],

  grillesSalariales: [
    { tableNum: 1, applicationDate: "2021", note: "Employés / ouvriers" },
    { tableNum: 2, applicationDate: "2021", note: "Employés / ouvriers (suite)" },
    { tableNum: 3, applicationDate: "2021", note: "Agents de maîtrise" },
    { tableNum: 4, applicationDate: "2021", note: "Cadres" },
    { tableNum: 5, applicationDate: "2021", note: "Cadres (suite)" },
    { tableNum: 6, applicationDate: "2021", note: "Cadres supérieurs" },
  ],

  /** Grille salariale détaillée — DONNÉES RÉELLES (source: PAIE-TUNISIE + arrêtés officiels) */
  grilleDetaillee: [
    // ── Employés / Ouvriers (Agents d'exécution) — 8 échelons ──
    { categorieCode: "EXECUTION", echelon: 1, montants: { "2021": 432.168, "2023": 461.512, "2024": 492.816, "2026": 528.32, "2027": 554.736, "2028": 582.4 } },
    { categorieCode: "EXECUTION", echelon: 2, montants: { "2021": 442.728, "2023": 472.808, "2024": 504.856, "2026": 541.248, "2027": 568.312, "2028": 596.696 } },
    { categorieCode: "EXECUTION", echelon: 3, montants: { "2021": 453.288, "2023": 484.104, "2024": 516.896, "2026": 554.176, "2027": 581.888, "2028": 610.992 } },
    { categorieCode: "EXECUTION", echelon: 4, montants: { "2021": 463.848, "2023": 495.4, "2024": 528.936, "2026": 567.104, "2027": 595.464, "2028": 625.288 } },
    { categorieCode: "EXECUTION", echelon: 5, montants: { "2021": 474.408, "2023": 506.696, "2024": 540.976, "2026": 580.032, "2027": 609.04, "2028": 639.584 } },
    { categorieCode: "EXECUTION", echelon: 6, montants: { "2021": 484.968, "2023": 517.992, "2024": 553.016, "2026": 592.96, "2027": 622.616, "2028": 653.88 } },
    { categorieCode: "EXECUTION", echelon: 7, montants: { "2021": 495.528, "2023": 529.288, "2024": 565.056, "2026": 605.888, "2027": 636.192, "2028": 668.176 } },
    { categorieCode: "EXECUTION", echelon: 8, montants: { "2021": 506.088, "2023": 540.584, "2024": 577.096, "2026": 618.816, "2027": 649.768, "2028": 682.472 } },
    // ── Agents de maîtrise — 8 échelons ──
    { categorieCode: "MAITRISE", echelon: 1, montants: { "2021": 540.584, "2023": 577.304, "2024": 616.368, "2026": 660.816, "2027": 693.856, "2028": 728.544 } },
    { categorieCode: "MAITRISE", echelon: 2, montants: { "2021": 553.768, "2023": 591.392, "2024": 631.416, "2026": 676.952, "2027": 710.8, "2028": 746.34 } },
    { categorieCode: "MAITRISE", echelon: 3, montants: { "2021": 566.952, "2023": 605.48, "2024": 646.464, "2026": 693.088, "2027": 727.744, "2028": 764.136 } },
    { categorieCode: "MAITRISE", echelon: 4, montants: { "2021": 580.136, "2023": 619.568, "2024": 661.512, "2026": 709.224, "2027": 744.688, "2028": 781.932 } },
    { categorieCode: "MAITRISE", echelon: 5, montants: { "2021": 593.32, "2023": 633.656, "2024": 676.56, "2026": 725.36, "2027": 761.632, "2028": 799.728 } },
    { categorieCode: "MAITRISE", echelon: 6, montants: { "2021": 606.504, "2023": 647.744, "2024": 691.608, "2026": 741.496, "2027": 778.576, "2028": 817.524 } },
    { categorieCode: "MAITRISE", echelon: 7, montants: { "2021": 619.688, "2023": 661.832, "2024": 706.656, "2026": 757.632, "2027": 795.52, "2028": 835.32 } },
    { categorieCode: "MAITRISE", echelon: 8, montants: { "2021": 632.872, "2023": 675.92, "2024": 721.704, "2026": 773.768, "2027": 812.464, "2028": 853.116 } },
    // ── Cadres — 8 échelons ──
    { categorieCode: "CADRES", echelon: 1, montants: { "2021": 675.92, "2023": 721.704, "2024": 770.624, "2026": 825.768, "2027": 867.056, "2028": 910.408 } },
    { categorieCode: "CADRES", echelon: 2, montants: { "2021": 692.48, "2023": 739.392, "2024": 789.52, "2026": 846.016, "2027": 888.32, "2028": 932.736 } },
    { categorieCode: "CADRES", echelon: 3, montants: { "2021": 709.04, "2023": 757.08, "2024": 808.416, "2026": 866.264, "2027": 909.584, "2028": 955.064 } },
    { categorieCode: "CADRES", echelon: 4, montants: { "2021": 725.6, "2023": 774.768, "2024": 827.312, "2026": 886.512, "2027": 930.848, "2028": 977.392 } },
    { categorieCode: "CADRES", echelon: 5, montants: { "2021": 742.16, "2023": 792.456, "2024": 846.208, "2026": 906.76, "2027": 952.112, "2028": 999.72 } },
    { categorieCode: "CADRES", echelon: 6, montants: { "2021": 758.72, "2023": 810.144, "2024": 865.104, "2026": 927.008, "2027": 973.376, "2028": 1022.048 } },
    { categorieCode: "CADRES", echelon: 7, montants: { "2021": 775.28, "2023": 827.832, "2024": 884, "2026": 947.256, "2027": 994.64, "2028": 1044.376 } },
    { categorieCode: "CADRES", echelon: 8, montants: { "2021": 791.84, "2023": 845.52, "2024": 902.896, "2026": 967.504, "2027": 1015.904, "2028": 1066.704 } },
  ],

  allowances: [],

  pdfDocuments: [
    { text: "Grilles salariales (PDF officiel)", url: "https://paie-tunisie.com/docs/relatedInfo/arrete2023-714arabe-76.pdf" },
  ],

  resume:
    "Commerce de gros, demi-gros et en détails — 3 primes mensuelles (transport, présence, caisse), " +
    "2 primes annuelles (productivité selon note, fin d'année 0,5 mois), " +
    "3 avantages sociaux (scolarité, retraite 4 mois, décès). " +
    "6 grilles salariales (Employés, Maîtrise, Cadres, Cadres supérieurs) — années 2021/2023/2024.",

  engineStatus: "partial",

  categoriesAgents: [
    { code: "EXECUTION", labelFr: "Agents d'exécution", labelAr: "أعوان التنفيذ" },
    { code: "MAITRISE", labelFr: "Agents de maîtrise", labelAr: "أعوان التسيير" },
    { code: "CADRES", labelFr: "Cadres", labelAr: "الإطارات" },
  ],

  /** Primes mensuelles structurées — DONNÉES RÉELLES de secteurs_donnees.json */
  primesMensuelles: [
    {
      code: "TRANSPORT",
      labelFr: "Indemnité de transport",
      labelAr: "منحة النقل",
      montants: {
        EXECUTION: { "2021": 65.826, "2023": 70.269, "2024": 75.012, "2026": 78.762, "2027": 82.7, "2028": 86.835 },
        MAITRISE:  { "2021": 69.219, "2023": 73.892, "2024": 78.879, "2026": 82.823, "2027": 86.964, "2028": 91.312 },
        CADRES:    { "2021": 72.612, "2023": 77.514, "2024": 82.746, "2026": 86.883, "2027": 91.227, "2028": 95.788 },
      },
      description: "Inclut décret 503/1982 : 5D/mois (exécution), 10D/mois (cadres)",
    },
    {
      code: "PRESENCE",
      labelFr: "Prime de présence",
      labelAr: "منحة الحضور",
      montants: {
        EXECUTION: { "2021": 12.4, "2023": 13.237, "2024": 14.13, "2026": 14.836, "2027": 15.578, "2028": 16.357 },
        MAITRISE:  { "2021": 12.4, "2023": 13.237, "2024": 14.13, "2026": 14.836, "2027": 15.578, "2028": 16.357 },
        CADRES:    { "2021": 12.4, "2023": 13.237, "2024": 14.13, "2026": 14.836, "2027": 15.578, "2028": 16.357 },
      },
      description: "Montant unique, non différencié par catégorie",
    },
    {
      code: "CAISSE",
      labelFr: "Prime de caisse",
      labelAr: "منحة الصندوق",
      montants: {
        EXECUTION: { "default": 5 },
        MAITRISE:  { "default": 10 },
        CADRES:    { "default": 10 },
      },
      description: "Selon ancienneté : <5ans=5D, 5-10ans=10D, >10ans=15D",
    },
  ],

  primesAnnuelles: [
    {
      code: "PRODUCTIVITE",
      labelFr: "Prime de productivité",
      labelAr: "منحة الإنتاجية",
      description: "0-10/20→50%, 10-13→60%, 13-16→75%, 16-18→90%, 18-20→1 mois. Non accordée si sanction 2ème degré.",
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
      description: "150D (salarié), 100D (famille)",
      montant: 150,
    },
  ],
};
