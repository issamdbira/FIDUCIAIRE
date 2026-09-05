/**
 * Configuration centralisée du moteur de paie — panneau d'administration.
 *
 * Tous les taux/barèmes/déductions modifiables depuis /admin sont stockés ici.
 * Persistance : localStorage (traitement 100% local, cohérent avec le reste
 * du projet — pas de backend pour le MVP).
 *
 * RÈGLE : plus AUCUN taux/barème ne doit être codé en dur dans un composant
 * ou une fonction — tout doit passer par getPayrollConfig().
 */

export interface TrancheIRPPConfig {
  min: number;
  max: number | null; // null = infini
  taux: number;
}

export interface PayrollConfig {
  // --- CNSS ---
  cnssSalarialNonAgricole: number;
  cnssPatronalNonAgricole: number;
  cnssSalarialAgricole: number;
  cnssPatronalAgricole: number;

  // --- CSS (Contribution Sociale de Solidarité) ---
  cssActive: boolean;
  cssTaux: number;
  cssSeuilExonerationAnnuel: number;

  // --- IRPP ---
  baremeIRPP: TrancheIRPPConfig[];

  // --- Frais professionnels ---
  fraisProTauxActifs: number;
  fraisProPlafondActifsAnnuel: number;
  fraisProTauxRetraites: number; // progressif selon la loi de finances 2026 (30% 2027, 40% 2028, 50% 2029)

  // --- Déductions familiales (annuelles) ---
  deductionChefFamille: number;
  deductionEnfant: number;
  deductionEtudiant: number;
  plafondNombreEnfantsEtudiants: number;
  deductionInfirme: number;

  // --- Parents à charge (déclaration annuelle uniquement, pas à la source) ---
  parentsEnChargeActif: boolean;
  parentsEnChargeTaux: number;
  parentsEnChargePlafondParAnnuel: number;
}

export const CONFIG_PAR_DEFAUT: PayrollConfig = {
  cnssSalarialNonAgricole: 0.0968,
  cnssPatronalNonAgricole: 0.1707,
  cnssSalarialAgricole: 0.0699,
  cnssPatronalAgricole: 0.1248,

  cssActive: true,
  cssTaux: 0.005,
  cssSeuilExonerationAnnuel: 5000,

  baremeIRPP: [
    { min: 0, max: 5000, taux: 0 },
    { min: 5000, max: 10000, taux: 0.15 },
    { min: 10000, max: 20000, taux: 0.25 },
    { min: 20000, max: 30000, taux: 0.30 },
    { min: 30000, max: 40000, taux: 0.33 },
    { min: 40000, max: 50000, taux: 0.36 },
    { min: 50000, max: 70000, taux: 0.38 },
    { min: 70000, max: null, taux: 0.40 },
  ],

  fraisProTauxActifs: 0.10,
  fraisProPlafondActifsAnnuel: 2000,
  fraisProTauxRetraites: 0.25,

  deductionChefFamille: 300,
  deductionEnfant: 100,
  deductionEtudiant: 1000,
  plafondNombreEnfantsEtudiants: 4,
  deductionInfirme: 2000,

  parentsEnChargeActif: false, // hors périmètre retenue mensuelle à la source
  parentsEnChargeTaux: 0.05,
  parentsEnChargePlafondParAnnuel: 450,
};

const STORAGE_KEY = "fiduciaire_payroll_config";

let configEnMemoire: PayrollConfig | null = null;

export function getPayrollConfig(): PayrollConfig {
  if (configEnMemoire) return configEnMemoire;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      configEnMemoire = { ...CONFIG_PAR_DEFAUT, ...JSON.parse(raw) };
      return configEnMemoire!;
    }
  } catch {
    // localStorage indisponible ou JSON invalide -> config par défaut
  }
  configEnMemoire = { ...CONFIG_PAR_DEFAUT };
  return configEnMemoire;
}

export function setPayrollConfig(config: PayrollConfig): void {
  configEnMemoire = config;
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  } catch {
    // ignore si stockage indisponible
  }
}

export function reinitialiserPayrollConfig(): PayrollConfig {
  setPayrollConfig({ ...CONFIG_PAR_DEFAUT });
  return getPayrollConfig();
}
