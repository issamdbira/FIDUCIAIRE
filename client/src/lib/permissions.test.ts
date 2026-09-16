// =============================================================================
// Tests de la matrice de permissions frontend (miroir du backend)
// =============================================================================

import { describe, it, expect } from "vitest";
import { can, roleInWorkspace } from "./permissions";

describe("Matrice — PROPRIETAIRE", () => {
  it("a tous les droits", () => {
    const perms = ["read", "write", "writePayroll", "closePeriod", "generateCnss", "submitCnss", "archive", "configRead", "configWrite", "manageMembers", "audit", "cabinetDashboard"] as const;
    for (const p of perms) {
      expect(can("PROPRIETAIRE", p)).toBe(true);
    }
  });
});

describe("Matrice — GESTIONNAIRE", () => {
  it("fait tout le métier mais pas les actes engageants", () => {
    expect(can("GESTIONNAIRE", "read")).toBe(true);
    expect(can("GESTIONNAIRE", "write")).toBe(true);
    expect(can("GESTIONNAIRE", "writePayroll")).toBe(true);      // valider paie
    expect(can("GESTIONNAIRE", "generateCnss")).toBe(true);      // générer CNSS
    expect(can("GESTIONNAIRE", "configRead")).toBe(true);
    // Interdits
    expect(can("GESTIONNAIRE", "closePeriod")).toBe(false);      // clôturer
    expect(can("GESTIONNAIRE", "submitCnss")).toBe(false);       // valider/transmettre CNSS
    expect(can("GESTIONNAIRE", "archive")).toBe(false);          // archiver
    expect(can("GESTIONNAIRE", "configWrite")).toBe(false);      // config
    expect(can("GESTIONNAIRE", "manageMembers")).toBe(false);    // membres
    expect(can("GESTIONNAIRE", "audit")).toBe(false);            // journal
    expect(can("GESTIONNAIRE", "cabinetDashboard")).toBe(false); // dashboard cabinet
  });
});

describe("Matrice — LECTEUR (lecture seule stricte)", () => {
  it("ne peut que consulter", () => {
    expect(can("LECTEUR", "read")).toBe(true);
    expect(can("LECTEUR", "configRead")).toBe(true);
    const interdits = ["write", "writePayroll", "closePeriod", "generateCnss", "submitCnss", "archive", "configWrite", "manageMembers", "audit", "cabinetDashboard"] as const;
    for (const p of interdits) {
      expect(can("LECTEUR", p)).toBe(false);
    }
  });
});

describe("Valeurs inattendues", () => {
  it("rôle null/undefined/inconnu → tout refusé (fail-closed)", () => {
    expect(can(null, "read")).toBe(false);
    expect(can(undefined, "read")).toBe(false);
    expect(can("CLIENT_VIEWER", "read")).toBe(false); // valeur résiduelle rejetée
    expect(can("ADMIN", "write")).toBe(false);
  });
});

describe("roleInWorkspace — rôle du workspace actif", () => {
  const user = {
    workspaces: [
      { id: "ws-a", role: "PROPRIETAIRE" },
      { id: "ws-b", role: "LECTEUR" },
    ],
  };

  it("retourne le rôle du workspace demandé (et pas le rôle global)", () => {
    expect(roleInWorkspace(user, "ws-a")).toBe("PROPRIETAIRE");
    expect(roleInWorkspace(user, "ws-b")).toBe("LECTEUR");
  });
  it("retourne null pour un workspace non membre ou sans workspace", () => {
    expect(roleInWorkspace(user, "ws-c")).toBeNull();
    expect(roleInWorkspace(user, null)).toBeNull();
    expect(roleInWorkspace(null, "ws-a")).toBeNull();
    expect(roleInWorkspace({ workspaces: undefined }, "ws-a")).toBeNull();
  });
  it("le même utilisateur est P sur A et L sur B — les droits suivent le ws actif", () => {
    expect(can(roleInWorkspace(user, "ws-a"), "write")).toBe(true);
    expect(can(roleInWorkspace(user, "ws-b"), "write")).toBe(false);
  });
});
