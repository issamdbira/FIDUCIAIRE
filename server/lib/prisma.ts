// =============================================================================
// Le Fiduciaire — Prisma Client singleton (Neon PostgreSQL)
// =============================================================================
// Sur Vercel (serverless) : utilise @prisma/adapter-neon (pooled connection)
// En local (dev) : utilise le client Prisma classique avec moteur natif
// =============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// ---------------------------------------------------------------------------
// Secure diagnostic — never reveals DATABASE_URL value
// ---------------------------------------------------------------------------
function dbLog(level: "info" | "warn" | "error", msg: string, detail?: string) {
  const line = detail ? `[db] ${msg} — ${detail}` : `[db] ${msg}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function createPrismaClient(): PrismaClient {
  // ---- Vercel serverless: Neon adapter ----
  if (process.env.VERCEL === "1") {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      dbLog("error", "FATAL: DATABASE_URL is NOT set in environment");
      dbLog("error", "Add DATABASE_URL in Vercel → Settings → Environment Variables");
      throw new Error("DATABASE_URL is not configured");
    }

    // Validate URL format (never log the value)
    if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
      dbLog("error", "DATABASE_URL invalid prefix", `starts with "${dbUrl.slice(0, 15)}..."`);
      throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
    }

    // Log presence (never the value)
    const hasSslmode = dbUrl.includes("sslmode=");
    dbLog("info", "DATABASE_URL present", `length=${dbUrl.length}, sslmode=${hasSslmode}`);

    try {
      // PrismaNeon is bundled by esbuild — require() works via createRequire polyfill
      const { PrismaNeon } = require("@prisma/adapter-neon");
      const adapter = new PrismaNeon({ connectionString: dbUrl });
      dbLog("info", "Neon adapter created", `provider=${adapter.provider}, name=${adapter.adapterName}`);

      const client = new PrismaClient({ adapter });
      dbLog("info", "PrismaClient + Neon adapter ready");
      return client;
    } catch (err: any) {
      dbLog("error", "Neon adapter FAILED", err?.message || String(err));
      // On Vercel, we MUST use the adapter — native engine won't work
      throw new Error(`Neon adapter initialization failed: ${err?.message || err}`);
    }
  }

  // ---- Local development: native engine ----
  dbLog("info", "Using local PrismaClient (native engine)");
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Singleton pattern — re-use across serverless invocations
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
