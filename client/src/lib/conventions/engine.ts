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
  GrilleSalarialeLigne,
} from "./types";
import { getSmig, getLatestSmigYear } from "./data/index";

// ─── Importer le moteur principal (SOURCE UNIQUE) ────────────────────
import { getPayrollConfig } from "../payroll/config";
import { calculerIRPPAnnuel, calculerFraisProfessionnels, calculerDeductionsAnnuelles } from "../payroll/irpp";
import { calculerCSSAnnuelle } from "../payroll/cnss";
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
  /** Poste/fonction spécifique du salarié (ex: "caissier") — utilisé pour les primes à poste requis */
  poste?: string;
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
    code: "SB", labelFr: "Salaire de base",
    montant: elements.salaireBrut, type: "gain",
  });
  let totalBrut = elements.salaireBrut;

  // 2. Primes mensuelles de la convention — ÉLIGIBILITÉ CONTRÔLÉE
  if (convention.primesMensuelles) {
    for (const prime of convention.primesMensuelles) {
      // Vérifier si la prime est active
      if (prime.actif === false) continue;

      // Vérifier les catégories concernées
      const cats = prime.categoriesConcernees;
      if (cats && cats.length > 0 && !cats.includes(salarie.categorieAgent)) continue;

      // Vérifier l'ancienneté minimum
      const ancienneteMinPrime = prime.ancienneteMin ?? 0;
      if (salarie.anciennete < ancienneteMinPrime) continue;

      // Vérifier le poste requis (ex: "caissier" pour Prime de caisse)
      if (prime.posteRequis && salarie.poste !== prime.posteRequis) continue;

      // Prime à barème d'ancienneté
      if (prime.modeCalcul === "anciennete_dependant" && prime.baremeAnciennete) {
        let montantPrime = 0;
        for (const tranche of prime.baremeAnciennete) {
          if (salarie.anciennete >= tranche.ancienneteMin && salarie.anciennete <= tranche.ancienneteMax) {
            montantPrime = tranche.montant;
            break;
          }
        }
        if (montantPrime > 0) {
          lignes.push({
            code: prime.code, labelFr: prime.labelFr,
            montant: round3(montantPrime), type: "gain",
          });
          totalBrut += montantPrime;
        }
        continue;
      }

      // Prime forfaitaire par catégorie/année
      const montant = getMontantPrime(prime, salarie.categorieAgent, elements.annee);
      if (montant > 0) {
        lignes.push({
          code: prime.code, labelFr: prime.labelFr,
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
      code: "HS", labelFr: "Heures supplémentaires",
      montant: montantHS, type: "gain", base: elements.heuresSup, taux: majoration,
    });
    totalBrut += montantHS;
  }

  // 4. Primes exceptionnelles
  if (elements.primesExceptionnelles && elements.primesExceptionnelles > 0) {
    lignes.push({
      code: "EXCEPT", labelFr: "Primes exceptionnelles",
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
    code: "CNSS_S", labelFr: "CNSS (part salariale)",
    montant: cnssSalarial, type: "retenue", base: assietteCNSS, taux: config.cnssSalarialNonAgricole,
  });
  cotPat.push({ label: "CNSS (part patronale)", montant: round3(assietteCNSS * config.cnssPatronalNonAgricole) });

  // 6. IRPP + CSS — DÉLÉGUÉES AU MOTEUR PRINCIPAL (même cascade que le moteur principal)
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
  const assietteFiscaleAnnuelle = netImposableAnnuel - fraisPro - deductionsAnnuelles;

  // CSS — sur l'assiette fiscale annuelle (comme le moteur principal)
  const cssAnnuel = calculerCSSAnnuelle(Math.max(0, assietteFiscaleAnnuelle));
  const cssSalarial = round3(cssAnnuel / 12);
  if (cssSalarial > 0) {
    lignes.push({
      code: "CSS_S", labelFr: "CSS (part salariale)",
      montant: cssSalarial, type: "retenue", base: round3(assietteFiscaleAnnuelle / 12), taux: config.cssTaux,
    });
    cotPat.push({ label: "CSS (part patronale)", montant: round3(Math.max(0, assietteFiscaleAnnuelle) * config.cssTaux * 2 / 12) });
  }

  // IRPP
  const irppAnnuel = calculerIRPPAnnuel(netImposableAnnuel, deductionsAnnuelles + fraisPro);
  const irppMensuel = round3(irppAnnuel / 12);
  if (irppMensuel > 0) {
    lignes.push({
      code: "IRPP", labelFr: "IRPP (retenue à la source)",
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

// ═══════════════════════════════════════════════════════════════════════
// FONCTIONS GRILLE SALARIALE — échelle × échelon
// ═══════════════════════════════════════════════════════════════════════

/** Détecter l'échelon à partir de l'ancienneté selon les règles d'avancement */
export function detecterEchelon(convention: ConventionCollective, anciennete: number): number {
  if (!convention.reglesAvancement) return 1;
  const { tableAnciennete } = convention.reglesAvancement;
  for (const rule of tableAnciennete) {
    if (anciennete >= rule.ancienneteMin && anciennete <= rule.ancienneteMax) {
      return rule.echelon;
    }
  }
  // Default: last échelon
  return tableAnciennete[tableAnciennete.length - 1]?.echelon ?? 1;
}

/** Détecter la catégorie d'agent à partir du numéro d'échelle */
export function detecterCategorie(convention: ConventionCollective, echelle: number): CategorieAgent | null {
  const cats = convention.categoriesAgents ?? [];
  return cats.find((c) => echelle >= c.echelleMin && echelle <= c.echelleMax) ?? null;
}

/** Obtenir les échelles disponibles pour une catégorie */
export function getEchellesPourCategorie(convention: ConventionCollective, categorieCode: string): number[] {
  const cat = (convention.categoriesAgents ?? []).find((c) => c.code === categorieCode);
  if (!cat) return [];
  const echelles: number[] = [];
  for (let e = cat.echelleMin; e <= cat.echelleMax; e++) {
    // Only include échelles that have data in the grille
    const hasData = convention.grilleDetaillee?.some((l) => l.echelle === e);
    if (hasData) echelles.push(e);
  }
  return echelles;
}

/** Obtenir les échelons disponibles pour une échelle donnée */
export function getEchelonsPourEchelle(convention: ConventionCollective, echelle: number): number[] {
  if (!convention.grilleDetaillee) return [];
  return convention.grilleDetaillee
    .filter((l) => l.echelle === echelle)
    .map((l) => l.echelon)
    .sort((a, b) => a - b);
}

/** Chercher le salaire de base dans la grille pour échelle × échelon × année */
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

/** Obtenir toutes les années disponibles dans la grille */
export function getAnneesGrille(convention: ConventionCollective): string[] {
  if (!convention.grilleDetaillee) return [];
  const years = new Set<string>();
  for (const ligne of convention.grilleDetaillee) {
    for (const y of Object.keys(ligne.montants)) years.add(y);
  }
  return Array.from(years).sort();
}

// ═══════════════════════════════════════════════════════════════════════
// CALCUL INVERSE : Net → Brut (décomposition grille + indemnité suppl.)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Résultat du calcul Net → Brut pour convention collective.
 * Le brut est décomposé en :
 *   - salaireBaseGrille : montant de la grille (échelle × échelon × année)
 *   - indemniteSupplementaire : excédent du brut au-delà de la grille
 *   - resultat : le résultat complet de la paie (avec toutes les lignes)
 */
export interface ResultatNetToBrut {
  brutTotal: number;
  salaireBaseGrille: number;
  indemniteSupplementaire: number;
  resultat: ResultatPaieConvention;
}

/**
 * Calcule le salaire brut correspondant à un net à payer souhaité,
 * par recherche dichotomique sur le moteur de convention.
 *
 * L'IRPP est un barème progressif, donc net(brut) n'est pas inversible
 * algébriquement. On réutilise le même moteur que Brut→Net pour garantir
 * la cohérence entre les deux sens de calcul.
 *
 * Le brut trouvé est ensuite décomposé :
 *   - base grille (échelle × échelon × année) → ligne « Salaire de base »
 *   - excédent → ligne « Indemnité supplémentaire »
 *
 * @param netSouhaite   Le net à payer souhaité (mensuel)
 * @param convention    La convention collective
 * @param salarie       Informations du salarié
 * @param echelle       Numéro d'échelle
 * @param echelon       Numéro d'échelon
 * @param annee         Année de référence
 * @param mois          Mois de paie
 * @param options       Heures sup, primes exceptionnelles, etc.
 */
export function calculerBrutPourNetConvention(
  netSouhaite: number,
  convention: ConventionCollective,
  salarie: SalarieConvention,
  echelle: number,
  echelon: number,
  annee: number,
  mois: number,
  options?: {
    heuresSup?: number;
    tauxHoraireHS?: number;
    noteProfessionnelle?: number;
    primesExceptionnelles?: number;
  },
  maxIterations = 60,
  tolerance = 0.005,
): ResultatNetToBrut | null {
  // 1. Obtenir le salaire de base depuis la grille
  const salaireBaseGrille = chercherSalaireGrille(convention, echelle, echelon, annee);
  if (salaireBaseGrille === null) return null;

  // 2. Recherche dichotomique du brut qui donne le net souhaité
  let bas = 0;
  let haut = Math.max(netSouhaite * 3, 10000);

  const calculerNetPourBrut = (brut: number) => {
    const elements: ElementsPaieConvention = {
      salaireBrut: brut,
      annee,
      mois,
      heuresSup: options?.heuresSup,
      tauxHoraireHS: options?.tauxHoraireHS,
      noteProfessionnelle: options?.noteProfessionnelle,
      primesExceptionnelles: options?.primesExceptionnelles,
    };
    return calculerPaieConvention(convention, salarie, elements);
  };

  let dernierResultat = calculerNetPourBrut(haut);
  // Sécurité : si même la borne haute ne suffit pas, on l'agrandit
  while (dernierResultat.netAPayer < netSouhaite && haut < 10_000_000) {
    haut *= 2;
    dernierResultat = calculerNetPourBrut(haut);
  }

  for (let i = 0; i < maxIterations; i++) {
    const milieu = (bas + haut) / 2;
    dernierResultat = calculerNetPourBrut(milieu);
    if (Math.abs(dernierResultat.netAPayer - netSouhaite) < tolerance) {
      const brutTotal = Math.round(milieu * 1000) / 1000;
      const indemniteSupp = round3(Math.max(0, brutTotal - salaireBaseGrille));
      return {
        brutTotal,
        salaireBaseGrille,
        indemniteSupplementaire: indemniteSupp,
        resultat: dernierResultat,
      };
    }
    if (dernierResultat.netAPayer < netSouhaite) {
      bas = milieu;
    } else {
      haut = milieu;
    }
  }

  const brutFinal = (bas + haut) / 2;
  dernierResultat = calculerNetPourBrut(brutFinal);
  const indemniteSupp = round3(Math.max(0, brutFinal - salaireBaseGrille));
  return {
    brutTotal: round3(brutFinal),
    salaireBaseGrille,
    indemniteSupplementaire: indemniteSupp,
    resultat: dernierResultat,
  };
}
