/**
 * Moteur de paie professionnel par convention collective
 *
 * Ce moteur est SÉPARÉ du moteur de paie général (lib/payroll/engine.ts).
 * Il utilise les données spécifiques à chaque convention collective :
 * - Primes et indemnités propres au secteur
 * - Catégories d'agents (Exécution, Maîtrise, Cadres)
 * - Grilles salariales sectorielles
 * - Barèmes SMIG/SMAG applicables
 */

import type {
  ConventionCollective,
  PrimeMensuelleStructuree,
  PrimeAnnuelleStructuree,
  PrimeSocialeStructuree,
  CategorieAgent,
  SmigEntry,
} from "./types";
import { getSmig, getLatestSmigYear } from "./data/index";

// ─── Types entrée/sortie ─────────────────────────────────────────────

export interface SalarieConvention {
  /** Nom complet */
  nom: string;
  prénom: string;
  /** Catégorie d'agent dans la convention */
  categorieAgent: string; // "EXECUTION" | "MAITRISE" | "CADRES" | etc.
  /** Ancienneté en années */
  anciennete: number;
  /** Régime de travail */
  regime: "48h" | "40h";
  /** Situation familiale pour IRPP */
  situationFamiliale: "Célibataire" | "Marié" | "Marié + enfants";
  nombreEnfants: number;
}

export interface ElementsPaieConvention {
  /** Salaire de base mensuel (brut) */
  salaireBrut: number;
  /** Année de référence pour les primes */
  annee: number;
  /** Mois (1-12) */
  mois: number;
  /** Heures supplémentaires */
  heuresSup?: number;
  /** Taux horaire HS */
  tauxHoraireHS?: number;
  /** Prime de responsabilité (pour cadres) — montant forfaitaire */
  primeResponsabilite?: number;
  /** Note professionnelle (0-20) pour primes annuelles */
  noteProfessionnelle?: number;
  /** Primes exceptionnelles */
  primesExceptionnelles?: number;
}

export interface LignePaie {
  code: string;
  labelFr: string;
  labelAr?: string;
  montant: number;
  type: "gain" | "retenue";
  base?: number;
  taux?: number;
}

export interface ResultatPaieConvention {
  convention: {
    sectorId: number;
    slug: string;
    nameFr: string;
    nameAr: string;
  };
  salarie: SalarieConvention;
  periode: { mois: number; annee: number; moisNom: string };
  lignes: LignePaie[];
  totalBrut: number;
  totalCotisationsSalariales: number;
  totalRetenues: number;
  netAPayer: number;
  /** Détail des cotisations patronales */
  cotisationsPatronales: { label: string; montant: number }[];
  totalCotisationsPatronales: number;
}

// ─── Constantes CNSS / CSS / IRPP ────────────────────────────────────
// (Mêmes taux que le moteur général, mais accessibles ici aussi)

const CNSS_SALARIAL = 0.0918;    // 9,18%
const CNSS_PATRONAL = 0.1643;    // 16,43%
const CSS_SALARIAL = 0.01;       // 1%
const CSS_PATRONAL = 0.02;       // 2%
const PLAFOND_CNSS_MENSUEL = 5000; // 5000 DT

const MOIS_NOMS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ─── Barème IRPP 2024 ────────────────────────────────────────────────
const BAREME_IRPP = [
  { min: 0, max: 5000, taux: 0 },
  { min: 5000, max: 10000, taux: 0.26 },
  { min: 10000, max: 20000, taux: 0.28 },
  { min: 20000, max: 30000, taux: 0.32 },
  { min: 30000, max: 50000, taux: 0.35 },
  { min: 50000, max: Infinity, taux: 0.37 },
];

// ─── Fonctions utilitaires ───────────────────────────────────────────

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Obtenir la meilleure année disponible pour les primes (année demandée ou la plus proche inférieure) */
function getBestYear(availableYears: string[], targetYear: number): string | null {
  const years = availableYears.map(Number).sort((a, b) => b - a);
  for (const y of years) {
    if (y <= targetYear) return String(y);
  }
  return years.length > 0 ? String(years[years.length - 1]) : null;
}

/** Obtenir le montant d'une prime mensuelle pour une catégorie et année */
function getMontantPrime(
  prime: PrimeMensuelleStructuree,
  categorieAgent: string,
  annee: number,
): number {
  const catMontants = prime.montants[categorieAgent];
  if (!catMontants) return 0;

  const bestYear = getBestYear(Object.keys(catMontants), annee);
  if (!bestYear) return 0;

  return catMontants[bestYear] ?? 0;
}

