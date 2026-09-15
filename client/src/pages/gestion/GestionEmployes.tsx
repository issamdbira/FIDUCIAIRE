// =============================================================================
// Le Fiduciaire — Gestion des Employés (CRUD complet)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, type ApiError } from "@/lib/api";
import { getWorkspaceId } from "@/lib/workspace";
import BackToTools from "@/components/BackToTools";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Archive,
  RotateCcw,
  UserPlus,
  Building2,
  IdCard,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface ContractBrief {
  id: string;
  type: string;
  poste: string;
  dateDebut: string;
  dateFin: string | null;
}

interface ClientBrief {
  id: string;
  raisonSociale: string;
}

interface EstablishmentBrief {
  id: string;
  designation: string;
}

interface Employee {
  id: string;
  matriculeCnss: string;
  firstName: string;
  lastName: string;
  baseSalary: number;
  civilStatus: string;
  numberOfChildren: number;
  isActive: boolean;
  hiredAt: string | null;
  departedAt: string | null;
  clientCompanyId: string | null;
  establishmentId: string | null;
  client_company?: ClientBrief | null;
  establishment?: EstablishmentBrief | null;
  contracts?: ContractBrief[];
}

interface EmployeeFormData {
  clientCompanyId: string;
  establishmentId: string;
  matriculeCnss: string;
  firstName: string;
  lastName: string;
  baseSalary: string;
  civilStatus: string;
  numberOfChildren: string;
  hiredAt: string;
}

// =============================================================================
// Constantes
// =============================================================================

const CIVIL_STATUS_OPTIONS = [
  { value: "CELIBATAIRE", label: "Célibataire" },
  { value: "MARIE", label: "Marié(e)" },
  { value: "DIVORCE", label: "Divorcé(e)" },
  { value: "VEUF", label: "Veuf/Veuve" },
];

const EMPTY_FORM: EmployeeFormData = {
  clientCompanyId: "",
  establishmentId: "",
  matriculeCnss: "",
  firstName: "",
  lastName: "",
  baseSalary: "",
  civilStatus: "CELIBATAIRE",
  numberOfChildren: "0",
  hiredAt: new Date().toISOString().slice(0, 10),
};

// =============================================================================
// Composant
// =============================================================================

