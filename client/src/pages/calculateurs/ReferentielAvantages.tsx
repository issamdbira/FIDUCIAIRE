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
 * — Décret n° 2003-1098 du 19 mai 2003.
 *
 * Contenu construit à partir d'une note de l'administration des études et
 * du contrôle de gestion (juillet 2024) détaillant les plafonds maximaux,
 * exprimés en multiples/pourcentages du SMIG, pour chaque avantage exclu de
 * l'assiette de calcul des cotisations. Ce document ne reproduit qu'une
 * partie des points du décret (les items numérotés ci-dessous) — les autres
 * numéros existent dans le décret mais leur contenu n'a pas pu être extrait
 * (document source scanné, partiel). Ils sont volontairement laissés en
 * attente plutôt qu'inventés.
 */

interface Plafond {
  periode: string;
  montant: number;
  actuel?: boolean;
}

interface AvantageExclu {
  numero: number;
  titre: string;
  base: string;
  plafonds: Plafond[];
}

const AVANTAGES: AvantageExclu[] = [
  {
    numero: 1,
    titre: "Prime de rentrée scolaire",
    base: "30% du SMIG mensuel, par enfant scolarisé",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 128.794 },
      { periode: "01/10/2022 – 30/04/2024", montant: 137.779 },
      { periode: "01/05/2024 – 31/12/2024", montant: 147.451 },
      { periode: "À partir du 01/01/2025", montant: 158.496, actuel: true },
    ],
  },
  {
    numero: 2,
    titre: "Prime de crèche et jardin d'enfants",
    base: "20% du SMIG mensuel, par enfant et par mois",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 85.862 },
      { periode: "01/10/2022 – 30/04/2024", montant: 91.852 },
      { periode: "01/05/2024 – 31/12/2024", montant: 98.301 },
      { periode: "À partir du 01/01/2025", montant: 105.664, actuel: true },
    ],
  },
  {
    numero: 4,
    titre: "Prime de réussite scolaire",
    base: "30% du SMIG mensuel, en cas de réussite scolaire d'un enfant",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 128.794 },
      { periode: "01/10/2022 – 30/04/2024", montant: 137.779 },
      { periode: "01/05/2024 – 31/12/2024", montant: 147.451 },
      { periode: "À partir du 01/01/2025", montant: 158.496, actuel: true },
    ],
  },
  {
    numero: 5,
    titre: "Prime de la médaille du travail",
    base: "2x le SMIG mensuel, dans la limite d'un mois de salaire",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 858.624 },
      { periode: "01/10/2022 – 30/04/2024", montant: 918.528 },
      { periode: "01/05/2024 – 31/12/2024", montant: 983.008 },
      { periode: "À partir du 01/01/2025", montant: 1056.640, actuel: true },
    ],
  },
  {
    numero: 7,
    titre: "Aides exceptionnelles — mariage ou pèlerinage",
    base: "2x le SMIG mensuel",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 858.624 },
      { periode: "01/10/2022 – 30/04/2024", montant: 918.528 },
      { periode: "01/05/2024 – 31/12/2024", montant: 983.008 },
      { periode: "À partir du 01/01/2025", montant: 1056.640, actuel: true },
    ],
  },
  {
    numero: 8,
    titre: "Aides exceptionnelles — naissance, circoncision, fêtes religieuses",
    base: "1x le SMIG mensuel",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 429.312 },
      { periode: "01/10/2022 – 30/04/2024", montant: 459.264 },
      { periode: "01/05/2024 – 31/12/2024", montant: 491.504 },
      { periode: "À partir du 01/01/2025", montant: 528.320, actuel: true },
    ],
  },
  {
    numero: 13,
    titre: "Frais de restauration",
    base: "3x le SMIG horaire, par repas, pour les agents ayant 2 séances de travail par jour",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 6.192 },
      { periode: "01/10/2022 – 30/04/2024", montant: 6.624 },
      { periode: "01/05/2024 – 31/12/2024", montant: 7.089 },
      { periode: "À partir du 01/01/2025", montant: 7.620, actuel: true },
    ],
  },
  {
    numero: 14,
    titre: "Frais de transport (agents itinérants)",
    base: "15% du SMIG horaire — remboursement des frais de déplacement des agents dont la nature du travail exige l'utilisation de moyens de transport",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 0.310 },
      { periode: "01/10/2022 – 30/04/2024", montant: 0.331 },
      { periode: "01/05/2024 – 31/12/2024", montant: 0.354 },
      { periode: "À partir du 01/01/2025", montant: 0.381, actuel: true },
    ],
  },
  {
    numero: 20,
    titre: "Rémunérations des collaborateurs de presse occasionnels",
    base: "2x le SMIG mensuel — rémunérations versées par les entreprises de presse à leurs collaborateurs occasionnels au titre de missions ponctuelles",
    plafonds: [
      { periode: "01/10/2020 – 30/09/2022", montant: 858.624 },
      { periode: "01/10/2022 – 30/04/2024", montant: 918.528 },
      { periode: "01/05/2024 – 31/12/2024", montant: 983.008 },
      { periode: "À partir du 01/01/2025", montant: 1056.640, actuel: true },
    ],
  },
];

// Points du décret référencés dans la note source mais dont le contenu n'a
// pas pu être extrait (document scanné, partiel) — laissés en attente,
// aucune donnée inventée.
const POINTS_NON_DOCUMENTES = [3, 6, 9, 10, 11, 12, 15, 16, 17, 18, 19];

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
            Décret n° 2003-1098 du 19 mai 2003, relatif à la détermination de la liste des avantages
            exclus de l'assiette de calcul des cotisations au titre des régimes légaux de sécurité
            sociale en Tunisie.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Plafonds exprimés en multiples/pourcentages du SMIG, avec l'historique des montants
            maximaux depuis octobre 2020.
          </p>

          {/* Recherche */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un avantage (ex: transport, scolaire, mariage...)"
              className="pl-10"
            />
          </div>

          {/* Liste des avantages documentés */}
          <Accordion type="single" collapsible className="space-y-3">
            {avantagesFiltres.map((a) => (
              <AccordionItem key={a.numero} value={`item-${a.numero}`} className="border-0">
                <Card className="border-0 shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 shrink-0">
                        Point {a.numero}
                      </Badge>
                      <span className="font-semibold text-blue-900">{a.titre}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Base de calcul :</strong> {a.base}
                    </p>
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
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>

          {avantagesFiltres.length === 0 && (
            <p className="text-center text-gray-400 py-8">Aucun avantage ne correspond à cette recherche.</p>
          )}

          {/* Points non documentés */}
          <Card className="mt-8 p-6 border-0 shadow-sm bg-amber-50">
            <h2 className="font-semibold text-blue-900 mb-2">Points du décret en attente de documentation</h2>
            <p className="text-sm text-gray-600 mb-3">
              Les points suivants existent dans le décret n° 2003-1098 mais leur contenu n'a pas pu
              être extrait de la source disponible (document scanné, partiel). Aucune donnée n'a été
              inventée pour les compléter — ils apparaissent ici en attente d'une source à jour.
            </p>
            <div className="flex flex-wrap gap-2">
              {POINTS_NON_DOCUMENTES.map((n) => (
                <Badge key={n} variant="outline" className="text-gray-500 border-gray-300">
                  Point {n} — à compléter
                </Badge>
              ))}
            </div>
          </Card>

          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-gray-600">
              <strong>Note :</strong> ce référentiel est fourni à titre informatif et ne remplace pas
              une vérification auprès des textes réglementaires officiels ou d'un expert en la matière.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
