-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('PROPRIETAIRE', 'GESTIONNAIRE', 'LECTEUR');

-- CreateEnum
CREATE TYPE "StatutValidation" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REFUSE', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "CivilStatus" AS ENUM ('CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CLIENT', 'VENDOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'GESTIONNAIRE',
    "statut" "StatutValidation" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matriculeCnss" TEXT,
    "codeExploitation" TEXT,
    "matriculeFiscal" TEXT,
    "address" TEXT,
    "tauxAtMp" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "secteur" TEXT NOT NULL DEFAULT 'non_agricole',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'GESTIONNAIRE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("userId","workspaceId")
);

-- CreateTable
CREATE TABLE "payroll_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "cnssSalarialNonAgricole" DOUBLE PRECISION NOT NULL DEFAULT 0.0968,
    "cnssPatronalNonAgricole" DOUBLE PRECISION NOT NULL DEFAULT 0.1707,
    "cnssSalarialAgricole" DOUBLE PRECISION NOT NULL DEFAULT 0.0699,
    "cnssPatronalAgricole" DOUBLE PRECISION NOT NULL DEFAULT 0.1248,
    "cssActive" BOOLEAN NOT NULL DEFAULT false,
    "cssTaux" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cssSeuilExonerationAnnuel" INTEGER NOT NULL DEFAULT 5000,
    "fraisProTauxActifs" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "fraisProPlafondActifsAnnuel" INTEGER NOT NULL DEFAULT 2000,
    "fraisProTauxRetraites" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "deductionChefFamille" INTEGER NOT NULL DEFAULT 300,
    "deductionEnfant" INTEGER NOT NULL DEFAULT 100,
    "deductionEtudiant" INTEGER NOT NULL DEFAULT 1000,
    "plafondNombreEnfantsEtudiants" INTEGER NOT NULL DEFAULT 4,
    "deductionInfirme" INTEGER NOT NULL DEFAULT 2000,
    "parentsEnChargeActif" BOOLEAN NOT NULL DEFAULT false,
    "parentsEnChargeTaux" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "parentsEnChargePlafondParAnnuel" INTEGER NOT NULL DEFAULT 450,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tranches_irpp" (
    "id" TEXT NOT NULL,
    "payrollConfigId" TEXT NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER,
    "taux" DOUBLE PRECISION NOT NULL,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "tranches_irpp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "matriculeFiscal" TEXT,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matriculeCnss" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "civilStatus" "CivilStatus" NOT NULL DEFAULT 'CELIBATAIRE',
    "numberOfChildren" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_configs_workspaceId_key" ON "payroll_configs"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "tranches_irpp_payrollConfigId_ordre_key" ON "tranches_irpp"("payrollConfigId", "ordre");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_configs" ADD CONSTRAINT "payroll_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tranches_irpp" ADD CONSTRAINT "tranches_irpp_payrollConfigId_fkey" FOREIGN KEY ("payrollConfigId") REFERENCES "payroll_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
