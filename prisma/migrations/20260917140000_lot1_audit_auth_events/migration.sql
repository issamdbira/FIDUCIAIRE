-- Lot 1 — sécurité : auditer les événements d'authentification (LOGIN, LOGOUT,
-- échecs de connexion, réinitialisations) qui ne sont rattachés à AUCUN espace.
-- Assouplissement permissif (rétrocompatible) : la colonne devient nullable,
-- aucune ligne existante n'est modifiée.

ALTER TABLE "audit_logs" ALTER COLUMN "workspaceId" DROP NOT NULL;

CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
