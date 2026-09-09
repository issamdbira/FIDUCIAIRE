/**
 * Convention Collective Cadre (ID=176)
 * الاتفاقية الجماعية الإطارية
 *
 * CONVENTION CADRE GÉNÉRALE — sert de base à toutes les conventions sectorielles.
 * Ne contient PAS de grille de salaires chiffrée ni de primes avec montants.
 * Les barèmes, primes et indemnités chiffrées sont dans les conventions SECTORIELLES.
 *
 * Source : secteurs_donnees.json (secteur[2])
 */

import type { ConventionCollective } from "../types";

export const CONVENTION_CADRE: ConventionCollective = {
  sectorId: 176,
  slug: "cadre",
  sectorNameFr: "Convention Collective Cadre",
  sectorNameAr: "الاتفاقية الجماعية الإطارية",
  sourceUrl: "https://paie-tunisie.com/387/fr/176/publications/convention-collective-cadre",

  jortHistory: [
    {
      documentType: "Convention",
      signatureDate: "20/03/1973",
      arreteAgrementDate: "29/05/1973",
      jortReference: "n° des 25-29 Mai - 1er Juin 1973, page 852",
      applicationStart: "01/06/1973",
    },
  ],

  primesIndemnites: [], // Aucune prime chiffrée propre — renvoie aux conventions sectorielles

  categoriesSalariales: [], // Pas de grille propre — renvoie aux conventions sectorielles

  grillesSalariales: [], // Pas de grille propre

  allowances: [],

  pdfDocuments: [],

  resume:
    "Convention cadre générale servant de base à toutes les conventions collectives sectorielles. " +
    "Ne contient pas de grille de salaires chiffrée ni de classification détaillée par secteur " +
    "(celles-ci sont renvoyées aux conventions sectorielles). " +
    "Contient le cadre juridique commun applicable aux 3 catégories de personnel.",

  engineStatus: "planned", // Pas de calculs possibles sans données sectorielles

  /** Les 3 catégories de personnel définies par la convention cadre */
  categoriesAgents: [
    { code: "EXECUTION", labelFr: "Agents d'exécution", labelAr: "أعوان التنفيذ", echelleMin: 1, echelleMax: 7 },
    { code: "MAITRISE", labelFr: "Agents de maîtrise", labelAr: "أعوان التسيير", echelleMin: 8, echelleMax: 13 },
    { code: "CADRES", labelFr: "Cadres", labelAr: "الإطارات", echelleMin: 14, echelleMax: 21 },
  ],

  primesMensuelles: [], // Aucun montant — renvoie aux conventions sectorielles

  primesAnnuelles: [], // Aucun montant — renvoie aux conventions sectorielles

  primesSociales: [], // Aucun montant — renvoie aux conventions sectorielles
};

// Données structurelles (hors ConventionCollective type)
export const DONNEES_CADRE = {
  periodeEssai: [
    { categorie: "Agents d'exécution", duree: "6 mois" },
    { categorie: "Agents de maîtrise", duree: "9 mois" },
    { categorie: "Cadres", duree: "1 an" },
  ],
  congesSpeciaux: [
    { evenement: "Naissance d'un enfant", duree: "2 jours ouvrables" },
    { evenement: "Décès du conjoint", duree: "3 jours ouvrables" },
    { evenement: "Décès père/mère/fils", duree: "3 jours ouvrables" },
    { evenement: "Mariage du travailleur", duree: "3 jours ouvrables" },
    { evenement: "Circoncision d'un enfant", duree: "1 jour ouvrable" },
  ],
  joursFeries: [
    "20 mars", "1er mai", "25 juillet", "7 novembre",
    "Mouled", "1er et 2ème jour Aïd El Fitr", "1er et 2ème jour Aïd El Idha",
  ],
  congeSansSoldeMax: "90 jours/an",
  reposHebdomadaire: "24 heures consécutives",
  majorationJourFerie: "100%",
};