export default function GestionEmployes() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<ClientBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

  // ── Fetch employees ──
  const fetchEmployees = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterActive) params.set("activeOnly", "true");
      const data = await api.get<Employee[]>(`/employees/${workspaceId}?${params}`);
      setEmployees(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des salariés");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, search, filterActive]);

  // ── Fetch clients (for the select dropdown) ──
  const fetchClients = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await api.get<any[]>(`/clients/${workspaceId}`);
      setClients(data.map((c: any) => ({ id: c.id, raisonSociale: c.raisonSociale })));
    } catch {
      // Silently fail — clients list is optional
    }
  }, [workspaceId]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── Open create dialog ──
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  // ── Open edit dialog ──
  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      clientCompanyId: emp.clientCompanyId || "",
      establishmentId: emp.establishmentId || "",
      matriculeCnss: emp.matriculeCnss,
      firstName: emp.firstName,
      lastName: emp.lastName,
      baseSalary: String(emp.baseSalary),
      civilStatus: emp.civilStatus,
      numberOfChildren: String(emp.numberOfChildren),
      hiredAt: emp.hiredAt ? new Date(emp.hiredAt).toISOString().slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  // ── Save (create or update) ──
  const handleSave = async () => {
    if (!workspaceId) return;
    if (!form.matriculeCnss || !form.firstName || !form.lastName || !form.baseSalary) {
      toast.error("Matricule CNSS, nom, prénom et salaire de base sont requis");
      return;
    }
    setSaving(true);
    try {
      const body = {
        workspaceId,
        clientCompanyId: form.clientCompanyId || null,
        establishmentId: form.establishmentId || null,
        matriculeCnss: form.matriculeCnss,
        firstName: form.firstName,
        lastName: form.lastName,
        baseSalary: parseFloat(form.baseSalary),
        civilStatus: form.civilStatus,
        numberOfChildren: parseInt(form.numberOfChildren, 10) || 0,
        hiredAt: form.hiredAt || undefined,
      };

      if (editingId) {
        await api.put(`/employees/${workspaceId}/${editingId}`, body);
        toast.success("Salarié mis à jour");
      } else {
        await api.post("/employees", body);
        toast.success("Salarié créé");
      }
      setDialogOpen(false);
      fetchEmployees();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // ── Archive / Activate ──
  const handleArchive = async (emp: Employee) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/employees/${workspaceId}/${emp.id}/archive`);
      toast.success(`${emp.firstName} ${emp.lastName} archivé`);
      fetchEmployees();
    } catch (err) {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleActivate = async (emp: Employee) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/employees/${workspaceId}/${emp.id}/activate`);
      toast.success(`${emp.firstName} ${emp.lastName} réactivé`);
      fetchEmployees();
    } catch (err) {
      toast.error("Erreur lors de la réactivation");
    }
  };

  // ── Detail view ──
  const openDetail = async (emp: Employee) => {
    if (!workspaceId) return;
    try {
      const data = await api.get<Employee>(`/employees/${workspaceId}/${emp.id}`);
      setDetailEmployee(data);
      setDetailOpen(true);
    } catch {
      toast.error("Erreur lors du chargement du détail");
    }
  };

  // ── No workspace guard ─────────────────────────────────────────────────
  if (!workspaceId) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <BackToTools />
        <Card className="p-6 border border-destructive/30">
          <p className="text-destructive">
            Aucun workspace sélectionné. Veuillez vous reconnecter.
          </p>
        </Card>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <BackToTools />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Gestion des Salariés
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créer, modifier et archiver les salariés de votre workspace.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="size-4" />
          Ajouter un salarié
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterActive ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterActive(true)}
          >
            Actifs
          </Button>
          <Button
            variant={!filterActive ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterActive(false)}
          >
            Tous
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : employees.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <UserPlus className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun salarié trouvé.</p>
              <p className="text-xs mt-1">Cliquez sur « Ajouter un salarié » pour commencer.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Matricule CNSS</TableHead>
                  <TableHead className="hidden sm:table-cell">Entreprise</TableHead>
                  <TableHead className="text-right">Salaire de base</TableHead>
                  <TableHead className="hidden md:table-cell">Situation</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className={!emp.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      {emp.lastName} {emp.firstName}
                      {!emp.isActive && (
                        <Badge variant="outline" className="ml-2 text-xs">Archivé</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{emp.matriculeCnss}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {emp.client_company?.raisonSociale || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {emp.baseSalary.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {CIVIL_STATUS_OPTIONS.find((o) => o.value === emp.civilStatus)?.label || emp.civilStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(emp)} className="gap-2">
                            <Eye className="size-3.5" /> Voir détail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(emp)} className="gap-2">
                            <Pencil className="size-3.5" /> Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {emp.isActive ? (
                            <DropdownMenuItem onClick={() => handleArchive(emp)} className="gap-2 text-destructive">
                              <Archive className="size-3.5" /> Archiver
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleActivate(emp)} className="gap-2">
                              <RotateCcw className="size-3.5" /> Réactiver
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le salarié" : "Ajouter un salarié"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Modifiez les informations du salarié." : "Renseignez les informations du nouveau salarié."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Entreprise cliente */}
            <div className="space-y-1.5">
              <Label>Entreprise cliente</Label>
              <Select value={form.clientCompanyId} onValueChange={(v) => setForm({ ...form, clientCompanyId: v, establishmentId: "" })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une entreprise" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Matricule CNSS */}
            <div className="space-y-1.5">
              <Label>Matricule CNSS <span className="text-destructive">*</span></Label>
              <Input
                value={form.matriculeCnss}
                onChange={(e) => setForm({ ...form, matriculeCnss: e.target.value })}
                placeholder="8 chiffres"
                maxLength={8}
              />
            </div>

            {/* Nom / Prénom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom <span className="text-destructive">*</span></Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Prénom <span className="text-destructive">*</span></Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
            </div>

            {/* Salaire de base */}
            <div className="space-y-1.5">
              <Label>Salaire de base (DT) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.001"
                value={form.baseSalary}
                onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                placeholder="0.000"
              />
            </div>

            {/* Situation familiale / Enfants */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Situation familiale</Label>
                <Select value={form.civilStatus} onValueChange={(v) => setForm({ ...form, civilStatus: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CIVIL_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nombre d'enfants</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.numberOfChildren}
                  onChange={(e) => setForm({ ...form, numberOfChildren: e.target.value })}
                />
              </div>
            </div>

            {/* Date d'embauche */}
            <div className="space-y-1.5">
              <Label>Date d'embauche</Label>
              <Input
                type="date"
                value={form.hiredAt}
                onChange={(e) => setForm({ ...form, hiredAt: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail du salarié</DialogTitle>
          </DialogHeader>
          {detailEmployee && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nom complet</span>
                  <p className="font-medium">{detailEmployee.lastName} {detailEmployee.firstName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Matricule CNSS</span>
                  <p className="font-mono">{detailEmployee.matriculeCnss}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Salaire de base</span>
                  <p className="font-mono">{detailEmployee.baseSalary.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} DT</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Situation</span>
                  <p>{CIVIL_STATUS_OPTIONS.find((o) => o.value === detailEmployee.civilStatus)?.label}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Enfants</span>
                  <p>{detailEmployee.numberOfChildren}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Entreprise</span>
                  <p>{detailEmployee.client_company?.raisonSociale || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date d'embauche</span>
                  <p>{detailEmployee.hiredAt ? new Date(detailEmployee.hiredAt).toLocaleDateString("fr-TN") : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Statut</span>
                  <Badge variant={detailEmployee.isActive ? "default" : "outline"}>
                    {detailEmployee.isActive ? "Actif" : "Archivé"}
                  </Badge>
                </div>
              </div>

              {/* Contrats */}
              {detailEmployee.contracts && detailEmployee.contracts.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold mb-2">Contrats</p>
                  <div className="space-y-2">
                    {detailEmployee.contracts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-2">
                        <div className="flex items-center gap-2">
                          <IdCard className="size-3.5 text-muted-foreground" />
                          <span className="font-medium">{c.type}</span>
                          <span className="text-muted-foreground">— {c.poste}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.dateDebut).toLocaleDateString("fr-TN")}
                          {c.dateFin && ` → ${new Date(c.dateFin).toLocaleDateString("fr-TN")}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
