-- =============================================================================
-- Phase 3 — Contrats & Référentiels
-- Migration appliquée via `prisma db push` le 2026-09-13
-- =============================================================================

-- Enumérations Phase 3
CREATE TYPE "TypeContrat" AS ENUM ('CDI', 'CDD', 'TEMPS_PARTIEL', 'SAISONNIER', 'STAGE', 'INTERIM');
CREATE TYPE "StatutContrat" AS ENUM ('ACTIF', 'SUSPENDU', 'RESILIE', 'TERMINE');
CREATE TYPE "JourSemaine" AS ENUM ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE');
CREATE TYPE "CategorieRegle" AS ENUM ('CNSS', 'IRPP', 'CSS', 'FRAIS_PRO', 'DEDUCTION', 'RETRAITE', 'ACCIDENT', 'GENERAL');

-- Contrats de travail
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "TypeContrat" NOT NULL,
    "statut" "StatutContrat" NOT NULL DEFAULT 'ACTIF',
    "poste" TEXT NOT NULL,
    "conventionCollectiveId" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "periodeEssai" INTEGER,
    "motifRupture" TEXT,
    "dateRupture" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- Versions de contrat (historique)
CREATE TABLE "contract_versions" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "salaireBrut" DOUBLE PRECISION NOT NULL,
    "salaireBrutAnnuel" DOUBLE PRECISION,
    "coefficient" TEXT,
    "echelon" TEXT,
    "conventionCollectiveId" TEXT,
    "heuresHebdomadaires" DOUBLE PRECISION,
    "heuresMensuelles" DOUBLE PRECISION,
    "motifChangement" TEXT NOT NULL,
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- Conventions collectives
CREATE TABLE "convention_collectives" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "secteur" "SecteurActivite" NOT NULL DEFAULT 'NON_AGRICOLE',
    "organisme" TEXT,
    "datePublication" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "convention_collectives_pkey" PRIMARY KEY ("id")
);

-- Articles de convention
CREATE TABLE "convention_articles" (
    "id" TEXT NOT NULL,
    "conventionCollectiveId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "convention_articles_pkey" PRIMARY KEY ("id")
);

-- Grille salariale
CREATE TABLE "convention_grille_salaires" (
    "id" TEXT NOT NULL,
    "conventionCollectiveId" TEXT NOT NULL,
    "coefficient" TEXT NOT NULL,
    "echelon" TEXT NOT NULL,
    "salaireMinimum" DOUBLE PRECISION NOT NULL,
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "convention_grille_salaires_pkey" PRIMARY KEY ("id")
);

-- Adaptations client
CREATE TABLE "convention_adaptations" (
    "id" TEXT NOT NULL,
    "conventionCollectiveId" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "articleNumero" TEXT NOT NULL,
    "adaptationDescription" TEXT NOT NULL,
    "valeurOriginale" TEXT,
    "valeurAdaptee" TEXT,
    "dateEffet" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "convention_adaptations_pkey" PRIMARY KEY ("id")
);

-- Calendriers de travail
CREATE TABLE "work_calendars" (
    "id" TEXT NOT NULL,
    "clientCompanyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "heuresHebdomadaires" DOUBLE PRECISION NOT NULL,
    "joursMoisStandard" INTEGER NOT NULL,
    "heuresMoisStandard" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "work_calendars_pkey" PRIMARY KEY ("id")
);

-- Jours du calendrier
CREATE TABLE "work_calendar_days" (
    "id" TEXT NOT NULL,
    "workCalendarId" TEXT NOT NULL,
    "jour" "JourSemaine" NOT NULL,
    "estOuvre" BOOLEAN NOT NULL,
    "heuresTravail" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "work_calendar_days_pkey" PRIMARY KEY ("id")
);

-- Règles réglementaires versionnées
CREATE TABLE "regles_reglementaires" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "categorie" "CategorieRegle" NOT NULL,
    "description" TEXT NOT NULL,
    "valeur" DOUBLE PRECISION NOT NULL,
    "unite" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "source" TEXT,
    "reference" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "regles_reglementaires_pkey" PRIMARY KEY ("id")
);

