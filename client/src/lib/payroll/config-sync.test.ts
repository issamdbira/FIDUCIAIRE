// =============================================================================
// Tests — Lot 5 : synchronisation de la config paie client ↔ serveur
// =============================================================================
// Critères d'acceptation :
//   - remoteVersLocale : mapping complet, repli sûr champ par champ sur les
//     valeurs par défaut, barème IRPP mappé (vide → défaut) ;
//   - synchroniserConfigAvecServeur : anonyme/sans workspace → aucun appel ;
//     utilisateur + workspace actif → GET /config/:ws + copie locale posée ;
//     échec API → silencieux, copie locale inchangée.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() },
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceId: vi.fn(() => null),
}));

import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/workspace";
import { CONFIG_PAR_DEFAUT, getPayrollConfig, __reinitialiserPourTests } from "./config";
import { remoteVersLocale, synchroniserConfigAvecServeur } from "./config-sync";
import type { AuthUser } from "@/lib/api";

const apiMock = api as unknown as { get: ReturnType<typeof vi.fn> };
const getWorkspaceIdMock = getWorkspaceId as unknown as ReturnType<typeof vi.fn>;

// Environnement « node » : stub in-memory de localStorage (même contrat).
// config.ts n'écrit/lit le localStorage que si `window` existe → on expose
// globalThis comme window.
const stockage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => stockage.get(k) ?? null,
  setItem: (k: string, v: string) => stockage.set(k, v),
  removeItem: (k: string) => stockage.delete(k),
  clear: () => stockage.clear(),
};
(globalThis as Record<string, unknown>).window = globalThis;

const UTILISATEUR = {
  id: "u1",
  email: "membre@fiduciaire.tn",
  role: "GESTIONNAIRE",
  workspaces: [{ id: "ws-1", name: "Fiduciaire Principale", role: "GESTIONNAIRE" }],
} as unknown as AuthUser;

beforeEach(() => {
  vi.clearAllMocks();
  stockage.clear();
  __reinitialiserPourTests(); // cache mémoire de config.ts isolé entre cas
});

describe("Lot 5 — remoteVersLocale", () => {
  it("mappe la réponse serveur vers la config du moteur", () => {
    const c = remoteVersLocale({
      cnssSalarialNonAgricole: 0.1111,
      tranchesIrpp: [
        { min: 0, max: 5000, taux: 0 },
        { min: 5000, max: null, taux: 0.35 },
      ],
    });
    expect(c.cnssSalarialNonAgricole).toBe(0.1111);
    expect(c.baremeIRPP).toEqual([
      { min: 0, max: 5000, taux: 0 },
      { min: 5000, max: null, taux: 0.35 },
    ]);
  });

  it("repli sûr : champs absents → valeurs par défaut, barème vide → défaut", () => {
    const c = remoteVersLocale({});
    expect(c).toEqual(CONFIG_PAR_DEFAUT);
    const c2 = remoteVersLocale({ tranchesIrpp: [] });
    expect(c2.baremeIRPP).toEqual(CONFIG_PAR_DEFAUT.baremeIRPP);
  });
});

describe("Lot 5 — synchroniserConfigAvecServeur", () => {
  it("anonyme / sans workspace : aucun appel réseau", async () => {
    getWorkspaceIdMock.mockReturnValue(null);
    expect(await synchroniserConfigAvecServeur(null)).toBe(false);
    expect(await synchroniserConfigAvecServeur(UTILISATEUR)).toBe(false);
    expect(apiMock.get).not.toHaveBeenCalled();
  });

  it("workspace actif : GET /config/:ws puis copie locale posée", async () => {
    getWorkspaceIdMock.mockReturnValue("ws-1");
    apiMock.get.mockResolvedValue({ cnssSalarialNonAgricole: 0.1234 });

    const ok = await synchroniserConfigAvecServeur(UTILISATEUR);

    expect(ok).toBe(true);
    expect(apiMock.get).toHaveBeenCalledWith("/config/ws-1");
    expect(getPayrollConfig().cnssSalarialNonAgricole).toBe(0.1234);
    // Le reste retombe sur les valeurs par défaut (repli champ par champ)
    expect(getPayrollConfig().cnssPatronalNonAgricole).toBe(CONFIG_PAR_DEFAUT.cnssPatronalNonAgricole);
    // Copie persistée pour les prochaines visites
    expect(localStorage.getItem("fiduciaire_payroll_config")).toContain("0.1234");
  });

  it("échec API : silencieux, copie locale inchangée", async () => {
    getWorkspaceIdMock.mockReturnValue("ws-1");
    localStorage.setItem("fiduciaire_payroll_config", JSON.stringify({ ...CONFIG_PAR_DEFAUT, cssTaux: 0.42 }));

    apiMock.get.mockRejectedValue(new Error("réseau coupé"));
    expect(await synchroniserConfigAvecServeur(UTILISATEUR)).toBe(false);
    expect(getPayrollConfig().cssTaux).toBe(0.42); // copie locale conservée
  });
});
