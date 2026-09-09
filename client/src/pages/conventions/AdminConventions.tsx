/**
 * AdminConventions.tsx — CRUD admin interface for managing convention collective data.
 * Allows inline editing of primes (mensuelles, annuelles, sociales) and grille salariale display.
 * All changes are persisted to localStorage via admin-store.
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  History,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { CONVENTIONS, getConventionBySlug } from "@/lib/conventions/data/index";
import type {
  PrimeMensuelleStructuree,
  PrimeAnnuelleStructuree,
  PrimeSocialeStructuree,
  ConventionCollective,
  GrilleSalarialeLigne,
  CategorieAgent,
} from "@/lib/conventions/types";
import { formatMontantDT } from "@/lib/utils";
import {
  getConventionOverrides,
  saveConventionOverrides,
  clearConventionOverrides,
  type ConventionOverrides,
} from "@/lib/conventions/admin-store";
import BackToTools from "@/components/BackToTools";

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const CURRENT_YEAR = new Date().getFullYear();

function isHistoricalYear(yearStr: string): boolean {
  const year = parseInt(yearStr, 10);
  return year < CURRENT_YEAR;
}

// ═══════════════════════════════════════════════════════════════════════
// TYPES FOR EDITING STATE
// ═══════════════════════════════════════════════════════════════════════

interface EditingRow {
  index: number;
  data: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function AdminConventions() {
  // ─── Convention selector ────────────────────────────────────────────
  const [selectedSlug, setSelectedSlug] = useState<string>(
    CONVENTIONS[0]?.slug ?? ""
  );

  // ─── Load merged data ──────────────────────────────────────────────
  const [refreshKey, setRefreshKey] = useState(0);

  const convention = useMemo(() => {
    const base = getConventionBySlug(selectedSlug);
    if (!base) return null;
    const overrides = getConventionOverrides(selectedSlug);
    if (!overrides) return base;
    return {
      ...base,
      ...(overrides.primesMensuelles
        ? { primesMensuelles: (overrides.primesMensuelles as unknown) as PrimeMensuelleStructuree[] }
        : {}),
      ...(overrides.primesAnnuelles
        ? { primesAnnuelles: (overrides.primesAnnuelles as unknown) as PrimeAnnuelleStructuree[] }
        : {}),
      ...(overrides.primesSociales
        ? { primesSociales: (overrides.primesSociales as unknown) as PrimeSocialeStructuree[] }
        : {}),
    } as ConventionCollective;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, refreshKey]);

  // ─── Persistence helper ────────────────────────────────────────────
  const persist = useCallback(
    (field: "primesMensuelles" | "primesAnnuelles" | "primesSociales", data: unknown[]) => {
      if (!convention) return;
      const existing = getConventionOverrides(selectedSlug) ?? {};
      saveConventionOverrides(selectedSlug, { ...existing, [field]: data });
      setRefreshKey((k) => k + 1);
    },
    [convention, selectedSlug]
  );

  // ─── Grille historical toggle ──────────────────────────────────────
  const [showHistorical, setShowHistorical] = useState(false);

  // ─── Tab ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "mensuelles" | "annuelles" | "sociales" | "grille"
  >("mensuelles");

  // ─── Delete confirmation ───────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "mensuelles" | "annuelles" | "sociales";
    index: number;
  } | null>(null);

  if (!convention) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <BackToTools />
        <p className="text-muted-foreground">Aucune convention sélectionnée.</p>
      </div>
    );
  }

  const categoriesAgents = convention.categoriesAgents ?? [];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      <BackToTools />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Administration des Conventions
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérer les primes, indemnités et grilles salariales
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearConventionOverrides(selectedSlug);
            setRefreshKey((k) => k + 1);
            toast.success("Overrides supprimés — données statiques restaurées");
          }}
        >
          <History className="size-4 mr-1.5" />
          Réinitialiser
        </Button>
      </div>

      {/* ── Convention Selector ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Convention collective</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choisir une convention…" />
            </SelectTrigger>
            <SelectContent>
              {CONVENTIONS.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.sectorNameFr} ({c.slug})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {convention.sectorNameFr} — ID {convention.sectorId} — moteur{" "}
            <Badge variant="outline" className="ml-1 text-[10px]">
              {convention.engineStatus}
            </Badge>
          </p>
        </CardContent>
      </Card>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b pb-0">
        {(
          [
            ["mensuelles", "Primes Mensuelles"],
            ["annuelles", "Primes Annuelles"],
            ["sociales", "Primes Sociales"],
            ["grille", "Grille Salariale"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ────────────────────────────────────────────── */}
      {activeTab === "mensuelles" && (
        <PrimesMensuellesSection
          primes={convention.primesMensuelles ?? []}
          categoriesAgents={categoriesAgents}
          persist={(data) => persist("primesMensuelles", data)}
          deleteConfirm={deleteConfirm?.type === "mensuelles" ? deleteConfirm : null}
          setDeleteConfirm={(dc) =>
            setDeleteConfirm(dc ? { ...dc, type: "mensuelles" } : null)
          }
        />
      )}

      {activeTab === "annuelles" && (
        <PrimesAnnuellesSection
          primes={convention.primesAnnuelles ?? []}
          categoriesAgents={categoriesAgents}
          persist={(data) => persist("primesAnnuelles", data)}
          deleteConfirm={deleteConfirm?.type === "annuelles" ? deleteConfirm : null}
          setDeleteConfirm={(dc) =>
            setDeleteConfirm(dc ? { ...dc, type: "annuelles" } : null)
          }
        />
      )}

      {activeTab === "sociales" && (
        <PrimesSocialesSection
          primes={convention.primesSociales ?? []}
          categoriesAgents={categoriesAgents}
          persist={(data) => persist("primesSociales", data)}
          deleteConfirm={deleteConfirm?.type === "sociales" ? deleteConfirm : null}
          setDeleteConfirm={(dc) =>
            setDeleteConfirm(dc ? { ...dc, type: "sociales" } : null)
          }
        />
      )}

      {activeTab === "grille" && (
        <GrilleSalarialeSection
          grille={convention.grilleDetaillee ?? []}
          categoriesAgents={categoriesAgents}
          showHistorical={showHistorical}
          setShowHistorical={setShowHistorical}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRIMES MENSUELLES SECTION
// ═══════════════════════════════════════════════════════════════════════

interface PrimesMensuellesProps {
  primes: PrimeMensuelleStructuree[];
  categoriesAgents: CategorieAgent[];
  persist: (data: PrimeMensuelleStructuree[]) => void;
  deleteConfirm: { type: string; index: number } | null;
  setDeleteConfirm: (dc: { type: string; index: number } | null) => void;
}

function PrimesMensuellesSection({
  primes,
  categoriesAgents,
  persist,
  deleteConfirm,
  setDeleteConfirm,
}: PrimesMensuellesProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditingRow | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // New prime form defaults
  const emptyPrime: PrimeMensuelleStructuree = useMemo(
    () => ({
      code: "",
      labelFr: "",
      montants: {},
      categoriesConcernees: categoriesAgents.map((c) => c.code),
      ancienneteMin: 0,
      actif: true,
      modeCalcul: "forfaitaire",
    }),
    [categoriesAgents]
  );

  const [newPrime, setNewPrime] = useState<PrimeMensuelleStructuree>(emptyPrime);

  // ── Add ──────────────────────────────────────────────────────────────
  const handleAdd = () => {
    if (!newPrime.code.trim() || !newPrime.labelFr.trim()) {
      toast.error("Code et label sont requis");
      return;
    }
    const updated = [...primes, { ...newPrime }];
    persist(updated);
    setAdding(false);
    setNewPrime(emptyPrime);
    toast.success(`Prime "${newPrime.code}" ajoutée`);
  };

  // ── Delete ───────────────────────────────────────────────────────────
  const handleDelete = (index: number) => {
    const updated = primes.filter((_, i) => i !== index);
    persist(updated);
    setDeleteConfirm(null);
    toast.success("Prime supprimée");
  };

  // ── Toggle actif ─────────────────────────────────────────────────────
  const handleToggleActif = (index: number, val: boolean) => {
    const updated = primes.map((p, i) => (i === index ? { ...p, actif: val } : p));
    persist(updated);
  };

  // ── Start edit ───────────────────────────────────────────────────────
  const startEdit = (index: number) => {
    setEditing({ index, data: deepClone(primes[index]) as unknown as Record<string, unknown> });
  };

  const saveEdit = () => {
    if (!editing) return;
    const updated = primes.map((p, i) =>
      i === editing.index ? (editing.data as unknown as PrimeMensuelleStructuree) : p
    );
    persist(updated);
    setEditing(null);
    toast.success("Prime modifiée");
  };

  const cancelEdit = () => setEditing(null);

  // ── Edit helpers ─────────────────────────────────────────────────────
  const editData = editing?.data as PrimeMensuelleStructuree | undefined;

  const updateEditField = (field: keyof PrimeMensuelleStructuree, value: unknown) => {
    if (!editing) return;
    setEditing({ ...editing, data: { ...editing.data, [field]: value } });
  };

  const updateEditCategories = (code: string, checked: boolean) => {
    if (!editData) return;
    const current = editData.categoriesConcernees ?? [];
    const next = checked
      ? [...current, code]
      : current.filter((c) => c !== code);
    updateEditField("categoriesConcernees", next);
  };

  // ── Update montant in edit ──────────────────────────────────────────
  const updateEditMontant = (cat: string, year: string, value: number) => {
    if (!editData) return;
    const montants = { ...(editData.montants as Record<string, Record<string, number>>) };
    montants[cat] = { ...(montants[cat] ?? {}), [year]: value };
    updateEditField("montants", montants);
  };

  // ── Bareme editing ──────────────────────────────────────────────────
  const addBaremeEntry = () => {
    if (!editData) return;
    const bareme = [...(editData.baremeAnciennete ?? []), { ancienneteMin: 0, ancienneteMax: 0, montant: 0 }];
    updateEditField("baremeAnciennete", bareme);
  };

  const updateBaremeEntry = (
    idx: number,
    field: "ancienneteMin" | "ancienneteMax" | "montant",
    value: number
  ) => {
    if (!editData) return;
    const bareme = [...(editData.baremeAnciennete ?? [])];
    bareme[idx] = { ...bareme[idx], [field]: value };
    updateEditField("baremeAnciennete", bareme);
  };

  const removeBaremeEntry = (idx: number) => {
    if (!editData) return;
    const bareme = (editData.baremeAnciennete ?? []).filter((_, i) => i !== idx);
    updateEditField("baremeAnciennete", bareme);
  };

  // ── New prime helpers ────────────────────────────────────────────────
  const updateNewCategories = (code: string, checked: boolean) => {
    const current = newPrime.categoriesConcernees ?? [];
    const next = checked
      ? [...current, code]
      : current.filter((c) => c !== code);
    setNewPrime({ ...newPrime, categoriesConcernees: next });
  };

  // ── All years across all primes ──────────────────────────────────────
  const allYears = useMemo(() => {
    const years = new Set<string>();
    primes.forEach((p) => {
      Object.values(p.montants ?? {}).forEach((yearMap) => {
        Object.keys(yearMap).forEach((y) => years.add(y));
      });
    });
    return Array.from(years).sort();
  }, [primes]);

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Primes Mensuelles ({primes.length})</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          <Plus className="size-4 mr-1" />
          Ajouter une prime
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Catégories</TableHead>
                <TableHead className="text-center">Anc. min</TableHead>
                <TableHead>Mode calcul</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ── Add row ──────────────────────────────────────── */}
              {adding && (
                <TableRow className="bg-muted/30">
                  <TableCell />
                  <TableCell>
                    <Input
                      className="h-8 w-28 text-xs"
                      placeholder="CODE"
                      value={newPrime.code}
                      onChange={(e) =>
                        setNewPrime({ ...newPrime, code: e.target.value.toUpperCase() })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-48 text-xs"
                      placeholder="Label FR"
                      value={newPrime.labelFr}
                      onChange={(e) =>
                        setNewPrime({ ...newPrime, labelFr: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {categoriesAgents.map((cat) => (
                        <label key={cat.code} className="flex items-center gap-1 text-xs">
                          <Checkbox
                            checked={newPrime.categoriesConcernees?.includes(cat.code) ?? false}
                            onCheckedChange={(c) => updateNewCategories(cat.code, !!c)}
                          />
                          {cat.code}
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      className="h-8 w-16 text-xs text-center"
                      value={newPrime.ancienneteMin ?? 0}
                      onChange={(e) =>
                        setNewPrime({
                          ...newPrime,
                          ancienneteMin: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newPrime.modeCalcul ?? "forfaitaire"}
                      onValueChange={(v) =>
                        setNewPrime({
                          ...newPrime,
                          modeCalcul: v as PrimeMensuelleStructuree["modeCalcul"],
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="forfaitaire">Forfaitaire</SelectItem>
                        <SelectItem value="anciennete_dependant">
                          Ancienneté-dépendant
                        </SelectItem>
                        <SelectItem value="note_dependant">Note-dépendant</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={newPrime.actif ?? true}
                      onCheckedChange={(v) => setNewPrime({ ...newPrime, actif: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="size-7" onClick={handleAdd}>
                        <Check className="size-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => {
                          setAdding(false);
                          setNewPrime(emptyPrime);
                        }}
                      >
                        <X className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* ── Data rows ──────────────────────────────────────── */}
              {primes.map((prime, idx) => {
                const isEditing = editing?.index === idx;
                const isExpanded = expandedRow === idx;
                const p = isEditing ? editData! : prime;

                return (
                  <>
                    <TableRow
                      key={`row-${idx}`}
                      className={isEditing ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : idx)}
                          className="p-0.5 hover:bg-muted rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {isEditing ? (
                          <Input
                            className="h-8 w-28 text-xs"
                            value={p.code}
                            onChange={(e) =>
                              updateEditField("code", e.target.value.toUpperCase())
                            }
                          />
                        ) : (
                          p.code
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isEditing ? (
                          <Input
                            className="h-8 w-48 text-xs"
                            value={p.labelFr}
                            onChange={(e) => updateEditField("labelFr", e.target.value)}
                          />
                        ) : (
                          p.labelFr
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex flex-wrap gap-1">
                            {categoriesAgents.map((cat) => (
                              <label
                                key={cat.code}
                                className="flex items-center gap-1 text-xs"
                              >
                                <Checkbox
                                  checked={
                                    (p.categoriesConcernees ?? []).includes(cat.code)
                                  }
                                  onCheckedChange={(c) =>
                                    updateEditCategories(cat.code, !!c)
                                  }
                                />
                                {cat.code}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(p.categoriesConcernees ?? []).map((cat) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {cat}
                              </Badge>
                            ))}
                            {(p.categoriesConcernees ?? []).length === 0 && (
                              <span className="text-xs text-muted-foreground">Toutes</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-8 w-16 text-xs text-center"
                            value={p.ancienneteMin ?? 0}
                            onChange={(e) =>
                              updateEditField(
                                "ancienneteMin",
                                parseInt(e.target.value) || 0
                              )
                            }
                          />
                        ) : (
                          p.ancienneteMin ?? 0
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={p.modeCalcul ?? "forfaitaire"}
                            onValueChange={(v) =>
                              updateEditField(
                                "modeCalcul",
                                v as PrimeMensuelleStructuree["modeCalcul"]
                              )
                            }
                          >
                            <SelectTrigger className="h-8 w-40 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="forfaitaire">Forfaitaire</SelectItem>
                              <SelectItem value="anciennete_dependant">
                                Ancienneté-dép.
                              </SelectItem>
                              <SelectItem value="note_dependant">
                                Note-dépendant
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">
                            {p.modeCalcul === "anciennete_dependant"
                              ? "Ancienneté-dép."
                              : p.modeCalcul === "note_dependant"
                              ? "Note-dép."
                              : "Forfaitaire"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Switch
                            checked={p.actif ?? true}
                            onCheckedChange={(v) => updateEditField("actif", v)}
                          />
                        ) : (
                          <Switch
                            checked={p.actif ?? true}
                            onCheckedChange={(v) => handleToggleActif(idx, v)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={saveEdit}
                            >
                              <Check className="size-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={cancelEdit}
                            >
                              <X className="size-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => startEdit(idx)}
                            >
                              <Edit3 className="size-3.5" />
                            </Button>
                            {deleteConfirm?.index === idx &&
                            deleteConfirm?.type === "mensuelles" ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={() => handleDelete(idx)}
                                >
                                  <Check className="size-4 text-red-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-7"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  <X className="size-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() =>
                                  setDeleteConfirm({ type: "mensuelles", index: idx })
                                }
                              >
                                <Trash2 className="size-3.5 text-red-400" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* ── Expanded row: montants per cat/year ────── */}
                    {isExpanded && (
                      <TableRow key={`expanded-${idx}`}>
                        <TableCell colSpan={8} className="bg-muted/20 px-6 py-3">
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Montants par catégorie / année
                            </p>
                            {(p.categoriesConcernees ?? categoriesAgents.map((c) => c.code)).map(
                              (cat) => {
                                const yearMap =
                                  (p.montants as Record<string, Record<string, number>>)?.[cat] ??
                                  {};
                                const years = Object.keys(yearMap).sort();
                                return (
                                  <div key={cat} className="flex items-start gap-3">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] mt-1 shrink-0"
                                    >
                                      {cat}
                                    </Badge>
                                    <div className="flex flex-wrap gap-2">
                                      {allYears.map((yr) => {
                                        const val = yearMap[yr];
                                        return (
                                          <div key={yr} className="flex items-center gap-1">
                                            <Label className="text-[10px] text-muted-foreground w-10">
                                              {yr}
                                            </Label>
                                            {isEditing ? (
                                              <Input
                                                type="number"
                                                step="0.001"
                                                className="h-7 w-24 text-xs"
                                                value={val ?? ""}
                                                onChange={(e) =>
                                                  updateEditMontant(
                                                    cat,
                                                    yr,
                                                    parseFloat(e.target.value) || 0
                                                  )
                                                }
                                              />
                                            ) : (
                                              <span className="text-xs font-mono">
                                                {val !== undefined
                                                  ? formatMontantDT(val)
                                                  : "—"}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                            )}

                            {/* ── Barème ancienneté ────────────────── */}
                            {p.modeCalcul === "anciennete_dependant" && (
                              <div className="mt-3 space-y-2">
                                <Separator />
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Barème ancienneté
                                </p>
                                {(p.baremeAnciennete ?? []).map((entry, bIdx) => (
                                  <div
                                    key={bIdx}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className="text-muted-foreground">Min:</span>
                                    {isEditing ? (
                                      <>
                                        <Input
                                          type="number"
                                          className="h-7 w-14 text-xs"
                                          value={entry.ancienneteMin}
                                          onChange={(e) =>
                                            updateBaremeEntry(
                                              bIdx,
                                              "ancienneteMin",
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                        />
                                        <span className="text-muted-foreground">Max:</span>
                                        <Input
                                          type="number"
                                          className="h-7 w-14 text-xs"
                                          value={entry.ancienneteMax}
                                          onChange={(e) =>
                                            updateBaremeEntry(
                                              bIdx,
                                              "ancienneteMax",
                                              parseInt(e.target.value) || 0
                                            )
                                          }
                                        />
                                        <span className="text-muted-foreground">DT:</span>
                                        <Input
                                          type="number"
                                          step="0.001"
                                          className="h-7 w-20 text-xs"
                                          value={entry.montant}
                                          onChange={(e) =>
                                            updateBaremeEntry(
                                              bIdx,
                                              "montant",
                                              parseFloat(e.target.value) || 0
                                            )
                                          }
                                        />
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-6"
                                          onClick={() => removeBaremeEntry(bIdx)}
                                        >
                                          <X className="size-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span>
                                          {entry.ancienneteMin}–{entry.ancienneteMax} ans →{" "}
                                          {formatMontantDT(entry.montant)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                ))}
                                {isEditing && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={addBaremeEntry}
                                  >
                                    <Plus className="size-3 mr-1" />
                                    Ajouter bareme
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}

              {primes.length === 0 && !adding && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Aucune prime mensuelle définie pour cette convention.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRIMES ANNUELLES SECTION
// ═══════════════════════════════════════════════════════════════════════

interface PrimesAnnuellesProps {
  primes: PrimeAnnuelleStructuree[];
  categoriesAgents: CategorieAgent[];
  persist: (data: PrimeAnnuelleStructuree[]) => void;
  deleteConfirm: { type: string; index: number } | null;
  setDeleteConfirm: (dc: { type: string; index: number } | null) => void;
}

function PrimesAnnuellesSection({
  primes,
  categoriesAgents,
  persist,
  deleteConfirm,
  setDeleteConfirm,
}: PrimesAnnuellesProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditingRow | null>(null);

  const emptyPrime: PrimeAnnuelleStructuree = useMemo(
    () => ({
      code: "",
      labelFr: "",
      categoriesConcernees: categoriesAgents.map((c) => c.code),
      ancienneteMin: 0,
      actif: true,
      modeCalcul: "forfaitaire",
    }),
    [categoriesAgents]
  );

  const [newPrime, setNewPrime] = useState<PrimeAnnuelleStructuree>(emptyPrime);

  const handleAdd = () => {
    if (!newPrime.code.trim() || !newPrime.labelFr.trim()) {
      toast.error("Code et label sont requis");
      return;
    }
    persist([...primes, { ...newPrime }]);
    setAdding(false);
    setNewPrime(emptyPrime);
    toast.success(`Prime "${newPrime.code}" ajoutée`);
  };

  const handleDelete = (index: number) => {
    persist(primes.filter((_, i) => i !== index));
    setDeleteConfirm(null);
    toast.success("Prime supprimée");
  };

  const handleToggleActif = (index: number, val: boolean) => {
    persist(primes.map((p, i) => (i === index ? { ...p, actif: val } : p)));
  };

  const startEdit = (index: number) => {
    setEditing({ index, data: deepClone(primes[index]) as unknown as Record<string, unknown> });
  };

  const saveEdit = () => {
    if (!editing) return;
    persist(
      primes.map((p, i) =>
        i === editing.index ? (editing.data as unknown as PrimeAnnuelleStructuree) : p
      )
    );
    setEditing(null);
    toast.success("Prime modifiée");
  };

  const editData = editing?.data as PrimeAnnuelleStructuree | undefined;

  const updateEditField = (field: keyof PrimeAnnuelleStructuree, value: unknown) => {
    if (!editing) return;
    setEditing({ ...editing, data: { ...editing.data, [field]: value } });
  };

  const updateEditCategories = (code: string, checked: boolean) => {
    if (!editData) return;
    const current = editData.categoriesConcernees ?? [];
    const next = checked ? [...current, code] : current.filter((c) => c !== code);
    updateEditField("categoriesConcernees", next);
  };

  const updateNewCategories = (code: string, checked: boolean) => {
    const current = newPrime.categoriesConcernees ?? [];
    const next = checked ? [...current, code] : current.filter((c) => c !== code);
    setNewPrime({ ...newPrime, categoriesConcernees: next });
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Primes Annuelles ({primes.length})</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          <Plus className="size-4 mr-1" />
          Ajouter une prime
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Mode calcul</TableHead>
                <TableHead>Catégories affectées</TableHead>
                <TableHead className="text-center">Anc. min</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow className="bg-muted/30">
                  <TableCell>
                    <Input
                      className="h-8 w-28 text-xs"
                      placeholder="CODE"
                      value={newPrime.code}
                      onChange={(e) =>
                        setNewPrime({ ...newPrime, code: e.target.value.toUpperCase() })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-48 text-xs"
                      placeholder="Label FR"
                      value={newPrime.labelFr}
                      onChange={(e) => setNewPrime({ ...newPrime, labelFr: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-36 text-xs"
                      placeholder="modeCalcul"
                      value={newPrime.modeCalcul ?? ""}
                      onChange={(e) =>
                        setNewPrime({ ...newPrime, modeCalcul: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {categoriesAgents.map((cat) => (
                        <label key={cat.code} className="flex items-center gap-1 text-xs">
                          <Checkbox
                            checked={newPrime.categoriesConcernees?.includes(cat.code) ?? false}
                            onCheckedChange={(c) => updateNewCategories(cat.code, !!c)}
                          />
                          {cat.code}
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      className="h-8 w-16 text-xs text-center"
                      value={newPrime.ancienneteMin ?? 0}
                      onChange={(e) =>
                        setNewPrime({
                          ...newPrime,
                          ancienneteMin: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={newPrime.actif ?? true}
                      onCheckedChange={(v) => setNewPrime({ ...newPrime, actif: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="size-7" onClick={handleAdd}>
                        <Check className="size-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => {
                          setAdding(false);
                          setNewPrime(emptyPrime);
                        }}
                      >
                        <X className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {primes.map((prime, idx) => {
                const isEditing = editing?.index === idx;
                const p = isEditing ? editData! : prime;

                return (
                  <TableRow key={idx} className={isEditing ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {isEditing ? (
                        <Input
                          className="h-8 w-28 text-xs"
                          value={p.code}
                          onChange={(e) =>
                            updateEditField("code", e.target.value.toUpperCase())
                          }
                        />
                      ) : (
                        p.code
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <Input
                          className="h-8 w-48 text-xs"
                          value={p.labelFr}
                          onChange={(e) => updateEditField("labelFr", e.target.value)}
                        />
                      ) : (
                        p.labelFr
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          className="h-8 w-36 text-xs"
                          value={p.modeCalcul ?? ""}
                          onChange={(e) => updateEditField("modeCalcul", e.target.value)}
                        />
                      ) : (
                        <span className="text-xs">{p.modeCalcul ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1">
                          {categoriesAgents.map((cat) => (
                            <label
                              key={cat.code}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Checkbox
                                checked={(p.categoriesConcernees ?? []).includes(cat.code)}
                                onCheckedChange={(c) => updateEditCategories(cat.code, !!c)}
                              />
                              {cat.code}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(p.categoriesConcernees ?? []).map((cat) => (
                            <Badge
                              key={cat}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {isEditing ? (
                        <Input
                          type="number"
                          className="h-8 w-16 text-xs text-center"
                          value={p.ancienneteMin ?? 0}
                          onChange={(e) =>
                            updateEditField("ancienneteMin", parseInt(e.target.value) || 0)
                          }
                        />
                      ) : (
                        p.ancienneteMin ?? 0
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Switch
                          checked={p.actif ?? true}
                          onCheckedChange={(v) => updateEditField("actif", v)}
                        />
                      ) : (
                        <Switch
                          checked={p.actif ?? true}
                          onCheckedChange={(v) => handleToggleActif(idx, v)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={saveEdit}
                          >
                            <Check className="size-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => setEditing(null)}
                          >
                            <X className="size-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => startEdit(idx)}
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                          {deleteConfirm?.index === idx &&
                          deleteConfirm?.type === "annuelles" ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => handleDelete(idx)}
                              >
                                <Check className="size-4 text-red-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                <X className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() =>
                                setDeleteConfirm({ type: "annuelles", index: idx })
                              }
                            >
                              <Trash2 className="size-3.5 text-red-400" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {primes.length === 0 && !adding && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    Aucune prime annuelle définie.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRIMES SOCIALES SECTION
// ═══════════════════════════════════════════════════════════════════════

interface PrimesSocialesProps {
  primes: PrimeSocialeStructuree[];
  categoriesAgents: CategorieAgent[];
  persist: (data: PrimeSocialeStructuree[]) => void;
  deleteConfirm: { type: string; index: number } | null;
  setDeleteConfirm: (dc: { type: string; index: number } | null) => void;
}

function PrimesSocialesSection({
  primes,
  categoriesAgents,
  persist,
  deleteConfirm,
  setDeleteConfirm,
}: PrimesSocialesProps) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EditingRow | null>(null);

  const emptyPrime: PrimeSocialeStructuree = useMemo(
    () => ({
      code: "",
      labelFr: "",
      categoriesConcernees: categoriesAgents.map((c) => c.code),
      ancienneteMin: 0,
      actif: true,
    }),
    [categoriesAgents]
  );

  const [newPrime, setNewPrime] = useState<PrimeSocialeStructuree>(emptyPrime);

  const handleAdd = () => {
    if (!newPrime.code.trim() || !newPrime.labelFr.trim()) {
      toast.error("Code et label sont requis");
      return;
    }
    persist([...primes, { ...newPrime }]);
    setAdding(false);
    setNewPrime(emptyPrime);
    toast.success(`Prime "${newPrime.code}" ajoutée`);
  };

  const handleDelete = (index: number) => {
    persist(primes.filter((_, i) => i !== index));
    setDeleteConfirm(null);
    toast.success("Prime supprimée");
  };

  const handleToggleActif = (index: number, val: boolean) => {
    persist(primes.map((p, i) => (i === index ? { ...p, actif: val } : p)));
  };

  const startEdit = (index: number) => {
    setEditing({ index, data: deepClone(primes[index]) as unknown as Record<string, unknown> });
  };

  const saveEdit = () => {
    if (!editing) return;
    persist(
      primes.map((p, i) =>
        i === editing.index ? (editing.data as unknown as PrimeSocialeStructuree) : p
      )
    );
    setEditing(null);
    toast.success("Prime modifiée");
  };

  const editData = editing?.data as PrimeSocialeStructuree | undefined;

  const updateEditField = (field: keyof PrimeSocialeStructuree, value: unknown) => {
    if (!editing) return;
    setEditing({ ...editing, data: { ...editing.data, [field]: value } });
  };

  const updateEditCategories = (code: string, checked: boolean) => {
    if (!editData) return;
    const current = editData.categoriesConcernees ?? [];
    const next = checked ? [...current, code] : current.filter((c) => c !== code);
    updateEditField("categoriesConcernees", next);
  };

  const updateNewCategories = (code: string, checked: boolean) => {
    const current = newPrime.categoriesConcernees ?? [];
    const next = checked ? [...current, code] : current.filter((c) => c !== code);
    setNewPrime({ ...newPrime, categoriesConcernees: next });
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Primes Sociales ({primes.length})</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
          disabled={adding}
        >
          <Plus className="size-4 mr-1" />
          Ajouter une prime
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-center">Montant</TableHead>
                <TableHead>Catégories</TableHead>
                <TableHead className="text-center">Anc. min</TableHead>
                <TableHead className="text-center">Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adding && (
                <TableRow className="bg-muted/30">
                  <TableCell>
                    <Input
                      className="h-8 w-28 text-xs"
                      placeholder="CODE"
                      value={newPrime.code}
                      onChange={(e) =>
                        setNewPrime({ ...newPrime, code: e.target.value.toUpperCase() })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-48 text-xs"
                      placeholder="Label FR"
                      value={newPrime.labelFr}
                      onChange={(e) => setNewPrime({ ...newPrime, labelFr: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      step="0.001"
                      className="h-8 w-24 text-xs text-center"
                      value={newPrime.montant ?? ""}
                      onChange={(e) =>
                        setNewPrime({
                          ...newPrime,
                          montant: parseFloat(e.target.value) || undefined,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {categoriesAgents.map((cat) => (
                        <label key={cat.code} className="flex items-center gap-1 text-xs">
                          <Checkbox
                            checked={newPrime.categoriesConcernees?.includes(cat.code) ?? false}
                            onCheckedChange={(c) => updateNewCategories(cat.code, !!c)}
                          />
                          {cat.code}
                        </label>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      className="h-8 w-16 text-xs text-center"
                      value={newPrime.ancienneteMin ?? 0}
                      onChange={(e) =>
                        setNewPrime({
                          ...newPrime,
                          ancienneteMin: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={newPrime.actif ?? true}
                      onCheckedChange={(v) => setNewPrime({ ...newPrime, actif: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="size-7" onClick={handleAdd}>
                        <Check className="size-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => {
                          setAdding(false);
                          setNewPrime(emptyPrime);
                        }}
                      >
                        <X className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {primes.map((prime, idx) => {
                const isEditing = editing?.index === idx;
                const p = isEditing ? editData! : prime;

                return (
                  <TableRow key={idx} className={isEditing ? "bg-primary/5" : ""}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {isEditing ? (
                        <Input
                          className="h-8 w-28 text-xs"
                          value={p.code}
                          onChange={(e) =>
                            updateEditField("code", e.target.value.toUpperCase())
                          }
                        />
                      ) : (
                        p.code
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {isEditing ? (
                        <Input
                          className="h-8 w-48 text-xs"
                          value={p.labelFr}
                          onChange={(e) => updateEditField("labelFr", e.target.value)}
                        />
                      ) : (
                        p.labelFr
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm font-mono">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.001"
                          className="h-8 w-24 text-xs text-center"
                          value={p.montant ?? ""}
                          onChange={(e) =>
                            updateEditField(
                              "montant",
                              parseFloat(e.target.value) || undefined
                            )
                          }
                        />
                      ) : p.montant !== undefined && p.montant !== null ? (
                        formatMontantDT(p.montant)
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1">
                          {categoriesAgents.map((cat) => (
                            <label
                              key={cat.code}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Checkbox
                                checked={(p.categoriesConcernees ?? []).includes(cat.code)}
                                onCheckedChange={(c) => updateEditCategories(cat.code, !!c)}
                              />
                              {cat.code}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(p.categoriesConcernees ?? []).map((cat) => (
                            <Badge
                              key={cat}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {isEditing ? (
                        <Input
                          type="number"
                          className="h-8 w-16 text-xs text-center"
                          value={p.ancienneteMin ?? 0}
                          onChange={(e) =>
                            updateEditField("ancienneteMin", parseInt(e.target.value) || 0)
                          }
                        />
                      ) : (
                        p.ancienneteMin ?? 0
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Switch
                          checked={p.actif ?? true}
                          onCheckedChange={(v) => updateEditField("actif", v)}
                        />
                      ) : (
                        <Switch
                          checked={p.actif ?? true}
                          onCheckedChange={(v) => handleToggleActif(idx, v)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={saveEdit}
                          >
                            <Check className="size-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => setEditing(null)}
                          >
                            <X className="size-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => startEdit(idx)}
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                          {deleteConfirm?.index === idx &&
                          deleteConfirm?.type === "sociales" ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => handleDelete(idx)}
                              >
                                <Check className="size-4 text-red-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                <X className="size-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() =>
                                setDeleteConfirm({ type: "sociales", index: idx })
                              }
                            >
                              <Trash2 className="size-3.5 text-red-400" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {primes.length === 0 && !adding && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    Aucune prime sociale définie.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GRILLE SALARIALE SECTION
// ═══════════════════════════════════════════════════════════════════════

interface GrilleSalarialeProps {
  grille: GrilleSalarialeLigne[];
  categoriesAgents: CategorieAgent[];
  showHistorical: boolean;
  setShowHistorical: (v: boolean) => void;
}

function GrilleSalarialeSection({
  grille,
  categoriesAgents,
  showHistorical,
  setShowHistorical,
}: GrilleSalarialeProps) {
  // Collect all years
  const allYears = useMemo(() => {
    const years = new Set<string>();
    grille.forEach((ligne) => {
      Object.keys(ligne.montants).forEach((y) => years.add(y));
    });
    return Array.from(years).sort();
  }, [grille]);

  const visibleYears = useMemo(
    () => (showHistorical ? allYears : allYears.filter((y) => !isHistoricalYear(y))),
    [allYears, showHistorical]
  );

  // Group by category then by echelle
  const grouped = useMemo(() => {
    const catMap = new Map<string, Map<number, GrilleSalarialeLigne[]>>();

    for (const cat of categoriesAgents) {
      const echelleMap = new Map<number, GrilleSalarialeLigne[]>();
      for (const ligne of grille) {
        if (ligne.echelle >= cat.echelleMin && ligne.echelle <= cat.echelleMax) {
          if (!echelleMap.has(ligne.echelle)) {
            echelleMap.set(ligne.echelle, []);
          }
          echelleMap.get(ligne.echelle)!.push(ligne);
        }
      }
      if (echelleMap.size > 0) {
        catMap.set(cat.code, echelleMap);
      }
    }

    // Also add uncategorized echelles
    const coveredEchelles = new Set<number>();
    for (const cat of categoriesAgents) {
      for (const ligne of grille) {
        if (ligne.echelle >= cat.echelleMin && ligne.echelle <= cat.echelleMax) {
          coveredEchelles.add(ligne.echelle);
        }
      }
    }
    const uncategorized = grille.filter((l) => !coveredEchelles.has(l.echelle));
    if (uncategorized.length > 0) {
      const echelleMap = new Map<number, GrilleSalarialeLigne[]>();
      for (const ligne of uncategorized) {
        if (!echelleMap.has(ligne.echelle)) echelleMap.set(ligne.echelle, []);
        echelleMap.get(ligne.echelle)!.push(ligne);
      }
      catMap.set("AUTRES", echelleMap);
    }

    return catMap;
  }, [grille, categoriesAgents]);

  // ── Expanded echelles ────────────────────────────────────────────────
  const [expandedEchelles, setExpandedEchelles] = useState<Set<number>>(new Set());

  const toggleEchelle = (echelle: number) => {
    const next = new Set(expandedEchelles);
    if (next.has(echelle)) next.delete(echelle);
    else next.add(echelle);
    setExpandedEchelles(next);
  };

  if (grille.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Aucune grille salariale détaillée pour cette convention.
        </CardContent>
      </Card>
    );
  }

  const catLabel = (code: string) => {
    const cat = categoriesAgents.find((c) => c.code === code);
    return cat ? `${cat.labelFr} (éch. ${cat.echelleMin}–${cat.echelleMax})` : code;
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">
          Grille Salariale ({grille.length} lignes)
        </CardTitle>
        <Button
          size="sm"
          variant={showHistorical ? "default" : "outline"}
          onClick={() => setShowHistorical(!showHistorical)}
        >
          {showHistorical ? (
            <>
              <EyeOff className="size-4 mr-1.5" />
              Masquer historique
            </>
          ) : (
            <>
              <Eye className="size-4 mr-1.5" />
              Afficher historique
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from(grouped.entries()).map(([catCode, echelleMap]) => (
          <div key={catCode}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {catCode}
              </Badge>
              {catLabel(catCode)}
            </h3>

            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Éch.</TableHead>
                    <TableHead className="w-10">Échel.</TableHead>
                    {visibleYears.map((yr) => (
                      <TableHead
                        key={yr}
                        className={`text-center text-xs ${
                          isHistoricalYear(yr) ? "text-muted-foreground" : ""
                        }`}
                      >
                        {yr}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(echelleMap.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([echelle, lignes]) => {
                      const isExpanded = expandedEchelles.has(echelle);
                      // Show only first echelon unless expanded
                      const displayLignes = isExpanded
                        ? lignes.sort((a, b) => a.echelon - b.echelon)
                        : lignes
                            .sort((a, b) => a.echelon - b.echelon)
                            .slice(0, 1);

                      return (
                        <>
                          {displayLignes.map((ligne, lIdx) => (
                            <TableRow key={`${echelle}-${ligne.echelon}`}>
                              {lIdx === 0 && (
                                <TableCell
                                  rowSpan={isExpanded ? lignes.length : 1}
                                  className="font-semibold text-center border-r"
                                >
                                  <button
                                    onClick={() => toggleEchelle(echelle)}
                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="size-3.5" />
                                    ) : (
                                      <ChevronRight className="size-3.5" />
                                    )}
                                    {echelle}
                                  </button>
                                </TableCell>
                              )}
                              <TableCell className="text-center text-xs">
                                {ligne.echelon}
                              </TableCell>
                              {visibleYears.map((yr) => {
                                const val = ligne.montants[yr];
                                return (
                                  <TableCell
                                    key={yr}
                                    className={`text-center text-xs font-mono ${
                                      isHistoricalYear(yr)
                                        ? "text-muted-foreground/60"
                                        : ""
                                    }`}
                                  >
                                    {val !== undefined ? formatMontantDT(val) : "—"}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}

        {!showHistorical && (
          <p className="text-xs text-muted-foreground text-center">
            Années historiques masquées — cliquez « Afficher historique » pour les
            révéler
          </p>
        )}
      </CardContent>
    </Card>
  );
}
