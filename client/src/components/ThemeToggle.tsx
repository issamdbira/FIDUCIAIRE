import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-white/70 hover:text-white hover:bg-white/10"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      <span className="sr-only">Basculer le thème</span>
    </Button>
  );
}
