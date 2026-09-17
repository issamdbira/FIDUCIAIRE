-- Lot 4 — Messages du formulaire de contact (fin du mock « envoi simulé »)
--
-- La page publique /contact affichait un faux accusé de réception sans
-- enregistrer quoi que ce soit. Chaque envoi valide devient une ligne ;
-- le PROPRIETAIRE (rôle global) consulte, marque lu et supprime via
-- /gestion/messages. Anti-abus : comptage en base (max 5/h/IP), efficace
-- sur toutes les instances serverless — même principe que login_attempts.
--
-- Migration 100 % additive : nouvelle table, aucune donnée existante touchée.

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ip" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_messages_createdAt_idx" ON "contact_messages"("createdAt");

-- CreateIndex
CREATE INDEX "contact_messages_ip_createdAt_idx" ON "contact_messages"("ip", "createdAt");
