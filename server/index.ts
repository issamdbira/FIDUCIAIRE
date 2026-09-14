// =============================================================================
// Le Fiduciaire — API Server (Full)
// Express + CORS + All API Routes
// =============================================================================

// Charger .env uniquement en local (Vercel injecte les variables d'env directement)
if (process.env.VERCEL !== "1") {
  try { require("dotenv/config"); } catch { /* dotenv non disponible en serverless */ }
}

import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import configRoutes from "./routes/config.js";
import clientRoutes from "./routes/clients.js";
import contractRoutes from "./routes/contracts.js";
import conventionRoutes from "./routes/conventions.js";
import calendarRoutes from "./routes/calendars.js";
import regleRoutes from "./routes/regles.js";
import attendanceRoutes from "./routes/attendance.js";
import payrollRoutes from "./routes/payroll.js";
import documentRoutes from "./routes/documents.js";
import cnssRoutes from "./routes/cnss.js";
import reportRoutes from "./routes/reports.js";
import dashboardRoutes from "./routes/dashboard.js";
import prisma, { initLog, initMode, initError } from "./lib/prisma.js";

// ---------------------------------------------------------------------------
// Create Express app (réutilisable en local ET en serverless Vercel)
// ---------------------------------------------------------------------------

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || (process.env.VERCEL === "1" ? "https://fiduciaire-nine.vercel.app" : "http://localhost:3000"),
    credentials: true,
  }));
  app.use(express.json());

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/config", configRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/contracts", contractRoutes);
  app.use("/api/conventions", conventionRoutes);
  app.use("/api/calendars", calendarRoutes);
  app.use("/api/regles", regleRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/cnss", cnssRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // Health check with secure diagnostics
  app.get("/api/health", async (_req, res) => {
    const diag: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      vercel: process.env.VERCEL === "1",
      dbUrlSet: !!process.env.DATABASE_URL,
      initMode,
      initError,
    };

    // Validate URL format without revealing value
    if (process.env.DATABASE_URL) {
      const url = process.env.DATABASE_URL;
      diag.dbUrlPrefix = url.startsWith("postgresql://") ? "postgresql://" : url.startsWith("postgres://") ? "postgres://" : "INVALID";
      diag.dbUrlLength = url.length;
      diag.dbUrlSslmode = url.includes("sslmode=");
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "connected", ...diag });
    } catch (err: any) {
      // Anonymize error — never expose connection string, host, or credentials
      const safeError = err?.code || err?.name || "Unknown";
      const safeMsg = err?.message
        ? err.message
            .replace(/postgresql:\/\/[^\s]+/g, "[REDACTED]")
            .replace(/postgres:\/\/[^\s]+/g, "[REDACTED]")
            .replace(/@[^/]+\//g, "@[REDACTED]/")
        : "No message";
      res.status(503).json({
        status: "error",
        database: "disconnected",
        error: safeError,
        message: safeMsg.slice(0, 500),
        ...diag,
        initLog: initLog.slice(-10), // Last 10 init log entries
      });
    }
  });

  // Catch-all for undefined API routes
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Route non trouvée" });
  });

  return app;
}

const app = createApp();

// ---------------------------------------------------------------------------
// Static files & SPA fallback (local only — Vercel sert le static lui-même)
// ---------------------------------------------------------------------------
let server: ReturnType<typeof createServer> | null = null;

if (process.env.VERCEL !== "1") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // SPA fallback — serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    if (_req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Route non trouvée" });
    }
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const PORT = process.env.PORT || 3001;
  server = createServer(app);
  server.listen(PORT, () => {
    console.log(`🚀 Le Fiduciaire API — http://localhost:${PORT}/`);
    console.log(`   Auth:        /api/auth/*`);
    console.log(`   Config:      /api/config/*`);
    console.log(`   Clients:     /api/clients/*`);
    console.log(`   Contrats:    /api/contracts/*`);
    console.log(`   Conventions: /api/conventions/*`);
    console.log(`   Calendriers: /api/calendars/*`);
    console.log(`   Règles:      /api/regles/*`);
    console.log(`   Pointage:    /api/attendance/*`);
    console.log(`   Paie:        /api/payroll/*`);
    console.log(`   Documents:   /api/documents/*`);
    console.log(`   CNSS:        /api/cnss/*`);
    console.log(`   Rapports:    /api/reports/*`);
    console.log(`   Dashboard:   /api/dashboard/*`);
    console.log(`   Health:      /api/health`);
  });
}

export { app, server };
