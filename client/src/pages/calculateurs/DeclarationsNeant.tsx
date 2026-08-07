import { useState, useCallback } from "react";
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
import { Upload, FileSpreadsheet, Trash2, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib";

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
  opts: Parameters<PDFPage["drawText"]>[1] & { size?: number }
) {
  const { width: pw, height: ph } = page.getSize();
  const fontSize = opts.size ?? 10;
  const clampedX = Math.max(10, Math.min(x, pw - 10));
  const clampedY = Math.max(10, Math.min(y, ph - 10));
  page.drawText(text, { ...opts, x: clampedX, y: clampedY, size: fontSize });
}

// ── I16 Programmatic Generation ──
async function generateI16Page(
  item: NeantItem,
  fontRegular: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width } = page.getSize();

  const BLACK = rgb(0, 0, 0);
  const DARK_BLUE = rgb(0.1, 0.15, 0.35);
  const GRAY = rgb(0.5, 0.5, 0.5);
  const LIGHT_BG = rgb(0.95, 0.96, 0.98);

  // ── Header band ──
  page.drawRectangle({ x: 0, y: 770, width, height: 71.89, color: DARK_BLUE });
  safeDrawText(page, "R\u00c9PUBLIQUE TUNISIENNE", 40, 818, { font: fontBold, size: 11, color: rgb(1, 1, 1) });
  safeDrawText(page, "Caisse Nationale de S\u00e9curit\u00e9 Sociale", 40, 800, { font: fontBold, size: 13, color: rgb(1, 1, 1) });
  safeDrawText(page, "BORDEREAU DE D\u00c9CLARATION (I16)", width - 290, 785, { font: fontBold, size: 12, color: rgb(1, 1, 1) });

  // ── Underline ──
  page.drawLine({ start: { x: 40, y: 765 }, end: { x: width - 40, y: 765 }, thickness: 1.5, color: DARK_BLUE });

  // ── Employer info section ──
  const sectionY = 735;
  safeDrawText(page, "Renseignements employeur", 40, sectionY, { font: fontBold, size: 11, color: DARK_BLUE });

  safeDrawText(page, "Matricule CNSS :", 40, sectionY - 25, { font: fontRegular, size: 10, color: BLACK });
  page.drawRectangle({ x: 170, y: sectionY - 35, width: 140, height: 18, borderColor: BLACK, borderWidth: 0.5 });
  safeDrawText(page, item.matricule, 178, sectionY - 31, { font: fontRegular, size: 11, color: BLACK });

  safeDrawText(page, "Raison sociale :", 40, sectionY - 55, { font: fontRegular, size: 10, color: BLACK });
  page.drawRectangle({ x: 170, y: sectionY - 65, width: 340, height: 18, borderColor: BLACK, borderWidth: 0.5 });
  safeDrawText(page, item.raisonSociale, 178, sectionY - 61, { font: fontRegular, size: 11, color: BLACK });

  // ── Period section ──
  const periodY = sectionY - 100;
  safeDrawText(page, "P\u00e9riode de d\u00e9claration", 40, periodY, { font: fontBold, size: 11, color: DARK_BLUE });

  safeDrawText(page, "Trimestre :", 40, periodY - 25, { font: fontRegular, size: 10, color: BLACK });
  page.drawRectangle({ x: 170, y: periodY - 35, width: 80, height: 18, borderColor: BLACK, borderWidth: 0.5 });
  safeDrawText(page, String(item.trimestre), 208, periodY - 31, { font: fontRegular, size: 11, color: BLACK });

  safeDrawText(page, "Ann\u00e9e :", 280, periodY - 25, { font: fontRegular, size: 10, color: BLACK });
  page.drawRectangle({ x: 370, y: periodY - 35, width: 80, height: 18, borderColor: BLACK, borderWidth: 0.5 });
  safeDrawText(page, String(item.annee), 403, periodY - 31, { font: fontRegular, size: 11, color: BLACK });

  // ── N\u00c9ANT Declaration box ──
  const boxY = periodY - 90;
  page.drawRectangle({ x: 40, y: boxY - 60, width: width - 80, height: 70, color: LIGHT_BG, borderColor: DARK_BLUE, borderWidth: 1 });
  safeDrawText(page, "D\u00c9CLARATION N\u00c9ANT", width / 2 - 60, boxY - 20, { font: fontBold, size: 18, color: DARK_BLUE });
  safeDrawText(page, "Aucun salari\u00e9 \u00e0 d\u00e9clarer pour le " + TRIMESTRE_LIBELLE[item.trimestre] + " " + String(item.annee), width / 2 - 180, boxY - 45, { font: fontRegular, size: 10, color: GRAY });

  // ── Signature area ──
  const sigY = 120;
  page.drawLine({ start: { x: 40, y: sigY + 30 }, end: { x: 250, y: sigY + 30 }, thickness: 0.5, color: GRAY });
  safeDrawText(page, "Signature et cachet de l'employeur", 70, sigY + 10, { font: fontRegular, size: 9, color: GRAY });
  page.drawLine({ start: { x: 350, y: sigY + 30 }, end: { x: 555, y: sigY + 30 }, thickness: 0.5, color: GRAY });
  safeDrawText(page, "Cachet CNSS", 420, sigY + 10, { font: fontRegular, size: 9, color: GRAY });

  // ── Footer ──
  safeDrawText(page, "Document g\u00e9n\u00e9r\u00e9 automatiquement - LE FIDUCIAIRE", 40, 40, { font: fontRegular, size: 7, color: GRAY });
  safeDrawText(page, "Mod\u00e8le I16 - Bordereau de d\u00e9claration", width - 220, 40, { font: fontRegular, size: 7, color: GRAY });

  return doc.save();
}

