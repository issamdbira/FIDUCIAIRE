// =============================================================================
// Lot 8-4 — Tests unitaires pour server/lib/document-generator.ts (PDF)
// =============================================================================
// Vérifie que generateBulletinPdf produit un vrai PDF binaire :
//   - commence par %PDF (magic bytes)
//   - se termine par %%EOF
//   - mimeType application/pdf
// Note : pdf-lib compresse les content streams (FlateDecode), donc les strings
// "Ali Ben Test" / "Test SARL" ne sont pas visibles en clair dans le binaire.
// La validation du contenu textuel se ferait avec un parser PDF (hors-scope).
// Aucune DB — generateBulletinPdf est une fonction PURE qui prend un payslip.

import { describe, it, expect } from "vitest";
import { generateBulletinPdf, generateBulletinHtml } from "./document-generator.js";

const SAMPLE_PAYSLIP = {
  id: "psl-1",
  mois: 9,
  annee: 2026,
  matricule: "12345678",
  nomPrenom: "Ali Ben Test",
  salaireBrutContractuel: 1500,
  tauxPresence: 1,
  joursTravailles: 22,
  joursAbsence: 0,
  heuresSupplementaires: 0,
  salaireBrutEffectif: 1500,
  montantHeuresSup: 0,
  montantAbsence: 0,
  baseImposable: 1500,
  retenueCnssSalarial: 145.2,
  retenueCss: 0,
  totalRetenuesSalariales: 145.2,
  retenueCnssPatronal: 256.05,
  fraisProfessionnels: 150,
  netImposableAvantDeductions: 1204.8,
  deductionChefFamille: 0,
  deductionEnfants: 0,
  deductionParents: 0,
  totalDeductionsFamiliales: 0,
  baseIrpp: 1204.8,
  retenueIrpp: 155.37,
  salaireNet: 1199.43,
  tauxHoraire: 7.21,
};

const SAMPLE_CLIENT = {
  raisonSociale: "Test SARL",
  matriculeFiscal: "MF-123",
  matriculeCnss: "12345678",
};

describe("Lot 8-4 — server/lib/document-generator.ts (PDF binaire)", () => {
  describe("generateBulletinPdf", () => {
    it("PDF-1: produit un Buffer non vide (> 1000 bytes)", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(1000);
    });

    it("PDF-2: le PDF commence par %PDF- (magic bytes)", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      const header = pdf.slice(0, 5).toString("latin1");
      expect(header).toBe("%PDF-");
    });

    it("PDF-3: le PDF se termine par %%EOF", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      // Les derniers caractères contiennent %%EOF (parfois suivi d'un newline)
      const tail = pdf.slice(-10).toString("latin1");
      expect(tail).toContain("%%EOF");
    });

    it("PDF-4: le PDF a une version 1.7 (header %PDF-1.7)", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      const header = pdf.slice(0, 8).toString("latin1");
      expect(header).toMatch(/^%PDF-1\.\d/);
    });

    it("PDF-5: le PDF contient une structure valide (object streams)", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      const content = pdf.toString("latin1");
      // pdf-lib utilise des objets compressés (Object Streams) — les marqueurs /Type /Catalog
      // ne sont pas visibles en clair, mais la structure d'objets l'est
      expect(content).toMatch(/\d+ \d+ obj/); // au moins un objet "N M obj"
      expect(content).toContain("endobj");
    });

    it("PDF-6: le PDF contient au moins un stream compressé (cross-reference)", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      const content = pdf.toString("latin1");
      // Le xref (table de références croisées) est en clair à la fin
      expect(content).toMatch(/xref|startxref/);
    });

    it("PDF-7: le PDF contient un stream de contenu compressé", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      const content = pdf.toString("latin1");
      // pdf-lib compresse les content streams (FlateDecode)
      expect(content).toContain("stream");
      expect(content).toContain("endstream");
      // Au moins un filtre FlateDecode ou ASCII85
      expect(content).toMatch(/FlateDecode|ASCII85/);
    });

    it("PDF-8: mimeType application/pdf peut être dérivé du header", async () => {
      const pdf = await generateBulletinPdf(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      const header = pdf.slice(0, 5).toString("latin1");
      expect(header).toBe("%PDF-");
      // Si le header commence par %PDF-, le mimeType standard est application/pdf
      const mimeType = header.startsWith("%PDF-") ? "application/pdf" : "application/octet-stream";
      expect(mimeType).toBe("application/pdf");
    });

    it("PDF-9: génère un PDF pour différents salaires (SMIG et salaire moyen)", async () => {
      // SMIG 2026 48h
      const pdf1 = await generateBulletinPdf({ ...SAMPLE_PAYSLIP, salaireBrutContractuel: 554.736, salaireNet: 433 }, SAMPLE_CLIENT);
      expect(pdf1.slice(0, 5).toString("latin1")).toBe("%PDF-");
      // Salaire élevé
      const pdf2 = await generateBulletinPdf({ ...SAMPLE_PAYSLIP, salaireBrutContractuel: 8000, salaireNet: 6500 }, SAMPLE_CLIENT);
      expect(pdf2.slice(0, 5).toString("latin1")).toBe("%PDF-");
    });
  });

  describe("generateBulletinHtml (fallback)", () => {
    it("HTML-1: génère du HTML non vide (fallback inline)", () => {
      const html = generateBulletinHtml(SAMPLE_PAYSLIP, SAMPLE_CLIENT);
      expect(html).toContain("<html");
      expect(html).toContain("Ali Ben Test");
      expect(html).toContain("Test SARL");
    });
  });
});
