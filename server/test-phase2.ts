#!/usr/bin/env node
// =============================================================================
// Le Fiduciaire — Phase 2 Integration Test (Clients & Établissements)
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
import clientRoutes from "./routes/clients.js";
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

async function patch(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
    method: "PATCH", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const PORT = 3098;
const WS = "ws-fiduciaire-default";

async function main() {
  // === Start server ===
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/config", configRoutes);
  app.get("/api/health", async (_req, res) => {
    try { await prisma.$queryRaw`SELECT 1`; res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "error" }); }
  });

  const server = createServer(app);
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`🚀 Test server on port ${PORT}\n`);

  console.log("═══════════════════════════════════════════════════");
  console.log("  Le Fiduciaire — Tests Phase 2 : Clients & Étab.");
  console.log("═══════════════════════════════════════════════════\n");

  // --- Login propriétaire ---
  let propToken;
  await test("login propriétaire", async () => {
    const r = await post("/auth/login", {
      email: "proprietaire@lefiduciaire.tn",
      password: "ChangezMoi2026!Prop",
    });
    if (r.status !== 200) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    propToken = r.data.token;
    return `token obtenu`;
  })();

  // --- Login gestionnaire ---
  let gestToken;
  await test("login gestionnaire", async () => {
    const r = await post("/auth/login", {
      email: "gestionnaire@lefiduciaire.tn",
      password: "ChangezMoi2026!Gest",
    });
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    gestToken = r.data.token;
    return `token obtenu`;
  })();

  // ====== CLIENTS CRUD ======

  // --- 1. POST /api/clients — Créer entreprise + établissement principal ---
  let companyId, establishmentId;
  await test("POST /clients — créer entreprise", async () => {
    const r = await post("/clients", {
      workspaceId: WS,
      raisonSociale: "Société Tunisienne de Construction SARL",
      matriculeFiscal: "MF-123456789",
      matriculeCnss: "CNSS-987654",
      secteur: "INDUSTRIEL",
      adresse: "12 Rue Hédi Nouira",
      ville: "Tunis",
      gouvernorat: "Tunis",
      contactNom: "Ahmed Ben Ali",
      contactTelephone: "+216 71 234 567",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    companyId = r.data.company.id;
    establishmentId = r.data.establishment.id;
    return `company=${r.data.company.raisonSociale}, estPrincipal=${r.data.establishment.isPrincipal}`;
  })();

  // --- 2. GET /api/clients/:ws — Lister entreprises ---
  await test("GET /clients/:ws — lister", async () => {
    const r = await get(`/clients/${WS}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.length} entreprise(s), première=${r.data[0]?.raisonSociale}`;
  })();

  // --- 3. GET /api/clients/:ws/:id — Détail entreprise ---
  await test("GET /clients/:ws/:id — détail", async () => {
    const r = await get(`/clients/${WS}/${companyId}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `${r.data.raisonSociale}, ${r.data.establishments.length} établissement(s), ${r.data.employees.length} employé(s)`;
  })();

  // --- 4. PUT /api/clients/:ws/:id — Mettre à jour ---
  await test("PUT /clients/:ws/:id — modifier", async () => {
    const r = await put(`/clients/${WS}/${companyId}`, {
      contactTelephone: "+216 71 999 888",
      ville: "Ariana",
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `ville=${r.data.ville}, tel=${r.data.contactTelephone}`;
  })();

  // --- 5. PATCH archive ---
  await test("PATCH /clients/:ws/:id/archive", async () => {
    const r = await patch(`/clients/${WS}/${companyId}/archive`, {}, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `statut=${r.data.statut}, archivedAt=${r.data.archivedAt ? 'set' : 'null'}`;
  })();

  // --- 6. PATCH activate (réactivation) ---
  await test("PATCH /clients/:ws/:id/activate", async () => {
    const r = await patch(`/clients/${WS}/${companyId}/activate`, {}, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `statut=${r.data.statut}`;
  })();

  // ====== ÉTABLISSEMENTS ======

  // --- 7. POST établissement secondaire ---
  let est2Id;
  await test("POST /clients/:ws/:id/establishments — ajout établissement", async () => {
    const r = await post(`/clients/${WS}/${companyId}/establishments`, {
      designation: "Usine Bizerte",
      adresse: "Zone Industrielle",
      ville: "Bizerte",
      matriculeCnss: "CNSS-BIZ-001",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}: ${JSON.stringify(r.data)}`);
    est2Id = r.data.id;
    return `designation=${r.data.designation}, isPrincipal=${r.data.isPrincipal}`;
  })();

  // --- 8. Promouvoir le second établissement comme principal ---
  await test("PUT establishments/:estId — promouvoir principal", async () => {
    const r = await put(`/clients/${WS}/${companyId}/establishments/${est2Id}`, {
      isPrincipal: true,
    }, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    return `isPrincipal=${r.data.isPrincipal}`;
  })();

  // --- 9. Vérifier que l'ancien principal n'est plus principal ---
  await test("vérifier unicité isPrincipal", async () => {
    const r = await get(`/clients/${WS}/${companyId}`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const principals = r.data.establishments.filter(e => e.isPrincipal);
    if (principals.length !== 1) throw new Error(`${principals.length} établissements principaux (attendu 1)`);
    return `1 établissement principal: ${principals[0].designation}`;
  })();

  // ====== SÉCURITÉ ======

  // --- 10. Gestionnaire ne peut pas créer dans un workspace non attribué ---
  await test("gestionnaire → workspace non attribué → 403", async () => {
    const r = await post("/clients", {
      workspaceId: "ws-inexistant",
      raisonSociale: "Test Interdit",
    }, gestToken);
    if (r.status !== 403) throw new Error(`attendu 403, obtenu ${r.status}`);
    return `correctement 403`;
  })();

  // --- 11. Sans token → 401 ---
  await test("sans token → 401", async () => {
    const r = await get(`/clients/${WS}`);
    if (r.status !== 401) throw new Error(`attendu 401, obtenu ${r.status}`);
    return `correctement 401`;
  })();

  // --- 12. Filtrer par statut ---
  await test("GET /clients/:ws?statut=ACTIVE", async () => {
    const r = await get(`/clients/${WS}?statut=ACTIVE`, propToken);
    if (r.status !== 200) throw new Error(`status ${r.status}`);
    const allActive = r.data.every(c => c.statut === "ACTIVE");
    if (!allActive) throw new Error("certains ne sont pas ACTIVE");
    return `${r.data.length} entreprises actives`;
  })();

  // --- 13. Créer une 2ème entreprise pour tester la liste ---
  await test("POST /clients — 2ème entreprise", async () => {
    const r = await post("/clients", {
      workspaceId: WS,
      raisonSociale: "Café El Horr SA",
      matriculeFiscal: "MF-CAF-001",
      secteur: "COMMERCIAL",
      ville: "Sousse",
    }, propToken);
    if (r.status !== 201) throw new Error(`status ${r.status}`);
    return `${r.data.company.raisonSociale}`;
  })();

  // === Résumé ===
  console.log("\n═══════════════════════════════════════════════════");
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`  Résultat: ${passed} PASS / ${failed} FAIL / ${results.length} total`);
  console.log("═══════════════════════════════════════════════════");

  server.close();
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
