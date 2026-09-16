-- Phase 10 — Espaces CABINET / ENTREPRISE + accès délégué (100% additif)
-- Référence : document d'orientation modèle métier des espaces (fait autorité).
-- Aucune colonne supprimée, aucune table existante altérée structurellement.

-- CreateEnum
CREATE TYPE "TypeEspace" AS ENUM ('CABINET', 'ENTREPRISE');

-- CreateEnum
CREATE TYPE "StatutDelegation" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');

-- AlterTable : type d'espace (immuable après création, défaut CABINET —
-- les espaces existants restent des cabinets jusqu'à la migration des données)
ALTER TABLE "workspaces" ADD COLUMN "type" "TypeEspace" NOT NULL DEFAULT 'CABINET';

-- AlterTable : archivage logique (masquage des espaces fusionnés, données préservées)
ALTER TABLE "workspaces" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "workspaces_type_idx" ON "workspaces"("type");

-- CreateTable : table d'accès délégué (cabinet → espace Entreprise)
CREATE TABLE "delegated_access" (
    "id" TEXT NOT NULL,
    "cabinetWorkspaceId" TEXT,
    "targetWorkspaceId" TEXT NOT NULL,
    "statut" "StatutDelegation" NOT NULL DEFAULT 'PENDING',
    "code" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "delegated_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delegated_access_code_key" ON "delegated_access"("code");
CREATE UNIQUE INDEX "delegated_access_cabinetWorkspaceId_targetWorkspaceId_key" ON "delegated_access"("cabinetWorkspaceId", "targetWorkspaceId");
CREATE INDEX "delegated_access_cabinetWorkspaceId_idx" ON "delegated_access"("cabinetWorkspaceId");
CREATE INDEX "delegated_access_targetWorkspaceId_idx" ON "delegated_access"("targetWorkspaceId");
CREATE INDEX "delegated_access_statut_idx" ON "delegated_access"("statut");

-- AddForeignKey
ALTER TABLE "delegated_access" ADD CONSTRAINT "delegated_access_cabinetWorkspaceId_fkey" FOREIGN KEY ("cabinetWorkspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delegated_access" ADD CONSTRAINT "delegated_access_targetWorkspaceId_fkey" FOREIGN KEY ("targetWorkspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable : traçabilité de la migration Clients → Espaces (idempotence + réversibilité)
CREATE TABLE "migration_map" (
    "id" TEXT NOT NULL,
    "oldWorkspaceId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "newWorkspaceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EXECUTED',
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "migration_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "migration_map_clientCompanyId_key" ON "migration_map"("clientCompanyId");
CREATE INDEX "migration_map_oldWorkspaceId_idx" ON "migration_map"("oldWorkspaceId");
CREATE INDEX "migration_map_newWorkspaceId_idx" ON "migration_map"("newWorkspaceId");
