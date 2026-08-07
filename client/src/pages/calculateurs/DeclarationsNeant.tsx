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

// ── Trimestres libell\u00e9s ──
const TRIMESTRE_LIBELLE: Record<number, string> = {
  1: "1er Trimestre",
  2: "2\u00e8me Trimestre",
  3: "3\u00e8me Trimestre",
  4: "4\u00e8me Trimestre",
};

// ── Helper: draw text safely (clamp within page) ──
function safeDrawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: { font: PDFFont; size?: number; color: ReturnType<typeof rgb> }
) {
  const { width: pw, height: ph } = page.getSize();
  const fontSize = opts.size ?? 10;
  const clampedX = Math.max(10, Math.min(x, pw - 10));
  const clampedY = Math.max(10, Math.min(y, ph - 10));
  page.drawText(text, { ...opts, x: clampedX, y: clampedY, size: fontSize });
}

// ── Stamp N\u00c9ANT watermark (diagonal, 45pt, bold) ──
function stampNeantWatermark(
  page: PDFPage,
  centerX: number,
  centerY: number,
  fontBold: PDFFont
) {
  page.drawText("N\u00c9ANT", {
    x: centerX,
    y: centerY,
    font: fontBold,
    size: 45,
    color: rgb(0.75, 0.75, 0.75),
    rotate: degrees(45),
    opacity: 0.5,
  });
}

// ── Stamp I3 template ──
async function stampI3(
  templateBytes: ArrayBuffer,
  item: NeantItem,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  offsetX: number,
  offsetY: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const page = doc.getPages()[0];

  // En-t\u00eate : matricule, trimestre, ann\u00e9e, raisonSociale
  safeDrawText(page, item.matricule, offsetX, offsetY, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });
  safeDrawText(page, item.raisonSociale, offsetX, offsetY - 16, {
    font: fontBold, size: 10, color: rgb(0, 0, 0),
  });
  safeDrawText(page, String(item.trimestre), offsetX, offsetY - 34, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });
  safeDrawText(page, String(item.annee), offsetX + 30, offsetY - 34, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Pied de page : "Z\u00e9ro Dinar"
  safeDrawText(page, "Z\u00e9ro Dinar", offsetX, offsetY - 56, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Filigrane N\u00c9ANT centr\u00e9 sur le tableau
  const { width } = page.getSize();
  stampNeantWatermark(page, width / 2 - 60, offsetY - 180, fontBold);

  return doc.save();
}

// ── Stamp I16 template ──
async function stampI16(
  templateBytes: ArrayBuffer,
  item: NeantItem,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  offsetX: number,
  offsetY: number,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const page = doc.getPages()[0];
  const { width, height } = page.getSize();

  // En-t\u00eate : N\u00b0 Employeur (matricule)
  safeDrawText(page, item.matricule, 155, height - 103, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });
  // Trimestre
  safeDrawText(page, String(item.trimestre), 445, height - 103, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });
  // Ann\u00e9e
  safeDrawText(page, String(item.annee), 560, height - 103, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Pied de page : Raison Sociale (NOM ET ADRESSE)
  safeDrawText(page, item.raisonSociale, 255, height - 126, {
    font: fontBold, size: 9, color: rgb(0, 0, 0),
  });

  // Pied de page : "Z\u00e9ro Dinar" (arr\u00eat\u00e9 \u00e0 la somme de)
  safeDrawText(page, "Z\u00e9ro Dinar", 175, 130, {
    font: fontRegular, size: 10, color: rgb(0, 0, 0),
  });

  // Filigrane N\u00c9ANT centr\u00e9 sur le tableau de 12 lignes
  // Le tableau commence environ \u00e0 y=height-155 et descend ~240pt
  const tableCenterX = width / 2 - 60;
  const tableCenterY = height - 155 - 120;
  stampNeantWatermark(page, tableCenterX, tableCenterY, fontBold);

  return doc.save();
}

// ── Generate single page preview (base64) ──
async function generatePreviewPage(
  templateType: "I3" | "I16",
  templateBytes: ArrayBuffer,
  item: NeantItem,
  offsetX: number,
  offsetY: number,
): Promise<string> {
  const doc = await PDFDocument.load(templateBytes);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPages()[0];
  const { width, height } = page.getSize();

  if (templateType === "I3") {
    safeDrawText(page, item.matricule, offsetX, offsetY, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    safeDrawText(page, item.raisonSociale, offsetX, offsetY - 16, {
      font: fontBold, size: 10, color: rgb(0, 0, 0),
    });
    safeDrawText(page, String(item.trimestre), offsetX, offsetY - 34, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    safeDrawText(page, String(item.annee), offsetX + 30, offsetY - 34, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    safeDrawText(page, "Z\u00e9ro Dinar", offsetX, offsetY - 56, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    stampNeantWatermark(page, width / 2 - 60, offsetY - 180, fontBold);
  } else {
    safeDrawText(page, item.matricule, 155, height - 103, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    safeDrawText(page, String(item.trimestre), 445, height - 103, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    safeDrawText(page, String(item.annee), 560, height - 103, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    safeDrawText(page, item.raisonSociale, 255, height - 126, {
      font: fontBold, size: 9, color: rgb(0, 0, 0),
    });
    safeDrawText(page, "Z\u00e9ro Dinar", 175, 130, {
      font: fontRegular, size: 10, color: rgb(0, 0, 0),
    });
    const tableCenterX = width / 2 - 60;
    const tableCenterY = height - 155 - 120;
    stampNeantWatermark(page, tableCenterX, tableCenterY, fontBold);
  }

  const pdfBytes = await doc.save();
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
  const [offsetX, setOffsetX] = useState(160);
  const [offsetY, setOffsetY] = useState(520);
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

  // Live Preview: regenerate on slider/item change
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
        const url = await generatePreviewPage(previewTab, templateBytes, firstItem, offsetX, offsetY);
        setPreviewUrl(url);
      } catch {
        // silent fail for preview
      }
    }, 150);

    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [items, previewTab, offsetX, offsetY, i3TemplateBytes, i16TemplateBytes]);

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
      const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);
      const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

      for (const item of items) {
        // ─── I3 : \u00c9tat R\u00e9capitulatif (template officiel) ───
        const i3Bytes = await stampI3(i3TemplateBytes, item, fontRegular, fontBold, offsetX, offsetY);
        const i3Doc = await PDFDocument.load(i3Bytes);
        const i3Copied = await mergedPdf.copyPages(i3Doc, i3Doc.getPageIndices());
        for (const cp of i3Copied) mergedPdf.addPage(cp);

        // ─── I16 : Bordereau de d\u00e9claration (template officiel) ───
        const i16Bytes = await stampI16(i16TemplateBytes, item, fontRegular, fontBold, offsetX, offsetY);
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

            {/* Calibrage I3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <Label>D\u00e9calage Horizontal I3 (X) : {offsetX} pt</Label>
                <Slider min={0} max={500} step={1} value={[offsetX]} onValueChange={([v]) => setOffsetX(v)} />
              </div>
              <div className="space-y-2">
                <Label>D\u00e9calage Vertical I3 (Y) : {offsetY} pt</Label>
                <Slider min={0} max={800} step={1} value={[offsetY]} onValueChange={([v]) => setOffsetY(v)} />
              </div>
            </div>

            {/* Live Preview */}
            {items.length > 0 && (
              <div className="space-y-3">
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
