import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BackToTools from "@/components/BackToTools";
import {
  Shield,
  Building2,
  Factory,
  Wheat,
  Ship,
  HomeIcon,
  Landmark,
  Users,
  Briefcase,
  Heart,
  Baby,
  PiggyBank,
  Scale,
  Info,
} from "lucide-react";

/**
 * Régimes Sociaux en Tunisie
 *
 * Données exclusivement issues des 3 sources autorisées :
 * - https://travailjuripratique.tn
 * - https://www.cnss.tn/
 * - https://secu.tn/
 */

/* ─── Types ─── */
interface Regime {
  nom: string;
  organisme: "CNSS" | "CNRPS" | "CNAM";
  secteur: string;
  tauxSalarial: string;
  tauxPatronal: string;
  tauxTotal: string;
  plafond: string;
  details: string[];
  source: string;
}

interface Prestation {
  nom: string;
  description: string;
  organisme: string;
  details: string[];
}

/* ─── Data ─── */

const REGIMES: Regime[] = [
  {
    nom: "Secteur non agricole",
    organisme: "CNSS",
    secteur: "Privé — Industrie, commerce, professions libérales",
    tauxSalarial: "9,68 %",
    tauxPatronal: "17,07 %",
    tauxTotal: "26,75 %",
    plafond: "6 × SMIG",
    details: [
      "Taux applicables depuis janvier 2025 (avant 2025 : 9,18 % salarial / 16,57 % patronal)",
      "Couvre : industrie, commerce, professions libérales, coopératives, sociétés civiles, syndicats, associations",
      "Accidents du travail (patronal) : 0,5 % à 4 % selon le secteur d'activité",
      "Assiette plafonnée à 6 fois le SMIG pour le calcul de la pension",
    ],
    source: "secu.tn — Calculateur de paie CNSS",
  },
  {
    nom: "Secteur agricole",
    organisme: "CNSS",
    secteur: "Privé — Agriculture et pêche",
    tauxSalarial: "6,99 %",
    tauxPatronal: "12,48 %",
    tauxTotal: "19,47 %",
    plafond: "SMAG journalier",
    details: [
      "Concerne : transformation de produits agricoles, services agricoux, transport public",
      "Producteurs employant des ouvriers agricoles 45+ jours/trimestre",
      "SMAG journalier : 21,336 DT (2026), 20,320 DT (2025)",
      "Jours min. travail salarié agricole : 45 jours/trimestre",
    ],
    source: "secu.tn — Calculateur de paie CNSS / cnss.tn",
  },
  {
    nom: "Pêche maritime",
    organisme: "CNSS",
    secteur: "Privé — Pêche",
    tauxSalarial: "6,99 %",
    tauxPatronal: "12,48 %",
    tauxTotal: "19,47 %",
    plafond: "SMAG journalier",
    details: [
      "Pêcheurs sur navires ≥ 30 tonnes brutes (semi-industrielle)",
      "Pêcheurs sur navires < 30 tonnes brutes (artisanale)",
      "Pêcheurs sur navires ≤ 5 tonnes brutes (petite pêche)",
    ],
    source: "cnss.tn — Employeurs/Salariés",
  },
  {
    nom: "Gens de maison",
    organisme: "CNSS",
    secteur: "Privé — Domestique",
    tauxSalarial: "9,68 %",
    tauxPatronal: "17,07 %",
    tauxTotal: "26,75 %",
    plafond: "6 × SMIG",
    details: [
      "Employés de maison : aide ménager, cuisinier, jardinier, chauffeur, etc.",
      "Travail domestique chez un ou plusieurs employeurs sans but lucratif",
    ],
    source: "cnss.tn — Employeurs",
  },
  {
    nom: "Fonction publique",
    organisme: "CNRPS",
    secteur: "Public — État et collectivités locales",
    tauxSalarial: "12,95 %",
    tauxPatronal: "—",
    tauxTotal: "—",
    plafond: "6 × SMIG",
    details: [
      "Retraite : 9,20 % | Maladie (CNAM) : 2,75 % | Capital décès : 1,00 %",
      "Total cotisation salariale : 12,95 %",
      "Âge légal de retraite : 60 ans (ordinaire), 62 ans anticipée",
      "Jours min. travail : 25 jours/mois",
    ],
    source: "secu.tn — Calculateur de paie CNRPS",
  },
];

