-- =============================================================================
-- Phase 5 — Paie Mensuelle
-- =============================================================================

-- Enums
CREATE TYPE "StatutPeriodePaie" AS ENUM ('OPEN', 'CALCULATED', 'TO_REVIEW', 'VALIDATED', 'CLOSED');
CREATE TYPE "NiveauAnomalie" AS ENUM ('BLOQUANTE', 'AVERTISSEMENT', 'INFORMATION');

-- PayrollPeriod
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "statut" "StatutPeriodePaie" NOT NULL DEFAULT 'OPEN',
    "dateOuverture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCalcul" TIMESTAMP(3),
    "dateValidation" TIMESTAMP(3),
    "dateCloture" TIMESTAMP(3),
    "nombreSalaries" INTEGER NOT NULL DEFAULT 0,
    "nombreBulletins" INTEGER NOT NULL DEFAULT 0,
    "nombreAnomalies" INTEGER NOT NULL DEFAULT 0,
    "openedBy" TEXT,
    "calculatedBy" TEXT,
    "validatedBy" TEXT,
    "closedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_periods_workspaceId_clientCompanyId_annee_mois_key" ON "payroll_periods"("workspaceId", "clientCompanyId", "annee", "mois");
CREATE INDEX "payroll_periods_workspaceId_idx" ON "payroll_periods"("workspaceId");
CREATE INDEX "payroll_periods_clientCompanyId_idx" ON "payroll_periods"("clientCompanyId");
CREATE INDEX "payroll_periods_statut_idx" ON "payroll_periods"("statut");
CREATE INDEX "payroll_periods_annee_mois_idx" ON "payroll_periods"("annee", "mois");

ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payslip
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "matricule" TEXT NOT NULL,
    "nomPrenom" TEXT NOT NULL,
    "contratId" TEXT,
    "salaireBrutContractuel" DOUBLE PRECISION NOT NULL,
    "tauxPresence" DOUBLE PRECISION NOT NULL,
    "joursTravailles" DOUBLE PRECISION NOT NULL,
    "joursAbsence" DOUBLE PRECISION NOT NULL,
    "heuresSupplementaires" DOUBLE PRECISION NOT NULL,
    "salaireBrutEffectif" DOUBLE PRECISION NOT NULL,
    "montantHeuresSup" DOUBLE PRECISION NOT NULL,
    "montantAbsence" DOUBLE PRECISION NOT NULL,
    "baseImposable" DOUBLE PRECISION NOT NULL,
    "retenueCnssSalarial" DOUBLE PRECISION NOT NULL,
    "retenueCss" DOUBLE PRECISION NOT NULL,
    "totalRetenuesSalariales" DOUBLE PRECISION NOT NULL,
    "retenueCnssPatronal" DOUBLE PRECISION NOT NULL,
    "fraisProfessionnels" DOUBLE PRECISION NOT NULL,
    "netImposableAvantDeductions" DOUBLE PRECISION NOT NULL,
    "deductionChefFamille" DOUBLE PRECISION NOT NULL,
    "deductionEnfants" DOUBLE PRECISION NOT NULL,
    "deductionParents" DOUBLE PRECISION NOT NULL,
    "totalDeductionsFamiliales" DOUBLE PRECISION NOT NULL,
    "baseIrpp" DOUBLE PRECISION NOT NULL,
    "retenueIrpp" DOUBLE PRECISION NOT NULL,
    "salaireNet" DOUBLE PRECISION NOT NULL,
    "tauxHoraire" DOUBLE PRECISION,
    "statut" "StatutVariablePaie" NOT NULL DEFAULT 'PROPOSEE',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payslips_periodId_idx" ON "payslips"("periodId");
CREATE INDEX "payslips_employeeId_idx" ON "payslips"("employeeId");
CREATE INDEX "payslips_workspaceId_idx" ON "payslips"("workspaceId");
CREATE INDEX "payslips_clientCompanyId_idx" ON "payslips"("clientCompanyId");
CREATE INDEX "payslips_annee_mois_idx" ON "payslips"("annee", "mois");
CREATE INDEX "payslips_statut_idx" ON "payslips"("statut");

ALTER TABLE "payslips" ADD CONSTRAINT "payslips_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Anomaly
CREATE TABLE "payroll_anomalies" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "payslipId" TEXT,
    "employeeId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "niveau" "NiveauAnomalie" NOT NULL,
    "message" TEXT NOT NULL,
    "estResolue" BOOLEAN NOT NULL DEFAULT false,
    "resoluPar" TEXT,
    "resoluAt" TIMESTAMP(3),
    "noteResolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_anomalies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payroll_anomalies_periodId_idx" ON "payroll_anomalies"("periodId");
CREATE INDEX "payroll_anomalies_payslipId_idx" ON "payroll_anomalies"("payslipId");
CREATE INDEX "payroll_anomalies_employeeId_idx" ON "payroll_anomalies"("employeeId");
CREATE INDEX "payroll_anomalies_workspaceId_idx" ON "payroll_anomalies"("workspaceId");
CREATE INDEX "payroll_anomalies_niveau_idx" ON "payroll_anomalies"("niveau");
CREATE INDEX "payroll_anomalies_estResolue_idx" ON "payroll_anomalies"("estResolue");

ALTER TABLE "payroll_anomalies" ADD CONSTRAINT "payroll_anomalies_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_anomalies" ADD CONSTRAINT "payroll_anomalies_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
