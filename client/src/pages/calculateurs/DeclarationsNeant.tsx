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
  raisonSociale: z.string().min(2, "Minimum 2 caract\u00e8res"),
  trimestre: z.number().min(1).max(4),
  annee: z
    .number()
    .min(new Date().getFullYear() - 1)
    .max(new Date().getFullYear() + 1),
});

type NeantItem = z.infer<typeof neantItemSchema>;

type Calibrage = { x: number; y: number };

// ══════════════════════════════════════════════════════════════════════
// INJECTION I3 — Fonction isol\u00e9e pour le mod\u00e8le \u00c9tat R\u00e9capitulatif
// Coordonn\u00e9es de base sp\u00e9cifiques au template I3.pdf
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI3(
  page: PDFPage,
  data: NeantItem,
  offsets: Calibrage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const { width } = page.getSize();
  const ox = offsets.x;
  const oy = offsets.y;

  // Coordonn\u00e9es de base I3
  const MATRICULE_BASE_X = 70;
  const MATRICULE_BASE_Y = 710;
  const ANNEE_BASE_X = 250;
  const ANNEE_BASE_Y = 680;
  const RAISON_BASE_X = 350;
  const RAISON_BASE_Y = 710;
  const TRIMESTRE_BASE_X = 180;
  const TRIMESTRE_BASE_Y = 680;
  const ZERO_DINAR_X = 350;
  const ZERO_DINAR_Y = 80;
  const WATERMARK_X = width / 2 - 60;
  const WATERMARK_Y = 420;

  // Matricule
  page.drawText(data.matricule, {
    x: MATRICULE_BASE_X + ox,
    y: MATRICULE_BASE_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Raison Sociale
  page.drawText(data.raisonSociale, {
    x: RAISON_BASE_X + ox,
    y: RAISON_BASE_Y + oy,
    font: fontBold, size: 10, color: rgb(0, 0, 0),
  });

  // Trimestre
  page.drawText(String(data.trimestre), {
    x: TRIMESTRE_BASE_X + ox,
    y: TRIMESTRE_BASE_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Ann\u00e9e
  page.drawText(String(data.annee), {
    x: ANNEE_BASE_X + ox,
    y: ANNEE_BASE_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // "Z\u00e9ro Dinar" (arr\u00eat\u00e9e \u00e0 la somme de)
  page.drawText("Z\u00e9ro Dinar", {
    x: ZERO_DINAR_X + ox,
    y: ZERO_DINAR_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Filigrane N\u00c9ANT (45pt, bold, 45\u00b0 rotation, centr\u00e9 sur le tableau Salaires d\u00e9clar\u00e9s)
  page.drawText("N\u00c9ANT", {
    x: WATERMARK_X + ox,
    y: WATERMARK_Y + oy,
    font: fontBold, size: 45, color: rgb(0.75, 0.75, 0.75),
    rotate: degrees(45), opacity: 0.5,
  });
}

// ══════════════════════════════════════════════════════════════════════
// INJECTION I16 — Fonction isol\u00e9e pour le mod\u00e8le Bordereau de D\u00e9claration
// Coordonn\u00e9es de base sp\u00e9cifiques au template I16.pdf
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI16(
  page: PDFPage,
  data: NeantItem,
  offsets: Calibrage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
) {
  const { width, height } = page.getSize();
  const ox = offsets.x;
  const oy = offsets.y;

  // Coordonn\u00e9es de base I16
  const MATRICULE_BASE_X = 150;
  const MATRICULE_BASE_Y = 740;
  const ANNEE_BASE_X = 520;
  const ANNEE_BASE_Y = 740;
  const RAISON_BASE_X = 200;
  const RAISON_BASE_Y = 710;
  const TRIMESTRE_BASE_X = 445;
  const TRIMESTRE_BASE_Y = 740;
  const ZERO_DINAR_X = 175;
  const ZERO_DINAR_Y = 130;
  const WATERMARK_X = width / 2 - 60;
  const WATERMARK_Y = height - 155 - 120;

  // N\u00b0 Employeur (matricule)
  page.drawText(data.matricule, {
    x: MATRICULE_BASE_X + ox,
    y: MATRICULE_BASE_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Trimestre
  page.drawText(String(data.trimestre), {
    x: TRIMESTRE_BASE_X + ox,
    y: TRIMESTRE_BASE_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Ann\u00e9e
  page.drawText(String(data.annee), {
    x: ANNEE_BASE_X + ox,
    y: ANNEE_BASE_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // NOM ET ADRESSE DE L'EMPLOYEUR (raison sociale)
  page.drawText(data.raisonSociale, {
    x: RAISON_BASE_X + ox,
    y: RAISON_BASE_Y + oy,
    font: fontBold, size: 9, color: rgb(0, 0, 0),
  });

  // "Z\u00e9ro Dinar" (arr\u00eat\u00e9 \u00e0 la somme de)
  page.drawText("Z\u00e9ro Dinar", {
    x: ZERO_DINAR_X + ox,
    y: ZERO_DINAR_Y + oy,
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Filigrane N\u00c9ANT (45pt, bold, 45\u00b0 rotation, centr\u00e9 sur le tableau de 12 lignes)
  page.drawText("N\u00c9ANT", {
    x: WATERMARK_X + ox,
    y: WATERMARK_Y + oy,
    font: fontBold, size: 45, color: rgb(0.75, 0.75, 0.75),
    rotate: degrees(45), opacity: 0.5,
  });
}

// ── Helper: build a stamped PDF from template bytes ──
async function buildStampedPage(
  templateBytes: ArrayBuffer,
  item: NeantItem,
  offsets: Calibrage,
  injectFn: typeof injectDataIntoI3 | typeof injectDataIntoI16,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPages()[0];
  injectFn(page, item, offsets, fontRegular, fontBold);
  return doc.save();
}

// ── Helper: convert Uint8Array to base64 data URI ──
function pdfToDataUri(pdfBytes: Uint8Array): string {
  let binary = "";
  const bytes = new Uint8Array(pdfBytes);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}

// ── Component ──
export default function DeclarationsNeant() {
  const [items, setItems] = useState<NeantItem[]>([]);
  const [calibrageI3, setCalibrageI3] = useState<Calibrage>({ x: 0, y: 0 });
  const [calibrageI16, setCalibrageI16] = useState<Calibrage>({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewTab, setPreviewTab] = useState<"I3" | "I16">("I3");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [i3TemplateBytes, setI3TemplateBytes] = useState<ArrayBuffer | null>(null);
  const [i16TemplateBytes, setI16TemplateBytes] = useState<ArrayBuffer | null>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          toast.error("Mod\u00e8les PDF introuvables (I3/I16)");
          return;
        }
        setI3TemplateBytes(await i3Res.arrayBuffer());
        setI16TemplateBytes(await i16Res.arrayBuffer());
      } catch {
        toast.error("Erreur lors du chargement des mod\u00e8les PDF");
      }
    }
    loadTemplates();
  }, []);

  // Live Preview: regenerate on slider/item/tab change
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
        const offsets = previewTab === "I3" ? calibrageI3 : calibrageI16;
        const injectFn = previewTab === "I3" ? injectDataIntoI3 : injectDataIntoI16;
        const pdfBytes = await buildStampedPage(templateBytes, firstItem, offsets, injectFn);
        setPreviewUrl(pdfToDataUri(pdfBytes));
      } catch {
        // silent fail for preview
      }
    }, 150);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [items, previewTab, calibrageI3, calibrageI16, i3TemplateBytes, i16TemplateBytes]);

  const onFormSubmit = (data: NeantItem) => {
    setItems((prev) => [...prev, data]);
    reset({ matricule: "", raisonSociale: "", trimestre: 1, annee: currentYear });
    toast.success(`D\u00e9claration ajout\u00e9e : ${data.matricule}`);
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
          toast.success(`${imported.length} d\u00e9claration(s) import\u00e9e(s) depuis Excel`);
        } else {
          toast.error("Aucune donn\u00e9e valide trouv\u00e9e dans le fichier Excel");
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

  // ── PDF Generation (I3 + I16 fusionn\u00e9s) ──
  const generatePDF = async () => {
    if (items.length === 0 || !i3TemplateBytes || !i16TemplateBytes) return;
    setIsGenerating(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        // ─── I3 : \u00c9tat R\u00e9capitulatif (template officiel) ───
        const i3Bytes = await buildStampedPage(i3TemplateBytes, item, calibrageI3, injectDataIntoI3);
        const i3Doc = await PDFDocument.load(i3Bytes);
        const i3Copied = await mergedPdf.copyPages(i3Doc, i3Doc.getPageIndices());
        for (const cp of i3Copied) mergedPdf.addPage(cp);

        // ─── I16 : Bordereau de d\u00e9claration (template officiel) ───
        const i16Bytes = await buildStampedPage(i16TemplateBytes, item, calibrageI16, injectDataIntoI16);
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

      toast.success(`${items.length} d\u00e9claration(s) g\u00e9n\u00e9r\u00e9e(s) : I3 + I16`);
    } catch {
      toast.error("Erreur lors de la g\u00e9n\u00e9ration du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  // Calibrage actif selon l'onglet
  const activeCalibrage = previewTab === "I3" ? calibrageI3 : calibrageI16;
  const setActiveCalibrage = previewTab === "I3" ? setCalibrageI3 : setCalibrageI16;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
            D\u00e9clarations N\u00e9ant
          </h2>
          <p className="text-muted-foreground text-sm">
            G\u00e9n\u00e9rez par lot vos d\u00e9clarations n\u00e9ant (\u00c9tat R\u00e9capitulatif I3 + Bordereau I16) en injectant les donn\u00e9es employeur et la mention \u00ab N\u00c9ANT \u00bb.
          </p>
        </div>

        {/* A. Formulaire de saisie */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Saisie manuelle</CardTitle>
            <CardDescription>Ajoutez une d\u00e9claration \u00e0 la liste avant g\u00e9n\u00e9ration.</CardDescription>
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
                  <Label htmlFor="annee">Ann\u00e9e</Label>
                  <Input id="annee" type="number" min={currentYear - 1} max={currentYear + 1} {...register("annee", { valueAsNumber: true })} />
                  {errors.annee && <p className="text-sm text-destructive">{errors.annee.message}</p>}
                </div>
              </div>
              <Button type="submit">Ajouter \u00e0 la liste</Button>
            </form>
          </CardContent>
        </Card>

        {/* B. Import Excel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-foreground">Import Excel</CardTitle>
            <CardDescription>Glissez un fichier .xlsx ou cliquez pour s\u00e9lectionner. Colonne A = Matricule, B = Raison Sociale, C = Trimestre, D = Ann\u00e9e.</CardDescription>
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
                {dragOver ? "D\u00e9posez le fichier ici" : "Glissez un fichier .xlsx ici ou cliquez pour s\u00e9lectionner"}
              </p>
              <input id="excel-input-neant" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileSelect} />
            </div>
          </CardContent>
        </Card>

        {/* List + Calibrage + Preview + Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Liste des d\u00e9clarations ({items.length})</CardTitle>
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
                      <th className="pb-2 pr-4 font-semibold text-foreground">Ann\u00e9e</th>
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
                Aucune d\u00e9claration dans la liste. Utilisez le formulaire ou importez un Excel.
              </p>
            )}

            {/* Live Preview avec calibrage d\u00e9coupl\u00e9 */}
            {items.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Aper\u00e7u en direct</span>
                </div>
                <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "I3" | "I16")}>
                  <TabsList>
                    <TabsTrigger value="I3">Mod\u00e8le I3</TabsTrigger>
                    <TabsTrigger value="I16">Mod\u00e8le I16</TabsTrigger>
                  </TabsList>
                  <TabsContent value={previewTab}>
                    {/* Curseurs de calibrage d\u00e9coupl\u00e9s */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div className="space-y-2">
                        <Label>D\u00e9calage Horizontal {previewTab} (X) : {activeCalibrage.x} pt</Label>
                        <Slider min={-200} max={200} step={1} value={[activeCalibrage.x]} onValueChange={([v]) => setActiveCalibrage((prev) => ({ ...prev, x: v }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>D\u00e9calage Vertical {previewTab} (Y) : {activeCalibrage.y} pt</Label>
                        <Slider min={-200} max={200} step={1} value={[activeCalibrage.y]} onValueChange={([v]) => setActiveCalibrage((prev) => ({ ...prev, y: v }))} />
                      </div>
                    </div>

                    {previewUrl ? (
                      <iframe
                        src={previewUrl}
                        className="w-full h-[600px] border rounded-md"
                        title={"Aper\u00e7u " + previewTab}
                      />
                    ) : (
                      <div className="w-full h-[600px] border rounded-md flex items-center justify-center bg-muted/30">
                        <p className="text-sm text-muted-foreground">Chargement de l'aper\u00e7u...</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Generate Button */}
            <Button className="w-full py-5" size="lg" disabled={items.length === 0 || isGenerating} onClick={generatePDF}>
              <FileDown className="mr-2 h-5 w-5" />
              {isGenerating ? "G\u00e9n\u00e9ration..." : "G\u00e9n\u00e9rer les d\u00e9clarations N\u00e9ant"}
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
