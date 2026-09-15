// =============================================================================
// Le Fiduciaire — Gestion des Clients (CRUD complet)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getWorkspaceId } from "@/lib/workspace";
import { api, type ApiError } from "@/lib/api";
import BackToTools from "@/components/BackToTools";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  ChevronRight,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Establishment {
  id: string;
  designation: string;
  isPrincipal: boolean;
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  matriculeCnss?: string | null;
  codeExploitation?: string | null;
  isActive?: boolean;
}

interface Employee {
  id: string;
  matriculeCnss?: string | null;
  firstName: string;
  lastName: string;
  baseSalary?: number | null;
  civilStatus?: string | null;
  establishmentId?: string | null;
}

interface ClientCompany {
  id: string;
  raisonSociale: string;
  matriculeFiscal?: string | null;
  matriculeCnss?: string | null;
  codeTVA?: string | null;
  secteur: string;
  statut: "ACTIVE" | "ARCHIVED";
  adresse?: string | null;
  ville?: string | null;
  gouvernorat?: string | null;
  codePostal?: string | null;
  contactNom?: string | null;
  contactTelephone?: string | null;
  contactEmail?: string | null;
  workspaceId: string;
  createdAt: string;
  archivedAt?: string | null;
  establishments?: Establishment[];
  employees?: Employee[];
  _count?: { employees: number };
}

interface ClientFormData {
  raisonSociale: string;
  matriculeFiscal: string;
  matriculeCnss: string;
  codeTVA: string;
  secteur: string;
  adresse: string;
  ville: string;
  gouvernorat: string;
  codePostal: string;
  contactNom: string;
  contactTelephone: string;
  contactEmail: string;
}

type FilterTab = "ACTIVE" | "ARCHIVED" | "ALL";

// =============================================================================
// Constants
// =============================================================================

const SECTEURS = [
  { value: "NON_AGRICOLE", label: "Non agricole" },
  { value: "AGRICOLE", label: "Agricole" },
  { value: "SERVICES", label: "Services" },
  { value: "INDUSTRIEL", label: "Industriel" },
  { value: "COMMERCIAL", label: "Commercial" },
];

const GOUVERNORATS = [
  "Tunis", "Ariana", "Ben Arous", "Manouba",
  "Nabeul", "Zaghouan", "Bizerte", "Béja",
  "Jendouba", "Le Kef", "Siliana", "Sousse",
  "Monastir", "Mahdia", "Sfax", "Kairouan",
  "Kasserine", "Sidi Bouzid", "Gabès", "Médenine",
  "Tataouine", "Gafsa", "Tozeur", "Kébili",
  "Sidi Bou Saïd", "La Marsa", "Carthage",
];

const EMPTY_FORM: ClientFormData = {
  raisonSociale: "",
  matriculeFiscal: "",
  matriculeCnss: "",
  codeTVA: "",
  secteur: "NON_AGRICOLE",
  adresse: "",
  ville: "",
  gouvernorat: "",
  codePostal: "",
  contactNom: "",
  contactTelephone: "",
  contactEmail: "",
};

// =============================================================================
// Helpers
// =============================================================================

const secteurLabel = (val: string): string =>
  SECTEURS.find((s) => s.value === val)?.label ?? val;

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// =============================================================================
// Main Component
// =============================================================================

