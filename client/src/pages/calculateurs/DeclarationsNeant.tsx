import { useState, useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, Trash2, FileDown, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import { PDFDocument, PDFPage, StandardFonts, rgb, degrees } from "pdf-lib";
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

// ── Calibrage coordinates per document type ──
type CalibrageCoords = {
  matriculeX: number;
  matriculeY: number;
  neantX: number;
  neantY: number;
  trimestreX: number;
  trimestreY: number;
};

const DEFAULT_CALIBRAGE: CalibrageCoords = {
  matriculeX: 70,
  matriculeY: 710,
  neantX: 230,
  neantY: 420,
  trimestreX: 180,
  trimestreY: 680,
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
// INJECTION I3 — Coordonnees pilotées par le calibrage
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI3(
  page: PDFPage,
  data: NeantItem,
  c: CalibrageCoords,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  // Matricule Employeur
  page.drawText(sanitize(data.matricule), {
    x: c.matriculeX, y: c.matriculeY,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Raison Sociale
  page.drawText(sanitize(data.raisonSociale), {
    x: 350, y: 710, font: fontBold, size: 10, color: rgb(0, 0, 0),
  });

  // Trimestre
  page.drawText(String(data.trimestre), {
    x: c.trimestreX, y: c.trimestreY,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Annee
  page.drawText(String(data.annee), {
    x: 250, y: 680, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // "Zero Dinar"
  page.drawText("Zero Dinar", {
    x: 350, y: 80, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Filigrane NEANT (45pt, bold, 45 degres)
  page.drawText("NEANT", {
    x: c.neantX, y: c.neantY,
    font: fontBold, size: 45, color: rgb(0.75, 0.75, 0.75),
    rotate: degrees(45), opacity: 0.5,
  });
}

// ══════════════════════════════════════════════════════════════════════
// INJECTION I16 — Coordonnees pilotées par le calibrage
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI16(
  page: PDFPage,
  data: NeantItem,
  c: CalibrageCoords,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const { width, height } = page.getSize();

  // N. Employeur (matricule)
  page.drawText(sanitize(data.matricule), {
    x: c.matriculeX, y: c.matriculeY,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Trimestre
  page.drawText(String(data.trimestre), {
    x: c.trimestreX, y: c.trimestreY,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Annee
  page.drawText(String(data.annee), {
    x: 560, y: 740, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // NOM ET ADRESSE DE L'EMPLOYEUR
  page.drawText(sanitize(data.raisonSociale), {
    x: 255, y: 718, font: fontBold, size: 9, color: rgb(0, 0, 0),
  });

  // "Zero Dinar"
  page.drawText("Zero Dinar", {
    x: 175, y: 130, font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Filigrane NEANT (45pt, bold, 45 degres)
  page.drawText("NEANT", {
    x: c.neantX, y: c.neantY,
    font: fontBold, size: 45, color: rgb(0.75, 0.75, 0.75),
    rotate: degrees(45), opacity: 0.5,
  });
}

// ── Helper: build stamped PDF, first page only if requested ──
async function buildStampedPage(
  templateBytes: ArrayBuffer,
  item: NeantItem,
 c: CalibrageCoords,
  injectFn: (page: PDFPage, data: NeantItem, c: CalibrageCoords, fR: PDFFont, fB: PDFFont) => void,
  firstPageOnly: boolean,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPages()[0];
  injectFn(page, item, c, fontRegular, fontBold);

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

// ── Single slider row component with numeric display ──
function CalibrageSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 800,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-40 shrink-0 text-xs text-muted-foreground">{label}</Label>
      <Slider
        min={min} max={max} step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="w-12 text-right text-xs font-mono text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ── Component ──
export default function DeclarationsNeant() {
  const [items, setItems] = useState<NeantItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewTab, setPreviewTab] = useState<"I3" | "I16">("I3");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [i3TemplateBytes, setI3TemplateBytes] = useState<ArrayBuffer | null>(null);
  const [i16TemplateBytes, setI16TemplateBytes] = useState<ArrayBuffer | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calibrage states — separated per document type
  const [calibrageI3, setCalibrageI3] = useState<CalibrageCoords>({ ...DEFAULT_CALIBRAGE });
  const [calibrageI16, setCalibrageI16] = useState<CalibrageCoords>({ ...DEFAULT_CALIBRAGE });

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

  // Load templates once
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
        setI3TemplateBytes(await i3Res.arrayBuffer());
        setI16TemplateBytes(await i16Res.arrayBuffer());
      } catch {
        toast.error("Erreur lors du chargement des modeles PDF");
      }
    }
    loadTemplates();
  }, []);

  // Active calibrage state based on preview tab
  const activeCalibrage = previewTab === "I3" ? calibrageI3 : calibrageI16;
  const setActiveCalibrage = previewTab === "I3" ? setCalibrageI3 : setCalibrageI16;

  const updateCalibrage = (key: keyof CalibrageCoords, value: number) => {
    setActiveCalibrage((prev) => ({ ...prev, [key]: value }));
  };

  // Live Preview
  useEffect(() => {
    if (!i3TemplateBytes || !i16TemplateBytes || items.length === 0) {
      setPreviewUrl("");
      return;
    }

    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(async () => {
      try {
        const firstItem = items[0];
        const templateBytes = previewTab === "I3" ? i3TemplateBytes : i16TemplateBytes;
        const injectFn = previewTab === "I3" ? injectDataIntoI3 : injectDataIntoI16;
        const firstPageOnly = previewTab === "I16";
        const coords = previewTab === "I3" ? calibrageI3 : calibrageI16;
        const pdfBytes = await buildStampedPage(templateBytes, firstItem, coords, injectFn, firstPageOnly);
        setPreviewUrl(pdfToDataUri(pdfBytes));
      } catch {
        // silent
      }
    }, 150);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [items, previewTab, calibrageI3, calibrageI16, i3TemplateBytes, i16TemplateBytes]);

  const onFormSubmit = (data: NeantItem) => {
    setItems((prev) => [...prev, data]);
    reset({ matricule: "", raisonSociale: "", trimestre: 1, annee: currentYear });
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
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });

        const imported: NeantItem[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;

          const rawMatricule = String(row[0] ?? "").trim();
          if (!/^\d{8}-\d{2}$/.test(rawMatricule)) continue;

          const rawTrimestre = Number(row[2]);
          const rawAnnee = Number(row[3]);

          if (rawTrimestre < 1 || rawTrimestre > 4) continue;
          if (!rawAnnee || rawAnnee < currentYear - 1 || rawAnnee > currentYear + 1) continue;

          imported.push({
            matricule: rawMatricule,
            raisonSociale: String(row[1] ?? "").trim(),
            trimestre: rawTrimestre,
            annee: rawAnnee,
          });
        }

        if (imported.length > 0) {
          setItems((prev) => [...prev, ...imported]);
          toast.success(`${imported.length} declaration(s) importee(s) depuis Excel`);
        } else {
          toast.error("Aucune donnee valide trouvee dans le fichier Excel");
        }
      } catch {
        toast.error("Erreur lors de la lecture du fichier Excel");
      }
    },
    [currentYear]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processExcelFile(file);
    },
    [processExcelFile]
  );

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcelFile(file);
    e.target.value = "";
  };

  // ── PDF Generation ──
  const generatePDF = async () => {
    if (items.length === 0 || !i3TemplateBytes || !i16TemplateBytes) return;
    setIsGenerating(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        // I3
        const i3Bytes = await buildStampedPage(i3TemplateBytes, item, calibrageI3, injectDataIntoI3, false);
        const i3Doc = await PDFDocument.load(i3Bytes);
        const i3Copied = await mergedPdf.copyPages(i3Doc, i3Doc.getPageIndices());
        for (const cp of i3Copied) mergedPdf.addPage(cp);

        // I16 (strictement premiere page)
        const i16Bytes = await buildStampedPage(i16TemplateBytes, item, calibrageI16, injectDataIntoI16, true);
        const i16Doc = await PDFDocument.load(i16Bytes);
        const i16Copied = await mergedPdf.copyPages(i16Doc, i16Doc.getPageIndices());
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
          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
            Declarations Neant
          </h2>
          <p className="text-muted-foreground text-sm">
            Generez par lot vos declarations neant (Etat Recapitulatif I3 + Bordereau I16) en injectant les donnees employeur et la mention NEANT.
          </p>
        </div>

        {/* A. Saisie manuelle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Saisie manuelle</CardTitle>
            <CardDescription>Ajoutez une declaration a la liste avant generation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matricule">Matricule CNSS</Label>
                  <Input id="matricule" placeholder="12345678-99" {...register("matricule")} />
                  {errors.matricule && <p className="text-sm text-destructive">{errors.matricule.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="raisonSociale">Raison sociale</Label>
                  <Input id="raisonSociale" placeholder="Nom de l'entreprise" {...register("raisonSociale")} />
                  {errors.raisonSociale && <p className="text-sm text-destructive">{errors.raisonSociale.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trimestre</Label>
                  <Select defaultValue="1" onValueChange={(val) => register("trimestre").onChange({ target: { value: val } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input id="annee" type="number" min={currentYear - 1} max={currentYear + 1} {...register("annee", { valueAsNumber: true })} />
                  {errors.annee && <p className="text-sm text-destructive">{errors.annee.message}</p>}
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
            <CardDescription>Glissez un fichier .xlsx ou cliquez pour selectionner. Colonne A = Matricule, B = Raison Sociale, C = Trimestre, D = Annee.</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-md p-10 text-center transition-colors cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById("excel-input-neant")?.click()}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {dragOver ? "Deposez le fichier ici" : "Glissez un fichier .xlsx ici ou cliquez pour selectionner"}
              </p>
              <input id="excel-input-neant" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileSelect} />
            </div>
          </CardContent>
        </Card>

        {/* C. Liste + Calibrage + Preview + Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Liste des declarations ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-semibold text-foreground">#</th>
                      <th className="pb-2 pr-4 font-semibold text-foreground">Matricule</th>
                      <th className="pb-2 pr-4 font-semibold text-foreground">Raison sociale</th>
                      <th className="pb-2 pr-4 font-semibold text-foreground">Trim.</th>
                      <th className="pb-2 pr-4 font-semibold text-foreground">Annee</th>
                      <th className="pb-2 font-semibold text-foreground" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 font-mono text-foreground">{item.matricule}</td>
                        <td className="py-2 pr-4 text-foreground">{item.raisonSociale}</td>
                        <td className="py-2 pr-4 text-foreground">{item.trimestre}</td>
                        <td className="py-2 pr-4 text-foreground">{item.annee}</td>
                        <td className="py-2">
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => removeItem(i)}>
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
                Aucune declaration dans la liste. Utilisez le formulaire ou importez un Excel.
              </p>
            )}

            {/* Calibrage + Live Preview */}
            {items.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Apercu et calibrage ({previewTab})</span>
                </div>

                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "I3" | "I16")}>
                  <TabsList>
                    <TabsTrigger value="I3">Modele I3</TabsTrigger>
                    <TabsTrigger value="I16">Modele I16</TabsTrigger>
                  </TabsList>
                  <TabsContent value={previewTab}>
                    {/* Groupe 1 : Matricule + NEANT */}
                    <div className="space-y-2 mb-4 rounded-md border p-3 bg-muted/30">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Matricule Employeur</p>
                      <CalibrageSlider
                        label="Position X"
                        value={activeCalibrage.matriculeX}
                        onChange={(v) => updateCalibrage("matriculeX", v)}
                      />
                      <CalibrageSlider
                        label="Position Y"
                        value={activeCalibrage.matriculeY}
                        onChange={(v) => updateCalibrage("matriculeY", v)}
                      />
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide mt-3">Mention NEANT</p>
                      <CalibrageSlider
                        label="Position X"
                        value={activeCalibrage.neantX}
                        onChange={(v) => updateCalibrage("neantX", v)}
                      />
                      <CalibrageSlider
                        label="Position Y"
                        value={activeCalibrage.neantY}
                        onChange={(v) => updateCalibrage("neantY", v)}
                      />
                    </div>

                    {/* Groupe 2 : Trimestre */}
                    <div className="space-y-2 mb-4 rounded-md border p-3 bg-muted/30">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Trimestre</p>
                      <CalibrageSlider
                        label="Position X"
                        value={activeCalibrage.trimestreX}
                        onChange={(v) => updateCalibrage("trimestreX", v)}
                      />
                      <CalibrageSlider
                        label="Position Y"
                        value={activeCalibrage.trimestreY}
                        onChange={(v) => updateCalibrage("trimestreY", v)}
                      />
                    </div>

                    {/* Preview iframe */}
                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[600px] border rounded-md"
                        title={"Apercu " + previewTab}
                      />
                    ) : (
                      <div className="w-full h-[600px] border rounded-md flex items-center justify-center bg-muted/30">
                        <p className="text-sm text-muted-foreground">Chargement de l'apercu...</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Generate Button */}
            <Button className="w-full py-5" size="lg" disabled={items.length === 0 || isGenerating} onClick={generatePDF}>
              <FileDown className="mr-2 h-5 w-5" />
              {isGenerating ? "Generation..." : "Generer les declarations Neant"}
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
