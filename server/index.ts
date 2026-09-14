import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Create Express app (réutilisable en local ET en serverless Vercel)
// ---------------------------------------------------------------------------

export function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }));
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
if (process.env.VERCEL !== "1") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    if (_req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Route non trouvée" });
    }
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  createServer(app).listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

export { app };
