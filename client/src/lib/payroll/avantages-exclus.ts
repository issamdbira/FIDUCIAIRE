/**
 * Moteur de calcul des avantages exclus de l'assiette des cotisations
 * sociales — Décret n° 2003-1098 du 19 mai 2003.
 *
 * Les 24 points de l'article premier sont répartis en deux catégories :
 *   - Points SMIG (9) : plafond exprimé en multiple/pourcentage du SMIG
 *     → calcul automatique du plafond.
 *   - Points qualitatifs (15) : exclusion catégorielle, conditionnelle
 *     ou sans plafond SMIG fixe → montant déclaré manuellement par
 *     l'employeur, exonéré sous réserve de respecter la condition légale.
 *
 * Art. 3 — Plafond global 5% : le total des avantages exclus (hors
 * points 16, 17, 18, 19, 23, 24) ne peut dépasser 5% de l'ensemble
 * des salaires versés par l'entreprise. Le dépassement est réintégré
 * dans l'assiette CNSS/IRPP.
 *
 * SOURCE : note administrative (CNSS, direction des études et du contrôle
 * de gestion) détaillant les plafonds jusqu'en 2028.
 */

import { getSmigPourAnnee } from "./cnss";

// ─── Points SMIG (plafond calculable) ───────────────────────────────

export type FormuleAvantage =
  | { type: "pourcentage_smig_mensuel"; taux: number } // ex: 30% du SMIG mensuel
  | { type: "multiple_smig_mensuel"; multiple: number } // ex: 2x le SMIG mensuel
  | { type: "multiple_smig_horaire"; multiple: number }; // ex: 3x le SMIG horaire, par repas

export interface PointAvantageSMIG {
  numero: number;
  titre: string;
  formule: FormuleAvantage;
  uniteNombre: string; // ex: "enfant(s)", "repas", "bénéficiaire(s)"
}

export const POINTS_AVANTAGES_SMIG: PointAvantageSMIG[] = [
  { numero: 1, titre: "Prime de rentrée scolaire", formule: { type: "pourcentage_smig_mensuel", taux: 0.30 }, uniteNombre: "enfant(s) scolarisé(s)" },
  { numero: 2, titre: "Prime de crèche / jardin d'enfants", formule: { type: "pourcentage_smig_mensuel", taux: 0.20 }, uniteNombre: "enfant(s)" },
  { numero: 4, titre: "Prime de réussite scolaire", formule: { type: "pourcentage_smig_mensuel", taux: 0.30 }, uniteNombre: "enfant(s)" },
  { numero: 5, titre: "Prime de médaille du travail", formule: { type: "multiple_smig_mensuel", multiple: 2 }, uniteNombre: "bénéficiaire(s)" },
  { numero: 7, titre: "Aide exceptionnelle — mariage ou pèlerinage", formule: { type: "multiple_smig_mensuel", multiple: 2 }, uniteNombre: "bénéficiaire(s)" },
  { numero: 8, titre: "Aide exceptionnelle — naissance, circoncision, fêtes religieuses", formule: { type: "multiple_smig_mensuel", multiple: 1 }, uniteNombre: "bénéficiaire(s)" },
  { numero: 13, titre: "Frais de restauration", formule: { type: "multiple_smig_horaire", multiple: 3 }, uniteNombre: "repas" },
  { numero: 14, titre: "Frais de transport (moyens personnels)", formule: { type: "multiple_smig_horaire", multiple: 0.15 }, uniteNombre: "km parcouru(s)" },
  { numero: 20, titre: "Salaires des collaborateurs de presse occasionnels", formule: { type: "multiple_smig_mensuel", multiple: 2 }, uniteNombre: "pigiste(s)" },
];

// ─── Points qualitatifs (exclusion conditionnelle, pas de plafond SMIG) ─

export interface PointAvantageQualitatif {
  numero: number;
  titre: string;
  condition: string; // Condition légale à respecter pour l'exonération
  horsPlafond5pct: boolean; // true = exclu du plafond global 5% (art. 3)
}