-- Foreign keys & indexes
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_conventionCollectiveId_fkey" FOREIGN KEY ("conventionCollectiveId") REFERENCES "convention_collectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_conventionCollectiveId_fkey" FOREIGN KEY ("conventionCollectiveId") REFERENCES "convention_collectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "convention_collectives" ADD CONSTRAINT "convention_collectives_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "convention_articles" ADD CONSTRAINT "convention_articles_conventionCollectiveId_fkey" FOREIGN KEY ("conventionCollectiveId") REFERENCES "convention_collectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "convention_grille_salaires" ADD CONSTRAINT "convention_grille_salaires_conventionCollectiveId_fkey" FOREIGN KEY ("conventionCollectiveId") REFERENCES "convention_collectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "convention_adaptations" ADD CONSTRAINT "convention_adaptations_conventionCollectiveId_fkey" FOREIGN KEY ("conventionCollectiveId") REFERENCES "convention_collectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "convention_adaptations" ADD CONSTRAINT "convention_adaptations_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_calendars" ADD CONSTRAINT "work_calendars_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "client_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_calendar_days" ADD CONSTRAINT "work_calendar_days_workCalendarId_fkey" FOREIGN KEY ("workCalendarId") REFERENCES "work_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "regles_reglementaires" ADD CONSTRAINT "regles_reglementaires_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "contracts_employeeId_idx" ON "contracts"("employeeId");
CREATE INDEX "contracts_workspaceId_idx" ON "contracts"("workspaceId");
CREATE INDEX "contracts_statut_idx" ON "contracts"("statut");
CREATE INDEX "contracts_type_idx" ON "contracts"("type");
CREATE INDEX "contract_versions_contractId_idx" ON "contract_versions"("contractId");
CREATE INDEX "contract_versions_dateEffet_idx" ON "contract_versions"("dateEffet");
CREATE UNIQUE INDEX "convention_collectives_workspaceId_code_key" ON "convention_collectives"("workspaceId", "code");
CREATE INDEX "convention_collectives_workspaceId_idx" ON "convention_collectives"("workspaceId");
CREATE INDEX "convention_collectives_secteur_idx" ON "convention_collectives"("secteur");
CREATE INDEX "convention_articles_conventionCollectiveId_idx" ON "convention_articles"("conventionCollectiveId");
CREATE INDEX "convention_grille_salaires_conventionCollectiveId_idx" ON "convention_grille_salaires"("conventionCollectiveId");
CREATE INDEX "convention_grille_salaires_dateEffet_idx" ON "convention_grille_salaires"("dateEffet");
CREATE INDEX "convention_adaptations_conventionCollectiveId_idx" ON "convention_adaptations"("conventionCollectiveId");
CREATE INDEX "convention_adaptations_clientCompanyId_idx" ON "convention_adaptations"("clientCompanyId");
CREATE INDEX "convention_adaptations_workspaceId_idx" ON "convention_adaptations"("workspaceId");
CREATE INDEX "work_calendars_clientCompanyId_idx" ON "work_calendars"("clientCompanyId");
CREATE INDEX "work_calendars_workspaceId_idx" ON "work_calendars"("workspaceId");
CREATE UNIQUE INDEX "work_calendar_days_workCalendarId_jour_key" ON "work_calendar_days"("workCalendarId", "jour");
CREATE UNIQUE INDEX "regles_reglementaires_workspaceId_code_dateDebut_key" ON "regles_reglementaires"("workspaceId", "code", "dateDebut");
CREATE INDEX "regles_reglementaires_workspaceId_idx" ON "regles_reglementaires"("workspaceId");
CREATE INDEX "regles_reglementaires_categorie_idx" ON "regles_reglementaires"("categorie");
CREATE INDEX "regles_reglementaires_code_idx" ON "regles_reglementaires"("code");
CREATE INDEX "regles_reglementaires_dateDebut_idx" ON "regles_reglementaires"("dateDebut");
