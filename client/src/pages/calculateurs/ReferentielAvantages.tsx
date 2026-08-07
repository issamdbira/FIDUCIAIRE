import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calculator, Search } from "lucide-react";
import { Link } from "wouter";
import { getPointAvantageSMIG, simulerAvantage } from "@/lib/payroll/avantages-exclus";
import { formatMontantDT } from "@/lib/utils";

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
  { periode: "01/01/2025 – 31/12/2025", montant: 158.496 },
  { periode: "01/01/2026 – 31/12/2026", montant: 166.421, actuel: true },
  { periode: "01/01/2027 – 31/12/2027", montant: 174.720 },
  { periode: "À partir du 01/01/2028", montant: 183.456 },
];

const PLAFONDS_2X_SMIG: Plafond[] = [
  { periode: "01/10/2020 – 30/09/2022", montant: 858.624 },
  { periode: "01/10/2022 – 30/04/2024", montant: 918.528 },
  { periode: "01/05/2024 – 31/12/2024", montant: 983.008 },
  { periode: "01/01/2025 – 31/12/2025", montant: 1056.640 },
  { periode: "01/01/2026 – 31/12/2026", montant: 1109.472, actuel: true },
  { periode: "01/01/2027 – 31/12/2027", montant: 1164.800 },
  { periode: "À partir du 01/01/2028", montant: 1223.040 },
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
      { periode: "01/01/2025 – 31/12/2025", montant: 105.664 },
      { periode: "01/01/2026 – 31/12/2026", montant: 110.947, actuel: true },
      { periode: "01/01/2027 – 31/12/2027", montant: 116.480 },
      { periode: "À partir du 01/01/2028", montant: 122.304 },
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
      { periode: "01/01/2025 – 31/12/2025", montant: 528.320 },
      { periode: "01/01/2026 – 31/12/2026", montant: 554.736, actuel: true },
      { periode: "01/01/2027 – 31/12/2027", montant: 582.400 },
      { periode: "À partir du 01/01/2028", montant: 611.520 },
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
      { periode: "01/01/2025 – 31/12/2025", montant: 7.620 },
      { periode: "01/01/2026 – 31/12/2026", montant: 8.001, actuel: true },
      { periode: "01/01/2027 – 31/12/2027", montant: 8.400 },
      { periode: "À partir du 01/01/2028", montant: 8.820 },
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
      { periode: "01/01/2025 – 31/12/2025", montant: 0.381 },
      { periode: "01/01/2026 – 31/12/2026", montant: 0.400, actuel: true },
      { periode: "01/01/2027 – 31/12/2027", montant: 0.420 },
      { periode: "À partir du 01/01/2028", montant: 0.441 },
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

/**
 * Simulateur point par point — reproduit la logique du formulaire officiel
 * de déclaration (nombre x montant unitaire, plafond, exonéré, soumis,
 * écart de déclaration).
 */
function SimulateurPoint({ numero }: { numero: number }) {
  const point = getPointAvantageSMIG(numero);
  const [nombre, setNombre] = useState(1);
  const [montantUnitaire, setMontantUnitaire] = useState(0);
  const [dateVersement, setDateVersement] = useState(new Date().toISOString().slice(0, 10));
  const [montantDeclare, setMontantDeclare] = useState(0);

  if (!point) return null;

  const resultat = simulerAvantage(point, new Date(dateVersement), nombre, montantUnitaire, montantDeclare);

  return (
    <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-blue-100">
      <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <Calculator className="w-4 h-4" /> Simulateur — {point.uniteNombre}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div>
          <Label className="text-xs mb-1 block">Nombre ({point.uniteNombre})</Label>
          <Input type="number" min="0" value={nombre} onChange={(e) => setNombre(parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Montant unitaire (D)</Label>
          <Input type="number" min="0" step="0.001" value={montantUnitaire} onChange={(e) => setMontantUnitaire(parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Date de versement</Label>
          <Input type="date" value={dateVersement} onChange={(e) => setDateVersement(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Montant déclaré (D)</Label>
          <Input type="number" min="0" step="0.01" value={montantDeclare} onChange={(e) => setMontantDeclare(parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="text-muted-foreground">Montant total (nombre × montant unitaire)</TableCell>
            <TableCell className="text-right font-mono">{formatMontantDT(resultat.montantTotal)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Plafond unitaire applicable à cette date</TableCell>
            <TableCell className="text-right font-mono">{formatMontantDT(resultat.plafondUnitaire)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Plafond total (nombre × plafond unitaire)</TableCell>
            <TableCell className="text-right font-mono">{formatMontantDT(resultat.plafondTotal)}</TableCell>
          </TableRow>
          <TableRow className="bg-green-50">
            <TableCell className="text-green-700 font-medium">Montant exonéré</TableCell>
            <TableCell className="text-right font-mono text-green-700 font-medium">{formatMontantDT(resultat.montantExonere)}</TableCell>
          </TableRow>
          <TableRow className="bg-red-50">
            <TableCell className="text-red-700 font-medium">Montant soumis (CNSS + IRPP)</TableCell>
            <TableCell className="text-right font-mono text-red-700 font-medium">{formatMontantDT(resultat.montantSoumis)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className={resultat.ecartDeclaration !== 0 ? "text-amber-700 font-medium" : "text-muted-foreground"}>
              Écart de déclaration (soumis − déclaré)
            </TableCell>
            <TableCell className={`text-right font-mono ${resultat.ecartDeclaration !== 0 ? "text-amber-700 font-medium" : ""}`}>
              {formatMontantDT(resultat.ecartDeclaration)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

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
    <div className="max-w-3xl mx-auto py-8 px-4">
          <h2
            className="text-2xl font-bold text-foreground mb-1"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Référentiel des avantages exclus de l'assiette des cotisations sociales
          </h2>
          <p className="text-muted-foreground text-sm mb-2">
            Décret n° 2003-1098 du 19 mai 2003 (JORT n°41 du 23/05/2003), fixant la liste des 24
            avantages exclus de l'assiette de calcul des cotisations au titre des régimes légaux de
            sécurité sociale en Tunisie.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Les montants exprimés en multiples/pourcentages du SMIG incluent l'historique 2020-2025.
            Les points sans formule SMIG affichent la condition légale exacte, sans montant inventé.
          </p>

          <Card className="mb-8 p-4 rounded-lg shadow-sm border border-border bg-card bg-primary/5">
            <p className="text-sm text-muted-foreground">
              <strong>Règle générale (Art. 3 du décret) :</strong> le montant global des avantages
              exclus ne peut dépasser <strong>5% de l'ensemble des salaires</strong> versés par
              l'entreprise — à l'exception des points 16, 17, 18, 19, 23 et 24, qui ne sont pas
              comptabilisés dans ce plafond de 5% (badge "Hors plafond 5%" ci-dessous).
            </p>
          </Card>

          {/* Recherche */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                <Card className="rounded-lg shadow-sm border border-border bg-card overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3 text-left flex-wrap">
                      <Badge variant="secondary" className="bg-blue-100 text-primary shrink-0">
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
                    <p className="text-sm text-muted-foreground mb-4">
                      <strong>Base de calcul / condition :</strong> {a.base}
                    </p>
                    {a.type === "smig" && a.plafonds && (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Période</TableHead>
                              <TableHead className="text-right">Montant maximal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {a.plafonds.map((p) => (
                              <TableRow key={p.periode}>
                                <TableCell className="flex items-center gap-2">
                                  {p.periode}
                                  {p.actuel && <Badge className="bg-green-100 text-green-700">Actuel</Badge>}
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatMontantDT(p.montant)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <SimulateurPoint numero={a.numero} />
                      </>
                    )}
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>

          {avantagesFiltres.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Aucun avantage ne correspond à cette recherche.</p>
          )}

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-muted-foreground">
              <strong>Note :</strong> ce référentiel est fourni à titre informatif et ne remplace pas
              une vérification auprès des textes réglementaires officiels ou d'un expert en la matière.
              Les 9 points ci-dessus dotés d'un plafond SMIG sont intégrés au calcul automatique du
              générateur de fiche de paie (répartition exonéré/soumis). Les autres points du décret
              restent à saisir manuellement, leur nature de limite n'étant pas un montant fixe.
            </p>
          </div>
    </div>
  );
}
