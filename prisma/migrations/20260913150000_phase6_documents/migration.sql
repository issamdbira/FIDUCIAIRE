-- =============================================================================
-- Phase 6 — Documents & Stockage
-- =============================================================================

CREATE TYPE "TypeDocument" AS ENUM ('BULLETIN_PDF', 'EXPORT_EXCEL', 'EXPORT_CSV', 'ATTESTATION');

CREATE TABLE "document_storage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientCompanyId" TEXT,
    "payslipId" TEXT,
    "type" "TypeDocument" NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "cheminStockage" TEXT NOT NULL,
    "tailleOctets" INTEGER,
    "mimeType" TEXT NOT NULL,
    "mois" INTEGER,
    "annee" INTEGER,
    "periodePaieId" TEXT,
    "generePar" TEXT,
    "genereAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_storage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_storage_workspaceId_idx" ON "document_storage"("workspaceId");
CREATE INDEX "document_storage_clientCompanyId_idx" ON "document_storage"("clientCompanyId");
CREATE INDEX "document_storage_payslipId_idx" ON "document_storage"("payslipId");
CREATE INDEX "document_storage_type_idx" ON "document_storage"("type");
CREATE INDEX "document_storage_annee_mois_idx" ON "document_storage"("annee", "mois");

ALTER TABLE "document_storage" ADD CONSTRAINT "document_storage_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
