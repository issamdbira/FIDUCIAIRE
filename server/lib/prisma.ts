// =============================================================================
// Le Fiduciaire — Prisma Client singleton (Neon PostgreSQL)
// =============================================================================
// Sur Vercel (serverless) : utilise @prisma/adapter-neon
//   PrismaNeon est une factory qui prend un config object { connectionString }
//   et crée le Pool Neon en interne. Pas de binaire natif requis.
// En local (dev) : utilise le client Prisma classique avec moteur natif
//   → Meilleures performances en développement
// =============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Sur Vercel : utiliser le Neon serverless driver adapter
  if (process.env.VERCEL === "1") {
    try {
      // PrismaNeon v7+ est une factory : new PrismaNeon({ connectionString })
      // Elle crée le Pool Neon en interne — ne PAS passer un Pool directement
      const { PrismaNeon } = require("@prisma/adapter-neon");
      const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
      return new PrismaClient({ adapter });
    } catch (err) {
      console.error("⚠️  Failed to initialize Neon adapter, falling back to default client:", err);
    }
  }

  // En local ou fallback : client Prisma classique
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
