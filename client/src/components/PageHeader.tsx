import { useLang } from "@/contexts/LangContext";

interface PageHeaderProps {
  titleFr: string;
  titleAr: string;
  subtitleFr?: string;
  subtitleAr?: string;
}

/**
 * Bilingual page header — displays title in current language (FR/AR)
 * with automatic font switching and RTL support.
 */
export default function PageHeader({ titleFr, titleAr, subtitleFr, subtitleAr }: PageHeaderProps) {
  const { isAr } = useLang();

  const titleStyle = isAr
    ? { fontFamily: "'Noto Sans Arabic', sans-serif" }
    : { fontFamily: "Montserrat, sans-serif" };

  return (
    <div className="mb-6">
      <h2
        className="text-2xl font-bold text-foreground mb-1"
        style={titleStyle}
      >
        {isAr ? titleAr : titleFr}
      </h2>
      {(subtitleFr || subtitleAr) && (
        <p className="text-muted-foreground text-sm" style={isAr ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : undefined}>
          {isAr ? (subtitleAr ?? subtitleFr) : subtitleFr}
        </p>
      )}
    </div>
  );
}