/** Calcul IRPP mensuel simplifié */
function calculerIRPPMensuel(
  netImposableAnnuel: number,
  situationFamiliale: string,
  nombreEnfants: number,
): number {
  // Déductions
  let deductions = 0;
  if (situationFamiliale === "Marié" || situationFamiliale === "Marié + enfants") {
    deductions += 300; // Chef de famille
  }
  deductions += nombreEnfants * 90; // Par enfant à charge
  deductions += Math.min(netImposableAnnuel * 0.1, 2000); // Frais professionnels (10%, max 2000)

  const revenuImposable = Math.max(0, netImposableAnnuel - deductions);

  // Calcul par tranches
  let irpp = 0;
  let reste = revenuImposable;
  for (const tranche of BAREME_IRPP) {
    if (reste <= 0) break;
    const largeur = tranche.max - tranche.min;
    const imposable = Math.min(reste, largeur);
    irpp += imposable * tranche.taux;
    reste -= imposable;
  }

  return round3(irpp / 12); // Mensuel
}

// ─── Moteur principal ────────────────────────────────────────────────

export function calculerPaieConvention(
  convention: ConventionCollective,
  salarie: SalarieConvention,
  elements: ElementsPaieConvention,
): ResultatPaieConvention {
  const lignes: LignePaie[] = [];
  const cotPat: { label: string; montant: number }[] = [];

  // 1. Salaire de base
  lignes.push({
    code: "SB",
    labelFr: "Salaire de base",
    labelAr: "الأجر الأساسي",
    montant: elements.salaireBrut,
    type: "gain",
  });

  let totalBrut = elements.salaireBrut;

  // 2. Primes mensuelles de la convention
  if (convention.primesMensuelles) {
    for (const prime of convention.primesMensuelles) {
      // Prime de caisse : dépend de l'ancienneté
      if (prime.code === "CAISSE") {
        let montantCaisse = 5;
        if (salarie.anciennete >= 5 && salarie.anciennete < 10) montantCaisse = 10;
        if (salarie.anciennete >= 10) montantCaisse = 15;
        lignes.push({
          code: prime.code,
          labelFr: prime.labelFr,
          labelAr: prime.labelAr,
          montant: round3(montantCaisse),
          type: "gain",
        });
        totalBrut += montantCaisse;
        continue;
      }

      const montant = getMontantPrime(prime, salarie.categorieAgent, elements.annee);
      if (montant > 0) {
        lignes.push({
          code: prime.code,
          labelFr: prime.labelFr,
          labelAr: prime.labelAr,
          montant: round3(montant),
          type: "gain",
        });
        totalBrut += montant;
      }
    }
  }

  // 3. Prime de responsabilité (cadres)
  if (elements.primeResponsabilite && elements.primeResponsabilite > 0) {
    lignes.push({
      code: "RESPONSABILITE",
      labelFr: "Prime de responsabilité",
      labelAr: "منحة المسؤولية",
      montant: round3(elements.primeResponsabilite),
      type: "gain",
    });
    totalBrut += elements.primeResponsabilite;
  }

  // 4. Heures supplémentaires
  if (elements.heuresSup && elements.heuresSup > 0) {
    const tauxHS = elements.tauxHoraireHS ?? (elements.salaireBrut / (salarie.regime === "48h" ? 208 : 173.33));
    const majoration = elements.heuresSup <= 8 ? 1.25 : 1.5; // 25% premières 8h, 50% au-delà
    const montantHS = round3(tauxHS * majoration * elements.heuresSup);
    lignes.push({
      code: "HS",
      labelFr: "Heures supplémentaires",
      labelAr: "الساعات الإضافية",
      montant: montantHS,
      type: "gain",
      base: elements.heuresSup,
      taux: majoration,
    });
    totalBrut += montantHS;
  }

  // 5. Primes exceptionnelles
  if (elements.primesExceptionnelles && elements.primesExceptionnelles > 0) {
    lignes.push({
      code: "EXCEPT",
      labelFr: "Primes exceptionnelles",
      labelAr: "منح استثنائية",
      montant: round3(elements.primesExceptionnelles),
      type: "gain",
    });
    totalBrut += elements.primesExceptionnelles;
  }

  // ─── Retenues ──────────────────────────────────────────────────────
  const assietteCNSS = Math.min(totalBrut, PLAFOND_CNSS_MENSUEL);

  // 6. CNSS salariale
  const cnssSalarial = round3(assietteCNSS * CNSS_SALARIAL);
  lignes.push({
    code: "CNSS_S",
    labelFr: "CNSS (part salariale)",
    labelAr: "الضمان الاجتماعي (نسبة الأجير)",
    montant: cnssSalarial,
    type: "retenue",
    base: assietteCNSS,
    taux: CNSS_SALARIAL,
  });

  // CNSS patronale
  cotPat.push({
    label: "CNSS (part patronale)",
    montant: round3(assietteCNSS * CNSS_PATRONAL),
  });

  // 7. CSS salariale
  const cssSalarial = round3(totalBrut * CSS_SALARIAL);
  lignes.push({
    code: "CSS_S",
    labelFr: "CSS (part salariale)",
    labelAr: "المساهمة الاجتماعية للتضامن (نسبة الأجير)",
    montant: cssSalarial,
    type: "retenue",
    base: totalBrut,
    taux: CSS_SALARIAL,
  });

  cotPat.push({
    label: "CSS (part patronale)",
    montant: round3(totalBrut * CSS_PATRONAL),
  });

  // 8. IRPP (calcul simplifié sur base annuelle)
  const netImposableAnnuel = (totalBrut - cnssSalarial) * 12;
  const irppMensuel = calculerIRPPMensuel(
    netImposableAnnuel,
    salarie.situationFamiliale,
    salarie.nombreEnfants,
  );
  if (irppMensuel > 0) {
    lignes.push({
      code: "IRPP",
      labelFr: "IRPP (retenue à la source)",
      labelAr: "الضريبة على الدخل",
      montant: round3(irppMensuel),
      type: "retenue",
    });
  }

  // ─── Totaux ────────────────────────────────────────────────────────
  const totalCotisationsSalariales = cnssSalarial + cssSalarial;
  const totalRetenues = totalCotisationsSalariales + irppMensuel;
  const netAPayer = round3(totalBrut - totalRetenues);
  const totalCotisationsPatronales = round3(cotPat.reduce((s, c) => s + c.montant, 0));

  return {
    convention: {
      sectorId: convention.sectorId,
      slug: convention.slug,
      nameFr: convention.sectorNameFr,
      nameAr: convention.sectorNameAr,
    },
    salarie,
    periode: {
      mois: elements.mois,
      annee: elements.annee,
      moisNom: MOIS_NOMS[elements.mois],
    },
    lignes,
    totalBrut: round3(totalBrut),
    totalCotisationsSalariales: round3(totalCotisationsSalariales),
    totalRetenues: round3(totalRetenues),
    netAPayer,
    cotisationsPatronales: cotPat,
    totalCotisationsPatronales,
  };
}

