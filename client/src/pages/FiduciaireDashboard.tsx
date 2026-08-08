import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileStack } from "lucide-react";

type AuditStatus = "Conforme" | "Risque Plafond" | "Taux Incohérent";

type DeclarationStatus = "Déclaré" | "En attente" | "Néant";

interface DossierClient {
  nom: string;
  matriculeCnss: string;
  statutDeclarations: DeclarationStatus;
  audit: AuditStatus;
}

const DOSSIERS_MOCK: DossierClient[] = [
  { nom: "ABC TUNIS SARL", matriculeCnss: "12345678-01", statutDeclarations: "Déclaré", audit: "Conforme" },
  { nom: "XYZ SERVICES", matriculeCnss: "23456789-02", statutDeclarations: "En attente", audit: "Risque Plafond" },
  { nom: "TUNISIA LOGISTICS", matriculeCnss: "34567890-03", statutDeclarations: "Déclaré", audit: "Taux Incohérent" },
  { nom: "NORD COMMERCE", matriculeCnss: "45678901-04", statutDeclarations: "Néant", audit: "Conforme" },
  { nom: "SUD INDUSTRIE", matriculeCnss: "56789012-05", statutDeclarations: "En attente", audit: "Risque Plafond" },
];

function auditBadge(status: AuditStatus) {
  const map: Record<AuditStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
    Conforme: { variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
    "Risque Plafond": { variant: "destructive", className: "" },
    "Taux Incohérent": { variant: "outline", className: "text-amber-700 border-amber-400" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant} className={cfg.className}>{status}</Badge>;
}

function statutBadge(status: DeclarationStatus) {
  const map: Record<DeclarationStatus, { variant: "default" | "secondary" | "outline"; className: string }> = {
    "Déclaré": { variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
    "En attente": { variant: "outline", className: "" },
    Néant: { variant: "secondary", className: "" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant} className={cfg.className}>{status}</Badge>;
}

export default function FiduciaireDashboard() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileStack className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1
            className="text-xl font-bold text-foreground"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Espace Fiduciaire — Audit des Dossiers
          </h1>
          <p className="text-xs text-muted-foreground">
            Pilotage et génération en lot des déclarations CNSS
          </p>
        </div>
      </div>

      <Card className="rounded-lg shadow-sm border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dossier Client</TableHead>
              <TableHead>Matricule CNSS</TableHead>
              <TableHead>Statut Déclarations</TableHead>
              <TableHead>Audit des Déclarations</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DOSSIERS_MOCK.map((d) => (
              <TableRow key={d.matriculeCnss}>
                <TableCell className="font-medium">{d.nom}</TableCell>
                <TableCell className="font-mono text-sm">{d.matriculeCnss}</TableCell>
                <TableCell>{statutBadge(d.statutDeclarations)}</TableCell>
                <TableCell>{auditBadge(d.audit)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Générer Lot CNSS
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
