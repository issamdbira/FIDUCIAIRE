/**
 * Moteur de calcul des avantages exclus de l'assiette des cotisations
 * sociales — Décret n° 2003-1098 du 19 mai 2003.
 *
 * Les 24 points du décret sont tous représentés :
 * - 9 points SMIG (formule chiffrée) : 1, 2, 4, 5, 7, 8, 13, 14, 20
 * - 15 points qualitatifs (catégoriels, justificatifs, variables) :
 *   3, 6, 9, 10, 11, 12, 15, 16, 17, 18, 19, 21, 22, 23, 24
 *
 * Cap global 5 % (art. 3 du décret) : le total des avantages exclus
 * soumis au cap (hors points 16, 17, 18, 19, 23, 24) ne doit pas
 * dépasser 5 % de la masse salariale brute.
 *
 * SOURCE : note administrative (CNSS, direction des études et du contrôle
 * de gestion) détaillant les plafonds jusqu'en 2028.
 */

import { getSmigPourAnnee } from "./cnss";

// ── Types ──

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

export interface PointAvantageQualitatif {
  numero: number;
  titre: string;
  condition: string; // Description de la condition légale d'exclusion
  horsPlafond5pct: boolean; // true si exclu du cap global 5% (art. 3)
}

export type PointAvantage = PointAvantageSMIG | PointAvantageQualitatif;

// ── Points SMIG (calculables) ──

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

// ── Points qualitatifs (15 restants du Décret 2003-1098) ──

export const POINTS_AVANTAGES_QUALITATIFS: PointAvantageQualitatif[] = [
  {
    numero: 3,
    titre: "Prime de colonie de vacances",
    condition: "Dans la limite des montants octroyés par la CNSS au profit de ses affiliés pour ce type de prestation (barème CNSS en vigueur, pas un pourcentage du SMIG).",
    horsPlafond5pct: false,
  },
  {
    numero: 6,
    titre: "Cadeaux à l'occasion de la mise à la retraite",
    condition: "Dans la limite de 3 mensualités du salaire de l'agent concerné (plafond dépend du salaire individuel, non du SMIG).",
    horsPlafond5pct: false,
  },
  {
    numero: 9,
    titre: "Aide exceptionnelle — événement malheureux ou décès",
    condition: "Le décret n'indique aucun plafond chiffré (contrairement aux points 7 et 8) — exclusion sans montant maximal explicite.",
    horsPlafond5pct: false,
  },
  {
    numero: 10,
    titre: "Vêtements de travail (tenues de service ou de protection)",
    condition: "Exclusion catégorielle, à condition que les vêtements demeurent la propriété de l'employeur. Pas de plafond monétaire.",
    horsPlafond5pct: false,
  },
  {
    numero: 11,
    titre: "Lait, savon et produits de préservation de la santé/sécurité au travail",
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
    condition: "Limité à la partie dépassant le salaire habituel de leurs homologues restés en Tunisie. Pas de montant SMIG.",
    horsPlafond5pct: true,
  },
  {
    numero: 18,
    titre: "Primes d'assurance collective maladie ou vie (employeur)",
    condition: "Primes d'assurance collective prises en charge par l'employeur. Pas de plafond chiffré dans le décret.",
    horsPlafond5pct: true,
  },
  {
    numero: 19,
    titre: "Contrepartie de missions temporaires pour affiliés d'un autre régime",
    condition: "Limite en heures : 10h/semaine (enseignement), 3h/semaine (autres secteurs). Sous réserve d'autorisation de l'employeur.",
    horsPlafond5pct: true,
  },
  {
    numero: 21,
    titre: "Montants — étudiants/élèves pour travaux saisonniers (vacances officielles)",
    condition: "Pas de plafond chiffré dans le décret. Réservé aux étudiants/élèves durant les vacances officielles.",
    horsPlafond5pct: false,
  },
  {
    numero: 22,
    titre: "Montants accordés aux étudiants stagiaires (stages obligatoires)",
    condition: "Limité aux montants octroyés aux stagiaires « homologues » bénéficiant de stages d'initiation à la vie professionnelle.",
    horsPlafond5pct: false,
  },
  {
    numero: 23,
    titre: "Gratifications de fin de service",
    condition: "Uniquement la part qui dépasse l'indemnité prévue par le Code du travail, sous réserve d'approbation de l'inspection du travail.",
    horsPlafond5pct: true,
  },
  {
    numero: 24,
    titre: "Dommages et intérêts fixés judiciairement",
    condition: "Montants octroyés en réparation d'un préjudice, fixés par décision de justice. Pas de plafond administratif.",
    horsPlafond5pct: true,
  },
];

