import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, UserPlus, Users, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TREASORERIE_DATA = [
  { mois: "Janvier", encaissements: 42000, decaissements: 31000 },
  { mois: "Fevrier", encaissements: 38500, decaissements: 29500 },
  { mois: "Mars", encaissements: 45200, decaissements: 33800 },
];

export default function EntrepriseDashboard() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <DollarSign className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Tableau de Bord
          </h1>
          <p className="text-xs text-muted-foreground">Vue d'ensemble de votre entreprise</p>
        </div>
      </div>

      {/* ─── Widget Financier : BarChart ─── */}
      <Card className="rounded-lg shadow-sm border border-border bg-card p-6 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Tresorerie sur 3 mois
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={TREASORERIE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mois" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="encaissements" name="Encaissements" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="decaissements" name="Decaissements" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ─── Widgets RH ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-lg shadow-sm border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-primary" />
            <p className="text-xs text-muted-foreground">Effectif Actif</p>
          </div>
          <p className="text-2xl font-bold text-foreground">24</p>
        </Card>
        <Card className="rounded-lg shadow-sm border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <p className="text-xs text-muted-foreground">Masse Salariale Nette</p>
          </div>
          <p className="text-2xl font-bold text-foreground">89 450 DT</p>
        </Card>
        <Card className="rounded-lg shadow-sm border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            <p className="text-xs text-muted-foreground">Estimation Charges Sociales</p>
          </div>
          <p className="text-2xl font-bold text-foreground">27 830 DT</p>
        </Card>
      </div>

      {/* ─── Widget Actions ─── */}
      <Card className="rounded-lg shadow-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Actions rapides
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            Saisir Paie
          </Button>
          <Button variant="outline">
            <DollarSign className="mr-2 h-4 w-4" />
            Nouvelle Facture
          </Button>
          <Button variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Ajouter Salarié
          </Button>
        </div>
      </Card>
    </div>
  );
}
