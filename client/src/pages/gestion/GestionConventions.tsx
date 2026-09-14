// =============================================================================
// Le Fiduciaire — Gestion des Conventions Collectives (CRUD complet)
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  BookOpen,
  FileText,
  Grid3X3,
  Users,
  CalendarDays,
  Building2,
  Shield,
  Hash,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface ConventionArticle {
  id: string;
  numero: string;
  titre: string;
  contenu: string;
  ordre: number;
}

interface GrilleSalarialeEntry {
  id: string;
  coefficient: string;
  echelon: number;
  salaireMinimum: number;
  dateEffet: string;
  dateFin?: string | null;
}

interface ConventionAdaptation {
  id: string;
  articleNumero: string;
  adaptationDescription: string;
  valeurOriginale?: string | null;
  valeurAdaptee?: string | null;
  dateEffet: string;
  dateFin?: string | null;
  client_company?: { id: string; raisonSociale: string };
}

interface Convention {
  id: string;
  code: string;
  nom: string;
  secteur: string;
  organisme?: string | null;
  datePublication?: string | null;
  isSystem: boolean;
  isActive: boolean;
  workspaceId: string;
  articles?: ConventionArticle[];
  grille_salaires?: GrilleSalarialeEntry[];
  adaptations?: ConventionAdaptation[];
  _count?: {
    articles: number;
    grille_salaires: number;
    adaptations: number;
    contracts?: number;
  };
}

interface ConventionFormData {
  code: string;
  nom: string;
  secteur: string;
  organisme: string;
  datePublication: string;
}

interface ArticleFormData {
  numero: string;
  titre: string;
  contenu: string;
  ordre: number;
}

interface GrilleFormData {
  coefficient: string;
  echelon: number;
  salaireMinimum: number;
  dateEffet: string;
  dateFin: string;
}

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

const EMPTY_FORM: ConventionFormData = {
  code: "",
  nom: "",
  secteur: "NON_AGRICOLE",
  organisme: "",
  datePublication: "",
};

const EMPTY_ARTICLE: ArticleFormData = {
  numero: "",
  titre: "",
  contenu: "",
  ordre: 1,
};

const EMPTY_GRILLE: GrilleFormData = {
  coefficient: "",
  echelon: 1,
  salaireMinimum: 0,
  dateEffet: new Date().toISOString().slice(0, 10),
  dateFin: "",
};

// =============================================================================
// Composant principal
// =============================================================================

