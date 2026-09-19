-- =============================================================================
-- Lot 8-A — Paie simple OU conventionnelle au choix (modePaie + champs paie)
-- =============================================================================
-- Cette migration ajoute :
--   1. Enum ModePaie (SIMPLE | CONVENTIONNEL)
--   2. Colonne PayrollPeriod.modePaie (default SIMPLE) — rétro-compatible
--   3. Colonnes Payslip.salaireBaseGrille + indemniteSupplementaire (nullable)
--      (utilisées en mode CONVENTIONNEL seulement — null en mode SIMPLE)
--   4. Colonnes Payslip.primesConventionnelles (Json) + totalPrimesConventionnelles (Float?)
--      (Lot 8 suite — applique les primes de la convention en mode CONVENTIONNEL)
--
-- Rétro-compatibilité :
--   - Toutes les périodes existantes prennent la valeur 'SIMPLE' (défaut) →
--     aucun changement de comportement pour les paies historiques.
--   - Tous les bulletins existants ont salaireBaseGrille = null et
--     indemniteSupplementaire = null → le moteur affiche brut effectif
--     comme avant.
--   - primesConventionnelles = null → pas de primes appliquées sur les anciens
--     bulletins.
-- =============================================================================

-- CreateEnum
CREATE TYPE "ModePaie" AS ENUM ('SIMPLE', 'CONVENTIONNEL');

-- AlterTable : payroll_periods — add modePaie column
ALTER TABLE "payroll_periods" ADD COLUMN "modePaie" "ModePaie" NOT NULL DEFAULT 'SIMPLE';

-- AlterTable : payslips — add 4 columns for the CONVENTIONNEL mode decomposition
-- All nullable — null in SIMPLE mode, populated in CONVENTIONNEL mode
ALTER TABLE "payslips" ADD COLUMN "salaireBaseGrille" DOUBLE PRECISION;
ALTER TABLE "payslips" ADD COLUMN "indemniteSupplementaire" DOUBLE PRECISION;
ALTER TABLE "payslips" ADD COLUMN "primesConventionnelles" JSON;
ALTER TABLE "payslips" ADD COLUMN "totalPrimesConventionnelles" DOUBLE PRECISION;

-- =============================================================================
-- Note: cette migration ne modifie PAS la logique de calcul — elle ajoute
-- uniquement des champs pour stocker la décomposition grille + indemnité +
-- primes en mode CONVENTIONNEL. La logique de calcul est dans
-- server/lib/payroll-engine.ts (fonction calculateMassPayroll) et utilise
-- la valeur de PayrollPeriod.modePaie pour décider d'appliquer la
-- décomposition ou non.
-- =============================================================================
