import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "wouter";

/**
 * Référentiel des avantages exclus de l'assiette des cotisations sociales
 * — Décret n° 2003-1098 du 19 mai 2003 (JORT n°41 du 23/05/2003, p.1663-1664).
 *
 * Les 24 points de l'article premier sont repris du texte officiel du
 * décret. Pour les points exprimés en pourcentage/multiple du SMIG, les
 * montants historiques (2020-2025) proviennent d'une note administrative de
 * juillet 2024. Pour les points dont la limite n'est pas un montant fixe
 * (catégorie exclue, ordre de mission, plafond horaire, excédent par
 * rapport à un montant de référence...), seule la condition légale est
 * indiquée — aucun montant n'est inventé là où le décret n'en fixe pas.
 *
 * Art. 3 du décret : le montant global des avantages exclus (au titre des
 * points ci-dessous) ne peut dépasser 5% de l'ensemble des salaires versés
 * par l'entreprise, À L'EXCEPTION des points 16, 17, 18, 19, 23 et 24, qui
 * ne sont pas comptés dans ce plafond global de 5%.
 */

type TypeLimite = "smig" | "qualitatif";

interface Plafond {
  periode: string;
  montant: number;
  actuel?: boolean;
}

interface AvantageExclu {
  numero: number;
  titre: string;
  base: string;
  type: TypeLimite;
  plafonds?: Plafond[];
  horsPlafond5pct?: boolean;
}

const PLAFONDS_30PCT_SMIG: Plafond[] = [
  { periode: "01/10/2020 – 30/09/2022", montant: 128.794 },
  { periode: "01/10/2022 – 30/04/2024", montant: 137.779 },
  { periode: "01/05/2024 – 31/12/2024", montant: 147.451 },
  { periode: "À partir du 01/01/2025", montant: 158.496, actuel: true },
];

const PLAFONDS_2X_SMIG: Plafond[] = [
  { periode: "01/10/2020 – 30/09/2022", montant: 858.624 },
  { periode: "01/10/2022 – 30/04/2024", montant: 918.528 },
  { periode: "01/05/2024 – 31/12/2024", montant: 983.008 },
  { periode: "À partir du 01/01/2025", montant: 1056.640, actuel: true },
];