export const POINTS_AVANTAGES_QUALITATIF: PointAvantageQualitatif[] = [
  {
    numero: 3,
    titre: "Prime de colonie de vacances",
    condition: "Limite : montants octroyés par la CNSS au profit de ses affiliés pour ce type de prestation (barème CNSS en vigueur, montant variable).",
    horsPlafond5pct: false,
  },
  {
    numero: 6,
    titre: "Cadeaux (nature ou espèces) — mise à la retraite",
    condition: "Limite : 3 mensualités du salaire de l'agent concerné (plafond individuel, pas un multiple du SMIG).",
    horsPlafond5pct: false,
  },
  {
    numero: 9,
    titre: "Aides exceptionnelles — événement malheureux ou décès",
    condition: "Le décret n'indique aucun plafond chiffré pour ce point (contrairement aux points 7 et 8). Exclusion totale sous réserve de justificatif.",
    horsPlafond5pct: false,
  },
  {
    numero: 10,
    titre: "Vêtements de travail (tenues de service ou de protection)",
    condition: "Exclusion catégorielle à condition que les vêtements demeurent la propriété de l'employeur. Pas de plafond monétaire.",
    horsPlafond5pct: false,
  },
  {
    numero: 11,
    titre: "Lait, savon et produits de préservation santé/sécurité",
    condition: "Exclusion catégorielle (ou leur contre-valeur en espèces). Pas de plafond monétaire fixé par le décret.",
    horsPlafond5pct: false,
  },
  {
    numero: 12,
    titre: "Frais de mission à l'intérieur de la République",
    condition: "Séjour, restauration et transport des agents en mission, sous réserve de présentation d'un ordre de mission. Pas de plafond SMIG.",
    horsPlafond5pct: false,
  },
  {
    numero: 15,
    titre: "Transport du personnel (compagnies aériennes, maritimes, terrestres)",
    condition: "Exclusion sectorielle spécifique, sans formule SMIG ni plafond chiffré dans le décret.",
    horsPlafond5pct: false,
  },
  {
    numero: 16,
    titre: "Indemnités liées aux actions culturelles, sportives ou de loisirs",
    condition: "Ex : indemnités aux associations internes à l'entreprise, organisation d'excursions. Pas de plafond chiffré.",
    horsPlafond5pct: true,
  },
  {
    numero: 17,
    titre: "Indemnités spécifiques — agents en mission à l'étranger",
    condition: "Limité à la part dépassant le salaire habituel de leurs homologues restés en Tunisie (informatique, études, échanges d'expérience...).",
    horsPlafond5pct: true,
  },
  {
    numero: 18,
    titre: "Primes d'assurance collective maladie ou vie (employeur)",
    condition: "Pas de plafond chiffré dans le décret. Prise en charge par l'employeur.",
    horsPlafond5pct: true,
  },
  {
    numero: 19,
    titre: "Contrepartie de missions temporaires (autre régime)",
    condition: "Limite en heures : 10h/semaine (enseignement primaire/secondaire), 3h/semaine (autres secteurs). Sous réserve d'autorisation de l'employeur.",
    horsPlafond5pct: true,
  },
  {
    numero: 21,
    titre: "Montants — étudiants/élèves pour travaux saisonniers (vacances officielles)",
    condition: "Pas de plafond chiffré dans le décret. Réservé aux travaux saisonniers durant les vacances officielles.",
    horsPlafond5pct: false,
  },
  {
    numero: 22,
    titre: "Montants accordés aux étudiants stagiaires (stages obligatoires)",
    condition: "Limité aux montants octroyés aux stagiaires « homologues » bénéficiant de stages d'initiation à la vie professionnelle — référence relative.",
    horsPlafond5pct: false,
  },
  {
    numero: 23,
    titre: "Gratifications de fin de service",
    condition: "Uniquement la part qui DÉPASSE l'indemnité prévue par le Code du travail, sous réserve d'approbation de l'inspection du travail ou de la commission de contrôle des licenciements.",
    horsPlafond5pct: true,
  },
  {
    numero: 24,
    titre: "Dommages et intérêts fixés judiciairement",
    condition: "Montants octroyés en réparation d'un préjudice, fixés par décision de justice — pas de plafond administratif.",
    horsPlafond5pct: true,
  },
];

