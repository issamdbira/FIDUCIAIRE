// =============================================================================
// Le Fiduciaire — Prisma Client singleton (Neon PostgreSQL)
// =============================================================================
// Sur Vercel (serverless) : utilise @prisma/adapter-neon (pooled connection)
// En local (dev) : utilise le client Prisma classique avec moteur natif
// =============================================================================

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// ---------------------------------------------------------------------------
// Initialization state for diagnostics
// ---------------------------------------------------------------------------
export const initLog: string[] = [];
export let initMode: "neon" | "native" | "none" = "none";
export let initError: string | null = null;

// ---------------------------------------------------------------------------
// Secure diagnostic — never reveals DATABASE_URL value
// ---------------------------------------------------------------------------
function dbLog(level: "info" | "warn" | "error", msg: string, detail?: string) {
  const line = detail ? `[db] ${msg} — ${detail}` : `[db] ${msg}`;
  initLog.push(`${level.toUpperCase()}: ${line}`);
  if (initLog.length > 20) initLog.shift(); // Keep last 20 entries
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function createPrismaClient(): PrismaClient {
  const isVercel = process.env.VERCEL === "1";
  dbLog("info", "createPrismaClient() called", `VERCEL=${isVercel}, NODE_ENV=${process.env.NODE_ENV}`);

  // ---- Vercel serverless: Neon adapter ----
  if (isVercel) {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      dbLog("error", "FATAL: DATABASE_URL is NOT set in environment");
      dbLog("error", "Add DATABASE_URL in Vercel → Settings → Environment Variables");
      initError = "DATABASE_URL not set";
      throw new Error("DATABASE_URL is not configured");
    }

    // Validate URL format (never log the value)
    if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
      dbLog("error", "DATABASE_URL invalid prefix", `starts with "${dbUrl.slice(0, 15)}..."`);
      initError = `Invalid prefix: ${dbUrl.slice(0, 15)}...`;
      throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
    }

    // Log presence (never the value)
    const hasSslmode = dbUrl.includes("sslmode=");
    dbLog("info", "DATABASE_URL present", `length=${dbUrl.length}, sslmode=${hasSslmode}`);

    try {
      // Use require() — esbuild bundles this into a direct reference
      dbLog("info", "About to require @prisma/adapter-neon");
      const adapterModule = require("@prisma/adapter-neon");
      dbLog("info", "Adapter module loaded", `keys=${Object.keys(adapterModule).join(",")}`);

      const { PrismaNeon } = adapterModule;
      dbLog("info", "PrismaNeon extracted", `type=${typeof PrismaNeon}`);

      const adapter = new PrismaNeon({ connectionString: dbUrl });
      dbLog("info", "Neon adapter instance created", `provider=${adapter.provider}, name=${adapter.adapterName}`);

      const client = new PrismaClient({ adapter } as any);
      dbLog("info", "PrismaClient created with Neon adapter");
      initMode = "neon";
      return client;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      dbLog("error", "Neon adapter initialization FAILED", errMsg);
      initError = errMsg;
      // On Vercel, we MUST use the adapter — native engine won't work
      throw new Error(`Neon adapter initialization failed: ${errMsg}`);
    }
  }

  // ---- Local development: native engine ----
  dbLog("info", "Using local PrismaClient (native engine)");
  initMode = "native";
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// ---------------------------------------------------------------------------
// Lazy initialization — defer until first request on Vercel
// On Vercel serverless, we want to create the client inside the request handler
// to ensure process.env.VERCEL is set and errors can be caught per-request.
// ---------------------------------------------------------------------------
let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (_prisma) return _prisma;
  if (globalForPrisma.prisma) {
    _prisma = globalForPrisma.prisma;
    return _prisma;
  }
  const client = createPrismaClient();
  _prisma = client;
  globalForPrisma.prisma = client;
  return client;
}

// Export a Proxy that lazily initializes on first property access
// This ensures createPrismaClient() runs INSIDE the request handler,
// not at module load time where env vars might not be set yet.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrisma();
    const value = (client as any)[prop];
    // Bind methods to the client instance so `this` is correct
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
