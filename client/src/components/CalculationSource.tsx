/**
 * CalculationSource — Affiche la source réglementaire et la date de vérification
 * à côté d'un résultat de calcul.
 *
 * Usage: <CalculationSource source="Barème IRPP 2025, art. 3 Loi n°2025-xx" verified="2025-01-01" />
 */
import { Info } from "lucide-react";

interface CalculationSourceProps {
  source: string;
  verified: string; // ISO date like "2025-01-01"
}

export default function CalculationSource({ source, verified }: CalculationSourceProps) {
  const dateStr = new Date(verified).toLocaleDateString("fr-TN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
      <Info className="size-3.5 shrink-0 mt-0.5 text-gold" />
      <span>
        <span className="font-medium">Source :</span> {source}
        <span className="mx-1.5 text-border">|</span>
        <span className="font-medium">Vérifié :</span> {dateStr}
      </span>
    </p>
  );
}
