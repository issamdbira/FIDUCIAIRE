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
      className="text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      <span className="sr-only">Basculer le thème</span>
    </Button>
  );
}
