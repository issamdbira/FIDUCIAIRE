/**
 * localStorage persistence for convention overrides
 * All edits are stored locally and merged with static data on load.
 */

const STORAGE_PREFIX = "fiduciaire_convention_overrides_";

export interface ConventionOverrides {
  primesMensuelles?: Record<string, unknown>[];
  primesAnnuelles?: Record<string, unknown>[];
  primesSociales?: Record<string, unknown>[];
  grilleDetaillee?: Record<string, unknown>[];
}

export function getConventionOverrides(slug: string): ConventionOverrides | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + slug);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConventionOverrides(slug: string, overrides: ConventionOverrides): void {
  localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(overrides));
}

export function clearConventionOverrides(slug: string): void {
  localStorage.removeItem(STORAGE_PREFIX + slug);
}

export function getOverriddenPrimes(
  slug: string,
  type: "mensuelles" | "annuelles" | "sociales"
): Record<string, unknown>[] | null {
  const overrides = getConventionOverrides(slug);
  if (!overrides) return null;
  const key = `primes${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof ConventionOverrides;
  return (overrides[key] as Record<string, unknown>[]) ?? null;
}

/**
 * Merge static convention data with localStorage overrides.
 * Returns a deep-merged convention where overridden primes replace static ones.
 */
export function getConventionWithOverrides<T extends Record<string, unknown>>(
  slug: string,
  staticData: T
): T {
  const overrides = getConventionOverrides(slug);
  if (!overrides) return staticData;

  return {
    ...staticData,
    ...(overrides.primesMensuelles ? { primesMensuelles: overrides.primesMensuelles } : {}),
    ...(overrides.primesAnnuelles ? { primesAnnuelles: overrides.primesAnnuelles } : {}),
    ...(overrides.primesSociales ? { primesSociales: overrides.primesSociales } : {}),
    ...(overrides.grilleDetaillee ? { grilleDetaillee: overrides.grilleDetaillee } : {}),
  } as T;
}
