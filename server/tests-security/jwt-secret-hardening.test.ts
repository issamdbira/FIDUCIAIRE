// =============================================================================
// Lot 8-0.3 — Test du durcissement JWT_SECRET en production
// =============================================================================
// Teste directement la fonction exportée resolveJwtSecret() qui est partagée
// par server/lib/jwt.ts et server/lib/auth.ts. Garantit que le fallback
// "dev-secret" ne peut JAMAIS fuiter en production.
//
// Lot 8 (fix) : le seuil FATAL est passé de 32 à 16 chars. Un secret entre
// 16 et 31 chars génère un WARNING (console.warn) mais ne crash pas.
// Cela permet à la prod avec un JWT_SECRET de 31 chars de continuer à
// fonctionner tout en alerant l'utilisateur.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  it("AUTH-PROD-3: throw si JWT_SECRET < 16 chars (minimum absolu) en production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "short15chars!!!"; // 15 chars — en dessous du minimum absolu

    expect(() => resolveJwtSecret()).toThrow(/minimum absolu est 16/);
  });

  it("AUTH-PROD-4: accepte un JWT_SECRET de 16 chars (minimum absolu) en production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "x".repeat(16); // 16 chars — minimum absolu

    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("x".repeat(16));
  });

  it("AUTH-PROD-5: accepte un JWT_SECRET de 31 chars (cas réel prod) avec WARNING", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "z".repeat(31); // 31 chars — cas réel en prod

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("z".repeat(31));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("WARNING: JWT_SECRET fait 31 caractères")
    );
    warnSpy.mockRestore();
  });

  it("AUTH-PROD-6: accepte un JWT_SECRET de 32 chars (recommandation) sans WARNING", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "y".repeat(32); // 32 chars — recommandation

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("y".repeat(32));
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("AUTH-PROD-7: accepte un JWT_SECRET de 64 chars en production", () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "a".repeat(64);

    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("a".repeat(64));
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

  it("AUTH-DEV-3: en test (NODE_ENV=test), fallback autorisé même si < 16 chars", () => {
    process.env.NODE_ENV = "test";
    delete process.env.VERCEL;
    process.env.JWT_SECRET = "short"; // 5 chars — interdit en prod mais OK en test

    expect(() => resolveJwtSecret()).not.toThrow();
    expect(resolveJwtSecret()).toBe("short");
  });
});
