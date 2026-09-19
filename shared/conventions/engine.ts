// =============================================================================
// Le Fiduciaire — Moteur de conventions collectives (shared, PURE)
// =============================================================================
// Ce module est partagé entre le client et le serveur. Il ne dépend PAS du
// moteur de paie (lib/payroll/) — uniquement des données de convention.
//
// Fonctions exportées :
//   - getEligiblePrimes(convention, salarie, annee) → primes mensuelles applicables
//   - getTotalPrimesEligibles(convention, salarie, annee) → montant total des primes
//   - chercherSalaireGrille(convention, echelle, echelon, annee) → montant grille
//   - detecterEchelon / detecterCategorie / getEchellesPourCategorie
//   - getResumeConvention / getAnneesGrille
//
// Le client a aussi `client/src/lib/conventions/engine.ts` qui AJOUTE les
// retenues CNSS/IRPP/CSS (nécessite lib/payroll/ — non partagé avec serveur).
// Le serveur utilise UNIQUEMENT ce fichier shared/ pour l'éligibilité primes
// et la lookup grille — il fait sa propre cascade CNSS/IRPP dans
// server/lib/payroll-engine.ts (function calculatePayroll).
// =============================================================================

import type {
  ConventionCollective,
  PrimeMensuelleStructuree,
  CategorieAgent,
  GrilleSalarialeLigne,
} from "./types";
import { getSmig, getLatestSmigYear } from "./data/index";

// ─── Types partagés ────────────────────────────────────────────────────

export interface SalarieInfo {
  categorieAgent: string;
  anciennete: number;
  poste?: string;
}

export interface PrimeEligible {
  code: string;
  labelFr: string;
  montant: number;
  modeCalcul?: PrimeMensuelleStructuree["modeCalcul"];
}

// ─── Fonctions utilitaires (privées) ────────────────────────────────────

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function getBestYear(availableYears: string[], targetYear: number): string | null {
  const years = availableYears.map(Number).sort((a, b) => b - a);
  for (const y of years) {
    if (y <= targetYear) return String(y);
  }
  return years.length > 0 ? String(years[years.length - 1]) : null;
}

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

// ============================================================================
// getEligiblePrimes — PURE, utilisable par le serveur
// ============================================================================

/**
 * Calcule les primes mensuelles éligibles pour un salarié selon sa convention.
 * Aucune dépendance vers le moteur de paie — peut être appelé par le serveur.
 *
 * ÉLIGIBILITÉ :
 *   - prime.actif !== false
 *   - categorieAgent ∈ prime.categoriesConcernees (si défini)
 *   - salarie.anciennete >= prime.ancienneteMin (si défini)
 *   - salarie.poste === prime.posteRequis (si défini)
 */
export function getEligiblePrimes(
  convention: ConventionCollective,
  salarie: SalarieInfo,
  annee: number,
): PrimeEligible[] {
  const result: PrimeEligible[] = [];
  if (!convention.primesMensuelles) return result;

  for (const prime of convention.primesMensuelles) {
    // 1. Prime active
    if (prime.actif === false) continue;

    // 2. Catégories concernées
    const cats = prime.categoriesConcernees;
    if (cats && cats.length > 0 && !cats.includes(salarie.categorieAgent)) continue;

    // 3. Ancienneté minimum
    const ancienneteMinPrime = prime.ancienneteMin ?? 0;
    if (salarie.anciennete < ancienneteMinPrime) continue;

    // 4. Poste requis (ex: "caissier" pour Prime de caisse)
    if (prime.posteRequis && salarie.poste !== prime.posteRequis) continue;

    // 5. Prime à barème d'ancienneté
    if (prime.modeCalcul === "anciennete_dependant" && prime.baremeAnciennete) {
      let montantPrime = 0;
      for (const tranche of prime.baremeAnciennete) {
        if (salarie.anciennete >= tranche.ancienneteMin && salarie.anciennete <= tranche.ancienneteMax) {
          montantPrime = tranche.montant;
          break;
        }
      }
      if (montantPrime > 0) {
        result.push({
          code: prime.code,
          labelFr: prime.labelFr,
          montant: round3(montantPrime),
          modeCalcul: prime.modeCalcul,
        });
      }
      continue;
    }

    // 6. Prime forfaitaire par catégorie/année
    const montant = getMontantPrime(prime, salarie.categorieAgent, annee);
    if (montant > 0) {
      result.push({
        code: prime.code,
        labelFr: prime.labelFr,
        montant: round3(montant),
        modeCalcul: prime.modeCalcul,
      });
    }
  }

  return result;
}

/**
 * Calcule le total des primes mensuelles éligibles pour un salarié.
 * Helper pratique pour le serveur qui veut juste le montant total.
 */
export function getTotalPrimesEligibles(
  convention: ConventionCollective,
  salarie: SalarieInfo,
  annee: number,
): number {
  const primes = getEligiblePrimes(convention, salarie, annee);
  return round3(primes.reduce((sum, p) => sum + p.montant, 0));
}

// ============================================================================
// FONCTIONS GRILLE SALARIALE — échelle × échelon
// ============================================================================

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

export function detecterEchelon(convention: ConventionCollective, anciennete: number): number {
  if (!convention.reglesAvancement) return 1;
  const { tableAnciennete } = convention.reglesAvancement;
  for (const rule of tableAnciennete) {
    if (anciennete >= rule.ancienneteMin && anciennete <= rule.ancienneteMax) {
      return rule.echelon;
    }
  }
  return tableAnciennete[tableAnciennete.length - 1]?.echelon ?? 1;
}

export function detecterCategorie(convention: ConventionCollective, echelle: number): CategorieAgent | null {
  const cats = convention.categoriesAgents ?? [];
  return cats.find((c) => echelle >= c.echelleMin && echelle <= c.echelleMax) ?? null;
}

export function getEchellesPourCategorie(convention: ConventionCollective, categorieCode: string): number[] {
  const cat = (convention.categoriesAgents ?? []).find((c) => c.code === categorieCode);
  if (!cat) return [];
  const echelles: number[] = [];
  for (let e = cat.echelleMin; e <= cat.echelleMax; e++) {
    const hasData = convention.grilleDetaillee?.some((l) => l.echelle === e);
    if (hasData) echelles.push(e);
  }
  return echelles;
}

export function getEchelonsPourEchelle(convention: ConventionCollective, echelle: number): number[] {
  if (!convention.grilleDetaillee) return [];
  return convention.grilleDetaillee
    .filter((l) => l.echelle === echelle)
    .map((l) => l.echelon)
    .sort((a, b) => a - b);
}

export function chercherSalaireGrille(
  convention: ConventionCollective,
  echelle: number,
  echelon: number,
  annee: number,
): number | null {
  if (!convention.grilleDetaillee) return null;
  const ligne = convention.grilleDetaillee.find(
    (l) => l.echelle === echelle && l.echelon === echelon,
  );
  if (!ligne) return null;
  const bestYear = getBestYear(Object.keys(ligne.montants), annee);
  if (!bestYear) return null;
  return ligne.montants[bestYear] ?? null;
}

export function getAnneesGrille(convention: ConventionCollective): string[] {
  if (!convention.grilleDetaillee) return [];
  const years = new Set<string>();
  for (const ligne of convention.grilleDetaillee) {
    for (const y of Object.keys(ligne.montants)) years.add(y);
  }
  return Array.from(years).sort();
}