// ─── Résumé de la convention (pour page détail) ──────────────────────

export interface ResumeConvention {
  convention: ConventionCollective;
  /** Dernier avenant en date */
  dernierAvenant?: string;
  /** Nombre total de primes mensuelles */
  nbPrimesMensuelles: number;
  /** Nombre total de primes annuelles */
  nbPrimesAnnuelles: number;
  /** Nombre total de primes sociales */
  nbPrimesSociales: number;
  /** Catégories d'agents */
  categoriesAgents: CategorieAgent[];
  /** SMIG applicable (année la plus récente) */
  smigMensuel48h: number;
  smigMensuel40h: number;
}

export function getResumeConvention(convention: ConventionCollective): ResumeConvention {
  const dernierJort = convention.jortHistory[convention.jortHistory.length - 1];
  const latestYear = getLatestSmigYear();

  return {
    convention,
    dernierAvenant: dernierJort?.documentType,
    nbPrimesMensuelles: convention.primesMensuelles?.length ?? 0,
    nbPrimesAnnuelles: convention.primesAnnuelles?.length ?? 0,
    nbPrimesSociales: convention.primesSociales?.length ?? 0,
    categoriesAgents: convention.categoriesAgents ?? [],
    smigMensuel48h: getSmig(latestYear, "48h/semaine (Mensuel)"),
    smigMensuel40h: getSmig(latestYear, "40h/semaine (Mensuel)"),
  };
}
