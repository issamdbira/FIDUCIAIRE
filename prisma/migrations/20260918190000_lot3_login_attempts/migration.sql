-- Lot 3 — Persistance des verrous de connexion (serverless multi-instances)
--
-- Les compteurs de tentatives (Lot 1 : 5 échecs/15 min par (email, IP) ;
-- Lot 2 : 20 échecs/1 h toutes IP → verrou compte 30 min) vivaient en mémoire
-- process : sur Vercel, chaque instance chaude multipliait les seuils effectifs.
-- Chaque échec de connexion devient une ligne ; fenêtres et verrous se calculent
-- en base — identiques sur toutes les instances. La réussite purge les lignes de
-- l'email ; la purge opportuniste supprime les lignes de plus de 2 h.
--
-- Migration 100 % additive : nouvelle table, aucune donnée existante touchée.

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_email_createdAt_idx" ON "login_attempts"("email", "createdAt");
