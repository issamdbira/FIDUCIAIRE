// =============================================================================
// Tests de sécurité — Lot 2 : en-têtes HTTP (CSP/HSTS/nosniff/frame/referrer)
// =============================================================================
// Critères d'acceptation :
//   - toutes les réponses API portent les 6 en-têtes de sécurité ;
//   - CSP : script-src STRICT 'self' (aucun 'unsafe-inline' — aucun script
//     inline dans le build prod depuis le Lot 2) ;
//   - VITE_ANALYTICS_ENDPOINT (https valide) est ajouté à script-src ET
//     connect-src ; une valeur invalide (http, vide) est ignorée ;
//   - la construction CSP est identique côté build (vercel-build.mjs lit la
//     même variable) — vérifiée par test de cohérence sur les directives.
// =============================================================================
process.env.VERCEL = "1";
process.env.JWT_SECRET = "secret-de-test-fiduciaire";

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma.js", async () => {
  const { creerFakeLoginAttempts } = await import("./helpers/fake-login-attempts.js");
  const mock = {
    session: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    users: { findUnique: vi.fn(), findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    login_attempts: creerFakeLoginAttempts(), // Lot 3 — limiteur persisté en base
  };
  return {
    default: mock,
    prisma: mock,
    initLog: [],
    initMode: "none",
    initError: null,
  };
});

import { createApp } from "../index.js";
import request from "supertest";

const app = createApp();

describe("Lot 2 — en-têtes de sécurité sur les réponses API", () => {
  it("chaque réponse API porte les 6 en-têtes de durcissement", async () => {
    const r = await request(app).post("/api/auth/login").send({ email: "x@t.tn", password: "y" });
    // 401 (identifiants invalides) — l'essentiel est la présence des en-têtes
    expect([401, 429]).toContain(r.status);

    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-frame-options"]).toBe("DENY");
    expect(r.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(r.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(r.headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains; preload" // Lot 3 — directive preload
    );

    const csp = r.headers["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("CSP stricte : script-src 'self' SANS 'unsafe-inline' (scripts)", async () => {
    const r = await request(app).post("/api/auth/login").send({ email: "x@t.tn", password: "y" });
    const csp = r.headers["content-security-policy"] as string;
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src"))!;
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("unsafe-inline");
  });

  it("style-src tolère unsafe-inline (librairies injectant des <style>) + polices Google", async () => {
    const r = await request(app).post("/api/auth/login").send({ email: "x@t.tn", password: "y" });
    const csp = r.headers["content-security-policy"] as string;
    const styleSrc = csp.split(";").find((d) => d.trim().startsWith("style-src"))!;
    expect(styleSrc).toContain("'unsafe-inline'");
    expect(styleSrc).toContain("https://fonts.googleapis.com");
    const fontSrc = csp.split(";").find((d) => d.trim().startsWith("font-src"))!;
    expect(fontSrc).toContain("https://fonts.gstatic.com");
  });
});

describe("Lot 2 — construireCsp() selon l'environnement", () => {
  async function cspFraiche(): Promise<string> {
    vi.resetModules();
    const mod = await import("../lib/security-headers.js");
    return mod.construireCsp();
  }

  it("sans analytics : script-src et connect-src limités à 'self'", async () => {
    delete process.env.VITE_ANALYTICS_ENDPOINT;
    const csp = await cspFraiche();
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self'");
  });

  it("analytics https valide : origine ajoutée à script-src ET connect-src", async () => {
    process.env.VITE_ANALYTICS_ENDPOINT = "https://stats.exemple.tn";
    const csp = await cspFraiche();
    expect(csp).toContain("script-src 'self' https://stats.exemple.tn");
    expect(csp).toContain("connect-src 'self' https://stats.exemple.tn");
  });

  it("analytics invalide (http non sécurisé) : ignorée, CSP inchangée", async () => {
    process.env.VITE_ANALYTICS_ENDPOINT = "http://pas-securise.tn";
    const csp = await cspFraiche();
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("pas-securise");
  });

  it("analytics avec slash final : normalisée", async () => {
    process.env.VITE_ANALYTICS_ENDPOINT = "https://stats.exemple.tn/";
    const csp = await cspFraiche();
    expect(csp).toContain("https://stats.exemple.tn");
    expect(csp).not.toContain("stats.exemple.tn/");
  });
});
