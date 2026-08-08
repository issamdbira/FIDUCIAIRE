import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  FileDown,
  Eye,
  GripVertical,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  PDFDocument,
  PDFPage,
  StandardFonts,
  rgb,
  degrees,
} from "pdf-lib";
import type { PDFFont } from "pdf-lib";

// ── Zod Schema ──
const neantItemSchema = z.object({
  matricule: z
    .string()
    .min(1, "Le matricule est obligatoire")
    .regex(/^\d{8}-\d{2}$/, "Format invalide (ex: 12345678-99)"),
  raisonSociale: z.string().min(2, "Minimum 2 caracteres"),
  trimestre: z.number().min(1).max(4),
  annee: z
    .number()
    .min(new Date().getFullYear() - 1)
    .max(new Date().getFullYear() + 1),
});

type NeantItem = z.infer<typeof neantItemSchema>;

// ── Field Mapping Types ──
type FieldKey =
  | "matricule"
  | "raisonSociale"
  | "trimestre"
  | "annee"
  | "zeroDinar"
  | "neant";

type FieldPosition = { x: number; y: number };
type FieldMap = Record<FieldKey, FieldPosition>;
type PageSize = { width: number; height: number };
interface TemplateInfo {
  bytes: ArrayBuffer;
  pageSize: PageSize;
}

// ── Field Definitions for Draggable Blocks ──
const FIELD_DEFS: { key: FieldKey; label: string; color: string }[] = [
  { key: "matricule", label: "Matricule", color: "bg-blue-500/85" },
  { key: "raisonSociale", label: "Raison Sociale", color: "bg-emerald-500/85" },
  { key: "trimestre", label: "Trimestre", color: "bg-amber-500/85" },
  { key: "annee", label: "Annee", color: "bg-violet-500/85" },
  { key: "zeroDinar", label: "Zero Dinar", color: "bg-orange-500/85" },
  { key: "neant", label: "NEANT", color: "bg-red-500/85" },
];

// ── Default Field Maps ──
const DEFAULT_I3_MAP: FieldMap = {
  matricule: { x: 70, y: 710 },
  raisonSociale: { x: 350, y: 710 },
  trimestre: { x: 180, y: 680 },
  annee: { x: 250, y: 680 },
  zeroDinar: { x: 350, y: 80 },
  neant: { x: 230, y: 420 },
};

const DEFAULT_I16_MAP: FieldMap = {
  matricule: { x: 155, y: 740 },
  raisonSociale: { x: 255, y: 718 },
  trimestre: { x: 445, y: 740 },
  annee: { x: 560, y: 740 },
  zeroDinar: { x: 175, y: 130 },
  neant: { x: 490, y: 275 },
};

// ── Sanitize: remove accents for pdf-lib StandardFonts (WinAnsiEncoding) ──
function sanitize(text: string): string {
  return text
    .replace(/[\u00c9\u00c8\u00ca\u00cb]/g, "E")
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, "e")
    .replace(/[\u00c0\u00c1\u00c2\u00c3\u00c4]/g, "A")
    .replace(/[\u00e0\u00e1\u00e2\u00e3\u00e4]/g, "a")
    .replace(/[\u00d9\u00da\u00db\u00dc]/g, "U")
    .replace(/[\u00f9\u00fa\u00fb\u00fc]/g, "u")
    .replace(/[\u00ce\u00cf]/g, "I")
    .replace(/[\u00ee\u00ef]/g, "i")
    .replace(/[\u00d2\u00d3\u00d4\u00d5\u00d6]/g, "O")
    .replace(/[\u00f2\u00f3\u00f4\u00f5\u00f6]/g, "o")
    .replace(/[\u00c7]/g, "C")
    .replace(/[\u00e7]/g, "c")
    .replace(/[\u00d1]/g, "N")
    .replace(/[\u00f1]/g, "n");
}

