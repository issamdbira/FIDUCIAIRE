-- CreateEnum
CREATE TYPE "StatutClient" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SecteurActivite" AS ENUM ('NON_AGRICOLE', 'AGRICOLE', 'SERVICES', 'INDUSTRIEL', 'COMMERCIAL');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "clientCompanyId" TEXT,
ADD COLUMN     "departedAt" TIMESTAMP(3),
ADD COLUMN     "establishmentId" TEXT,
ADD COLUMN     "hiredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "client_companies" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "matriculeFiscal" TEXT,
    "matriculeCnss" TEXT,
    "codeTVA" TEXT,
    "secteur" "SecteurActivite" NOT NULL DEFAULT 'NON_AGRICOLE',
    "statut" "StatutClient" NOT NULL DEFAULT 'ACTIVE',
    "adresse" TEXT,
    "ville" TEXT,
    "gouvernorat" TEXT,
    "codePostal" TEXT,
    "contactNom" TEXT,
    "contactTelephone" TEXT,
    "contactEmail" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "establishments" (
    "id" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "adresse" TEXT,
    "ville" TEXT,
    "gouvernorat" TEXT,
    "codePostal" TEXT,
    "matriculeCnss" TEXT,
    "codeExploitation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_companies_workspaceId_idx" ON "client_companies"("workspaceId");

-- CreateIndex
CREATE INDEX "client_companies_statut_idx" ON "client_companies"("statut");

-- CreateIndex
CREATE INDEX "client_companies_matriculeFiscal_idx" ON "client_companies"("matriculeFiscal");

-- CreateIndex
CREATE INDEX "establishments_clientCompanyId_idx" ON "establishments"("clientCompanyId");

-- CreateIndex
CREATE INDEX "establishments_isPrincipal_idx" ON "establishments"("isPrincipal");

-- CreateIndex
CREATE INDEX "employees_workspaceId_idx" ON "employees"("workspaceId");

-- CreateIndex
CREATE INDEX "employees_clientCompanyId_idx" ON "employees"("clientCompanyId");

-- CreateIndex
CREATE INDEX "employees_establishmentId_idx" ON "employees"("establishmentId");

-- AddForeignKey
ALTER TABLE "client_companies" ADD CONSTRAINT "client_companies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "establishments" ADD CONSTRAINT "establishments_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "client_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "establishments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

