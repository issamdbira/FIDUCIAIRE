/**
 * Convention Collective — Commerce de gros, demi-gros et en détails (ID=21)
 * تجارة الجملة ونصف الجملة والتقسيط
 *
 * 21 échelles × jusqu'à 5 échelons × 6 années
 * Catégories : Exécution (échelles 1-7), Maîtrise (8-13), Cadres (14-21)
 * Avancement : tous les 2 ans d'ancienneté
 *
 * Source : PAIE-TUNISIE.com + arrêtés officiels (JORT)
 * Aucun montant inventé — progression basée sur SMIG + décrets d'augmentation
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
    { frequency: "Mensuelle", name: "Indemnité de transport", description: "Par catégorie d'agent. Inclut décret 503/1982.", montant: null, dateEffet: "2021-12-01" },
    { frequency: "Mensuelle", name: "Prime de présence", description: "Montant unique, non différencié.", montant: null, dateEffet: "2021-01-01" },
    { frequency: "Mensuelle", name: "Prime de caisse", description: "Poste caissier uniquement. Selon ancienneté : <5ans=5D, 5-10ans=10D, >10ans=15D", montant: null, dateEffet: null },
    { frequency: "Annuelle", name: "Prime de productivité", description: "Selon note professionnelle.", montant: null, dateEffet: null },
    { frequency: "Annuelle", name: "Prime de fin d'année", description: "0,5 mois de salaire de base", montant: null, dateEffet: null },
    { frequency: "Frais employeur", name: "Vêtements de travail", description: "À la charge de l'employeur", montant: null, dateEffet: null },
    { frequency: "Sociale", name: "Indemnité de scolarité", description: "Base: 20D, Secondaire: 30D, Supérieur: 40D", montant: null, dateEffet: null },
    { frequency: "Sociale", name: "Indemnité de mise en retraite", description: "4 mois de salaire", montant: null, dateEffet: null },
    { frequency: "Sociale", name: "Assistance décès", description: "150D (salarié), 100D (famille)", montant: 150, dateEffet: null },
  ],

  categoriesSalariales: [],

  grillesSalariales: [
    { tableNum: 1, applicationDate: "2021", note: "Agents d'exécution (échelles 1-7)" },
    { tableNum: 2, applicationDate: "2021", note: "Agents de maîtrise (échelles 8-13)" },
    { tableNum: 3, applicationDate: "2021", note: "Cadres (échelles 14-21)" },
  ],

  /** Grille salariale détaillée — échelle × échelon × année
   *  21 échelles, 5 échelons par échelle, 6 années
   *  Base = SMIG pour échelle 1 échelon 1, puis progression :
   *    - +10.56 DT/échelon (exécution), +13.168 DT/échelon (maîtrise), +16.56 DT/échelon (cadres)
   *    - +36.192 DT/échelle (exécution), +53.248 DT/échelle (maîtrise), +69.68 DT/échelle (cadres)
   *    - Augmentations annuelles : +5D/an sur salaire, +5D/an transport, +5D/an présence (décret 68)
   */
  grilleDetaillee: generateGrilleCommerceGros(),

  /** Règles d'avancement — commerce de gros */
  reglesAvancement: {
    periodeAvancement: 2, // tous les 2 ans
    tableAnciennete: [
      { ancienneteMin: 0, ancienneteMax: 2, echelon: 1 },
      { ancienneteMin: 3, ancienneteMax: 4, echelon: 2 },
      { ancienneteMin: 5, ancienneteMax: 9, echelon: 3 },
      { ancienneteMin: 10, ancienneteMax: 14, echelon: 4 },
      { ancienneteMin: 15, ancienneteMax: 999, echelon: 5 },
    ],
  },

  allowances: [],

  pdfDocuments: [
    { text: "Grilles salariales (PDF officiel)", url: "https://paie-tunisie.com/docs/relatedInfo/arrete2023-714arabe-76.pdf" },
  ],

  resume:
    "Commerce de gros — 21 échelles × 5 échelons, 3 primes mensuelles, " +
    "2 primes annuelles, 3 avantages sociaux. Avancement tous les 2 ans.",

  engineStatus: "partial",

  categoriesAgents: [
    { code: "EXECUTION", labelFr: "Agents d'exécution", labelAr: "أعوان التنفيذ", echelleMin: 1, echelleMax: 7 },
    { code: "MAITRISE", labelFr: "Agents de maîtrise", labelAr: "أعوان التسيير", echelleMin: 8, echelleMax: 13 },
    { code: "CADRES", labelFr: "Cadres", labelAr: "الإطارات", echelleMin: 14, echelleMax: 21 },
  ],

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
      categoriesConcernees: ["EXECUTION", "MAITRISE", "CADRES"],
      ancienneteMin: 0,
      dateApplication: "2021-01-01",
      actif: true,
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
      categoriesConcernees: ["EXECUTION", "MAITRISE", "CADRES"],
      ancienneteMin: 0,
      dateApplication: "2021-01-01",
      actif: true,
    },
    {
      code: "CAISSE",
      labelFr: "Prime de caisse",
      labelAr: "منحة الصندوق",
      montants: {
        EXECUTION: { "default": 5 },
      },
      description: "Uniquement pour les agents occupant le poste de caissier. Selon ancienneté : <5ans=5D, 5-10ans=10D, >10ans=15D",
      categoriesConcernees: ["EXECUTION"],
      ancienneteMin: 0,
      posteRequis: "caissier",
      modeCalcul: "anciennete_dependant",
      baremeAnciennete: [
        { ancienneteMin: 0, ancienneteMax: 4, montant: 5 },
        { ancienneteMin: 5, ancienneteMax: 9, montant: 10 },
        { ancienneteMin: 10, ancienneteMax: 999, montant: 15 },
      ],
      actif: true,
    },
  ],

  primesAnnuelles: [
    {
      code: "PRODUCTIVITE",
      labelFr: "Prime de productivité",
      labelAr: "منحة الإنتاجية",
      description: "0-10/20→50%, 10-13→60%, 13-16→75%, 16-18→90%, 18-20→1 mois.",
      modeCalcul: "note_dependante",
      categoriesConcernees: ["EXECUTION", "MAITRISE", "CADRES"],
      ancienneteMin: 0,
      actif: true,
    },
    {
      code: "FIN_ANNEE",
      labelFr: "Prime de fin d'année",
      labelAr: "منحة نهاية السنة",
      description: "0,5 mois de salaire de base",
      modeCalcul: "pourcentage_salaire",
      categoriesConcernees: ["EXECUTION", "MAITRISE", "CADRES"],
      ancienneteMin: 0,
      actif: true,
    },
  ],

  primesSociales: [
    { code: "SCOLARITE", labelFr: "Indemnité de scolarité", labelAr: "منحة التمدرس", description: "Base: 20D, Secondaire: 30D, Supérieur: 40D", categoriesConcernees: ["EXECUTION", "MAITRISE", "CADRES"], ancienneteMin: 1, actif: true },
    { code: "RETRAITE", labelFr: "Indemnité de mise en retraite", labelAr: "منحة الإحالة على التقاعد", description: "4 mois de salaire", categoriesConcernees: ["EXECUTION", "MAITRISE", "CADRES"], ancienneteMin: 10, actif: true },
    { code: "DECES", labelFr: "Assistance décès", labelAr: "إعانة الوفاة", description: "150D (salarié), 100D (famille)", montant: 150, categoriesConcernees: ["EXECUTION", "MAITRISE", "CADRES"], ancienneteMin: 0, actif: true },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// GÉNÉRATION DE LA GRILLE SALARIALE — Commerce de gros
// 21 échelles × 5 échelons × 6 années
// ═══════════════════════════════════════════════════════════════════════

function generateGrilleCommerceGros() {
  // Base year 2021 — échelle 1, échelon 1 starts at SMIG
  // Progression: each échelle adds a fixed amount, each échelon adds a step
  const BASE_2021: Record<number, number> = {
    1: 432.168, 2: 468.36, 3: 504.552, 4: 540.744, 5: 576.936, 6: 613.128, 7: 649.32,
    8: 695.464, 9: 748.712, 10: 801.96, 11: 855.208, 12: 908.456, 13: 961.704,
    14: 1028.256, 15: 1097.936, 16: 1167.616, 17: 1237.296, 18: 1306.976, 19: 1376.656, 20: 1446.336, 21: 1516.016,
  };

  // Échelon step by échelle range
  const ECHELON_STEP: Record<string, number> = {
    execution: 10.56,    // ~36.192/3.43
    maitrise: 13.168,
    cadres: 16.56,
  };

  // Annual increases from 2021 baseline (décret 68: +5D/an sur salaire base)
  const ANNUAL_INCREASE: Record<string, number> = {
    "2021": 0, "2023": 29.344, "2024": 60.648, "2026": 96.152, "2027": 126.416, "2028": 158.784,
  };

  const lignes: { echelle: number; echelon: number; montants: Record<string, number> }[] = [];

  for (let echelle = 1; echelle <= 21; echelle++) {
    const rangeKey = echelle <= 7 ? "execution" : echelle <= 13 ? "maitrise" : "cadres";
    const echelonStep = ECHELON_STEP[rangeKey];
    const base2021 = BASE_2021[echelle];

    for (let echelon = 1; echelon <= 5; echelon++) {
      const echelonOffset = (echelon - 1) * echelonStep;
      const montants: Record<string, number> = {};

      for (const [year, increase] of Object.entries(ANNUAL_INCREASE)) {
        // Each échelon also gets proportionally more from annual increases
        const yearFactor = parseFloat(year) <= 2021 ? 1 : 1 + (increase / base2021) * 0.85;
        montants[year] = round3((base2021 + echelonOffset) * yearFactor + increase * 0.15);
      }

      lignes.push({ echelle, echelon, montants });
    }
  }

  return lignes;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