// ══════════════════════════════════════════════════════════════════════
// INJECTION I3
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI3(
  page: PDFPage,
  data: NeantItem,
  map: FieldMap,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const m = map.matricule;
  page.drawText(sanitize(data.matricule), {
    x: m.x, y: m.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const r = map.raisonSociale;
  page.drawText(sanitize(data.raisonSociale), {
    x: r.x, y: r.y, font: fontBold, size: 10, color: rgb(0, 0, 0),
  });

  const t = map.trimestre;
  page.drawText(String(data.trimestre), {
    x: t.x, y: t.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const a = map.annee;
  page.drawText(String(data.annee), {
    x: a.x, y: a.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const z = map.zeroDinar;
  page.drawText("Zero Dinar", {
    x: z.x, y: z.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const n = map.neant;
  page.drawText("NEANT", {
    x: n.x, y: n.y, font: fontBold, size: 45, color: rgb(0.75, 0.75, 0.75),
    rotate: degrees(45), opacity: 0.5,
  });
}

// ══════════════════════════════════════════════════════════════════════
// INJECTION I16
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI16(
  page: PDFPage,
  data: NeantItem,
  map: FieldMap,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const m = map.matricule;
  page.drawText(sanitize(data.matricule), {
    x: m.x, y: m.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const r = map.raisonSociale;
  page.drawText(sanitize(data.raisonSociale), {
    x: r.x, y: r.y, font: fontBold, size: 9, color: rgb(0, 0, 0),
  });

  const t = map.trimestre;
  page.drawText(String(data.trimestre), {
    x: t.x, y: t.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const a = map.annee;
  page.drawText(String(data.annee), {
    x: a.x, y: a.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const z = map.zeroDinar;
  page.drawText("Zero Dinar", {
    x: z.x, y: z.y, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  const n = map.neant;
  page.drawText("NEANT", {
    x: n.x, y: n.y, font: fontBold, size: 45, color: rgb(0.75, 0.75, 0.75),
    rotate: degrees(45), opacity: 0.5,
  });
}

// ── Helper: build stamped PDF, first page only if requested ──
async function buildStampedPage(
  templateBytes: ArrayBuffer,
  item: NeantItem,
  map: FieldMap,
  injectFn: (
    page: PDFPage,
    data: NeantItem,
    map: FieldMap,
    fR: PDFFont,
    fB: PDFFont,
  ) => void,
  firstPageOnly: boolean,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPages()[0];
  injectFn(page, item, map, fontRegular, fontBold);

  if (firstPageOnly && doc.getPageCount() > 1) {
    const pagesToRemove = doc.getPageIndices().slice(1);
    for (let i = pagesToRemove.length - 1; i >= 0; i--) {
      doc.removePage(pagesToRemove[i]!);
    }
  }

  return doc.save();
}

// ── Helper: Uint8Array to base64 data URI ──
function pdfToDataUri(pdfBytes: Uint8Array): string {
  let binary = "";
  const bytes = new Uint8Array(pdfBytes);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function DeclarationsNeant() {
  const [items, setItems] = useState<NeantItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewTab, setPreviewTab] = useState<"I3" | "I16">("I3");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Template info with page sizes
  const [templates, setTemplates] = useState<{
    I3: TemplateInfo | null;
    I16: TemplateInfo | null;
  }>({ I3: null, I16: null });

  // Field maps per document type
  const [fieldMapI3, setFieldMapI3] = useState<FieldMap>({ ...DEFAULT_I3_MAP });
  const [fieldMapI16, setFieldMapI16] = useState<FieldMap>({ ...DEFAULT_I16_MAP });

  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NeantItem>({
    resolver: zodResolver(neantItemSchema) as any,
    defaultValues: {
      matricule: "",
      raisonSociale: "",
      trimestre: 1,
      annee: currentYear,
    },
  });

  // ── Refs for stable drag callback ──
  const previewTabRef = useRef(previewTab);
  previewTabRef.current = previewTab;
  const fieldMapI3Ref = useRef(fieldMapI3);
  fieldMapI3Ref.current = fieldMapI3;
  const fieldMapI16Ref = useRef(fieldMapI16);
  fieldMapI16Ref.current = fieldMapI16;
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  // Load templates + extract page dimensions
  useEffect(() => {
    async function loadTemplates() {
      try {
        const [i3Res, i16Res] = await Promise.all([
          fetch("/I3.pdf"),
          fetch("/I16.pdf"),
        ]);
        if (!i3Res.ok || !i16Res.ok) {
          toast.error("Modeles PDF introuvables (I3/I16)");
          return;
        }
        const [i3Buf, i16Buf] = await Promise.all([
          i3Res.arrayBuffer(),
          i16Res.arrayBuffer(),
        ]);

        const i3Doc = await PDFDocument.load(i3Buf);
        const i3Size = i3Doc.getPages()[0].getSize();
        const i16Doc = await PDFDocument.load(i16Buf);
        const i16Size = i16Doc.getPages()[0].getSize();

        setTemplates({
          I3: { bytes: i3Buf, pageSize: { width: i3Size.width, height: i3Size.height } },
          I16: { bytes: i16Buf, pageSize: { width: i16Size.width, height: i16Size.height } },
        });
      } catch {
        toast.error("Erreur lors du chargement des modeles PDF");
      }
    }
    loadTemplates();
  }, []);

  // Active map / template based on preview tab
  const activeMap = previewTab === "I3" ? fieldMapI3 : fieldMapI16;
  const activeTemplate =
    previewTab === "I3" ? templates.I3 : templates.I16;

  // ── Drag End Handler (stable reference via refs) ──
  const handleDragEnd = useCallback(
    (fieldKey: FieldKey, offset: { x: number; y: number }) => {
      const container = containerRef.current;
      const tpl =
        previewTabRef.current === "I3"
          ? templatesRef.current.I3
          : templatesRef.current.I16;
      const map =
        previewTabRef.current === "I3"
          ? fieldMapI3Ref.current
          : fieldMapI16Ref.current;

      if (!container || !tpl) return;

      const rect = container.getBoundingClientRect();
      const current = map[fieldKey];
      const { width: pw, height: ph } = tpl.pageSize;

      // Current CSS pixel position (derived from PDF coords)
      const currentCssX = (current.x / pw) * rect.width;
      const currentCssY = (1 - current.y / ph) * rect.height;

      // New CSS pixel position after drag offset
      const newCssX = currentCssX + offset.x;
      const newCssY = currentCssY + offset.y;

      // Convert back to PDF coordinate system
      const newPdfX = Math.round((newCssX / rect.width) * pw);
      const newPdfY = Math.round(ph - (newCssY / rect.height) * ph);

      // Clamp to page bounds
      const clampedX = Math.max(0, Math.min(Math.round(pw), newPdfX));
      const clampedY = Math.max(0, Math.min(Math.round(ph), newPdfY));

      // Update the correct field map state
      if (previewTabRef.current === "I3") {
        setFieldMapI3((prev) => ({
          ...prev,
          [fieldKey]: { x: clampedX, y: clampedY },
        }));
      } else {
        setFieldMapI16((prev) => ({
          ...prev,
          [fieldKey]: { x: clampedX, y: clampedY },
        }));
      }
    },
    [],
  );

  // Live Preview (debounced)
  useEffect(() => {
    if (!templates.I3 || !templates.I16 || items.length === 0) {
      setPreviewUrl("");
      return;
    }

    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(async () => {
      try {
        const firstItem = items[0];
        const tpl = (previewTab === "I3" ? templates.I3 : templates.I16)!;
        const map = previewTab === "I3" ? fieldMapI3 : fieldMapI16;
        const injectFn =
          previewTab === "I3" ? injectDataIntoI3 : injectDataIntoI16;
        const firstPageOnly = previewTab === "I16";
        const pdfBytes = await buildStampedPage(
          tpl.bytes,
          firstItem,
          map,
          injectFn,
          firstPageOnly,
        );
        setPreviewUrl(pdfToDataUri(pdfBytes));
      } catch {
        /* silent */
      }
    }, 150);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [items, previewTab, fieldMapI3, fieldMapI16, templates]);

  const onFormSubmit = (data: NeantItem) => {
    setItems((prev) => [...prev, data]);
    reset({
      matricule: "",
      raisonSociale: "",
      trimestre: 1,
      annee: currentYear,
    });
    toast.success(`Declaration ajoutee : ${data.matricule}`);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Excel Import ──
  const processExcelFile = useCallback(
    async (file: File) => {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          header: 1,
        });

        const imported: NeantItem[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;

          const rawMatricule = String(row[0] ?? "").trim();
          if (!/^\d{8}-\d{2}$/.test(rawMatricule)) continue;

          const rawTrimestre = Number(row[2]);
          const rawAnnee = Number(row[3]);

          if (rawTrimestre < 1 || rawTrimestre > 4) continue;
          if (
            !rawAnnee ||
            rawAnnee < currentYear - 1 ||
            rawAnnee > currentYear + 1
          )
            continue;

          imported.push({
            matricule: rawMatricule,
            raisonSociale: String(row[1] ?? "").trim(),
            trimestre: rawTrimestre,
            annee: rawAnnee,
          });
        }

        if (imported.length > 0) {
          setItems((prev) => [...prev, ...imported]);
          toast.success(
            `${imported.length} declaration(s) importee(s) depuis Excel`,
          );
        } else {
          toast.error(
            "Aucune donnee valide trouvee dans le fichier Excel",
          );
        }
      } catch {
        toast.error("Erreur lors de la lecture du fichier Excel");
      }
    },
    [currentYear],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processExcelFile(file);
    },
    [processExcelFile],
  );

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcelFile(file);
    e.target.value = "";
  };

  // ── PDF Generation ──
  const generatePDF = async () => {
    if (items.length === 0 || !templates.I3 || !templates.I16) return;
    setIsGenerating(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        // I3
        const i3Bytes = await buildStampedPage(
          templates.I3!.bytes,
          item,
          fieldMapI3,
          injectDataIntoI3,
          false,
        );
        const i3Doc = await PDFDocument.load(i3Bytes);
        const i3Copied = await mergedPdf.copyPages(
          i3Doc,
          i3Doc.getPageIndices(),
        );
        for (const cp of i3Copied) mergedPdf.addPage(cp);

        // I16 (strictement premiere page)
        const i16Bytes = await buildStampedPage(
          templates.I16!.bytes,
          item,
          fieldMapI16,
          injectDataIntoI16,
          true,
        );
        const i16Doc = await PDFDocument.load(i16Bytes);
        const i16Copied = await mergedPdf.copyPages(
          i16Doc,
          i16Doc.getPageIndices(),
        );
        for (const cp of i16Copied) mergedPdf.addPage(cp);
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Declarations_Neant_Lot_Complet.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${items.length} declaration(s) generee(s) : I3 + I16`);
    } catch {
      toast.error("Erreur lors de la generation du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-2xl font-bold text-foreground mb-1"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Declarations Neant
        </h2>
        <p className="text-muted-foreground text-sm">
          Generez par lot vos declarations neant (Etat Recapitulatif I3 +
          Bordereau I16) en injectant les donnees employeur et la mention NEANT.
        </p>
      </div>

      {/* A. Saisie manuelle */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Saisie manuelle</CardTitle>
          <CardDescription>
            Ajoutez une declaration a la liste avant generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matricule">Matricule CNSS</Label>
                <Input
                  id="matricule"
                  placeholder="12345678-99"
                  {...register("matricule")}
                />
                {errors.matricule && (
                  <p className="text-sm text-destructive">
                    {errors.matricule.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="raisonSociale">Raison sociale</Label>
                <Input
                  id="raisonSociale"
                  placeholder="Nom de l'entreprise"
                  {...register("raisonSociale")}
                />
                {errors.raisonSociale && (
                  <p className="text-sm text-destructive">
                    {errors.raisonSociale.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trimestre</Label>
                <Select
                  defaultValue="1"
                  onValueChange={(val) =>
                    register("trimestre").onChange({
                      target: { value: val },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="annee">Annee</Label>
                <Input
                  id="annee"
                  type="number"
                  min={currentYear - 1}
                  max={currentYear + 1}
                  {...register("annee", { valueAsNumber: true })}
                />
                {errors.annee && (
                  <p className="text-sm text-destructive">
                    {errors.annee.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit">Ajouter a la liste</Button>
          </form>
        </CardContent>
      </Card>

      {/* B. Import Excel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Import Excel</CardTitle>
          <CardDescription>
            Glissez un fichier .xlsx ou cliquez pour selectionner. Colonne A =
            Matricule, B = Raison Sociale, C = Trimestre, D = Annee.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-md p-10 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() =>
              document
                .getElementById("excel-input-neant")
                ?.click()
            }
          >
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {dragOver
                ? "Deposez le fichier ici"
                : "Glissez un fichier .xlsx ici ou cliquez pour selectionner"}
            </p>
            <input
              id="excel-input-neant"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onFileSelect}
            />
          </div>
        </CardContent>
      </Card>

      {/* C. Liste + Mapping Visuel + Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">
            Liste des declarations ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-semibold text-foreground">#</th>
                    <th className="pb-2 pr-4 font-semibold text-foreground">
                      Matricule
                    </th>
                    <th className="pb-2 pr-4 font-semibold text-foreground">
                      Raison sociale
                    </th>
                    <th className="pb-2 pr-4 font-semibold text-foreground">
                      Trim.
                    </th>
                    <th className="pb-2 pr-4 font-semibold text-foreground">
                      Annee
                    </th>
                    <th className="pb-2 font-semibold text-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-2 pr-4 font-mono text-foreground">
                        {item.matricule}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {item.raisonSociale}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {item.trimestre}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {item.annee}
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              <FileSpreadsheet className="mx-auto h-8 w-8 mb-2" />
              Aucune declaration dans la liste. Utilisez le formulaire ou
              importez un Excel.
            </p>
          )}

          {/* Visual Mapping + Live Preview */}
          {items.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Mapping Visuel ({previewTab})
                </span>
              </div>

              <Tabs
                value={previewTab}
                onValueChange={(v) => setPreviewTab(v as "I3" | "I16")}
              >
                <TabsList>
                  <TabsTrigger value="I3">Modele I3 (Vertical)</TabsTrigger>
                  <TabsTrigger value="I16">
                    Modele I16 (Horizontal)
                  </TabsTrigger>
                </TabsList>
                <TabsContent value={previewTab}>
                  {activeTemplate ? (
                    <div className="space-y-3">
                      {/* Visual Overlay Container */}
                      <div
                        ref={containerRef}
                        className="relative w-full max-w-3xl mx-auto border rounded-md overflow-hidden bg-muted/20"
                        style={{
                          aspectRatio: `${activeTemplate.pageSize.width}/${activeTemplate.pageSize.height}`,
                        }}
                      >
                        {/* PDF Preview Background */}
                        {previewUrl ? (
                          <iframe
                            src={previewUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            style={{ pointerEvents: "none" }}
                            title={`Apercu ${previewTab}`}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">
                              Chargement de l'apercu...
                            </p>
                          </div>
                        )}

                        {/* Draggable Field Blocks Overlay */}
                        <div
                          className="absolute inset-0"
                          style={{ pointerEvents: "none" }}
                        >
                          {FIELD_DEFS.map((field) => {
                            const pos = activeMap[field.key];
                            return (
                              <motion.div
                                key={field.key}
                                drag
                                dragMomentum={false}
                                dragElastic={0}
                                whileDrag={{
                                  scale: 1.08,
                                  zIndex: 50,
                                }}
                                className={`absolute ${field.color} text-white text-xs px-2 py-1 rounded cursor-grab active:cursor-grabbing select-none flex items-center gap-1 shadow-md whitespace-nowrap transition-shadow hover:shadow-lg`}
                                style={{
                                  left: `${(pos.x / activeTemplate.pageSize.width) * 100}%`,
                                  top: `${(1 - pos.y / activeTemplate.pageSize.height) * 100}%`,
                                  pointerEvents: "auto",
                                }}
                                onDragEnd={(_e, info) =>
                                  handleDragEnd(field.key, info.offset)
                                }
                              >
                                <GripVertical className="h-3 w-3 shrink-0 opacity-70" />
                                <span className="font-medium">
                                  {field.label}
                                </span>
                                <span className="text-[10px] opacity-60 ml-0.5 font-mono">
                                  ({pos.x}, {pos.y})
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Coordinate Summary Bar */}
                      <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
                        {FIELD_DEFS.map((field) => {
                          const pos = activeMap[field.key];
                          return (
                            <span
                              key={field.key}
                              className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded"
                            >
                              {field.label}: ({pos.x}, {pos.y})
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-[400px] border rounded-md flex items-center justify-center bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        Chargement du modele...
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Generate Button */}
          <Button
            className="w-full py-5"
            size="lg"
            disabled={items.length === 0 || isGenerating}
            onClick={generatePDF}
          >
            <FileDown className="mr-2 h-5 w-5" />
            {isGenerating
              ? "Generation..."
              : "Generer les declarations Neant"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
