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
    { code: "EXECUTION", labelFr: "Agents d'exécution + Maîtrise", labelAr: "أعوان التنفيذ والتسيير" },
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
        CADRES:    { "2021": 12.4, "2023": 13.237, "2024": 14.13, "2026": 14.836, "2027": 15.578, "2028": 16.357 },
      },
      description: "Montant unique, non différencié cadre/exécution",
    },
    {
      code: "CAISSE",
      labelFr: "Prime de caisse",
      labelAr: "منحة الصندوق",
      montants: {
        EXECUTION: { "default": 5 },
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
