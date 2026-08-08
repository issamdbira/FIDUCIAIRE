import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';

const doc = await PDFDocument.create();
const page = doc.addPage([595.28, 841.89]);
const { width, height } = page.getSize();
const font = await doc.embedFont(StandardFonts.Helvetica);
const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

const BLACK = rgb(0, 0, 0);
const DARK = rgb(0.1, 0.12, 0.2);
const GRAY = rgb(0.6, 0.6, 0.6);

// Header
page.drawText('R\u00c9PUBLIQUE TUNISIENNE', { x: 40, y: height - 40, size: 9, font, color: DARK });
page.drawText('Minist\u00e8re des Affaires Sociales', { x: 40, y: height - 52, size: 8, font, color: DARK });
page.drawText('Caisse Nationale de S\u00e9curit\u00e9 Sociale', { x: 40, y: height - 64, size: 10, fontBold, color: DARK });

// Title
page.drawText('BORDEREAU DE D\u00c9CLARATION DES SALAIRES', { x: width - 310, y: height - 50, size: 12, fontBold, color: DARK });
page.drawText('Mod\u00e8le I16', { x: width - 160, y: height - 65, size: 9, font, color: GRAY });

// Separator line
page.drawLine({ start: { x: 30, y: height - 75 }, end: { x: width - 30, y: height - 75 }, thickness: 1, color: DARK });

// Employer info section
const infoY = height - 100;
page.drawText('N\u00b0 EMPLOYEUR :', { x: 40, y: infoY, size: 9, fontBold, color: BLACK });
page.drawLine({ start: { x: 150, y: infoY - 2 }, end: { x: 300, y: infoY - 2 }, thickness: 0.5, color: GRAY });

page.drawText('TRIMESTRE :', { x: 340, y: infoY, size: 9, fontBold, color: BLACK });
page.drawLine({ start: { x: 430, y: infoY - 2 }, end: { x: 470, y: infoY - 2 }, thickness: 0.5, color: GRAY });

page.drawText('ANN\u00c9E :', { x: 500, y: infoY, size: 9, fontBold, color: BLACK });
page.drawLine({ start: { x: 555, y: infoY - 2 }, end: { x: width - 30, y: infoY - 2 }, thickness: 0.5, color: GRAY });

page.drawText("NOM ET ADRESSE DE L'EMPLOYEUR :", { x: 40, y: infoY - 22, size: 9, fontBold, color: BLACK });
page.drawLine({ start: { x: 250, y: infoY - 24 }, end: { x: width - 30, y: infoY - 24 }, thickness: 0.5, color: GRAY });

// Second separator
page.drawLine({ start: { x: 30, y: infoY - 40 }, end: { x: width - 30, y: infoY - 40 }, thickness: 0.5, color: DARK });

// Table header
const tableTop = infoY - 55;
const colWidths = [35, 80, 60, 70, 70, 55, 55, 55, 55];
const headers = ['N\u00b0', 'Nom & Pr\u00e9nom', 'N\u00b0 CIN', 'Sal. Brut', 'Cot. Patr.', 'Cot. Sal.', 'IRPP', 'CS', 'Net'];

// Header row background
page.drawRectangle({ x: 30, y: tableTop - 15, width: width - 60, height: 18, color: rgb(0.92, 0.93, 0.96) });

let xPos = 30;
for (let i = 0; i < headers.length; i++) {
  page.drawText(headers[i], { x: xPos + 4, y: tableTop - 5, size: 7, fontBold, color: DARK });
  xPos += colWidths[i];
}

// Table rows (12 empty rows)
const rowHeight = 18;
for (let r = 0; r < 12; r++) {
  const rowY = tableTop - 18 - (r * rowHeight);
  page.drawLine({ start: { x: 30, y: rowY }, end: { x: width - 30, y: rowY }, thickness: 0.3, color: GRAY });
  page.drawText(String(r + 1), { x: 45, y: rowY + 5, size: 8, font, color: GRAY });
}

// Bottom border of table
page.drawLine({ start: { x: 30, y: tableTop - 18 - 12 * rowHeight }, end: { x: width - 30, y: tableTop - 18 - 12 * rowHeight }, thickness: 0.5, color: DARK });

// Vertical lines for columns
let vPos = 30;
for (let i = 0; i < colWidths.length - 1; i++) {
  vPos += colWidths[i];
  page.drawLine({ start: { x: vPos, y: tableTop - 15 }, end: { x: vPos, y: tableTop - 18 - 12 * rowHeight }, thickness: 0.2, color: GRAY });
}

// Outer border
page.drawRectangle({ x: 30, y: tableTop - 18 - 12 * rowHeight, width: width - 60, height: 18 + 12 * rowHeight, borderColor: DARK, borderWidth: 0.5 });

// Totals row
const totalsY = tableTop - 18 - 12 * rowHeight - 20;
page.drawText('TOTAUX', { x: 40, y: totalsY, size: 8, fontBold, color: DARK });
page.drawLine({ start: { x: 110, y: totalsY - 2 }, end: { x: width - 30, y: totalsY - 2 }, thickness: 0.5, color: GRAY });

// Footer section
const footerY = 100;
page.drawText("Arr\u00eat\u00e9 \u00e0 la somme de :", { x: 40, y: footerY + 30, size: 9, font, color: BLACK });
page.drawLine({ start: { x: 170, y: footerY + 28 }, end: { x: width - 30, y: footerY + 28 }, thickness: 0.5, color: GRAY });

// Signature lines
page.drawLine({ start: { x: 40, y: footerY - 10 }, end: { x: 220, y: footerY - 10 }, thickness: 0.5, color: GRAY });
page.drawText("Signature et cachet de l'employeur", { x: 70, y: footerY - 22, size: 7, font, color: GRAY });

page.drawLine({ start: { x: 350, y: footerY - 10 }, end: { x: width - 30, y: footerY - 10 }, thickness: 0.5, color: GRAY });
page.drawText('Cachet de la CNSS', { x: 400, y: footerY - 22, size: 7, font, color: GRAY });

const bytes = await doc.save();
writeFileSync('client/public/I16.pdf', bytes);
console.log('I16.pdf created: ' + bytes.length + ' bytes');
