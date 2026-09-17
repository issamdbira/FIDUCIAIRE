// =============================================================================
// Le Fiduciaire — Cookie de session (Lot 1 sécurité)
// =============================================================================
// Transition localStorage → cookie HttpOnly :
//   - le JWT de session n'est JAMAIS exposé au JavaScript du navigateur ;
//   - le cookie est HttpOnly, Secure en production, SameSite=Lax ;
//   - SameSite=Lax couvre le même-site (localhost:3000→3001 en dev inclus)
//     et bloque l'envoi du cookie sur les POST cross-site (socle anti-CSRF) ;
//   - requireAuth accepte le cookie OU l'en-tête Authorization Bearer
//     (compatibilité clients programmatiques et tests).
// =============================================================================

import type { Response } from "express";

export const SESSION_COOKIE = "fiduciaire_session";

const isProd =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

/** Dépose le JWT de session dans un cookie HttpOnly (login, invitation, création d'espace). */
export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/** Supprime le cookie de session (déconnexion). */
export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  });
}
