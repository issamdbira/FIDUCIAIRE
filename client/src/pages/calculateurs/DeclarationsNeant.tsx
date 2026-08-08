import { useState, useCallback, useEffect } from "react";
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
import { Upload, FileSpreadsheet, Trash2, FileDown } from "lucide-react";
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
  adresse: z.string().default(""),
  trimestre: z.number().min(1).max(4),
  annee: z
    .number()
    .min(new Date().getFullYear() - 1)
    .max(new Date().getFullYear() + 1),
  lieu: z.string().min(1, "Le lieu est obligatoire"),
  dateDocument: z.string().min(1, "La date est obligatoire"),
});

type NeantItem = z.infer<typeof neantItemSchema>;

// ── Zone type ──
type Zone = { x: number; y: number; width: number; height: number };

// ── Sanitize ──
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

// ── Helpers: centering in zone ──
function centerXInZone(font: PDFFont, text: string, fontSize: number, zone: Zone): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  return zone.x + (zone.width - textWidth) / 2;
}

function drawTextInZone(
  page: PDFPage,
  font: PDFFont,
  text: string,
  zone: Zone,
  options?: { size?: number; rotate?: ReturnType<typeof degrees>; color?: ReturnType<typeof rgb> },
) {
  const fontSize = options?.size ?? 11;
  const color = options?.color ?? rgb(0, 0, 0);
  const x = centerXInZone(font, text, fontSize, zone);
  // Web coordinates: y is from top. pdf-lib: origin bottom-left.
  // Convert: pdfY = pageHeight - y - height (baseline near bottom of zone)
  const pageHeight = page.getHeight();
  const pdfY = pageHeight - zone.y - zone.height;

  const drawOpts: Parameters<PDFPage["drawText"]>[1] = {
    x,
    y: pdfY,
    font,
    size: fontSize,
    color,
  };
  if (options?.rotate) drawOpts.rotate = options.rotate;
  page.drawText(text, drawOpts);
}

/** Draw multiline text (two lines) in a zone, centered horizontally */
function drawMultilineInZone(
  page: PDFPage,
  font: PDFFont,
  line1: string,
  line2: string,
  zone: Zone,
  options?: { size?: number; rotate?: ReturnType<typeof degrees>; color?: ReturnType<typeof rgb> },
) {
  const fontSize = options?.size ?? 11;
  const color = options?.color ?? rgb(0, 0, 0);
  const pageHeight = page.getHeight();
  const lineHeight = fontSize * 1.2;

  const x1 = centerXInZone(font, line1, fontSize, zone);
  const x2 = centerXInZone(font, line2, fontSize, zone);

  // First line: near top of zone. Second line: below it.
  const y1 = pageHeight - zone.y - fontSize;
  const y2 = y1 - lineHeight;

  const baseOpts = { font, size: fontSize, color };
  if (options?.rotate) (baseOpts as any).rotate = options.rotate;
  page.drawText(line1, { x: x1, y: y1, ...baseOpts });
  page.drawText(line2, { x: x2, y: y2, ...baseOpts });
}

// ══════════════════════════════════════════════════════════════════════
// INJECTION I3 — Zones definitives (Portrait)
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI3(
  page: PDFPage,
  data: NeantItem,
  font: PDFFont,
) {
  const c = rgb(0, 0, 0);

  const zones = {
    matricule:  { x: 33,  y: 618, width: 120, height: 29 },
    trimestre: { x: 33,  y: 556, width: 49,  height: 28 },
    annee:     { x: 85,  y: 557, width: 52,  height: 26 },
    rsAdresse: { x: 268, y: 560, width: 284, height: 73 },
    salaires:  { x: 31,  y: 451, width: 132, height: 54 },
    montant:   { x: 454, y: 476, width: 94,  height: 28 },
    total:     { x: 449, y: 424, width: 105, height: 20 },
    aPayer:    { x: 447, y: 352, width: 109, height: 28 },
    faitA:     { x: 386, y: 220, width: 96,  height: 20 },
    dateDoc:   { x: 257, y: 218, width: 112, height: 17 },
  };

  // Detect page rotation and compensate
  const rotation = page.getRotation().angle;
  const rot = rotation ? degrees(-rotation) : undefined;

  drawTextInZone(page, font, sanitize(data.matricule), zones.matricule, { rotate: rot, color: c });
  drawTextInZone(page, font, String(data.trimestre), zones.trimestre, { rotate: rot, color: c });
  drawTextInZone(page, font, String(data.annee), zones.annee, { rotate: rot, color: c });

  // Raison sociale + Adresse (deux lignes)
  drawMultilineInZone(
    page, font,
    sanitize(data.raisonSociale),
    sanitize(data.adresse),
    zones.rsAdresse,
    { rotate: rot, color: c },
  );

  drawTextInZone(page, font, "NEANT", zones.salaires, { rotate: rot, color: c });
  drawTextInZone(page, font, "0,000", zones.montant, { rotate: rot, color: c });
  drawTextInZone(page, font, "0,000", zones.total, { rotate: rot, color: c });
  drawTextInZone(page, font, "0,000", zones.aPayer, { rotate: rot, color: c });

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const dateParts = data.dateDocument.split("-");
  const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : data.dateDocument;
  drawTextInZone(page, font, sanitize(data.lieu), zones.faitA, { rotate: rot, color: c });
  drawTextInZone(page, font, dateStr, zones.dateDoc, { rotate: rot, color: c });
}

