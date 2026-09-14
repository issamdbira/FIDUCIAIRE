// =============================================================================
// Le Fiduciaire — Prisma Client singleton (Neon PostgreSQL)
// =============================================================================
// Sur Vercel (serverless) : utilise @prisma/adapter-neon + @neondatabase/serverless
//   → Pas de binaire natif, pure JS/WASM, compatible AWS Lambda
// En local (dev) : utilise le client Prisma classique avec moteur natif
//   → Meilleures performances en développement
// =============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  // Sur Vercel : utiliser le Neon serverless driver adapter
  if (process.env.VERCEL === "1") {
    try {
      // Import dynamique — esbuild bundle ces modules
      const { Pool } = require("@neondatabase/serverless");
      const { PrismaNeon } = require("@prisma/adapter-neon");
      const neonPool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaNeon(neonPool);
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
