import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ── Zod Schema ──
const neantItemSchema = z.object({
  matricule: z
    .string()
    .min(1, "Le matricule est obligatoire")
    .regex(/^\d{8}-\d{2}$/, "Format invalide (ex: 12345678-99)"),
  raisonSociale: z
    .string()
    .min(2, "Minimum 2 caract\u00e8res"),
  trimestre: z
    .number()
    .min(1)
    .max(4),
  annee: z
    .number()
    .min(new Date().getFullYear() - 1)
    .max(new Date().getFullYear() + 1),
});

type NeantItem = z.infer<typeof neantItemSchema>;

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
  const processExcelFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });

      const imported: NeantItem[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue; // skip empty rows / rows without matricule

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
  }, [currentYear]);

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
    if (items.length === 0) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/I3.pdf");
      if (!response.ok) throw new Error("Mod\u00e8le PDF introuvable");
      const templateBytes = await response.arrayBuffer();

      const mergedPdf = await PDFDocument.create();
      const font = await mergedPdf.embedFont(StandardFonts.Helvetica);

      for (const item of items) {
        const pdfDoc = await PDFDocument.load(templateBytes);
        const pages = pdfDoc.getPages();
        const page = pages[0];

        // Draw matricule at calibrated position
        page.drawText(item.matricule, {
          x: offsetX,
          y: offsetY,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });

        // Draw "NÉANT" below the matricule
        page.drawText("N\u00c9ANT", {
          x: offsetX,
          y: offsetY - 16,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });

        // Copy pages into merged document
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        for (const cp of copiedPages) {
          mergedPdf.addPage(cp);
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Declarations_Neant_Lot.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${items.length} d\u00e9claration(s) n\u00e9ant g\u00e9n\u00e9e(s)`);
    } catch {
      toast.error("Erreur lors de la g\u00e9n\u00e9ration du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-blue-900 mb-2"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            D\u00e9clarations N\u00e9ant
          </h1>
          <p className="text-gray-600">
            G\u00e9n\u00e9rez par lot vos d\u00e9clarations n\u00e9ant (\u00c9tat R\u00e9capitulatif I3) en
            injectant le matricule et \u00ab N\u00c9ANT \u00bb sur le formulaire CNSS.
          </p>
        </div>

        {/* A. Formulaire de saisie */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-blue-900">Saisie manuelle</CardTitle>
            <CardDescription>
              Ajoutez une d\u00e9claration \u00e0 la liste avant g\u00e9n\u00e9ration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matricule">Matricule CNSS</Label>
                  <Input
                    id="matricule"
                    placeholder="12345678-99"
                    {...register("matricule")}
                  />
                  {errors.matricule && (
                    <p className="text-sm text-red-500">
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
                    <p className="text-sm text-red-500">
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
                      register("trimestre").onChange({ target: { value: val } })
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
                  <Label htmlFor="annee">Ann\u00e9e</Label>
                  <Input
                    id="annee"
                    type="number"
                    min={currentYear - 1}
                    max={currentYear + 1}
                    {...register("annee", { valueAsNumber: true })}
                  />
                  {errors.annee && (
                    <p className="text-sm text-red-500">
                      {errors.annee.message}
                    </p>
                  )}
                </div>
              </div>
              <Button type="submit" className="bg-blue-700 hover:bg-blue-800">
                Ajouter \u00e0 la liste
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* B. Import Excel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-blue-900">Import Excel</CardTitle>
            <CardDescription>
              Glissez un fichier .xlsx ou cliquez pour s\u00e9lectionner. Colonne A =
              Matricule, B = Raison Sociale, C = Trimestre, D = Ann\u00e9e.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() =>
                document.getElementById("excel-input-neant")?.click()
              }
            >
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">
                {dragOver
                  ? "D\u00e9posez le fichier ici"
                  : "Glissez un fichier .xlsx ici ou cliquez pour s\u00e9lectionner"}
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

        {/* List + Calibrage + Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-900">
              Liste des d\u00e9clarations ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Table */}
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-semibold text-blue-900">#</th>
                      <th className="pb-2 pr-4 font-semibold text-blue-900">
                        Matricule
                      </th>
                      <th className="pb-2 pr-4 font-semibold text-blue-900">
                        Raison sociale
                      </th>
                      <th className="pb-2 pr-4 font-semibold text-blue-900">
                        Trim.
                      </th>
                      <th className="pb-2 pr-4 font-semibold text-blue-900">
                        Ann\u00e9e
                      </th>
                      <th className="pb-2 font-semibold text-blue-900"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                        <td className="py-2 pr-4 font-mono">{item.matricule}</td>
                        <td className="py-2 pr-4">{item.raisonSociale}</td>
                        <td className="py-2 pr-4">{item.trimestre}</td>
                        <td className="py-2 pr-4">{item.annee}</td>
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
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
              <p className="text-sm text-gray-400 text-center py-6">
                <FileSpreadsheet className="mx-auto h-8 w-8 mb-2" />
                Aucune d\u00e9claration dans la liste. Utilisez le formulaire ou
                importez un Excel.
              </p>
            )}

            {/* Calibrage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <Label>
                  D\u00e9calage Horizontal (X) : {offsetX} pt
                </Label>
                <Slider
                  min={0}
                  max={500}
                  step={1}
                  value={[offsetX]}
                  onValueChange={([v]) => setOffsetX(v)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  D\u00e9calage Vertical (Y) : {offsetY} pt
                </Label>
                <Slider
                  min={0}
                  max={800}
                  step={1}
                  value={[offsetY]}
                  onValueChange={([v]) => setOffsetY(v)}
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-5"
              disabled={items.length === 0 || isGenerating}
              onClick={generatePDF}
            >
              <FileDown className="mr-2 h-5 w-5" />
              {isGenerating
                ? "G\u00e9n\u00e9ration..."
                : "G\u00e9n\u00e9rer les d\u00e9clarations N\u00e9ant"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
