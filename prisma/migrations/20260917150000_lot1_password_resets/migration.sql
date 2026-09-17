-- Lot 1 — Récupération de compte : liens de réinitialisation à usage unique
-- Migration 100% additive (nouvelle table + index), aucune donnée existante touchée.

-- CreateTable : password_resets (token hashé sha256, TTL 24 h, usage unique)
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_tokenHash_key" ON "password_resets"("tokenHash");
CREATE INDEX "password_resets_email_idx" ON "password_resets"("email");

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
