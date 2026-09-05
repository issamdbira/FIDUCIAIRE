import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

/**
 * Bouton "← Retour aux outils" affiché en haut de chaque page de
 * fonctionnalité (calculateurs, déclarations, référentiel…).
 * Permet à l'utilisateur de revenir facilement à l'accueil sans
 * chercher dans la navbar.
 */
export default function BackToTools() {
  return (
    <Link href="/" className="inline-block mb-4">
      <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary -ml-2">
        <ArrowLeft className="size-4" />
        Retour aux outils
      </Button>
    </Link>
  );
}
