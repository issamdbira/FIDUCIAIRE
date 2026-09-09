import { Languages } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@/components/ui/button";

export default function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
      className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5 px-2"
    >
      <Languages className="size-4" />
      <span className="text-xs font-semibold">{lang === "fr" ? "عربي" : "FR"}</span>
    </Button>
  );
}
