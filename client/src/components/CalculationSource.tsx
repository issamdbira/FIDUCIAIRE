/**
 * CalculationSource — Affiche la source réglementaire et la date de vérification
 * à côté d'un résultat de calcul.
 *
 * Format enrichi (MOD4) :
 *   "Référentiel vérifié le {date} — Source : {source}"
 *   + texte (optionnel) : nom du texte + numéro + date + réf. JORT
 *   + limite (optionnelle) : portée ou limite du calcul si pertinente
 *
 * Usage:
 *   <CalculationSource
 *     source="Barème IRPP 2025 (Loi de finances 2025, art. 3)"
 *     reference="Décret n° 2003-1098 du 19 mai 2003 (JORT n° 41 du 23/05/2003)"
 *     limit="plafond global 5 % (art. 3)"
 *     verified="2025-01-01"
 *   />
 */
import { Info } from "lucide-react";

interface CalculationSourceProps {
  /** Description de la source réglementaire (barème, taux, texte de loi). */
  source: string;
  /** Date ISO de dernière vérification (ex: "2025-01-01"). */
  verified: string;
  /** Référence complète du texte : nom + numéro + date + JORT (optionnel). */
  reference?: string;
  /** Limite ou portée du calcul si pertinente (ex: "plafond 5 % (art. 3)"). */
  limit?: string;
}

export default function CalculationSource({ source, verified, reference, limit }: CalculationSourceProps) {
  const dateStr = new Date(verified).toLocaleDateString("fr-TN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
      <Info className="size-3.5 shrink-0 mt-0.5 text-gold" />
      <span>
        <span className="font-medium">Référentiel vérifié le {dateStr}</span>
        <span className="mx-1.5 text-border">—</span>
        <span className="font-medium">Source :</span> {source}
        {reference && (
          <>
            <span className="mx-1.5 text-border">—</span>
            {reference}
          </>
        )}
        {limit && (
          <>
            <span className="mx-1">,</span>
            {limit}
          </>
        )}
      </span>
    </p>
  );
}