// ── Component ──
export default function DeclarationsNeant() {
  const [items, setItems] = useState<NeantItem[]>([]);
  const [offsetX, setOffsetX] = useState(160);
  const [offsetY, setOffsetY] = useState(520);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  // ── PDF Generation (I3 + I16) ──
  const generatePDF = async () => {
    if (items.length === 0) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/I3.pdf");
      if (!response.ok) throw new Error("Mod\u00e8le I3 introuvable");
      const i3TemplateBytes = await response.arrayBuffer();

      const mergedPdf = await PDFDocument.create();
      const fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);
      const fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

      for (const item of items) {
        // ─── I3: \u00c9tat R\u00e9capitulatif (template) ───
        const i3Doc = await PDFDocument.load(i3TemplateBytes);
        const i3Page = i3Doc.getPages()[0];

        safeDrawText(i3Page, item.matricule, offsetX, offsetY, {
          font: fontRegular, size: 10, color: rgb(0, 0, 0),
        });
        safeDrawText(i3Page, item.raisonSociale, offsetX, offsetY - 16, {
          font: fontBold, size: 10, color: rgb(0, 0, 0),
        });
        safeDrawText(i3Page, String(item.trimestre), offsetX, offsetY - 34, {
          font: fontRegular, size: 10, color: rgb(0, 0, 0),
        });
        safeDrawText(i3Page, String(item.annee), offsetX + 30, offsetY - 34, {
          font: fontRegular, size: 10, color: rgb(0, 0, 0),
        });
        safeDrawText(i3Page, "N\u00c9ANT", offsetX, offsetY - 56, {
          font: fontBold, size: 14, color: rgb(0.1, 0.15, 0.35),
        });

        const i3Copied = await mergedPdf.copyPages(i3Doc, i3Doc.getPageIndices());
        for (const cp of i3Copied) mergedPdf.addPage(cp);

        // ─── I16: Bordereau de d\u00e9claration (g\u00e9n\u00e9r\u00e9) ───
        const i16Bytes = await generateI16Page(item, fontRegular, fontBold);
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
    <div className="py-10">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2" style={{ fontFamily: "Montserrat, sans-serif" }}>
            D\u00e9clarations N\u00e9ant
          </h1>
          <p className="text-muted-foreground">
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

        {/* List + Calibrage + Generation */}
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

            {/* Generate Button */}
            <Button className="w-full py-5" size="lg" disabled={items.length === 0 || isGenerating} onClick={generatePDF}>
              <FileDown className="mr-2 h-5 w-5" />
              {isGenerating ? "G\u00e9n\u00e9ration..." : "G\u00e9n\u00e9rer les d\u00e9clarations N\u00e9ant"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