// ══════════════════════════════════════════════════════════════════════
// INJECTION I16 — Zones definitives (Paysage)
// ══════════════════════════════════════════════════════════════════════
function injectDataIntoI16(
  page: PDFPage,
  data: NeantItem,
  font: PDFFont,
) {
  const c = rgb(0, 0, 0);

  const zones = {
    matricule:  { x: 83,  y: 503, width: 104, height: 21 },
    trimestre: { x: 142, y: 474, width: 39,  height: 28 },
    annee:     { x: 137, y: 449, width: 48,  height: 25 },
    rsAdresse: { x: 361, y: 449, width: 447, height: 76 },
    neantZone: { x: 155, y: 188, width: 583, height: 186 },
    faitA:     { x: 568, y: 82,  width: 96,  height: 17 },
    dateDoc:   { x: 678, y: 79,  width: 71,  height: 18 },
  };

  // Detect page rotation and compensate
  const rotation = page.getRotation().angle;
  const rot = rotation ? degrees(-rotation) : undefined;

  drawTextInZone(page, font, sanitize(data.matricule), zones.matricule, { rotate: rot, color: c });
  drawTextInZone(page, font, String(data.trimestre), zones.trimestre, { rotate: rot, color: c });
  drawTextInZone(page, font, String(data.annee), zones.annee, { rotate: rot, color: c });

  // Raison sociale + Adresse (deux lignes)
  drawMultilineInZone(
    page, font,
    sanitize(data.raisonSociale),
    sanitize(data.adresse),
    zones.rsAdresse,
    { rotate: rot, color: c },
  );

  // NEANT en grand format centre dans la zone
  drawTextInZone(page, font, "NEANT", zones.neantZone, { size: 40, rotate: rot, color: c });

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const dateParts = data.dateDocument.split("-");
  const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : data.dateDocument;
  drawTextInZone(page, font, sanitize(data.lieu), zones.faitA, { rotate: rot, color: c });
  drawTextInZone(page, font, dateStr, zones.dateDoc, { rotate: rot, color: c });
}

// ── Helper: build stamped PDF ──
async function buildStampedPage(
  templateBytes: ArrayBuffer,
  item: NeantItem,
  injectFn: (page: PDFPage, data: NeantItem, font: PDFFont) => void,
  firstPageOnly: boolean,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.getPages()[0];
  injectFn(page, item, font);

  if (firstPageOnly && doc.getPageCount() > 1) {
    const pagesToRemove = doc.getPageIndices().slice(1);
    for (let i = pagesToRemove.length - 1; i >= 0; i--) {
      doc.removePage(pagesToRemove[i]!);
    }
  }

  return doc.save();
}

