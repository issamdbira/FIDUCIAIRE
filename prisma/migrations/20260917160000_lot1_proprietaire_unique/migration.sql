-- Lot 1 — intégrité du cabinet : UN SEUL PROPRIETAIRE actif par workspace
-- (roadmap §4.3 : conserver un seul propriétaire, corriger la migration ayant
-- produit deux propriétaires, rétrograder automatiquement l'ancien).
--
-- 1) Auto-réparation des doublons existants : pour chaque workspace, on
--    conserve le propriétaire le plus récemment ACTIF (dernière session
--    ouverte) ; à égalité ou inactivité, le plus ancien membre l'emporte.
--    Les autres propriétaires sont rétrogradés en GESTIONNAIRE — réversible,
--    journalisé dans l'audit (CTE UPDATE ... RETURNING).
-- 2) Verrou structurel : index unique partiel — la base elle-même refuse
--    désormais deux PROPRIETAIRE sur un même workspace (y compris via le
--    script de fusion ou toute future écriture directe).

WITH retrogrades AS (
  UPDATE "workspace_members" wm
  SET "role" = 'GESTIONNAIRE'
  WHERE wm."role" = 'PROPRIETAIRE'
    AND wm."userId" <> (
      SELECT w2."userId"
      FROM "workspace_members" w2
      WHERE w2."workspaceId" = wm."workspaceId"
        AND w2."role" = 'PROPRIETAIRE'
      ORDER BY (SELECT MAX(s."createdAt") FROM "Session" s WHERE s."userId" = w2."userId") DESC NULLS LAST,
               w2."joinedAt" ASC
      LIMIT 1
    )
  RETURNING wm."workspaceId" AS ws_id, wm."userId" AS user_id
)
INSERT INTO "AuditLog" ("id", "workspaceId", "userId", "action", "entity", "entityId", "details")
SELECT 'sys-uniq-owner-' || ws_id,
       ws_id,
       'system-migration',
       'OWNER_UNIQUE_ENFORCED',
       'workspace_members',
       user_id,
       'Rétrogradé GESTIONNAIRE : doublon de propriétaire (Lot 1 — le propriétaire le plus récemment actif est conservé)'
FROM retrogrades;

-- 2) Verrou structurel : un seul PROPRIETAIRE par workspace, niveau base
CREATE UNIQUE INDEX "workspace_members_proprietaire_unique"
  ON "workspace_members"("workspaceId")
  WHERE "role" = 'PROPRIETAIRE';
