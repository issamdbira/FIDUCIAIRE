-- Lot 1 — sécurité : auditer les événements d'authentification (LOGIN, LOGOUT,
-- échecs de connexion, réinitialisations) qui ne sont rattachés à AUCUN espace.
-- Assouplissement permissif (rétrocompatible) : la colonne devient nullable,
-- aucune ligne existante n'est modifiée.

ALTER TABLE "AuditLog" ALTER COLUMN "workspaceId" DROP NOT NULL;

CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
