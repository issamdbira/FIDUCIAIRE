import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Scale, AlertTriangle } from "lucide-react";
import BackToTools from "@/components/BackToTools";

/**
 * Template d'article Guide SEO — réutilisable pour tous les guides.
 *
 * Structure SEO optimisée :
 *  - H1 = titre de la requête cible
 *  - Bloc réponse directe (2-3 phrases)
 *  - Sections d'explication
 *  - CTA interactif → calculateur
 *  - Avertissement juridique
 *
 * Anonymat total : signé au nom de la marque.
 */

interface GuideArticleProps {
  title: string;
  description: string;          // meta-description / intro courte
  reponseDirecte: React.ReactNode;
  sections: { heading: string; content: React.ReactNode }[];
  ctaLabel: string;
  ctaHref: string;
}

export default function GuideArticle({
  title,
  description,
  reponseDirecte,
  sections,
  ctaLabel,
  ctaHref,
}: GuideArticleProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <BackToTools />
      <p className="text-xs text-muted-foreground mb-2">Guide</p>
      <h1
        className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        {title}
      </h1>
      <p className="text-muted-foreground text-sm mb-8">{description}</p>

      {/* ── Réponse directe ── */}
      <Card className="p-5 rounded-lg border border-primary/20 bg-primary/5 mb-8">
        <h2 className="text-sm font-semibold text-primary mb-2">Réponse rapide</h2>
        <div className="text-sm text-foreground leading-relaxed">{reponseDirecte}</div>
      </Card>

      {/* ── Sections de contenu ── */}
      {sections.map((sec, i) => (
        <section key={i} className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">{sec.heading}</h2>
          <div className="text-sm text-foreground/90 leading-relaxed space-y-3">{sec.content}</div>
        </section>
      ))}

      {/* ── CTA Interactif ── */}
      <Card className="p-5 rounded-lg border border-primary/30 bg-primary/5 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-primary mb-1">
              Essayez le calculateur interactif
            </h3>
            <p className="text-xs text-muted-foreground">
              Obtenez un résultat personnalisé en quelques secondes — calcul 100 % local, aucune donnée transmise.
            </p>
          </div>
          <Link href={ctaHref}>
            <Button className="gap-2 shrink-0">
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* ── Avertissement juridique ── */}
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 mb-8">
        <div className="flex gap-3">
          <Scale className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Les simulations fournies par LE FIDUCIAIRE sont purement indicatives et ne
            constituent en aucun cas un avis juridique ou comptable. Elles sont basées
            sur les textes de loi et barèmes en vigueur à la date de calcul. Pour toute
            décision officielle, consultez les services compétents de la CNSS ou de
            l'administration fiscale tunisienne.
          </p>
        </div>
      </div>

      {/* ── Mention ── */}
      <p className="text-xs text-muted-foreground text-center">
        Support Technique LE FIDUCIAIRE — Mis à jour le {new Date().toLocaleDateString("fr-TN")}
      </p>
    </div>
  );
}