export default function GestionConventions() {
  const { user } = useAuth();
  const workspaceId = user?.workspaces?.[0]?.id;

  // ── State ──
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [secteurFilter, setSecteurFilter] = useState<string>("ALL");

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [articleOpen, setArticleOpen] = useState(false);
  const [grilleOpen, setGrilleOpen] = useState(false);

  // Form data
  const [form, setForm] = useState<ConventionFormData>(EMPTY_FORM);
  const [articleForm, setArticleForm] = useState<ArticleFormData>(EMPTY_ARTICLE);
  const [grilleForm, setGrilleForm] = useState<GrilleFormData>(EMPTY_GRILLE);

  // Selected
  const [selected, setSelected] = useState<Convention | null>(null);
  const [detail, setDetail] = useState<Convention | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch conventions ──
  const fetchConventions = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const query = secteurFilter !== "ALL" ? `?secteur=${secteurFilter}` : "";
      const data = await api.get<Convention[]>(`/conventions/${workspaceId}${query}`);
      setConventions(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement des conventions");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, secteurFilter]);

  useEffect(() => {
    fetchConventions();
  }, [fetchConventions]);

  // ── Filtered list ──
  const filtered = conventions.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      c.nom.toLowerCase().includes(q) ||
      (c.organisme || "").toLowerCase().includes(q)
    );
  });

  // ── Create ──
  const handleCreate = async () => {
    if (!workspaceId || !form.code.trim() || !form.nom.trim()) {
      toast.error("Code et nom sont requis");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/conventions", {
        workspaceId,
        code: form.code.trim(),
        nom: form.nom.trim(),
        secteur: form.secteur,
        organisme: form.organisme.trim() || undefined,
        datePublication: form.datePublication || undefined,
      });
      toast.success("Convention créée avec succès");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      fetchConventions();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update ──
  const handleUpdate = async () => {
    if (!workspaceId || !selected) return;
    setSubmitting(true);
    try {
      await api.put(`/conventions/${workspaceId}/${selected.id}`, {
        nom: form.nom.trim(),
        secteur: form.secteur,
        organisme: form.organisme.trim() || null,
        datePublication: form.datePublication || null,
      });
      toast.success("Convention mise à jour");
      setEditOpen(false);
      setSelected(null);
      setForm(EMPTY_FORM);
      fetchConventions();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!workspaceId || !selected) return;
    setSubmitting(true);
    try {
      await api.delete(`/conventions/${workspaceId}/${selected.id}`);
      toast.success("Convention supprimée");
      setDeleteOpen(false);
      setSelected(null);
      fetchConventions();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Detail ──
  const openDetail = async (c: Convention) => {
    if (!workspaceId) return;
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const data = await api.get<Convention>(`/conventions/${workspaceId}/${c.id}`);
      setDetail(data);
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors du chargement du détail");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Fetch adaptations for detail ──
  const fetchAdaptations = async () => {
    if (!workspaceId || !detail) return;
    try {
      const data = await api.get<ConventionAdaptation[]>(
        `/conventions/${workspaceId}/${detail.id}/adaptations`
      );
      setDetail((prev) => (prev ? { ...prev, adaptations: data } : prev));
    } catch {
      // silent
    }
  };

  // ── Add article ──
  const handleAddArticle = async () => {
    if (!workspaceId || !detail) return;
    if (!articleForm.numero.trim() || !articleForm.titre.trim() || !articleForm.contenu.trim()) {
      toast.error("Numéro, titre et contenu sont requis");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/conventions/${workspaceId}/${detail.id}/articles`, {
        numero: articleForm.numero.trim(),
        titre: articleForm.titre.trim(),
        contenu: articleForm.contenu.trim(),
        ordre: articleForm.ordre,
      });
      toast.success("Article ajouté");
      setArticleOpen(false);
      setArticleForm(EMPTY_ARTICLE);
      // Refresh detail
      const data = await api.get<Convention>(`/conventions/${workspaceId}/${detail.id}`);
      setDetail(data);
      fetchConventions();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'ajout de l'article");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Add grille entry ──
  const handleAddGrille = async () => {
    if (!workspaceId || !detail) return;
    if (!grilleForm.coefficient.trim() || !grilleForm.echelon || !grilleForm.salaireMinimum || !grilleForm.dateEffet) {
      toast.error("Coefficient, échelon, salaire minimum et date d'effet sont requis");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/conventions/${workspaceId}/${detail.id}/grille`, {
        coefficient: grilleForm.coefficient.trim(),
        echelon: grilleForm.echelon,
        salaireMinimum: grilleForm.salaireMinimum,
        dateEffet: grilleForm.dateEffet,
        dateFin: grilleForm.dateFin || undefined,
      });
      toast.success("Entrée de grille ajoutée");
      setGrilleOpen(false);
      setGrilleForm(EMPTY_GRILLE);
      // Refresh detail
      const data = await api.get<Convention>(`/conventions/${workspaceId}/${detail.id}`);
      setDetail(data);
      fetchConventions();
    } catch (err) {
      const apiErr = err as ApiError;
      toast.error(apiErr.message || "Erreur lors de l'ajout de l'entrée de grille");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ──
  const secteurLabel = (val: string) =>
    SECTEURS.find((s) => s.value === val)?.label || val;

  const formatDate = (d?: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("fr-FR");
    } catch {
      return d;
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("fr-TN", {
      style: "decimal",
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(n) + " TND";

  const openEdit = (c: Convention) => {
    setSelected(c);
    setForm({
      code: c.code,
      nom: c.nom,
      secteur: c.secteur,
      organisme: c.organisme || "",
      datePublication: c.datePublication ? c.datePublication.slice(0, 10) : "",
    });
    setEditOpen(true);
  };

  const openDelete = (c: Convention) => {
    setSelected(c);
    setDeleteOpen(true);
  };

  const isProprietaire = user?.role === "PROPRIETAIRE";

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <BackToTools />

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">
              Gestion des Conventions
            </h1>
            <p className="text-sm text-muted-foreground">
              Conventions collectives et grilles salariales
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM);
            setCreateOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Plus className="size-4" />
          Nouvelle convention
        </Button>
      </div>

      {/* ── Filtres ── */}
      <Card className="mb-6 border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code, nom, organisme..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={secteurFilter} onValueChange={setSecteurFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tous les secteurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les secteurs</SelectItem>
                {SECTEURS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-navy-900 dark:text-white flex items-center gap-2">
            <BookOpen className="size-5 text-gold" />
            Conventions collectives
            <Badge variant="secondary" className="ml-2">
              {filtered.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search || secteurFilter !== "ALL"
                  ? "Aucune convention ne correspond aux filtres"
                  : "Aucune convention créée pour le moment"}
              </p>
              {!search && secteurFilter === "ALL" && (
                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Créer une convention
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead className="w-[130px]">Secteur</TableHead>
                    <TableHead className="w-[80px] text-center">Articles</TableHead>
                    <TableHead className="w-[80px] text-center">Grille</TableHead>
                    <TableHead className="w-[100px] text-center">Adaptations</TableHead>
                    <TableHead className="w-[80px]">Statut</TableHead>
                    <TableHead className="w-[60px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => openDetail(c)}>
                      <TableCell className="font-mono text-sm font-medium text-primary">
                        {c.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-navy-900 dark:text-white">
                          {c.nom}
                        </div>
                        {c.organisme && (
                          <div className="text-xs text-muted-foreground">{c.organisme}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {secteurLabel(c.secteur)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <FileText className="size-3.5 text-muted-foreground" />
                          {c._count?.articles ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Grid3X3 className="size-3.5 text-muted-foreground" />
                          {c._count?.grille_salaires ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Users className="size-3.5 text-muted-foreground" />
                          {c._count?.adaptations ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {c.isSystem && (
                            <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px] px-1.5 py-0">
                              <Shield className="size-3 mr-0.5" />
                              Système
                            </Badge>
                          )}
                          <Badge
                            variant={c.isActive ? "default" : "secondary"}
                            className={`text-[10px] px-1.5 py-0 ${
                              c.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : ""
                            }`}
                          >
                            {c.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(c)} className="gap-2">
                              <Eye className="size-4" />
                              Voir détail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(c)} className="gap-2">
                              <Pencil className="size-4" />
                              Modifier
                            </DropdownMenuItem>
                            {!c.isSystem && isProprietaire && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => openDelete(c)}
                                  className="gap-2 text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Créer convention ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-900 dark:text-white">
              <BookOpen className="size-5 text-gold" />
              Nouvelle convention collective
            </DialogTitle>
            <DialogDescription>
              Créer une nouvelle convention collective pour le workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-code">Code *</Label>
                <Input
                  id="create-code"
                  placeholder="ex: CCN-51"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-secteur">Secteur</Label>
                <Select value={form.secteur} onValueChange={(v) => setForm((f) => ({ ...f, secteur: v }))}>
                  <SelectTrigger id="create-secteur">
                    <SelectValue />
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-nom">Nom *</Label>
              <Input
                id="create-nom"
                placeholder="ex: Convention collective du commerce de gros"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-organisme">Organisme</Label>
              <Input
                id="create-organisme"
                placeholder="ex: UTICA"
                value={form.organisme}
                onChange={(e) => setForm((f) => ({ ...f, organisme: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-date">Date de publication</Label>
              <Input
                id="create-date"
                type="date"
                value={form.datePublication}
                onChange={(e) => setForm((f) => ({ ...f, datePublication: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {submitting ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Modifier convention ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-900 dark:text-white">
              <Pencil className="size-5 text-gold" />
              Modifier la convention
            </DialogTitle>
            <DialogDescription>
              Modifier les informations de la convention collective
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nom">Nom *</Label>
              <Input
                id="edit-nom"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-secteur">Secteur</Label>
                <Select value={form.secteur} onValueChange={(v) => setForm((f) => ({ ...f, secteur: v }))}>
                  <SelectTrigger id="edit-secteur">
                    <SelectValue />
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
              <div className="space-y-2">
                <Label htmlFor="edit-organisme">Organisme</Label>
                <Input
                  id="edit-organisme"
                  value={form.organisme}
                  onChange={(e) => setForm((f) => ({ ...f, organisme: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date de publication</Label>
              <Input
                id="edit-date"
                type="date"
                value={form.datePublication}
                onChange={(e) => setForm((f) => ({ ...f, datePublication: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Supprimer convention ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la convention ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la convention{" "}
              <strong>{selected?.code} — {selected?.nom}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Détail convention ── */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setDetail(null); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-900 dark:text-white">
              <BookOpen className="size-5 text-gold" />
              {detail ? `${detail.code} — ${detail.nom}` : "Détail de la convention"}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `Secteur : ${secteurLabel(detail.secteur)}${detail.organisme ? ` · Organisme : ${detail.organisme}` : ""}`
                : "Chargement..."}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : detail ? (
            <div className="space-y-4 py-2">
              {/* Badges info */}
              <div className="flex flex-wrap gap-2">
                {detail.isSystem && (
                  <Badge className="bg-gold/20 text-gold border-gold/30">
                    <Shield className="size-3.5 mr-1" />
                    Convention système
                  </Badge>
                )}
                <Badge
                  variant={detail.isActive ? "default" : "secondary"}
                  className={
                    detail.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : ""
                  }
                >
                  {detail.isActive ? "Active" : "Inactive"}
                </Badge>
                {detail.datePublication && (
                  <Badge variant="outline" className="gap-1">
                    <CalendarDays className="size-3" />
                    Publiée le {formatDate(detail.datePublication)}
                  </Badge>
                )}
                {detail._count?.contracts !== undefined && (
                  <Badge variant="outline" className="gap-1">
                    <FileText className="size-3" />
                    {detail._count.contracts} contrat(s)
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Tabs: Articles / Grille / Adaptations */}
              <Tabs defaultValue="articles" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="articles" className="flex-1 gap-1.5">
                    <FileText className="size-3.5" />
                    Articles ({detail.articles?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="grille" className="flex-1 gap-1.5">
                    <Grid3X3 className="size-3.5" />
                    Grille ({detail.grille_salaires?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="adaptations" className="flex-1 gap-1.5">
                    <Users className="size-3.5" />
                    Adaptations
                  </TabsTrigger>
                </TabsList>

                {/* ── Tab: Articles ── */}
                <TabsContent value="articles" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                      Articles de la convention
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setArticleForm(EMPTY_ARTICLE);
                        setArticleOpen(true);
                      }}
                    >
                      <Plus className="size-3.5" />
                      Ajouter un article
                    </Button>
                  </div>
                  {(detail.articles?.length ?? 0) === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <FileText className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                      Aucun article défini
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {detail.articles?.map((a) => (
                        <Card key={a.id} className="border-border/40">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Badge variant="outline" className="shrink-0 font-mono text-xs">
                                <Hash className="size-3 mr-0.5" />
                                {a.numero}
                              </Badge>
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-navy-900 dark:text-white">
                                  {a.titre}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                                  {a.contenu}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Tab: Grille salariale ── */}
                <TabsContent value="grille" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                      Grille salariale (entrées en vigueur)
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setGrilleForm(EMPTY_GRILLE);
                        setGrilleOpen(true);
                      }}
                    >
                      <Plus className="size-3.5" />
                      Ajouter une entrée
                    </Button>
                  </div>
                  {(detail.grille_salaires?.length ?? 0) === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Grid3X3 className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                      Aucune entrée de grille salariale
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="w-[120px]">Coefficient</TableHead>
                            <TableHead className="w-[80px]">Échelon</TableHead>
                            <TableHead>Salaire minimum</TableHead>
                            <TableHead className="w-[110px]">Date d'effet</TableHead>
                            <TableHead className="w-[110px]">Date de fin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.grille_salaires?.map((g) => (
                            <TableRow key={g.id}>
                              <TableCell className="font-mono text-sm font-medium">
                                {g.coefficient}
                              </TableCell>
                              <TableCell className="text-center">{g.echelon}</TableCell>
                              <TableCell className="font-semibold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(g.salaireMinimum)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(g.dateEffet)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(g.dateFin)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* ── Tab: Adaptations ── */}
                <TabsContent value="adaptations" className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">
                      Adaptations client
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={fetchAdaptations}
                    >
                      <Users className="size-3.5" />
                      Actualiser
                    </Button>
                  </div>
                  {detail.adaptations && detail.adaptations.length > 0 ? (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Client</TableHead>
                            <TableHead>Article</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[110px]">Date d'effet</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.adaptations.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>
                                <span className="inline-flex items-center gap-1.5">
                                  <Building2 className="size-3.5 text-muted-foreground" />
                                  {a.client_company?.raisonSociale || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {a.articleNumero}
                              </TableCell>
                              <TableCell className="text-sm max-w-[200px] truncate">
                                {a.adaptationDescription}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(a.dateEffet)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                      Aucune adaptation client
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ajouter article ── */}
      <Dialog open={articleOpen} onOpenChange={setArticleOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-900 dark:text-white">
              <FileText className="size-5 text-gold" />
              Ajouter un article
            </DialogTitle>
            <DialogDescription>
              Ajouter un nouvel article à la convention collective
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="article-numero">Numéro *</Label>
                <Input
                  id="article-numero"
                  placeholder="ex: 1"
                  value={articleForm.numero}
                  onChange={(e) => setArticleForm((f) => ({ ...f, numero: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="article-ordre">Ordre</Label>
                <Input
                  id="article-ordre"
                  type="number"
                  min={1}
                  value={articleForm.ordre}
                  onChange={(e) => setArticleForm((f) => ({ ...f, ordre: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-titre">Titre *</Label>
              <Input
                id="article-titre"
                placeholder="ex: Durée du travail"
                value={articleForm.titre}
                onChange={(e) => setArticleForm((f) => ({ ...f, titre: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-contenu">Contenu *</Label>
              <Textarea
                id="article-contenu"
                placeholder="Contenu de l'article..."
                rows={5}
                value={articleForm.contenu}
                onChange={(e) => setArticleForm((f) => ({ ...f, contenu: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArticleOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleAddArticle} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {submitting ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ajouter entrée grille ── */}
      <Dialog open={grilleOpen} onOpenChange={setGrilleOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-900 dark:text-white">
              <Grid3X3 className="size-5 text-gold" />
              Ajouter une entrée de grille salariale
            </DialogTitle>
            <DialogDescription>
              Définir un salaire minimum pour un coefficient et échelon
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grille-coeff">Coefficient *</Label>
                <Input
                  id="grille-coeff"
                  placeholder="ex: 1A"
                  value={grilleForm.coefficient}
                  onChange={(e) => setGrilleForm((f) => ({ ...f, coefficient: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grille-echelon">Échelon *</Label>
                <Input
                  id="grille-echelon"
                  type="number"
                  min={1}
                  value={grilleForm.echelon}
                  onChange={(e) => setGrilleForm((f) => ({ ...f, echelon: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grille-salaire">Salaire minimum (TND) *</Label>
              <Input
                id="grille-salaire"
                type="number"
                step="0.001"
                min={0}
                placeholder="ex: 461.512"
                value={grilleForm.salaireMinimum || ""}
                onChange={(e) => setGrilleForm((f) => ({ ...f, salaireMinimum: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grille-debut">Date d'effet *</Label>
                <Input
                  id="grille-debut"
                  type="date"
                  value={grilleForm.dateEffet}
                  onChange={(e) => setGrilleForm((f) => ({ ...f, dateEffet: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grille-fin">Date de fin</Label>
                <Input
                  id="grille-fin"
                  type="date"
                  value={grilleForm.dateFin}
                  onChange={(e) => setGrilleForm((f) => ({ ...f, dateFin: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrilleOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleAddGrille} disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {submitting ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
