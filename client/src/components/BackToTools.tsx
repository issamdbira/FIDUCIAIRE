import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

/**
 * Bouton "← Retour à l'accueil" affiché en haut de chaque page de
 * fonctionnalité (calculateurs, déclarations, référentiel…).
 *
 * Modèle Hub & Spoke : puisque la navbar ne contient plus de liens
 * vers les outils, ce bouton est le seul moyen de revenir au Hub.
 * Il est donc très visible (variant outline, size default).
 */
export default function BackToTools() {
  return (
    <Link href="/" className="inline-block mb-4">
      <Button variant="outline" size="sm" className="gap-1.5 text-slate-700 hover:text-primary dark:text-slate-300 dark:hover:text-primary -ml-1">
        <ArrowLeft className="size-4" />
        Retour à l'accueil
      </Button>
    </Link>
  );
}