const PRESTATIONS: Prestation[] = [
  {
    nom: "Pensions de retraite",
    description:
      "Pension de vieillesse, d'invalidité et de survivants. Âge légal : 60 ans (CNSS) / 62 ans (CNRPS). Taux : 4 % par an les 10 premières années, puis 2 % par an, maximum 80 %.",
    organisme: "CNSS / CNRPS",
    details: [
      "Retraite anticipée possible : 50 ans (femmes 3 enfants, fatigue prématurée), 55 ans (métiers pénibles)",
      "Durée min. cotisation : 10 ans pour pension complète, 5-10 ans pour proportionnelle",
      "Rachat de périodes possible dans les 2 ans suivant la fin de période",
    ],
  },
  {
    nom: "Allocations familiales",
    description:
      "Prestations versées pour les enfants à charge. Limitées aux 3 premiers enfants (âge < 16 ans, ou < 21 ans si étudiants).",
    organisme: "CNSS / CNRPS",
    details: [
      "CNSS : allocations versées mensuellement par l'employeur",
      "CNRPS : 7,320 DT (1er enfant), 6,507 DT (2e), 5,693 DT (3e)",
      "Allocation salaire unique CNRPS : 3,125 DT / 6,250 DT / 7,825 DT",
    ],
  },
  {
    nom: "Assurances sociales",
    description:
      "Prestations en espèces pour maladie, maternité, invalidité et décès. Les cotisations maladie sont collectées par CNSS/CNRPS puis transférées à la CNAM.",
    organisme: "CNAM (via CNSS/CNRPS)",
    details: [
      "Cotisations maladie collectées par CNSS/CNRPS, puis transférées à la CNAM",
      "Congé maternité : 30 jours (secteur privé) — extendable",
      "Congé paternité : 1 jour (depuis loi 2024)",
    ],
  },
  {
    nom: "Accidents du travail et maladies professionnelles",
    description:
      "Régime spécifique couvrant les accidents survenus sur le lieu de travail et les maladies professionnelles reconnues. Taux patronal variable : 0,5 % à 4 % selon le secteur.",
    organisme: "CNSS",
    details: [
      "Taux AT variable selon le secteur d'activité (0,5 % à 4 %)",
      "Liste des maladies professionnelles révisée en 2018",
      "Indemnisation : soins + indemnités d'incapacité + rente",
    ],
  },
  {
    nom: "Prêts sociaux",
    description:
      "Prêts personnels, immobiliers, automobiles et universitaires accordés aux assurés sociaux justifiant d'une ancienneté suffisante.",
    organisme: "CNSS",
    details: [
      "Prêt personnel : 12 mois + 2 mois de grâce, renouvelable",
      "Prêt habitat : 20 ans max + 3 mois de grâce, renouvelable 1 fois",
      "Prêt automobile : 7 ans (neuf) / 5 ans (occasion), taux 8,25 % (6 % si handicapé)",
      "Prêt universitaire : taux 3 % (réduit depuis 2017), durée = études + 1 an",
    ],
  },
];

const BARREME_IRPP_2025 = [
  { tranche: "0 — 5 000 DT", taux: "0 %" },
  { tranche: "5 000 — 10 000 DT", taux: "15 %" },
  { tranche: "10 000 — 20 000 DT", taux: "25 %" },
  { tranche: "20 000 — 30 000 DT", taux: "30 %" },
  { tranche: "30 000 — 40 000 DT", taux: "33 %" },
  { tranche: "40 000 — 50 000 DT", taux: "36 %" },
  { tranche: "50 000 — 70 000 DT", taux: "38 %" },
  { tranche: "Au-delà de 70 000 DT", taux: "40 %" },
];

const SMIG_SMAG = [
  { annee: "2026", smigHoraire: "2,667", smigMensuel48h: "554,736", smigMensuel40h: "470,251", smagJour: "21,336" },
  { annee: "2025", smigHoraire: "2,540", smigMensuel48h: "528,320", smigMensuel40h: "448,238", smagJour: "20,320" },
  { annee: "2024", smigHoraire: "2,363", smigMensuel48h: "472,600", smigMensuel40h: "—", smagJour: "18,904" },
  { annee: "2022", smigHoraire: "2,208", smigMensuel48h: "441,600", smigMensuel40h: "—", smagJour: "17,664" },
  { annee: "2020", smigHoraire: "2,064", smigMensuel48h: "412,800", smigMensuel40h: "—", smagJour: "16,512" },
];