// ─── Registre unifié des 24 points ──────────────────────────────────

/** Numéros des points exclus du plafond global 5% (art. 3 du décret). */
export const NUMEROS_HORS_PLAFOND_5PCT = new Set(
  POINTS_AVANTAGES_QUALITATIF.filter((p) => p.horsPlafond5pct).map((p) => p.numero)
); // {16, 17, 18, 19, 23, 24}

/** Récupère un point SMIG par numéro. */
export function getPointAvantageSMIG(numero: number): PointAvantageSMIG | undefined {
  return POINTS_AVANTAGES_SMIG.find((p) => p.numero === numero);
}

/** Récupère un point qualitatif par numéro. */
export function getPointAvantageQualitatif(numero: number): PointAvantageQualitatif | undefined {
  return POINTS_AVANTAGES_QUALITATIF.find((p) => p.numero === numero);
}

/** Vérifie si un numéro correspond à un point du décret (SMIG ou qualitatif). */
export function estPointDuDecret(numero: number): boolean {
  return getPointAvantageSMIG(numero) !== undefined || getPointAvantageQualitatif(numero) !== undefined;
}

/** Vérifie si un point est exclu du plafond global 5% (art. 3). */
export function estHorsPlafond5pct(numero: number): boolean {
  return NUMEROS_HORS_PLAFOND_5PCT.has(numero);
}

// ─── Traitement unifié des avantages déclarés ──────────────────────

export type TypeAvantage = "smig" | "qualitatif" | "inconnu";

export interface ResultatAvantageDeclare {
  /** Numéro du point du décret */
  numero: number;
  /** Montant déclaré par l'employeur */
  montantDeclare: number;
  /** Type détecté : SMIG (plafond calculable), qualitatif (condition), inconnu */
  type: TypeAvantage;
  /** Titre du point (undefined si inconnu) */
  titre?: string;
  /** Condition légale à respecter (uniquement pour les points qualitatifs) */
  condition?: string;
  /** true si ce point est exclu du plafond global 5% (art. 3) */
  horsPlafond5pct: boolean;
  /** true si le numéro correspond à un point valide du décret */
  valide: boolean;
}

/**
 * Traite un avantage exclu déclaré par l'employeur.
 * Identifie le type (SMIG / qualitatif / inconnu), vérifie la validité
 * du numéro de point, et retourne les informations nécessaires au moteur.
 */
export function traiterAvantageDeclare(
  avantage: { numero: number; montant: number }
): ResultatAvantageDeclare {
  const pointSMIG = getPointAvantageSMIG(avantage.numero);
  if (pointSMIG) {
    return {
      numero: avantage.numero,
      montantDeclare: avantage.montant,
      type: "smig",
      titre: pointSMIG.titre,
      horsPlafond5pct: false, // Les points SMIG sont tous soumis au plafond 5%
      valide: true,
    };
  }

  const pointQualitatif = getPointAvantageQualitatif(avantage.numero);
  if (pointQualitatif) {
    return {
      numero: avantage.numero,
      montantDeclare: avantage.montant,
      type: "qualitatif",
      titre: pointQualitatif.titre,
      condition: pointQualitatif.condition,
      horsPlafond5pct: pointQualitatif.horsPlafond5pct,
      valide: true,
    };
  }

  // Numéro inconnu — n'appartient à aucun des 24 points du décret
  return {
    numero: avantage.numero,
    montantDeclare: avantage.montant,
    type: "inconnu",
    horsPlafond5pct: false,
    valide: false,
  };
}

// ─── Calcul des plafonds SMIG ───────────────────────────────────────

/** Calcule le plafond d'exonération UNITAIRE (par bénéficiaire/repas/km) pour une date donnée. */
export function calculerPlafondUnitaire(point: PointAvantageSMIG, dateVersement: Date): number {
  const annee = dateVersement.getFullYear();
  const smigMensuel = getSmigPourAnnee(annee, 48);
  const smigHoraire = smigMensuel / (48 * 52 / 12); // conversion mensuel -> horaire (48h/semaine)

  switch (point.formule.type) {
    case "pourcentage_smig_mensuel":
      return smigMensuel * point.formule.taux;
    case "multiple_smig_mensuel":
      return smigMensuel * point.formule.multiple;
    case "multiple_smig_horaire":
      return smigHoraire * point.formule.multiple;
  }
}

