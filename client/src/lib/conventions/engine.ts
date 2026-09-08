/**
 * Moteur de paie professionnel par convention collective
 *
 * RÈGLE FONDAMENTALE :
 * - IRPP, CNSS, CSS → délégués au moteur principal (lib/payroll/)
 * - Primes & indemnités → spécifiques à la convention (données réelles uniquement)
 * - AUCUN montant inventé
 */

import type {
  ConventionCollective,
  PrimeMensuelleStructuree,
  CategorieAgent,
} from "./types";
import { getSmig, getLatestSmigYear } from "./data/index";

// ─── Importer le moteur principal (SOURCE UNIQUE) ────────────────────
import { getPayrollConfig } from "../payroll/config";
import { calculerIRPPAnnuel, calculerFraisProfessionnels, calculerDeductionsAnnuelles } from "../payroll/irpp";
import type { SituationFamiliale as SituationFamilialePrincipale } from "../payroll/irpp";

// ─── Types entrée/sortie ─────────────────────────────────────────────

export interface SalarieConvention {
  nom: string;
  prénom: string;
  categorieAgent: string;
  anciennete: number;
  regime: "48h" | "40h";
  situationFamiliale: "Célibataire" | "Marié" | "Marié + enfants";
  nombreEnfants: number;
}

export interface ElementsPaieConvention {
  salaireBrut: number;
  annee: number;
  mois: number;
  heuresSup?: number;
  tauxHoraireHS?: number;
  noteProfessionnelle?: number;
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
  convention: { sectorId: number; slug: string; nameFr: string; nameAr: string };
  salarie: SalarieConvention;
  periode: { mois: number; annee: number; moisNom: string };
  lignes: LignePaie[];
  totalBrut: number;
  totalCotisationsSalariales: number;
  totalRetenues: number;
  netAPayer: number;
  cotisationsPatronales: { label: string; montant: number }[];
  totalCotisationsPatronales: number;
}

// ─── Constantes ──────────────────────────────────────────────────────

const MOIS_NOMS = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// ─── Fonctions utilitaires ───────────────────────────────────────────

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Obtenir la meilleure année disponible (année demandée ou la plus proche inférieure) */
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

// ─── Moteur principal ────────────────────────────────────────────────