const AVANTAGES: AvantageExclu[] = [
  {
    numero: 1,
    titre: "Prime de rentrée scolaire",
    base: "30% du SMIG mensuel (régime 48h/semaine), par enfant scolarisé",
    type: "smig",
    plafonds: PLAFONDS_30PCT_SMIG,
  },
  {
    numero: 2,
    titre: "Prime de crèche et de jardin d'enfants",
    base: "20% du SMIG mensuel (régime 48h/semaine), par enfant",
    type: "smig",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 85.862 },
      { periode: "01/10/2022 – 30/04/2024", montant: 91.852 },
      { periode: "01/05/2024 – 31/12/2024", montant: 98.301 },
      { periode: "À partir du 01/01/2025", montant: 105.664, actuel: true },
    ],
  },
  {
    numero: 3,
    titre: "Prime de colonie de vacances",
    base: "Dans la limite des montants octroyés par la CNSS elle-même au profit de ses affiliés pour ce type de prestation (pas un pourcentage du SMIG — montant variable selon le barème CNSS en vigueur).",
    type: "qualitatif",
  },
  {
    numero: 4,
    titre: "Prime de réussite (de l'agent ou d'un de ses enfants)",
    base: "30% du SMIG mensuel (régime 48h/semaine)",
    type: "smig",
    plafonds: PLAFONDS_30PCT_SMIG,
  },
  {
    numero: 5,
    titre: "Prime de médaille du travail",
    base: "Une mensualité de salaire, plafonnée à 2x le SMIG mensuel (régime 48h/semaine)",
    type: "smig",
    plafonds: PLAFONDS_2X_SMIG,
  },
  {
    numero: 6,
    titre: "Cadeaux (nature ou espèces) à l'occasion de la mise à la retraite",
    base: "Dans la limite de 3 mensualités du salaire DE L'AGENT CONCERNÉ (pas du SMIG — le plafond dépend donc du salaire individuel, non reproductible sous forme d'un montant fixe unique).",
    type: "qualitatif",
  },
  {
    numero: 7,
    titre: "Aides exceptionnelles — mariage ou pèlerinage",
    base: "Une mensualité de salaire, plafonnée à 2x le SMIG mensuel (régime 48h/semaine)",
    type: "smig",
    plafonds: PLAFONDS_2X_SMIG,
  },
  {
    numero: 8,
    titre: "Aides exceptionnelles — naissance, circoncision, fêtes religieuses",
    base: "Un salaire mensuel, plafonné à 1x le SMIG mensuel (régime 48h/semaine)",
    type: "smig",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 429.312 },
      { periode: "01/10/2022 – 30/04/2024", montant: 459.264 },
      { periode: "01/05/2024 – 31/12/2024", montant: 491.504 },
      { periode: "À partir du 01/01/2025", montant: 528.320, actuel: true },
    ],
  },
  {
    numero: 9,
    titre: "Aides exceptionnelles — évènement malheureux ou décès",
    base: "Le décret n'indique aucun plafond chiffré pour ce point (contrairement aux points 7 et 8) — exclusion sans montant maximal explicite dans le texte.",
    type: "qualitatif",
  },
  {
    numero: 10,
    titre: "Vêtements de travail (y compris tenues de service ou de protection)",
    base: "Exclusion catégorielle, à condition que ces vêtements demeurent la propriété de l'employeur. Pas de plafond monétaire.",
    type: "qualitatif",
  },
  {
    numero: 11,
    titre: "Lait, savon et autres produits de préservation de la santé/sécurité au travail",
    base: "Exclusion catégorielle (ou leur contre-valeur en espèces). Pas de plafond monétaire fixé par le décret.",
    type: "qualitatif",
  },
  {
    numero: 12,
    titre: "Frais de mission à l'intérieur de la République",
    base: "Séjour, restauration et transport des agents en mission, sous réserve de présentation d'un ordre de mission. Pas de plafond SMIG — conditionné à la justification documentaire.",
    type: "qualitatif",
  },
  {
    numero: 13,
    titre: "Frais de restauration",
    base: "3x le SMIG horaire (régime 48h/semaine), par repas, pour les agents ayant une journée de travail à double séance",
    type: "smig",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 6.192 },
      { periode: "01/10/2022 – 30/04/2024", montant: 6.624 },
      { periode: "01/05/2024 – 31/12/2024", montant: 7.089 },
      { periode: "À partir du 01/01/2025", montant: 7.620, actuel: true },
    ],
  },
  {
    numero: 14,
    titre: "Frais de transport (moyens personnels, usage professionnel)",
    base: "15% du SMIG horaire (régime 48h/semaine), PAR KILOMÈTRE parcouru — sous conditions : indemnité non généralisée (réservée aux agents dont l'activité exige le déplacement), justificatifs requis (ordre de mission, pièces), pas de montant fixe systématique.",
    type: "smig",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 0.310 },
      { periode: "01/10/2022 – 30/04/2024", montant: 0.331 },
      { periode: "01/05/2024 – 31/12/2024", montant: 0.354 },
      { periode: "À partir du 01/01/2025", montant: 0.381, actuel: true },
    ],
  },
  {
    numero: 15,
    titre: "Transport du personnel (compagnies aériennes, maritimes, terrestres)",
    base: "Exclusion sectorielle spécifique, sans formule SMIG ni plafond chiffré dans le décret.",
    type: "qualitatif",
  },
  {
    numero: 16,
    titre: "Indemnités liées aux actions culturelles, sportives ou de loisirs",
    base: "Ex : indemnités aux associations internes à l'entreprise, organisation d'excursions. Pas de plafond chiffré. Point EXCLU du plafond global de 5% (art. 3).",
    type: "qualitatif",
    horsPlafond5pct: true,
  },
  {
    numero: 17,
    titre: "Indemnités spécifiques — agents en mission à l'étranger (marchés/export de services)",
    base: "Limité à la partie dépassant le salaire habituel de leurs homologues restés en Tunisie (informatique, études, échanges d'expérience...). Pas de montant SMIG. Point EXCLU du plafond global de 5% (art. 3).",
    type: "qualitatif",
    horsPlafond5pct: true,
  },
  {
    numero: 18,
    titre: "Primes d'assurance collective maladie ou vie prises en charge par l'employeur",
    base: "Pas de plafond chiffré dans le décret. Point EXCLU du plafond global de 5% (art. 3).",
    type: "qualitatif",
    horsPlafond5pct: true,
  },
  {
    numero: 19,
    titre: "Contrepartie de missions temporaires pour affiliés d'un autre régime",
    base: "Limite EN HEURES (pas en montant) : 10h/semaine pour l'enseignement primaire et secondaire, 3h/semaine pour les autres secteurs — sous réserve d'autorisation de l'employeur. Point EXCLU du plafond global de 5% (art. 3).",
    type: "qualitatif",
    horsPlafond5pct: true,
  },
  {
    numero: 20,
    titre: "Salaires des collaborateurs de presse occasionnels (pigistes)",
    base: "2x le SMIG mensuel (régime 48h/semaine) par pigiste, ET plafond global : 10% de la masse salariale de l'entreprise de presse pour les quotidiens, 25% pour les hebdomadaires et autres. Conditions : activité autorisée par l'employeur d'origine, couverture sociale principale par ailleurs.",
    type: "smig",
    plafonds: PLAFONDS_2X_SMIG,
  },
  {
    numero: 21,
    titre: "Montants et avantages — étudiants/élèves pour travaux saisonniers durant les vacances officielles",
    base: "Pas de plafond chiffré dans le décret.",
    type: "qualitatif",
  },
  {
    numero: 22,
    titre: "Montants accordés aux étudiants stagiaires (stages obligatoires)",
    base: "Limité aux montants octroyés aux stagiaires \"homologues\" bénéficiant de stages d'initiation à la vie professionnelle — pas de montant SMIG fixe, référence relative.",
    type: "qualitatif",
  },
  {
    numero: 23,
    titre: "Gratifications de fin de service",
    base: "Uniquement la part qui DÉPASSE l'indemnité prévue par le Code du travail, sous réserve d'approbation de l'inspection du travail ou de la commission de contrôle des licenciements. Point EXCLU du plafond global de 5% (art. 3).",
    type: "qualitatif",
    horsPlafond5pct: true,
  },
  {
    numero: 24,
    titre: "Dommages et intérêts fixés judiciairement",
    base: "Montants octroyés en réparation d'un préjudice, fixés par décision de justice — pas de plafond administratif. Point EXCLU du plafond global de 5% (art. 3).",
    type: "qualitatif",
    horsPlafond5pct: true,
  },
];