// ─── Simulation point par point ─────────────────────────────────────

export interface ResultatSimulationAvantage {
  montantTotal: number;
  plafondUnitaire: number;
  plafondTotal: number;
  montantExonere: number;
  montantSoumis: number;
  montantDeclare: number;
  ecartDeclaration: number;
}

/**
 * Reproduit exactement la logique du formulaire officiel de déclaration :
 * Montant Total = Nombre x Montant unitaire
 * Plafond Total = Nombre x Plafond unitaire
 * Montant Exonéré = min(Montant Total, Plafond Total)
 * Montant Soumis = Montant Total - Montant Exonéré
 * Écart de déclaration = Montant Soumis - Montant Déclaré
 */
export function simulerAvantage(
  point: PointAvantageSMIG,
  dateVersement: Date,
  nombre: number,
  montantUnitaire: number,
  montantDeclare: number
): ResultatSimulationAvantage {
  const montantTotal = nombre * montantUnitaire;
  const plafondUnitaire = calculerPlafondUnitaire(point, dateVersement);
  const plafondTotal = nombre * plafondUnitaire;
  const montantExonere = Math.min(montantTotal, plafondTotal);
  const montantSoumis = montantTotal - montantExonere;
  const ecartDeclaration = montantSoumis - montantDeclare;

  return {
    montantTotal: round2(montantTotal),
    plafondUnitaire: round3(plafondUnitaire),
    plafondTotal: round2(plafondTotal),
    montantExonere: round2(montantExonere),
    montantSoumis: round2(montantSoumis),
    montantDeclare: round2(montantDeclare),
    ecartDeclaration: round2(ecartDeclaration),
  };
}

// ─── Plafond global 5% (Art. 3 du décret) ──────────────────────────

export interface ResultatPlafondGlobal {
  /** Total des avantages exclus soumis au plafond 5% (i.e. hors points 16,17,18,19,23,24) */
  totalAvantagesSoumisAuCap: number;
  /** Plafond autorisé = 5% × masseSalarialeBrute */
  plafondAutorise: number;
  /** Dépassement éventuel (0 si dans les clous) */
  depassement: number;
  /** Montant réintégré dans l'assiette CNSS/IRPP en cas de dépassement */
  montantReintegre: number;
  /** Détail par point : numéro → montant déclaré */
  detail: { numero: number; montant: number; soumisAuCap: boolean }[];
}

/**
 * Applique le plafond global 5% de l'article 3 du décret.
 *
 * @param avantagesDeclares - Liste des avantages exclus déclarés, avec leur
 *        numéro de point du décret et le montant mensuel.
 * @param masseSalarialeBrute - Masse salariale brute mensuelle de l'entreprise
 *        (ou du salarié pour le calcul individuel).
 * @returns Résultat du contrôle du plafond global.
 */
export function controlerPlafondGlobal5pct(
  avantagesDeclares: { numero: number; montant: number }[],
  masseSalarialeBrute: number
): ResultatPlafondGlobal {
  const TAUX_PLAFOND = 0.05;
  const plafondAutorise = masseSalarialeBrute * TAUX_PLAFOND;

  const detail = avantagesDeclares.map((a) => ({
    numero: a.numero,
    montant: a.montant,
    soumisAuCap: !estHorsPlafond5pct(a.numero),
  }));

  const totalAvantagesSoumisAuCap = avantagesDeclares
    .filter((a) => !estHorsPlafond5pct(a.numero))
    .reduce((sum, a) => sum + a.montant, 0);

  const depassement = Math.max(totalAvantagesSoumisAuCap - plafondAutorise, 0);
  const montantReintegre = round2(depassement);

  return {
    totalAvantagesSoumisAuCap: round2(totalAvantagesSoumisAuCap),
    plafondAutorise: round2(plafondAutorise),
    depassement: round2(depassement),
    montantReintegre,
    detail,
  };
}

// ─── Arrondis ───────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
