import { PDFDocument, rgb } from 'pdf-lib';

interface GeneratePdfOptions {
  templateUrl: string;
  data: Record<string, string>;
  config: {
    fields: Record<string, { x: number; y: number; default?: string; size?: number }>;
    lines?: Array<{ startX: number; startY: number; endX: number; endY: number; thickness: number }>;
  };
  globalOffsetX?: number;
  globalOffsetY?: number;
  globalFontSize?: number;
}

export async function generateFormulaireCNSS({
  templateUrl,
  data,
  config,
  globalOffsetX = 0,
  globalOffsetY = 0,
  globalFontSize = 11
}: GeneratePdfOptions): Promise<Uint8Array> {
  
  // Charger le modèle PDF vierge depuis le dossier public
  const existingPdfBytes = await fetch(templateUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  // Dessiner les lignes (ex: la diagonale pour le I16[cite: 3])
  if (config.lines) {
    for (const line of config.lines) {
      firstPage.drawLine({
        start: { x: line.startX, y: line.startY },
        end: { x: line.endX, y: line.endY },
        thickness: line.thickness,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Remplir les champs textuels (ex: NÉANT[cite: 2], matricule, etc.)
  for (const [fieldKey, fieldConfig] of Object.entries(config.fields)) {
    const textToDraw = data[fieldKey] || fieldConfig.default || '';
    const fontSizeToUse = fieldConfig.size || globalFontSize;

    firstPage.drawText(textToDraw, {
      x: fieldConfig.x + globalOffsetX,
      y: fieldConfig.y + globalOffsetY,
      size: fontSizeToUse,
      color: rgb(0, 0, 0),
    });
  }

  return await pdfDoc.save();
}
