// =============================================================================
// Le Fiduciaire — API Server (Phase 9)
// Express + Prisma + JWT Auth + CORS + Clients + Contrats + Refs + Paie + Docs + CNSS + Reports + Dashboard
// =============================================================================

import "dotenv/config";
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
import prisma from "./lib/prisma.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
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

// Health check
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

// ---------------------------------------------------------------------------
// Static files (production)
// ---------------------------------------------------------------------------
const staticPath =
  process.env.NODE_ENV === "production"
    ? path.resolve(__dirname, "public")
    : path.resolve(__dirname, "..", "dist", "public");

app.use(express.static(staticPath));

// SPA fallback — serve index.html for all non-API routes
app.get("*", (_req, res) => {
  // Ne pas servir index.html pour les routes API
  if (_req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Route non trouvée" });
  }
  res.sendFile(path.join(staticPath, "index.html"));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;

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

export { app, server };
