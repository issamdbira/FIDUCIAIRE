-- Lot 6-G (P3) : enum StatutVariablePaie — correction des valeurs mal nommées
-- VALIDEe → VALIDEE, REFUSEe → REFUSEE (cohérence PROPOSEE/VALIDEE/REFUSEE).
-- RENAME VALUE conserve l'ordre des valeurs et met à jour les lignes existantes
-- des tables payroll_variables / payslips (aucune perte de données).
ALTER TYPE "StatutVariablePaie" RENAME VALUE 'VALIDEe' TO 'VALIDEE';
ALTER TYPE "StatutVariablePaie" RENAME VALUE 'REFUSEe' TO 'REFUSEE';
