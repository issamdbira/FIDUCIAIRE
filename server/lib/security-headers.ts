// =============================================================================
// Le Fiduciaire — En-têtes de sécurité HTTP (Lot 2 — sécurité)
// =============================================================================
// Appliqués à TOUTES les réponses de l'API Express (le front statique reçoit
// les mêmes en-têtes via les routes de .vercel/output/config.json, générées
// par scripts/vercel-build.mjs — même logique, même source d'environnement).
//
//   - Content-Security-Policy : stricte. Grâce au Lot 2 (runtime de debug
//     inline retiré du build production), AUCUN script inline ne subsiste →
//     script-src 'self' SANS 'unsafe-inline'. Polices Google autorisées
//     (feuilles de style + fichiers). L'origine d'analytics (si configurée
//     via VITE_ANALYTICS_ENDPOINT) est ajoutée à script-src et connect-src.
//   - Strict-Transport-Security : HTTPS obligatoire 1 an (HSTS, ignoré sur
//     HTTP local — comportement inchangé en dev).
//   - X-Content-Type-Options / X-Frame-Options / Referrer-Policy /
//     Permissions-Policy : durcissement standard.
// =============================================================================

import { Request, Response, NextFunction } from "express";

function origineAnalytics(): string | null {
  const v = process.env.VITE_ANALYTICS_ENDPOINT;
  if (typeof v !== "string") return null;
  const url = v.trim().replace(/\/+$/, "");
  return /^https:\/\/[\w.-]+$/.test(url) ? url : null;
}

/** Construit la CSP — fonction exportée pour les tests. */
export function construireCsp(): string {
  const analytics = origineAnalytics();
  const scriptSrc = ["'self'", ...(analytics ? [analytics] : [])].join(" ");
  const connectSrc = ["'self'", ...(analytics ? [analytics] : [])].join(" ");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // 'unsafe-inline' pour les styles : injectés au runtime par des
    // librairies (html2canvas clone le DOM en <style>) — risque mineur,
    // contrairement aux scripts.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export const EN_TETES_SECURITE: Record<string, string> = {
  "Content-Security-Policy": construireCsp(),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** Middleware Express — en-têtes sur toutes les réponses API. */
export function enTetesSecurite(_req: Request, res: Response, next: NextFunction): void {
  for (const [k, v] of Object.entries(EN_TETES_SECURITE)) {
    res.setHeader(k, v);
  }
  next();
}
