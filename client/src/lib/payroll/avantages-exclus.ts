/**
 * Moteur de calcul des avantages exclus de l'assiette des cotisations
 * sociales — Décret n° 2003-1098 du 19 mai 2003.
 *
 * Ne couvre que les points dont le décret fixe un plafond exprimé en
 * multiple/pourcentage du SMIG (points 1, 2, 4, 5, 7, 8, 13, 14, 20).
 * Les autres points du décret (catégoriels, conditionnés à justificatif,
 * relatifs à un montant variable...) ne sont PAS calculables ici — voir
 * la page Référentiel pour leur condition légale exacte.
 *
 * SOURCE : note administrative (CNSS, direction des études et du contrôle
 * de gestion) détaillant les plafonds jusqu'en 2028.
 */

import { getSmigPourAnnee } from "./cnss";

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

export function getPointAvantageSMIG(numero: number): PointAvantageSMIG | undefined {
  return POINTS_AVANTAGES_SMIG.find((p) => p.numero === numero);
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
