-- Lot 6 (P0-3 + P1-7) : contenu des documents stocké en base.
-- /tmp est éphémère par instance serverless : le téléchargement pouvait
-- tomber sur une autre instance (404 aléatoires) et la génération CNSS
-- échouait en 500 sur Vercel. Colonne additive, nullable, sans impact.
-- (noms physiques snake_case — cf. correctif 08f4c9f)
ALTER TABLE "document_storage" ADD COLUMN "contenuBase64" TEXT;