export default function GestionClients() {
  const { user } = useAuth();
  const workspaceId = getWorkspaceId(user);

  // ── State ────────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ACTIVE");
  const [searchDebounce, setSearchDebounce] = useState("");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);
  const [detailClient, setDetailClient] = useState<ClientCompany | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM);

  // ── Debounced search ─────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch clients ────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      let path = `/clients/${workspaceId}?`;
      if (filter !== "ALL") path += `statut=${filter}&`;
      if (searchDebounce) path += `search=${encodeURIComponent(searchDebounce)}&`;

      const data = await api.get<ClientCompany[]>(path);
      setClients(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, filter, searchDebounce]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Create / Update ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!workspaceId) return;
    if (!form.raisonSociale.trim()) {
      toast.error("La raison sociale est requise");
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        // Update
        await api.put(`/clients/${workspaceId}/${editingClient.id}`, form);
        toast.success("Client mis à jour avec succès");
      } else {
        // Create
        await api.post("/clients", { workspaceId, ...form });
        toast.success("Client créé avec succès");
      }
      setFormOpen(false);
      setEditingClient(null);
      setForm(EMPTY_FORM);
      fetchClients();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Archive / Activate ───────────────────────────────────────────────────
  const handleArchive = async (client: ClientCompany) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/clients/${workspaceId}/${client.id}/archive`);
      toast.success(`${client.raisonSociale} archivé`);
      fetchClients();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'archivage");
    }
  };

  const handleActivate = async (client: ClientCompany) => {
    if (!workspaceId) return;
    try {
      await api.patch(`/clients/${workspaceId}/${client.id}/activate`);
      toast.success(`${client.raisonSociale} réactivé`);
      fetchClients();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la réactivation");
    }
  };

  // ── Detail ───────────────────────────────────────────────────────────────
  const openDetail = async (client: ClientCompany) => {
    if (!workspaceId) return;
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await api.get<ClientCompany>(`/clients/${workspaceId}/${client.id}`);
      setDetailClient(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement du détail");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Open form for create / edit ──────────────────────────────────────────
  const openCreateForm = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (client: ClientCompany) => {
    setEditingClient(client);
    setForm({
      raisonSociale: client.raisonSociale || "",
      matriculeFiscal: client.matriculeFiscal || "",
      matriculeCnss: client.matriculeCnss || "",
      codeTVA: client.codeTVA || "",
      secteur: client.secteur || "NON_AGRICOLE",
      adresse: client.adresse || "",
      ville: client.ville || "",
      gouvernorat: client.gouvernorat || "",
      codePostal: client.codePostal || "",
      contactNom: client.contactNom || "",
      contactTelephone: client.contactTelephone || "",
      contactEmail: client.contactEmail || "",
    });
    setFormOpen(true);
  };

  // ── Form field helper ────────────────────────────────────────────────────
  const setField = (field: keyof ClientFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── No workspace guard ───────────────────────────────────────────────────
  if (!workspaceId) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <Card className="p-6 border border-destructive/30">
          <p className="text-destructive">
            Aucun workspace sélectionné. Veuillez vous reconnecter.
          </p>
        </Card>
      </div>
    );
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      <BackToTools />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1
          className="text-2xl sm:text-3xl font-bold text-primary"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Gestion des Clients
        </h1>
        <Button
          onClick={openCreateForm}
          className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
        >
          <Plus className="size-4" />
          Nouveau client
        </Button>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par raison sociale, matricule…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(["ACTIVE", "ARCHIVED", "ALL"] as FilterTab[]).map((tab) => (
            <Button
              key={tab}
              variant={filter === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab)}
              className={
                filter === tab
                  ? "bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
                  : ""
              }
            >
              {tab === "ACTIVE" ? "Actifs" : tab === "ARCHIVED" ? "Archivés" : "Tous"}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <Card className="border border-slate-200 dark:border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="size-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchDebounce
                  ? "Aucun client ne correspond à votre recherche"
                  : filter === "ARCHIVED"
                  ? "Aucun client archivé"
                  : "Aucun client. Créez votre premier client."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Raison sociale</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Matricule fiscal</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Matricule CNSS</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Secteur</TableHead>
                  <TableHead className="font-semibold text-center">Salariés</TableHead>
                  <TableHead className="font-semibold text-center">Statut</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => openDetail(client)}
                  >
                    <TableCell className="font-medium text-primary">
                      {client.raisonSociale}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">
                      {client.matriculeFiscal || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">
                      {client.matriculeCnss || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs font-normal">
                        {secteurLabel(client.secteur)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {client._count?.employees ?? 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {client.statut === "ACTIVE" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                          Actif
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                          Archivé
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(client)}>
                            <Eye className="size-4 mr-2" />
                            Voir détail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditForm(client)}>
                            <Pencil className="size-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {client.statut === "ACTIVE" ? (
                            <DropdownMenuItem
                              onClick={() => handleArchive(client)}
                              className="text-amber-600 focus:text-amber-700"
                            >
                              <Archive className="size-4 mr-2" />
                              Archiver
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivate(client)}
                              className="text-emerald-600 focus:text-emerald-700"
                            >
                              <RotateCcw className="size-4 mr-2" />
                              Réactiver
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

      {/* ── Count ── */}
      {!loading && clients.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-right">
          {clients.length} client{clients.length > 1 ? "s" : ""} trouvé{clients.length > 1 ? "s" : ""}
        </p>
      )}

      {/* ========================================================================= */}
      {/* Create / Edit Dialog                                                      */}
      {/* ========================================================================= */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) { setEditingClient(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-primary"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {editingClient ? "Modifier le client" : "Nouveau client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Modifiez les informations de l'entreprise cliente."
                : "Renseignez les informations de la nouvelle entreprise cliente."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Raison sociale */}
            <div className="grid gap-1.5">
              <Label htmlFor="raisonSociale" className="text-sm font-medium">
                Raison sociale <span className="text-destructive">*</span>
              </Label>
              <Input
                id="raisonSociale"
                placeholder="Ex: Société Tunisienne de…"
                value={form.raisonSociale}
                onChange={(e) => setField("raisonSociale", e.target.value)}
              />
            </div>

            {/* Matricules row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="matriculeFiscal" className="text-sm font-medium">
                  Matricule fiscal
                </Label>
                <Input
                  id="matriculeFiscal"
                  placeholder="MF…"
                  value={form.matriculeFiscal}
                  onChange={(e) => setField("matriculeFiscal", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="matriculeCnss" className="text-sm font-medium">
                  Matricule CNSS
                </Label>
                <Input
                  id="matriculeCnss"
                  placeholder="CNSS…"
                  value={form.matriculeCnss}
                  onChange={(e) => setField("matriculeCnss", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="codeTVA" className="text-sm font-medium">
                  Code TVA
                </Label>
                <Input
                  id="codeTVA"
                  placeholder="TVA…"
                  value={form.codeTVA}
                  onChange={(e) => setField("codeTVA", e.target.value)}
                />
              </div>
            </div>

            {/* Secteur */}
            <div className="grid gap-1.5">
              <Label className="text-sm font-medium">Secteur d'activité</Label>
              <Select value={form.secteur} onValueChange={(v) => setField("secteur", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner le secteur" />
                </SelectTrigger>
                <SelectContent>
                  {SECTEURS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Adresse */}
            <div className="grid gap-1.5">
              <Label htmlFor="adresse" className="text-sm font-medium">Adresse</Label>
              <Input
                id="adresse"
                placeholder="Rue, avenue…"
                value={form.adresse}
                onChange={(e) => setField("adresse", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ville" className="text-sm font-medium">Ville</Label>
                <Input
                  id="ville"
                  placeholder="Ville"
                  value={form.ville}
                  onChange={(e) => setField("ville", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium">Gouvernorat</Label>
                <Select value={form.gouvernorat} onValueChange={(v) => setField("gouvernorat", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Gouvernorat" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOUVERNORATS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="codePostal" className="text-sm font-medium">Code postal</Label>
                <Input
                  id="codePostal"
                  placeholder="CP"
                  value={form.codePostal}
                  onChange={(e) => setField("codePostal", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <p className="text-sm font-semibold text-primary">Personne de contact</p>
            <div className="grid gap-1.5">
              <Label htmlFor="contactNom" className="text-sm font-medium">Nom</Label>
              <Input
                id="contactNom"
                placeholder="Nom du contact"
                value={form.contactNom}
                onChange={(e) => setField("contactNom", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="contactTelephone" className="text-sm font-medium">Téléphone</Label>
                <Input
                  id="contactTelephone"
                  placeholder="+216 …"
                  value={form.contactTelephone}
                  onChange={(e) => setField("contactTelephone", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contactEmail" className="text-sm font-medium">Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@…"
                  value={form.contactEmail}
                  onChange={(e) => setField("contactEmail", e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setFormOpen(false); setEditingClient(null); setForm(EMPTY_FORM); }}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.raisonSociale.trim()}
              className="gap-2 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white"
            >
              {submitting && (
                <span className="size-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
              )}
              {editingClient ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* Detail Dialog                                                             */}
      {/* ========================================================================= */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="size-8 border-4 border-primary border-r-transparent rounded-full animate-spin" />
            </div>
          ) : detailClient ? (
            <>
              <DialogHeader>
                <DialogTitle
                  className="text-primary flex items-center gap-2"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  <Building2 className="size-5" />
                  {detailClient.raisonSociale}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  {detailClient.statut === "ACTIVE" ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                      Actif
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                      Archivé
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Créé le {formatDate(detailClient.createdAt)}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Company Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem icon={<Building2 className="size-4" />} label="Matricule fiscal" value={detailClient.matriculeFiscal} />
                  <InfoItem icon={<Building2 className="size-4" />} label="Matricule CNSS" value={detailClient.matriculeCnss} />
                  <InfoItem icon={<Building2 className="size-4" />} label="Code TVA" value={detailClient.codeTVA} />
                  <InfoItem icon={<Building2 className="size-4" />} label="Secteur" value={secteurLabel(detailClient.secteur)} />
                </div>

                <Separator />

                {/* Address */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <MapPin className="size-4" /> Adresse
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Adresse : </span>{detailClient.adresse || "—"}</div>
                    <div><span className="text-muted-foreground">Ville : </span>{detailClient.ville || "—"}</div>
                    <div><span className="text-muted-foreground">Gouvernorat : </span>{detailClient.gouvernorat || "—"}</div>
                    <div><span className="text-muted-foreground">Code postal : </span>{detailClient.codePostal || "—"}</div>
                  </div>
                </div>

                <Separator />

                {/* Contact */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <Phone className="size-4" /> Contact
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Nom : </span>{detailClient.contactNom || "—"}</div>
                    <div><span className="text-muted-foreground">Tél : </span>{detailClient.contactTelephone || "—"}</div>
                    <div><span className="text-muted-foreground">Email : </span>{detailClient.contactEmail || "—"}</div>
                  </div>
                </div>

                <Separator />

                {/* Establishments */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <Building2 className="size-4" />
                    Établissements ({detailClient.establishments?.length ?? 0})
                  </p>
                  {detailClient.establishments && detailClient.establishments.length > 0 ? (
                    <div className="space-y-2">
                      {detailClient.establishments.map((est) => (
                        <Card key={est.id} className="border border-slate-200 dark:border-slate-700">
                          <CardContent className="p-3 flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{est.designation}</span>
                                {est.isPrincipal && (
                                  <Badge className="bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40 text-[10px] px-1.5 py-0">
                                    Principal
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {[est.adresse, est.ville, est.gouvernorat].filter(Boolean).join(", ") || "Adresse non renseignée"}
                                {est.matriculeCnss && <span className="ml-2 font-mono">• CNSS: {est.matriculeCnss}</span>}
                                {est.codeExploitation && <span className="ml-2 font-mono">• Expl: {est.codeExploitation}</span>}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucun établissement enregistré</p>
                  )}
                </div>

                <Separator />

                {/* Employees */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <Users className="size-4" />
                    Salariés ({detailClient.employees?.length ?? 0})
                  </p>
                  {detailClient.employees && detailClient.employees.length > 0 ? (
                    <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-md border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30 sticky top-0">
                          <tr>
                            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Nom</th>
                            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Prénom</th>
                            <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">CNSS</th>
                            <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Salaire de base</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailClient.employees.map((emp) => (
                            <tr key={emp.id} className="border-t border-border/50 hover:bg-muted/20">
                              <td className="py-1.5 px-2">{emp.lastName}</td>
                              <td className="py-1.5 px-2">{emp.firstName}</td>
                              <td className="py-1.5 px-2 font-mono">{emp.matriculeCnss || "—"}</td>
                              <td className="py-1.5 px-2 text-right font-mono">
                                {emp.baseSalary != null
                                  ? new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(emp.baseSalary) + " TND"
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucun salarié actif</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailOpen(false);
                    openEditForm(detailClient);
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="size-4" />
                  Modifier
                </Button>
                {detailClient.statut === "ACTIVE" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailOpen(false);
                      handleArchive(detailClient);
                    }}
                    className="gap-1.5 text-amber-600 hover:text-amber-700 border-amber-300 hover:border-amber-400"
                  >
                    <Archive className="size-4" />
                    Archiver
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailOpen(false);
                      handleActivate(detailClient);
                    }}
                    className="gap-1.5 text-emerald-600 hover:text-emerald-700 border-emerald-300 hover:border-emerald-400"
                  >
                    <RotateCcw className="size-4" />
                    Réactiver
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setDetailOpen(false)}
                >
                  Fermer
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Impossible de charger les détails
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Sub-component: InfoItem
// =============================================================================

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