// ── Today's date as YYYY-MM-DD ──
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ══════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function DeclarationsNeant() {
  const [items, setItems] = useState<NeantItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [i3Bytes, setI3Bytes] = useState<ArrayBuffer | null>(null);
  const [i16Bytes, setI16Bytes] = useState<ArrayBuffer | null>(null);

  const currentYear = new Date().getFullYear();
  const todayStr = todayISO();

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
      adresse: "",
      trimestre: 1,
      annee: currentYear,
      lieu: "Tunis",
      dateDocument: todayStr,
    },
  });

  // Load templates once
  useEffect(() => {
    async function load() {
      try {
        const [r1, r2] = await Promise.all([fetch("/I3.pdf"), fetch("/I16.pdf")]);
        if (!r1.ok || !r2.ok) { toast.error("Modeles PDF introuvables"); return; }
        setI3Bytes(await r1.arrayBuffer());
        setI16Bytes(await r2.arrayBuffer());
      } catch {
        toast.error("Erreur chargement des modeles PDF");
      }
    }
    load();
  }, []);

  const onFormSubmit = (data: NeantItem) => {
    setItems((prev) => [...prev, data]);
    reset({
      matricule: "",
      raisonSociale: "",
      adresse: "",
      trimestre: 1,
      annee: currentYear,
      lieu: "Tunis",
      dateDocument: todayStr,
    });
    toast.success(`Declaration ajoutee : ${data.matricule}`);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Excel Import ──
  // Colonnes: A=Matricule, B=Raison Sociale, C=Trimestre, D=Annee, E=Adresse, F=Lieu, G=Date
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

          // Parse date from Excel (could be serial number or string)
          let dateDoc = todayStr;
          if (row[6] != null) {
            const rawDate = row[6];
            if (typeof rawDate === "number") {
              // Excel serial date
              const excelEpoch = new Date(1899, 11, 30);
              const jsDate = new Date(excelEpoch.getTime() + rawDate * 86400000);
              dateDoc = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}-${String(jsDate.getDate()).padStart(2, "0")}`;
            } else {
              const str = String(rawDate).trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(str)) dateDoc = str;
              else {
                const parsed = new Date(str);
                if (!isNaN(parsed.getTime())) {
                  dateDoc = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
                }
              }
            }
          }

          imported.push({
            matricule: rawMatricule,
            raisonSociale: String(row[1] ?? "").trim(),
            adresse: String(row[4] ?? "").trim(),
            trimestre: rawTrimestre,
            annee: rawAnnee,
            lieu: String(row[5] ?? "Tunis").trim() || "Tunis",
            dateDocument: dateDoc,
          });
        }

        if (imported.length > 0) {
          setItems((prev) => [...prev, ...imported]);
          toast.success(`${imported.length} declaration(s) importee(s)`);
        } else {
          toast.error("Aucune donnee valide dans le fichier Excel");
        }
      } catch {
        toast.error("Erreur lecture du fichier Excel");
      }
    },
    [currentYear, todayStr],
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
    if (items.length === 0 || !i3Bytes || !i16Bytes) return;
    setIsGenerating(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        const i3Stamped = await buildStampedPage(i3Bytes, item, injectDataIntoI3, false);
        const i3Doc = await PDFDocument.load(i3Stamped);
        const i3Copied = await mergedPdf.copyPages(i3Doc, i3Doc.getPageIndices());
        for (const cp of i3Copied) mergedPdf.addPage(cp);

        const i16Stamped = await buildStampedPage(i16Bytes, item, injectDataIntoI16, true);
        const i16Doc = await PDFDocument.load(i16Stamped);
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
          Generez par lot vos declarations neant (Etat Recapitulatif I3 + Bordereau I16) en injectant les donnees employeur.
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
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" placeholder="Adresse de l'entreprise" {...register("adresse")} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lieu">Fait a (Lieu)</Label>
                <Input id="lieu" placeholder="Tunis" {...register("lieu")} />
                {errors.lieu && <p className="text-sm text-destructive">{errors.lieu.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateDocument">Date du document</Label>
                <Input id="dateDocument" type="date" {...register("dateDocument")} />
                {errors.dateDocument && <p className="text-sm text-destructive">{errors.dateDocument.message}</p>}
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
          <CardDescription>Colonnes : A=Matricule, B=Raison Sociale, C=Trimestre, D=Annee, E=Adresse, F=Lieu, G=Date.</CardDescription>
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

      {/* C. Liste + Generation */}
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
                    <th className="pb-2 pr-3 font-semibold text-foreground">#</th>
                    <th className="pb-2 pr-3 font-semibold text-foreground">Matricule</th>
                    <th className="pb-2 pr-3 font-semibold text-foreground">Raison sociale</th>
                    <th className="pb-2 pr-3 font-semibold text-foreground">Adresse</th>
                    <th className="pb-2 pr-3 font-semibold text-foreground">Trim.</th>
                    <th className="pb-2 pr-3 font-semibold text-foreground">Annee</th>
                    <th className="pb-2 pr-3 font-semibold text-foreground">Lieu</th>
                    <th className="pb-2 pr-3 font-semibold text-foreground">Date</th>
                    <th className="pb-2 font-semibold text-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-3 font-mono text-foreground">{item.matricule}</td>
                      <td className="py-2 pr-3 text-foreground">{item.raisonSociale}</td>
                      <td className="py-2 pr-3 text-foreground">{item.adresse}</td>
                      <td className="py-2 pr-3 text-foreground">{item.trimestre}</td>
                      <td className="py-2 pr-3 text-foreground">{item.annee}</td>
                      <td className="py-2 pr-3 text-foreground">{item.lieu}</td>
                      <td className="py-2 pr-3 text-foreground">{item.dateDocument}</td>
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

          <Button className="w-full py-5" size="lg" disabled={items.length === 0 || isGenerating} onClick={generatePDF}>
            <FileDown className="mr-2 h-5 w-5" />
            {isGenerating ? "Generation..." : "Generer les declarations Neant"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