const ORGANISMES = [
  {
    nom: "CNSS",
    nomComplet: "Caisse Nationale de Sécurité Sociale",
    description:
      "Couvre les travailleurs du secteur privé : salariés, non-salariés, travailleurs à domicile, artistes et intellectuels. Gère les régimes de retraite, allocations familiales, assurances sociales, accidents du travail et prêts sociaux.",
    icon: Factory,
    couleur: "bg-blue-600",
  },
  {
    nom: "CNRPS",
    nomComplet: "Caisse Nationale de Retraite et de Prévoyance Sociale",
    description:
      "Couvre les fonctionnaires publics, agents des collectivités locales et des établissements publics à caractère administratif. Gère les régimes de retraite, allocations familiales et prêts.",
    icon: Landmark,
    couleur: "bg-emerald-600",
  },
  {
    nom: "CNAM",
    nomComplet: "Caisse Nationale d'Assurance Maladie",
    description:
      "Couvre l'assurance maladie pour tous les Tunisiens (secteur public et privé, travailleurs indépendants). Les cotisations sont collectées par la CNSS ou la CNRPS puis transférées à la CNAM.",
    icon: Heart,
    couleur: "bg-rose-600",
  },
];

/* ─── Component ─── */
export default function RegimesSociaux() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <BackToTools />

      {/* ─── Header ─── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Shield className="size-7 text-primary" />
          Régimes sociaux en Tunisie
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-3xl">
          Les régimes de sécurité sociale en Tunisie reposent sur trois organismes principaux
          opérant sous le régime légal et obligatoire. Les données ci-dessous sont
          exclusivement issues des sources officielles :{" "}
          <a href="https://travailjuripratique.tn" target="_blank" rel="noopener" className="text-primary underline">travailjuripratique.tn</a>,{" "}
          <a href="https://www.cnss.tn" target="_blank" rel="noopener" className="text-primary underline">cnss.tn</a> et{" "}
          <a href="https://secu.tn" target="_blank" rel="noopener" className="text-primary underline">secu.tn</a>.
        </p>
      </div>

      {/* ─── Organismes ─── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Building2 className="size-5 text-primary" />
          Les trois organismes de sécurité sociale
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ORGANISMES.map((o) => (
            <Card key={o.nom} className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={`inline-flex items-center justify-center size-8 rounded-full text-white text-xs font-bold ${o.couleur}`}>
                    {o.nom}
                  </span>
                  <span>{o.nomComplet}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {o.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Régimes par secteur ─── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Users className="size-5 text-primary" />
          Régimes de cotisation par secteur
        </h2>
        <div className="space-y-4">
          {REGIMES.map((r) => (
            <Card key={r.nom}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {r.organisme === "CNSS" ? (
                      <Factory className="size-4 text-blue-600" />
                    ) : (
                      <Landmark className="size-4 text-emerald-600" />
                    )}
                    {r.nom}
                  </CardTitle>
                  <div className="flex gap-1.5">
                    <Badge variant="outline" className="text-xs">
                      {r.organisme}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {r.secteur}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Rates table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-medium">Part salariale</th>
                        <th className="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-medium">Part patronale</th>
                        <th className="text-left py-1.5 pr-3 text-slate-500 dark:text-slate-400 font-medium">Total</th>
                        <th className="text-left py-1.5 text-slate-500 dark:text-slate-400 font-medium">Plafond</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-semibold text-slate-800 dark:text-slate-200">
                        <td className="py-1.5 pr-3">{r.tauxSalarial}</td>
                        <td className="py-1.5 pr-3">{r.tauxPatronal}</td>
                        <td className="py-1.5 pr-3">{r.tauxTotal}</td>
                        <td className="py-1.5">{r.plafond}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Details */}
                <ul className="space-y-1">
                  {r.details.map((d, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
                  <Info className="size-3" /> Source : {r.source}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Prestations ─── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Baby className="size-5 text-primary" />
          Prestations sociales
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PRESTATIONS.map((p) => (
            <Card key={p.nom} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">{p.nom}</CardTitle>
                  <Badge variant="outline" className="text-xs shrink-0">{p.organisme}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {p.description}
                </p>
                <ul className="space-y-1">
                  {p.details.map((d, i) => (
                    <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Barème IRPP 2025 ─── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Scale className="size-5 text-primary" />
          Barème IRPP 2025 (Impôt sur le Revenu des Personnes Physiques)
        </h2>
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 text-slate-500 dark:text-slate-400 font-medium">Tranche (DT/an)</th>
                    <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {BARREME_IRPP_2025.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        row.taux === "0 %" ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <td className="py-1.5 pr-4">{row.tranche}</td>
                      <td className="py-1.5 font-semibold">{row.taux}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <p>• Frais professionnels : 10 % du salaire imposable, plafonnés à 2 000 DT</p>
              <p>• Déduction chef de famille : 300 DT</p>
              <p>• Déduction par enfant (max 4, &lt; 20 ans) : 100 DT</p>
              <p>• Parents en charge : 5 % par parent, plafonné à 450 DT/parent</p>
              <p className="italic flex items-center gap-1">
                <Info className="size-3" /> Source : secu.tn — Calculateur IRPP
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── SMIG / SMAG ─── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Briefcase className="size-5 text-primary" />
          SMIG et SMAG — Valeurs récentes
        </h2>
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium">Année</th>
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium">SMIG/h (DT)</th>
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium">48h/mois (DT)</th>
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium">40h/mois (DT)</th>
                    <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">SMAG/jour (DT)</th>
                  </tr>
                </thead>
                <tbody>
                  {SMIG_SMAG.map((row) => (
                    <tr
                      key={row.annee}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        row.annee === "2026" ? "font-semibold text-primary" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <td className="py-1.5 pr-3">{row.annee}</td>
                      <td className="py-1.5 pr-3">{row.smigHoraire}</td>
                      <td className="py-1.5 pr-3">{row.smigMensuel48h}</td>
                      <td className="py-1.5 pr-3">{row.smigMensuel40h}</td>
                      <td className="py-1.5">{row.smagJour}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <p>• SMIG = Salaire Minimum Interprofessionnel Garanti (secteur non agricole)</p>
              <p>• SMAG = Salaire Minimum Agricole Garanti (secteur agricole)</p>
              <p>• Prime de transport : 36,112 DT/mois | Prime de présence : 2,080 DT/mois</p>
              <p>• Heures supplémentaires : 48h → majoration 75 % ; 40h → 25 % (8 premières h), puis 50 %</p>
              <p className="italic flex items-center gap-1">
                <Info className="size-3" /> Source : secu.tn — SMIG/SMAG
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ─── Non-salariés ─── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <PiggyBank className="size-5 text-primary" />
          Cotisations des non-salariés
        </h2>
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium">Catégorie</th>
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium">Taux</th>
                    <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Classes (coeff. × SMIG)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-slate-200">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3">Non-salariés</td>
                    <td className="py-1.5 pr-3 font-semibold">14,71 %</td>
                    <td className="py-1.5">1, 1.5, 2, 3, 4, 6, 9, 12, 15, 18</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3">Travailleurs à l'étranger</td>
                    <td className="py-1.5 pr-3 font-semibold">13,3 %</td>
                    <td className="py-1.5">2, 4, 6, 9</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3">Artistes</td>
                    <td className="py-1.5 pr-3 font-semibold">14,71 %</td>
                    <td className="py-1.5">2, 2.5, 3, 4, 5, 7, 10, 13, 16, 18</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3">Faible revenu</td>
                    <td className="py-1.5 pr-3 font-semibold">7,5 %</td>
                    <td className="py-1.5">0,6667 (⅔ SMIG)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cotisation trimestrielle = coefficient × SMIG × taux × 3 mois
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
              <Info className="size-3" /> Source : secu.tn — Cotisations non-salariés
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ─── CSS (Contribution Sociale de Solidarité) ─── */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Wheat className="size-5 text-primary" />
          Contribution Sociale de Solidarité (CSS)
        </h2>
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-3 text-slate-500 dark:text-slate-400 font-medium">Période</th>
                    <th className="text-left py-2 text-slate-500 dark:text-slate-400 font-medium">Taux</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-slate-200">
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3">2018 – 2022</td>
                    <td className="py-1.5 font-semibold">1 %</td>
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-3">2023 – 2025</td>
                    <td className="py-1.5 font-semibold">0,5 %</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3">À partir de 2026</td>
                    <td className="py-1.5 font-semibold text-emerald-600">0 % (supprimée)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exonération : assiette &lt; 5 000 DT (depuis 2020). Suppression définitive par la Loi de finances 2026.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 italic flex items-center gap-1">
              <Info className="size-3" /> Source : secu.tn — Calculateur IRPP
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ─── Sources ─── */}
      <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Sources officielles</h3>
        <ul className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
          <li>
            <a href="https://travailjuripratique.tn" target="_blank" rel="noopener" className="text-primary underline hover:no-underline">
              travailjuripratique.tn
            </a>{" "}
            — Références juridiques, conventions collectives, Code du travail
          </li>
          <li>
            <a href="https://www.cnss.tn" target="_blank" rel="noopener" className="text-primary underline hover:no-underline">
              cnss.tn
            </a>{" "}
            — CNSS : affiliations, cotisations, prestations, formulaires
          </li>
          <li>
            <a href="https://secu.tn" target="_blank" rel="noopener" className="text-primary underline hover:no-underline">
              secu.tn
            </a>{" "}
            — Calculateurs de paie CNSS/CNRPS, barème IRPP, SMIG/SMAG
          </li>
        </ul>
      </section>
    </div>
  );
}
