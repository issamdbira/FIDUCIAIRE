import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function Parametres() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Paramètres</h1>
          <p className="text-xs text-muted-foreground">Configuration de votre espace de travail</p>
        </div>
      </div>
      <Card className="rounded-lg shadow-sm border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Module en cours de développement.</p>
      </Card>
    </div>
  );
}
