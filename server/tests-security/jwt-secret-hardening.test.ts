// =============================================================================
// Lot 8-0.3 — Test du durcissement JWT_SECRET en production
// =============================================================================
// Teste directement la fonction exportée resolveJwtSecret() qui est partagée
// par server/lib/jwt.ts et server/lib/auth.ts. Garantit que le fallback
// "dev-secret" ne peut JAMAIS fuiter en production.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveJwtSecret } from "../lib/jwt.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.JWT_SECRET;
  delete process.env.NODE_ENV;
  delete process.env.VERCEL;
});

afterEach(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    process.env[k] = v;
  }
});

describe("Lot 8-0.3 — JWT_SECRET durcissement production", () => {
  it("AUTH-PROD-1: throw si JWT_SECRET manquant en production (NODE_ENV)", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;

    expect(() => resolveJwtSecret()).toThrow(/FATAL: JWT_SECRET est requis en production/);
  });

  it("AUTH-PROD-2: throw si JWT_SECRET manquant en production (VERCEL=1)", () => {
    delete process.env.NODE_ENV;
    process.env.VERCEL = "1";
    delete process.env.JWT_SECRET;

    expect(() => resolveJwtSecret()).toThrow(/FATAL: JWT_SECRET est requis en production/);
  });

  it("AUTH-PROD-3: throw si JWT_SECRET < 32 chars en production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "short-secret-only-20-chars"; // 26 chars

    expect(() => resolveJwtSecret()).toThrow(/minimum requis en production est 32/);
  });

  it("AUTH-PROD-4: accepte un JWT_SECRET exactement 32 chars en production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "x".repeat(32); // 32 chars — exactement la limite

    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("x".repeat(32));
  });

  it("AUTH-PROD-5: accepte un JWT_SECRET de 64 chars en production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "y".repeat(64);

    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("y".repeat(64));
  });

  it("AUTH-DEV-1: utilise le fallback en dev (pas de throw si JWT_SECRET manquant)", () => {
    delete process.env.NODE_ENV;
    delete process.env.VERCEL;
    delete process.env.JWT_SECRET;

    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("fiduciaire-dev-secret-changez-moi");
  });

  it("AUTH-DEV-2: respecte JWT_SECRET explicite en dev", () => {
    delete process.env.NODE_ENV;
    delete process.env.VERCEL;
    process.env.JWT_SECRET = "custom-dev-secret-32-chars-test";

    expect(resolveJwtSecret()).toBe("custom-dev-secret-32-chars-test");
  });

  it("AUTH-DEV-3: en test (NODE_ENV=test), fallback autorisé même si < 32 chars", () => {
    process.env.NODE_ENV = "test";
    delete process.env.VERCEL;
    process.env.JWT_SECRET = "short"; // 5 chars — interdit en prod mais OK en test

    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("short");
  });
});