// ── Registre complet (24 points) ──

/** Tous les 24 points du Décret 2003-1098, triés par numéro. */
export const TOUS_LES_POINTS: PointAvantage[] = [
  ...POINTS_AVANTAGES_SMIG,
  ...POINTS_AVANTAGES_QUALITATIFS,
].sort((a, b) => a.numero - b.numero);

export function getPointAvantageSMIG(numero: number): PointAvantageSMIG | undefined {
  return POINTS_AVANTAGES_SMIG.find((p) => p.numero === numero);
}

export function getPointAvantageQualitatif(numero: number): PointAvantageQualitatif | undefined {
  return POINTS_AVANTAGES_QUALITATIFS.find((p) => p.numero === numero);
}

export function getPointAvantage(numero: number): PointAvantage | undefined {
  return TOUS_LES_POINTS.find((p) => p.numero === numero);
}

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

// ── Cap global 5 % (article 3 du Décret 2003-1098) ──

/**
 * Vérifie le respect du cap global de 5 % de la masse salariale brute.
 *
 * Les avantages des points 16, 17, 18, 19, 23 et 24 sont EXCLUS de ce
 * cap (horsPlafond5pct = true). Seuls les autres points (1–15, 20–22)
 * y sont soumis.
 *
 * @param totalAvantagesExclusSoumisAuCap  Somme des avantages exclus soumis au cap 5 %
 * @param masseSalarialeBrute             Masse salariale brute totale de l'entreprise
 * @returns Objet indiquant si le cap est respecté et le dépassement éventuel
 */
export interface ResultatCap5Pct {
  respecte: boolean;
  plafond5pct: number;        // 5 % de la masse salariale
  totalAvantagesSoumis: number; // Total des avantages soumis au cap
  depassement: number;        // Montant au-dessus du plafond (0 si respecté)
}

export function verifierCap5Pct(
  totalAvantagesExclusSoumisAuCap: number,
  masseSalarialeBrute: number
): ResultatCap5Pct {
  const plafond5pct = round2(masseSalarialeBrute * 0.05);
  const depassement = Math.max(round2(totalAvantagesExclusSoumisAuCap - plafond5pct), 0);
  return {
    respecte: totalAvantagesExclusSoumisAuCap <= plafond5pct,
    plafond5pct,
    totalAvantagesSoumis: round2(totalAvantagesExclusSoumisAuCap),
    depassement,
  };
}

/**
 * Calcule le total des avantages exclus soumis au cap 5 %, en excluant
 * les points marqués horsPlafond5pct (16, 17, 18, 19, 23, 24).
 *
 * @param avantageParPoint Map numero → montant total de l'avantage
 * @returns Somme des montants soumis au cap 5 %
 */
export function calculerTotalAvantagesSoumisAuCap(
  avantageParPoint: Map<number, number>
): number {
  let total = 0;
  avantageParPoint.forEach((montant, numero) => {
    const qualitatif = getPointAvantageQualitatif(numero);
    if (qualitatif?.horsPlafond5pct) return;
    // Les points SMIG (1,2,4,5,7,8,13,14,20) ne sont jamais horsPlafond5pct
    total += montant;
  });
  return round2(total);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
