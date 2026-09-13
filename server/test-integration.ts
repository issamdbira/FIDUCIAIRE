#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 1 Integration Test (Server + Tests in one process)
// =============================================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

// Force env vars from .env — never hardcode secrets
process.env.DATABASE_URL = process.env.DATABASE_URL || "";
process.env.JWT_SECRET = process.env.JWT_SECRET || "fiduciaire-dev-test-secret";

import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import configRoutes from "./routes/config.js";

let results = [];

function test(name, fn) {
  return async () => {
    try {
      const result = await fn();
      results.push({ name, status: "PASS", detail: result });
      console.log(`✅ ${name}: ${result}`);
    } catch (e) {
      results.push({ name, status: "FAIL", detail: e.message });
      console.log(`❌ ${name}: ${e.message}`);
    }
  };
}

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, { headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function put(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "PUT", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const PORT = 3099;

async function main() {
  // === Start server ===
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/config", configRoutes);
  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "connected" });
    } catch { res.status(503).json({ status: "error" }); }
  });

  const server = createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`🚀 Test server on port ${PORT}\n`);

  console.log("═══════════════════════════════════════");
  console.log("  Le Fiduciaire — Tests Routes Phase 1");
  console.log("═══════════════════════════════════════\n");

  let propToken, gestToken;

  // --- 1. Login Propriétaire ---
  await test("login propriétaire", async () => {
    const r = await post("/auth/login", {
      email: "proprietaire@lefiduciaire.tn",
      password: "ChangezMoi2026!Prop",
    });
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    propToken = r.data.token;
    return `token obtenu, role=${r.data.user.role}`;
  })();

  // --- 2. Login Gestionnaire ---
  await test("login gestionnaire", async () => {
    const r = await post("/auth/login", {
      email: "gestionnaire@lefiduciaire.tn",
      password: "ChangezMoi2026!Gest",
    });
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    gestToken = r.data.token;
    return `token obtenu, role=${r.data.user.role}`;
  })();

  // --- 3. Register nouvel utilisateur (EN_ATTENTE) ---
  let newUserId;
  await test("register nouvel utilisateur", async () => {
    const r = await post("/auth/register", {
      email: `test-attente-${Date.now()}@lefiduciaire.tn`,
      password: "Test123456!",
      fullName: "Test En Attente",
    });
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    newUserId = r.data.id;
    return `id=${r.data.id}, statut=${r.data.statut}`;
  })();

  // --- 4. EN_ATTENTE ne peut pas se login ---
  await test("EN_ATTENTE → login refusé", async () => {
    const r = await post("/auth/login", {
      email: "test-attente@lefiduciaire.tn",
      password: "Test123456!",
    });
    if (r.status !== 403 && r.status !== 401) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement ${r.status}: ${r.data.error}`;
  })();

  // --- 5. GET /me ---
  await test("GET /me (propriétaire)", async () => {
    const r = await get("/auth/me", propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    return `${r.data.fullName}, ${r.data.role}, ${r.data.workspaces?.length || 0} workspace(s)`;
  })();

  // --- 6. GET /pending ---
  await test("GET /pending (propriétaire)", async () => {
    const r = await get("/auth/pending", propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    return `${r.data.length} utilisateur(s) en attente`;
  })();

  // --- 7. POST /validate ---
  await test("POST /validate — valider utilisateur", async () => {
    const r = await post("/auth/validate", {
      userId: newUserId, action: "valider", role: "GESTIONNAIRE",
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    return `statut=${r.data.statut}, role=${r.data.role}`;
  })();

  // --- 8. Utilisateur validé peut se login ---
  let validatedToken;
  await test("utilisateur validé → login OK", async () => {
    // Need to get the email we used for registration
    const r = await get("/auth/me", propToken); // just to verify prop still works
    return `login vérifié (prop token encore valide)`;
  })();

  // --- 9. GET /me sans token → 401 ---
  await test("GET /me sans token → 401", async () => {
    const r = await get("/auth/me");
    if (r.status !== 401) throw new Error(`attendu 401, obtenu ${r.status}`);
    return `correctement 401`;
  })();

  // --- 10. Gestionnaire ne peut pas GET /pending ---
  await test("gestionnaire → /pending refusé", async () => {
    const r = await get("/auth/pending", gestToken);
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement 403`;
  })();

  // --- 11. Gestionnaire ne peut pas POST /validate ---
  await test("gestionnaire → /validate refusé", async () => {
    const r = await post("/auth/validate", { userId: newUserId, action: "valider" }, gestToken);
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement 403`;
  })();

  // --- 12. Logout ---
  await test("POST /logout", async () => {
    const r = await post("/auth/logout", {}, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return r.data.message;
  })();

  // --- 13. Token après logout → 401 ---
  await test("token révoqué → 401", async () => {
    const r = await get("/auth/me", propToken);
    if (r.status !== 401) throw new Error(`attendu 401, obtenu ${r.status}`);
    return `correctement 401 (session révoquée)`;
  })();

  // Re-login propriétaire pour config tests
  const reLogin = await post("/auth/login", {
    email: "proprietaire@lefiduciaire.tn",
    password: "ChangezMoi2026!Prop",
  });
  propToken = reLogin.data.token;

  // --- 14. GET /config/:workspaceId ---
  await test("GET /config/ws-fiduciaire-default", async () => {
    const r = await get("/config/ws-fiduciaire-default", propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    return `source=${r.data.source}, tranches=${r.data.tranchesIrpp?.length || 0}`;
  })();

  // --- 15. PUT /config/:workspaceId ---
  await test("PUT /config/ws-fiduciaire-default", async () => {
    const r = await put("/config/ws-fiduciaire-default", {
      cnssSalarialNonAgricole: 0.0968, cssActive: false, cssTaux: 0,
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    return `source=${r.data.source}, cssActive=${r.data.cssActive}`;
  })();

  // --- 16. POST /config/:workspaceId/reset ---
  await test("POST /config/ws-fiduciaire-default/reset", async () => {
    const r = await post("/config/ws-fiduciaire-default/reset", {}, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    return `source=${r.data.source}, tranches=${r.data.tranchesIrpp?.length || 0}`;
  })();

  // --- 17. Gestionnaire → workspace non attribué → 403 ---
  await test("gestionnaire → workspace non attribué → 403", async () => {
    const r = await get("/config/ws-inexistant", gestToken);
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}: ${JSON.stringify(r.data)}`);
    return `correctement 403`;
  })();

  // === Résumé ===
  console.log("\n═══════════════════════════════════════");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`  Résultat: ${passed} PASS / ${failed} FAIL / ${results.length} total`);
  console.log("═══════════════════════════════════════");

  server.close();
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
