/**
 * Convention Collective Cadre (ID=176)
 * الاتفاقية الجماعية الإطارية
 *
 * Approuvée par l'arrêté du ministre des Affaires Sociales du 29 Mai 1973
 * paru au JORT des 25-29 Mai - 1er Juin 1973, page n° 852
 * Signée à Tunis le 20 Mars 1973
 */

import type { ConventionCollective } from "../types";

export const CONVENTION_CADRE: ConventionCollective = {
  sectorId: 176,
  slug: "cadre",
  sectorNameFr: "Convention Collective Cadre",
  sectorNameAr: "الاتفاقية الجماعية الإطارية",
  sourceUrl: "https://paie-tunisie.com/387/fr/176/publications/",

  jortHistory: [
    {
      documentType: "Convention",
      signatureDate: "20/03/1973",
      arreteAgrementDate: "29/05/1973",
      jortReference: "n° des 25-29 Mai - 1er Juin 1973, page 852",
      applicationStart: "29/05/1973",
    },
  ],

  primesIndemnites: [
    // Primes mensuelles — Convention Cadre
    {
      frequency: "Mensuelle",
      name: "Indemnité de transport",
      description:
        "Servie à tous les cadres. Montant fixé par décret. À partir du 01/01/2026 : 112,323 dinars, 01/01/2027 : 117,939 dinars, 01/01/2028 : 123,935 dinars",
      montant: null,
      dateEffet: "01/01/2026",
    },
    {
      frequency: "Mensuelle",
      name: "Indemnité de panier",
      description:
        "Servie aux cadres effectuant des heures supplémentaires ou travaillant dans des conditions particulières",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Mensuelle",
      name: "Prime de responsabilité",
      description:
        "Accordée aux cadres occupant des fonctions de direction ou d'encadrement. Montant variable selon le niveau hiérarchique",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Mensuelle",
      name: "Prime de technicité",
      description:
        "Accordée aux cadres techniques justifiant d'une qualification professionnelle supérieure",
      montant: null,
      dateEffet: null,
    },
    // Primes annuelles
    {
      frequency: "Annuelle",
      name: "Prime de fin d'année",
      description:
        "Fixée au salaire de base d'un mois (13ème mois). Servie en fin d'année ou au moment du départ du salarié",
      montant: null,
      dateEffet: null,
    },
    {
      frequency: "Annuelle",
      name: "Prime de rendement",
      description:
        "Variable selon la performance individuelle et les résultats de l'entreprise. Peut atteindre 100% du salaire de base",
      montant: null,
      dateEffet: null,
    },
    // Primes sociales
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
      name: "Indemnité de mise en retraite",
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

  categoriesSalariales: [], // Pas de grille spécifique dans l'extraction actuelle

  grillesSalariales: [], // Grilles salariales à compléter via OCR des PDFs

  allowances: [], // Allowances à extraire des PDFs

  pdfDocuments: [],

  resume:
    "CONVENTION COLLECTIVE CADRE — Approuvée par l'arrêté du ministre des Affaires Sociales du 29 Mai 1973, parue au JORT des 25-29 Mai - 1er Juin 1973, page n° 852. Signée à Tunis le 20 Mars 1973 par MM. Habib ACHOUR et FERJANI BEL HADJ AMMAR respectivement Secrétaire général de l'Union Générale Tunisienne du Travail et Président de l'Union Tunisienne de l'Industrie, du Commerce et de l'Artisanat. Cette convention fixe les conditions d'emploi et de travail des cadres ainsi que les droits et obligations des parties.",

  engineStatus: "partial",

  categoriesAgents: [
    { code: "CADRES", labelFr: "Cadres", labelAr: "الإطارات" },
    {
      code: "CADRES_SUPERIEURS",
      labelFr: "Cadres supérieurs",
      labelAr: "الإطارات الأعلى",
    },
  ],

  primesMensuelles: [
    {
      code: "TRANSPORT",
      labelFr: "Indemnité de transport",
      labelAr: "منحة النقل",
      montants: {
        CADRES: { "2024": 106.975, "2026": 112.323, "2027": 117.939, "2028": 123.935 },
      },
      description: "Servie à tous les cadres",
    },
    {
      code: "PANIER",
      labelFr: "Indemnité de panier",
      labelAr: "منحة السلة",
      montants: {},
      description: "Conditions particulières de travail",
    },
    {
      code: "RESPONSABILITE",
      labelFr: "Prime de responsabilité",
      labelAr: "منحة المسؤولية",
      montants: {},
      description: "Fonctions de direction ou d'encadrement",
    },
  ],

  primesAnnuelles: [
    {
      code: "FIN_ANNEE",
      labelFr: "Prime de fin d'année",
      labelAr: "منحة نهاية السنة",
      description: "Salaire de base d'un mois (13ème mois)",
      modeCalcul: "pourcentage_salaire",
    },
    {
      code: "RENDEMENT",
      labelFr: "Prime de rendement",
      labelAr: "منحة الأداء",
      description: "Variable selon performance individuelle",
      modeCalcul: "note_dependante",
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
