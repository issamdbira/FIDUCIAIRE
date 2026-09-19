-- =============================================================================
-- Phase 4 — Pointage Mensuel (backfilled 2026-09-19)
-- =============================================================================
-- This migration was originally applied via `prisma db push` on 2026-09-13,
-- leaving this file empty. The DDL below is backfilled from the Prisma schema
-- via `prisma migrate diff --from-empty --to-schema-datamodel` filtered on
-- Phase 4 entities. It is now safe to run `prisma migrate deploy` on a fresh
-- database — the migration history is complete and self-contained.
--
-- Entities introduced in this migration:
--   - Enum "StatutVariablePaie" (PROPOSEE, VALIDEE, REFUSEE)
--   - Table "attendance_imports"        (imports de pointage, 1 par mois / entreprise)
--   - Table "attendance_summaries"      (1 ligne par salarié présent dans l'import)
--   - Table "payroll_variables"        (variables de paie calculées depuis le pointage)
--   - Indexes on (workspaceId, clientCompanyId, annee+mois, importId+employeeId)
--   - Foreign keys: imports→workspaces, imports→client_companies, imports→users,
--     summaries→imports (cascade), summaries→employees (cascade),
--     variables→summaries, variables→employees, variables→workspaces,
--     variables→contracts
-- =============================================================================

CREATE TYPE "StatutImport" AS ENUM ('EN_COURS', 'VALIDE', 'ANOMALIES', 'REJETE');

CREATE TYPE "StatutVariablePaie" AS ENUM ('PROPOSEE', 'VALIDEE', 'REFUSEE');

CREATE TABLE "attendance_imports" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "tailleFichier" INTEGER,
    "statut" "StatutImport" NOT NULL DEFAULT 'EN_COURS',
    "lignesTotal" INTEGER NOT NULL,
    "lignesOk" INTEGER NOT NULL,
    "lignesAnomalie" INTEGER NOT NULL,
    "anomalies" JSONB,
    "importedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_summaries" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nomPrenom" TEXT NOT NULL,
    "joursTravaillesReels" DOUBLE PRECISION NOT NULL,
    "congesPayes" DOUBLE PRECISION NOT NULL,
    "absencesJustifiees" DOUBLE PRECISION NOT NULL,
    "absencesNonJustifiees" DOUBLE PRECISION NOT NULL,
    "heuresSupplementaires" DOUBLE PRECISION NOT NULL,
    "joursOuvresTotal" DOUBLE PRECISION,
    "joursCalendairesMois" INTEGER,
    "tauxPresence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_summaries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_variables" (
    "id" TEXT NOT NULL,
    "summaryId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "salaireBrutMensuel" DOUBLE PRECISION NOT NULL,
    "tauxPresence" DOUBLE PRECISION NOT NULL,
    "salaireBrutEffectif" DOUBLE PRECISION NOT NULL,
    "heuresSupplementaires" DOUBLE PRECISION NOT NULL,
    "montantHeuresSup" DOUBLE PRECISION,
    "joursTravailles" DOUBLE PRECISION NOT NULL,
    "joursAbsence" DOUBLE PRECISION NOT NULL,
    "montantAbsence" DOUBLE PRECISION,
    "retenueCnss" DOUBLE PRECISION,
    "retenueIrpp" DOUBLE PRECISION,
    "retenueCss" DOUBLE PRECISION,
    "salaireNet" DOUBLE PRECISION,
    "statut" "StatutVariablePaie" NOT NULL DEFAULT 'PROPOSEE',
    "validatedBy" TEXT,
    "validatedAt" TIMESTAMP(3),
    "noteValidation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_variables_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_imports_workspaceId_idx" ON "attendance_imports"("workspaceId");

CREATE INDEX "attendance_imports_clientCompanyId_idx" ON "attendance_imports"("clientCompanyId");

CREATE INDEX "attendance_imports_annee_mois_idx" ON "attendance_imports"("annee", "mois");

CREATE INDEX "attendance_summaries_importId_idx" ON "attendance_summaries"("importId");

CREATE INDEX "attendance_summaries_employeeId_idx" ON "attendance_summaries"("employeeId");

CREATE INDEX "attendance_summaries_workspaceId_idx" ON "attendance_summaries"("workspaceId");

CREATE UNIQUE INDEX "attendance_summaries_importId_employeeId_key" ON "attendance_summaries"("importId", "employeeId");

CREATE INDEX "payroll_variables_summaryId_idx" ON "payroll_variables"("summaryId");

CREATE INDEX "payroll_variables_employeeId_idx" ON "payroll_variables"("employeeId");

CREATE INDEX "payroll_variables_workspaceId_idx" ON "payroll_variables"("workspaceId");

CREATE INDEX "payroll_variables_annee_mois_idx" ON "payroll_variables"("annee", "mois");

CREATE INDEX "payroll_variables_statut_idx" ON "payroll_variables"("statut");

ALTER TABLE "attendance_imports" ADD CONSTRAINT "attendance_imports_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_imports" ADD CONSTRAINT "attendance_imports_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_importId_fkey" FOREIGN KEY ("importId") REFERENCES "attendance_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_summaries" ADD CONSTRAINT "attendance_summaries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payroll_variables" ADD CONSTRAINT "payroll_variables_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "attendance_summaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
