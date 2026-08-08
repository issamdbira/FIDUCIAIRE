import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ClipboardList } from "lucide-react";

interface Formulaire {
  code: string;
  nomFr: string;
  nomAr: string;
  description: string;
  categorie: string;
}

const FORMULAIRES: Formulaire[] = [
  {
    code: "I3",
    nomFr: "État Récapitulatif des Salaires Déclarés",
    nomAr: "كشف إجمالي للأجور المصرح بها",
    description:
      "Déclaration trimestrielle récapitulant l'ensemble des salaires déclarés par l'employeur au titre de chaque trimestre. Ce formulaire est obligatoire pour tout employeur affilié à la CNSS, même en l'absence de salariés (déclaration néant). Il sert de base au calcul des cotisations sociales dues.",
    categorie: "Déclarations trimestrielles",
  },
  {
    code: "I16",
    nomFr: "Bordereau de Déclaration des Cotisations Sociales",
    nomAr: "كشف تصريح بالمساهمات الاجتماعية",
    description:
      "Bordereau détaillé des cotisations sociales calculées pour chaque salarié au cours du trimestre. Il accompagne l'état I3 et précise la répartition des montants entre les différentes caisses (assurance maladie, assurance vieillesse, accidents de travail, allocations familiales).",
    categorie: "Déclarations trimestrielles",
  },
  {
    code: "TXT",
    nomFr: "Fichier d'Échange CNSS (Format 122 caractères)",
    nomAr: "ملف التبادل بالصيغة القياسية (122 حرفاً)",
    description:
      "Fichier texte au format normalisé de 122 caractères par ligne, requis par la CNSS pour le télé-déclaratif. Chaque ligne représente un salarié avec l'ensemble des champs nécessaires au traitement automatisé (matricule, salaires, cotisations, périodes). Ce fichier est généré automatiquement par la plateforme après validation.",
    categorie: "Fichiers d'échange",
  },
  {
    code: "FN",
    nomFr: "Déclaration Néant (I3 + I16)",
    nomAr: "تصريح بالعدم (كشف إجمالي + كشف مساهمات)",
    description:
      "Ensemble des documents à produire lorsqu'un employeur n'a aucun salarié déclaré au cours d'un trimestre donné. Comprend un état I3 néant et un bordereau I16 néant, imprimables en PDF avec les références de l'employeur pré-remplies.",
    categorie: "Déclarations particulières",
  },
  {
    code: "FP",
    nomFr: "Fiche de Paie Individualisée",
    nomAr: "كشف راتب فردي",
    description:
      "Document de paie détaillé pour chaque salarié, incluant les éléments de rémunération brut, les déductions CNSS, IRPP, et le net à payer. La fiche intègre le calcul automatique des avantages exclus conformément au Décret n° 2003-1098 et aux barèmes en vigueur.",
    categorie: "Documents de paie",
  },
  {
    code: "RAE",
    nomFr: "Référentiel des Avantages Exclus de l'Assiette CNSS",
    nomAr: "مرجع الامتيازات المستثناة من وعاء المساهمات",
    description:
      "Référentiel complet des 24 avantages exclus de l'assiette de calcul des cotisations sociales, tel que fixé par le Décret n° 2003-1098 du 19 mai 2003. Inclut les plafonds exprimés en multiples du SMIG avec historique des montants, ainsi qu'un simulateur de conformité point par point.",
    categorie: "Référentiels légaux",
  },
];

const CATEGORIES = [...new Set(FORMULAIRES.map((f) => f.categorie))];

export default function FormulairesCNSS() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* ─── H1 SEO ─── */}
      <h1
        className="text-2xl font-bold text-foreground mb-1"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Formulaires CNSS — Répertoire officiel bilingue
      </h1>
      <p className="text-muted-foreground text-sm mb-8">
        Découvrez tous les formulaires et documents liés aux déclarations sociales
        en Tunisie. Noms officiels en français et en arabe, descriptions détaillées
        et accès direct aux outils de génération.
      </p>

      {/* ─── Par catégorie ─── */}
      {CATEGORIES.map((cat) => {
        const items = FORMULAIRES.filter((f) => f.categorie === cat);
        return (
          <section key={cat} className="mb-10">
            {/* ─── H2 SEO ─── */}
            <h2 className="text-lg font-semibold text-foreground mb-4">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((f) => (
                <Card
                  key={f.code}
                  className="rounded-lg shadow-sm border border-border bg-card p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <Badge variant="secondary" className="mb-1.5">
                        {f.code}
                      </Badge>
                      {/* ─── H3 SEO ─── */}
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {f.nomFr}
                      </h3>
                    </div>
                  </div>

                  {/* Nom arabe avec attributs RTL */}
                  <p
                    dir="rtl"
                    lang="ar"
                    className="text-sm font-medium text-muted-foreground mb-3 leading-relaxed"
                  >
                    {f.nomAr}
                  </p>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {/* ─── Section informative SEO ─── */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Qu'est-ce que la CNSS en Tunisie ?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          La Caisse Nationale de Sécurité Sociale (CNSS) est l'organisme public
          tunisien chargé de la gestion des régimes de sécurité sociale pour le
          secteur privé. Tout employeur affilié doit effectuer des déclarations
          trimestrielles (états I3 et I16) et verser les cotisations correspondantes
          pour garantir la couverture sociale de ses salariés : assurance maladie,
          assurance vieillesse, allocations familiales et accidents de travail.
        </p>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Comment remplir les formulaires CNSS ?
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Le Fiduciaire automatise la génération de l'ensemble des formulaires CNSS
          à partir des données salariales de votre entreprise. Importez votre fichier
          Excel, vérifiez les montants, et exportez les documents PDF et fichiers TXT
          prêts à être déposés auprès de la CNSS. Tous les calculs respectent la
          législation tunisienne en vigueur, y compris les plafonds du Décret
          n° 2003-1098 relatif aux avantages exclus de l'assiette de cotisations.
        </p>
      </section>
    </div>
  );
}