export default function ReferentielAvantages() {
  const [recherche, setRecherche] = useState("");

  const avantagesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return AVANTAGES;
    return AVANTAGES.filter(
      (a) => a.titre.toLowerCase().includes(q) || a.base.toLowerCase().includes(q) || String(a.numero).includes(q)
    );
  }, [recherche]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2 text-blue-700 hover:text-blue-900">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Référentiel des avantages exclus de l'assiette des cotisations sociales
          </h1>
          <p className="text-gray-600 mb-2">
            Décret n° 2003-1098 du 19 mai 2003 (JORT n°41 du 23/05/2003), fixant la liste des 24
            avantages exclus de l'assiette de calcul des cotisations au titre des régimes légaux de
            sécurité sociale en Tunisie.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Les montants exprimés en multiples/pourcentages du SMIG incluent l'historique 2020-2025.
            Les points sans formule SMIG affichent la condition légale exacte, sans montant inventé.
          </p>

          <Card className="mb-8 p-4 border-0 shadow-sm bg-blue-50">
            <p className="text-sm text-gray-700">
              <strong>Règle générale (Art. 3 du décret) :</strong> le montant global des avantages
              exclus ne peut dépasser <strong>5% de l'ensemble des salaires</strong> versés par
              l'entreprise — à l'exception des points 16, 17, 18, 19, 23 et 24, qui ne sont pas
              comptabilisés dans ce plafond de 5% (badge "Hors plafond 5%" ci-dessous).
            </p>
          </Card>

          {/* Recherche */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un avantage (ex: transport, scolaire, mariage, stagiaire...)"
              className="pl-10"
            />
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {avantagesFiltres.map((a) => (
              <AccordionItem key={a.numero} value={`item-${a.numero}`} className="border-0">
                <Card className="border-0 shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3 text-left flex-wrap">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 shrink-0">
                        Point {a.numero}
                      </Badge>
                      {a.horsPlafond5pct && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 shrink-0">
                          Hors plafond 5%
                        </Badge>
                      )}
                      <span className="font-semibold text-blue-900">{a.titre}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Base de calcul / condition :</strong> {a.base}
                    </p>
                    {a.type === "smig" && a.plafonds && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Période</TableHead>
                            <TableHead className="text-right">Montant maximal (D)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {a.plafonds.map((p) => (
                            <TableRow key={p.periode}>
                              <TableCell className="flex items-center gap-2">
                                {p.periode}
                                {p.actuel && <Badge className="bg-green-100 text-green-700">Actuel</Badge>}
                              </TableCell>
                              <TableCell className="text-right font-mono">{p.montant.toFixed(3)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>

          {avantagesFiltres.length === 0 && (
            <p className="text-center text-gray-400 py-8">Aucun avantage ne correspond à cette recherche.</p>
          )}

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600">
              <strong>Note :</strong> ce référentiel est fourni à titre informatif et ne remplace pas
              une vérification auprès des textes réglementaires officiels ou d'un expert en la matière.
              Aucun de ces avantages n'est encore intégré au calcul automatique des fiches de paie —
              ils restent à saisir manuellement en attendant la validation des règles de valorisation
              fiscale/CNSS associées.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
