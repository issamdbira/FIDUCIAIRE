/**
 * Registre central des conventions collectives
 * + Données SMIG/SMAG nationales
 */

import type { ConventionCollective, SmigTable } from "../types";
import { CONVENTION_CADRE } from "./cadre";
import { CONVENTION_COMMERCE_GROS } from "./commerce-gros";

// ─── Registre des conventions ────────────────────────────────────────
export const CONVENTIONS: ConventionCollective[] = [
  CONVENTION_CADRE,
  CONVENTION_COMMERCE_GROS,
];

export function getConventionBySlug(slug: string): ConventionCollective | undefined {
  return CONVENTIONS.find((c) => c.slug === slug);
}

export function getConventionById(sectorId: number): ConventionCollective | undefined {
  return CONVENTIONS.find((c) => c.sectorId === sectorId);
}

// ─── SMIG / SMAG nationaux (2025-2028) ───────────────────────────────
export const SMIG_SMAG: SmigTable[] = [
  {
    tableIndex: 1,
    title: "SMIG – Secteur non agricole (Décret n°67)",
    titleAr: "الأجر الأدنى المضمون – القطاع غير الفلاحي",
    entries: [
      { regime: "48h/semaine (Mensuel)", year: 2025, amount: 528.32, currency: "TND" },
      { regime: "48h/semaine (Mensuel)", year: 2026, amount: 554.736, currency: "TND" },
      { regime: "48h/semaine (Mensuel)", year: 2027, amount: 582.4, currency: "TND" },
      { regime: "48h/semaine (Mensuel)", year: 2028, amount: 611.52, currency: "TND" },
      { regime: "40h/semaine (Mensuel)", year: 2025, amount: 448.238, currency: "TND" },
      { regime: "40h/semaine (Mensuel)", year: 2026, amount: 470.251, currency: "TND" },
      { regime: "40h/semaine (Mensuel)", year: 2027, amount: 493.304, currency: "TND" },
      { regime: "40h/semaine (Mensuel)", year: 2028, amount: 517.571, currency: "TND" },
      { regime: "48h/semaine (Horaire)", year: 2025, amount: 2.54, currency: "TND" },
      { regime: "48h/semaine (Horaire)", year: 2026, amount: 2.667, currency: "TND" },
      { regime: "48h/semaine (Horaire)", year: 2027, amount: 2.8, currency: "TND" },
      { regime: "48h/semaine (Horaire)", year: 2028, amount: 2.94, currency: "TND" },
      { regime: "40h/semaine (Horaire)", year: 2025, amount: 2.586, currency: "TND" },
      { regime: "40h/semaine (Horaire)", year: 2026, amount: 2.713, currency: "TND" },
      { regime: "40h/semaine (Horaire)", year: 2027, amount: 2.846, currency: "TND" },
      { regime: "40h/semaine (Horaire)", year: 2028, amount: 2.986, currency: "TND" },
    ],
  },
  {
    tableIndex: 2,
    title: "SMAG – Secteur agricole (Décret n°66)",
    titleAr: "الأجر الأدنى المضمون – القطاع الفلاحي",
    entries: [
      { regime: "Salaire journalier", year: 2026, amount: 21.336, currency: "TND" },
      { regime: "Salaire journalier", year: 2027, amount: 22.4, currency: "TND" },
      { regime: "Salaire journalier", year: 2028, amount: 23.52, currency: "TND" },
      { regime: "Prime technique (ouvriers spécialisés)", year: 2026, amount: 1.138, currency: "TND" },
      { regime: "Prime technique (ouvriers spécialisés)", year: 2027, amount: 1.195, currency: "TND" },
      { regime: "Prime technique (ouvriers spécialisés)", year: 2028, amount: 1.255, currency: "TND" },
      { regime: "Prime technique (ouvriers qualifiés)", year: 2026, amount: 2.14, currency: "TND" },
      { regime: "Prime technique (ouvriers qualifiés)", year: 2027, amount: 2.247, currency: "TND" },
      { regime: "Prime technique (ouvriers qualifiés)", year: 2028, amount: 2.359, currency: "TND" },
    ],
  },
  {
    tableIndex: 3,
    title: "Augmentations annuelles — Secteurs avec conventions collectives (Décret n°68)",
    titleAr: "الزيادات السنوية – القطاعات ذات الاتفاقيات الجماعية",
    entries: [
      { regime: "Salaire de base", year: 2026, amount: 5, currency: "TND" },
      { regime: "Salaire de base", year: 2027, amount: 5, currency: "TND" },
      { regime: "Salaire de base", year: 2028, amount: 5, currency: "TND" },
      { regime: "Indemnité de transport", year: 2026, amount: 5, currency: "TND" },
      { regime: "Indemnité de transport", year: 2027, amount: 5, currency: "TND" },
      { regime: "Indemnité de transport", year: 2028, amount: 5, currency: "TND" },
      { regime: "Indemnité de présence", year: 2026, amount: 5, currency: "TND" },
      { regime: "Indemnité de présence", year: 2027, amount: 5, currency: "TND" },
      { regime: "Indemnité de présence", year: 2028, amount: 5, currency: "TND" },
    ],
  },
  {
    tableIndex: 5,
    title: "Augmentations par catégorie — Régime 48h",
    titleAr: "الزيادات حسب الصنف – نظام 48 ساعة",
    entries: [
      { regime: "Exécution (horaire)", year: 2026, amount: 0.174, currency: "TND" },
      { regime: "Exécution (horaire)", year: 2027, amount: 0.183, currency: "TND" },
      { regime: "Exécution (horaire)", year: 2028, amount: 0.192, currency: "TND" },
      { regime: "Exécution (mensuel)", year: 2026, amount: 36.192, currency: "TND" },
      { regime: "Exécution (mensuel)", year: 2027, amount: 38.064, currency: "TND" },
      { regime: "Exécution (mensuel)", year: 2028, amount: 39.936, currency: "TND" },
      { regime: "Maîtrise (horaire)", year: 2026, amount: 0.256, currency: "TND" },
      { regime: "Maîtrise (horaire)", year: 2027, amount: 0.269, currency: "TND" },
      { regime: "Maîtrise (horaire)", year: 2028, amount: 0.282, currency: "TND" },
      { regime: "Maîtrise (mensuel)", year: 2026, amount: 53.248, currency: "TND" },
      { regime: "Maîtrise (mensuel)", year: 2027, amount: 55.952, currency: "TND" },
      { regime: "Maîtrise (mensuel)", year: 2028, amount: 58.656, currency: "TND" },
      { regime: "Cadres (horaire)", year: 2026, amount: 0.335, currency: "TND" },
      { regime: "Cadres (horaire)", year: 2027, amount: 0.352, currency: "TND" },
      { regime: "Cadres (horaire)", year: 2028, amount: 0.37, currency: "TND" },
      { regime: "Cadres (mensuel)", year: 2026, amount: 69.68, currency: "TND" },
      { regime: "Cadres (mensuel)", year: 2027, amount: 73.216, currency: "TND" },
      { regime: "Cadres (mensuel)", year: 2028, amount: 76.96, currency: "TND" },
    ],
  },
  {
    tableIndex: 6,
    title: "Augmentations par catégorie — Régime 40h",
    titleAr: "الزيادات حسب الصنف – نظام 40 ساعة",
    entries: [
      { regime: "Exécution (horaire)", year: 2026, amount: 0.174, currency: "TND" },
      { regime: "Exécution (horaire)", year: 2027, amount: 0.183, currency: "TND" },
      { regime: "Exécution (horaire)", year: 2028, amount: 0.192, currency: "TND" },
      { regime: "Exécution (mensuel)", year: 2026, amount: 30.159, currency: "TND" },
      { regime: "Exécution (mensuel)", year: 2027, amount: 31.72, currency: "TND" },
      { regime: "Exécution (mensuel)", year: 2028, amount: 33.28, currency: "TND" },
      { regime: "Maîtrise (horaire)", year: 2026, amount: 0.256, currency: "TND" },
      { regime: "Maîtrise (horaire)", year: 2027, amount: 0.269, currency: "TND" },
      { regime: "Maîtrise (horaire)", year: 2028, amount: 0.282, currency: "TND" },
      { regime: "Maîtrise (mensuel)", year: 2026, amount: 44.373, currency: "TND" },
      { regime: "Maîtrise (mensuel)", year: 2027, amount: 46.627, currency: "TND" },
      { regime: "Maîtrise (mensuel)", year: 2028, amount: 48.88, currency: "TND" },
      { regime: "Cadres (horaire)", year: 2026, amount: 0.335, currency: "TND" },
      { regime: "Cadres (horaire)", year: 2027, amount: 0.352, currency: "TND" },
      { regime: "Cadres (horaire)", year: 2028, amount: 0.37, currency: "TND" },
      { regime: "Cadres (mensuel)", year: 2026, amount: 58.066, currency: "TND" },
      { regime: "Cadres (mensuel)", year: 2027, amount: 61.013, currency: "TND" },
      { regime: "Cadres (mensuel)", year: 2028, amount: 64.133, currency: "TND" },
    ],
  },
];

// ─── Utilitaires SMIG ────────────────────────────────────────────────
export function getSmig(year: number, regime: string): number {
  const table = SMIG_SMAG.find((t) => t.tableIndex === 1);
  if (!table) return 0;
  const entry = table.entries.find((e) => e.year === year && e.regime === regime);
  return entry?.amount ?? 0;
}

export function getLatestSmigYear(): number {
  const table = SMIG_SMAG.find((t) => t.tableIndex === 1);
  if (!table) return 2026;
  return Math.max(...table.entries.map((e) => e.year));
}
