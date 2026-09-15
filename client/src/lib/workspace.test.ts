// =============================================================================
// Tests — lib/workspace.ts (résolution du workspace actif)
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";

// vitest tourne en environnement "node" : localStorage n'existe pas.
// Mock minimal, assigné avant l'exécution des tests (le module ne lit
// localStorage qu'à l'intérieur de ses fonctions, jamais au chargement).
class LocalStorageMock {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}
(globalThis as unknown as { localStorage: Storage }).localStorage = new LocalStorageMock();

import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  getWorkspaceId,
  syncActiveWorkspaceId,
} from "@/lib/workspace";

const USER_MULTI = {
  workspaces: [
    { id: "ws-cabinet", name: "Cabinet Principal", role: "PROPRIETAIRE" },
    { id: "ws-client-b", name: "Client B", role: "GESTIONNAIRE" },
  ],
};

const USER_SINGLE = {
  workspaces: [{ id: "ws-seul", name: "Entreprise A", role: "PROPRIETAIRE" }],
};

beforeEach(() => {
  localStorage.clear();
});

describe("getActiveWorkspaceId / setActiveWorkspaceId", () => {
  it("retourne null quand rien n'est stocké", () => {
    expect(getActiveWorkspaceId()).toBeNull();
  });

  it("écrit puis relit l'ID stocké", () => {
    setActiveWorkspaceId("ws-x");
    expect(getActiveWorkspaceId()).toBe("ws-x");
  });
});

describe("getWorkspaceId", () => {
  it("sans utilisateur et sans stockage → null", () => {
    expect(getWorkspaceId(undefined)).toBeNull();
    expect(getWorkspaceId(null)).toBeNull();
  });

  it("sans utilisateur mais avec stockage → la valeur stockée", () => {
    setActiveWorkspaceId("ws-stocke");
    expect(getWorkspaceId(undefined)).toBe("ws-stocke");
  });

  it("utilisateur sans propriété workspaces → fallback sur le stockage", () => {
    setActiveWorkspaceId("ws-stocke");
    expect(getWorkspaceId({} as { workspaces?: { id: string }[] })).toBe("ws-stocke");
  });

  it("utilisateur multi-workspaces sans stockage → premier workspace", () => {
    expect(getWorkspaceId(USER_MULTI)).toBe("ws-cabinet");
  });

  it("utilisateur mono-workspace → son unique workspace", () => {
    expect(getWorkspaceId(USER_SINGLE)).toBe("ws-seul");
  });

  it("ID stocké valide → respecté (choix du sélecteur)", () => {
    setActiveWorkspaceId("ws-client-b");
    expect(getWorkspaceId(USER_MULTI)).toBe("ws-client-b");
  });

  it("ID stocké périmé (workspace quitté) → premier workspace", () => {
    setActiveWorkspaceId("ws-supprime");
    expect(getWorkspaceId(USER_MULTI)).toBe("ws-cabinet");
  });

  it("utilisateur avec zéro workspace → null", () => {
    expect(getWorkspaceId({ workspaces: [] })).toBeNull();
  });
});

describe("syncActiveWorkspaceId", () => {
  it("stockage absent → écrit le premier workspace", () => {
    syncActiveWorkspaceId(USER_MULTI);
    expect(getActiveWorkspaceId()).toBe("ws-cabinet");
  });

  it("choix stocké valide → préservé", () => {
    setActiveWorkspaceId("ws-client-b");
    syncActiveWorkspaceId(USER_MULTI);
    expect(getActiveWorkspaceId()).toBe("ws-client-b");
  });

  it("choix stocké périmé → remplacé par le premier workspace", () => {
    setActiveWorkspaceId("ws-supprime");
    syncActiveWorkspaceId(USER_MULTI);
    expect(getActiveWorkspaceId()).toBe("ws-cabinet");
  });

  it("utilisateur sans workspace → ne réécrit rien", () => {
    setActiveWorkspaceId("ws-ancien");
    syncActiveWorkspaceId({ workspaces: [] });
    expect(getActiveWorkspaceId()).toBe("ws-ancien");
  });
});