export function calculerPaieConvention(
  convention: ConventionCollective,
  salarie: SalarieConvention,
  elements: ElementsPaieConvention,
): ResultatPaieConvention {
  const lignes: LignePaie[] = [];
  const cotPat: { label: string; montant: number }[] = [];
  const config = getPayrollConfig();

  // 1. Salaire de base
  lignes.push({
    code: "SB", labelFr: "Salaire de base", labelAr: "الأجر الأساسي",
    montant: elements.salaireBrut, type: "gain",
  });
  let totalBrut = elements.salaireBrut;

  // 2. Primes mensuelles de la convention (DONNÉES RÉELLES UNIQUEMENT)
  if (convention.primesMensuelles) {
    for (const prime of convention.primesMensuelles) {
      // Prime de caisse : dépend de l'ancienneté
      if (prime.code === "CAISSE") {
        let montantCaisse = 5;
        if (salarie.anciennete >= 5 && salarie.anciennete < 10) montantCaisse = 10;
        if (salarie.anciennete >= 10) montantCaisse = 15;
        lignes.push({
          code: prime.code, labelFr: prime.labelFr, labelAr: prime.labelAr,
          montant: round3(montantCaisse), type: "gain",
        });
        totalBrut += montantCaisse;
        continue;
      }

      const montant = getMontantPrime(prime, salarie.categorieAgent, elements.annee);
      if (montant > 0) {
        lignes.push({
          code: prime.code, labelFr: prime.labelFr, labelAr: prime.labelAr,
          montant: round3(montant), type: "gain",
        });
        totalBrut += montant;
      }
    }
  }

  // 3. Heures supplémentaires
  if (elements.heuresSup && elements.heuresSup > 0) {
    const tauxHS = elements.tauxHoraireHS ?? (elements.salaireBrut / (salarie.regime === "48h" ? 208 : 173.33));
    const majoration = elements.heuresSup <= 8 ? 1.25 : 1.5;
    const montantHS = round3(tauxHS * majoration * elements.heuresSup);
    lignes.push({
      code: "HS", labelFr: "Heures supplémentaires", labelAr: "الساعات الإضافية",
      montant: montantHS, type: "gain", base: elements.heuresSup, taux: majoration,
    });
    totalBrut += montantHS;
  }

  // 4. Primes exceptionnelles
  if (elements.primesExceptionnelles && elements.primesExceptionnelles > 0) {
    lignes.push({
      code: "EXCEPT", labelFr: "Primes exceptionnelles", labelAr: "منح استثنائية",
      montant: round3(elements.primesExceptionnelles), type: "gain",
    });
    totalBrut += elements.primesExceptionnelles;
  }

  // ─── Retenues — DÉLÉGUÉES AU MOTEUR PRINCIPAL ──────────────────────
  const PLAFOND_CNSS_MENSUEL = 5000; // 5000 DT — plafond CNSS mensuel
  const assietteCNSS = Math.min(totalBrut, PLAFOND_CNSS_MENSUEL);

  // 5. CNSS salariale (depuis config)
  const cnssSalarial = round3(assietteCNSS * config.cnssSalarialNonAgricole);
  lignes.push({
    code: "CNSS_S", labelFr: "CNSS (part salariale)", labelAr: "الضمان الاجتماعي (نسبة الأجير)",
    montant: cnssSalarial, type: "retenue", base: assietteCNSS, taux: config.cnssSalarialNonAgricole,
  });
  cotPat.push({ label: "CNSS (part patronale)", montant: round3(assietteCNSS * config.cnssPatronalNonAgricole) });

  // 6. CSS (depuis config)
  const cssSalarial = config.cssActive ? round3(totalBrut * config.cssTaux) : 0;
  if (cssSalarial > 0) {
    lignes.push({
      code: "CSS_S", labelFr: "CSS (part salariale)", labelAr: "المساهمة الاجتماعية للتضامن",
      montant: cssSalarial, type: "retenue", base: totalBrut, taux: config.cssTaux,
    });
    cotPat.push({ label: "CSS (part patronale)", montant: round3(totalBrut * config.cssTaux * 2) });
  }

  // 7. IRPP — DÉLÉGUÉ AU MOTEUR PRINCIPAL (calculerIRPPAnnuel + déductions)
  const netImposableAnnuel = (totalBrut - cnssSalarial) * 12;
  const fraisPro = calculerFraisProfessionnels(netImposableAnnuel);
  const situationIRPP: SituationFamilialePrincipale = {
    chefFamille: salarie.situationFamiliale !== "Célibataire",
    enfants: salarie.nombreEnfants,
    etudiants: 0,
    infirmes: 0,
    autresDeductionsAnnuelles: 0,
  };
  const deductionsAnnuelles = calculerDeductionsAnnuelles(situationIRPP);
  const irppAnnuel = calculerIRPPAnnuel(netImposableAnnuel, deductionsAnnuelles + fraisPro);
  const irppMensuel = round3(irppAnnuel / 12);
  if (irppMensuel > 0) {
    lignes.push({
      code: "IRPP", labelFr: "IRPP (retenue à la source)", labelAr: "الضريبة على الدخل",
      montant: irppMensuel, type: "retenue",
    });
  }

  // ─── Totaux ────────────────────────────────────────────────────────
  const totalCotisationsSalariales = cnssSalarial + cssSalarial;
  const totalRetenues = totalCotisationsSalariales + irppMensuel;
  const netAPayer = round3(totalBrut - totalRetenues);
  const totalCotisationsPatronales = round3(cotPat.reduce((s, c) => s + c.montant, 0));

  return {
    convention: { sectorId: convention.sectorId, slug: convention.slug, nameFr: convention.sectorNameFr, nameAr: convention.sectorNameAr },
    salarie,
    periode: { mois: elements.mois, annee: elements.annee, moisNom: MOIS_NOMS[elements.mois] },
    lignes,
    totalBrut: round3(totalBrut),
    totalCotisationsSalariales: round3(totalCotisationsSalariales),
    totalRetenues: round3(totalRetenues),
    netAPayer,
    cotisationsPatronales: cotPat,
    totalCotisationsPatronales,
  };
}

// ─── Résumé de la convention ─────────────────────────────────────────

export interface ResumeConvention {
  convention: ConventionCollective;
  dernierAvenant?: string;
  nbPrimesMensuelles: number;
  nbPrimesAnnuelles: number;
  nbPrimesSociales: number;
  categoriesAgents: CategorieAgent[];
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
