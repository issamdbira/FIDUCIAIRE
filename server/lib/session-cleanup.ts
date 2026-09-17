// =============================================================================
// Le Fiduciaire — Nettoyage automatique des sessions et tokens expirés (Lot 2)
// =============================================================================
// Problème : la table `sessions` (et `password_resets`) accumule des lignes
// expirées à chaque connexion oubliée / lien de réinitialisation non utilisé.
// Lot 3 : la table `login_attempts` (verrous de connexion persistés) suit le
// même régime — ses lignes n'ont plus d'usage au-delà de 2 h.
//
// Solution SANS cron ni service externe :
//   - purge « time-gated » : AU PLUS une exécution par fenêtre d'1 heure et
//     par instance process (serverless compris). Le coût amorti est un simple
//     test d'horodatage en mémoire par requête ;
//   - appelée depuis requireAuth (trafic authentifié) et après un login ;
//   - JAMAIS bloquante pour l'appelant : une purge en échec est journalisée
//     puis ignorée (le nettoyage restera opportuniste, pas critique) ;
//   - ne supprime QUE les lignes strictement expirées (expiresAt < now) :
//     aucune session active ne peut être touchée.
// =============================================================================

import prisma from "./prisma.js";

const INTERVALLE_MS = 60 * 60 * 1000; // 1 heure entre deux purges par instance

// Lot 3 — rétention des tentatives de connexion : la fenêtre max utile est
// 1 h (niveau 2) + 30 min de verrou → 2 h couvrent avec marge. Au-delà, les
// lignes ne servent plus à rien (ni sécurité, ni audit — les échecs sont
// déjà tracés dans audit_logs).
const RETENTION_TENTATIVES_MS = 2 * 60 * 60 * 1000;

let dernierPassageMs = 0;

export interface ResultatPurge {
  sessions: number;
  resets: number;
  tentatives: number;
}

/** Purge les sessions, tokens de réinitialisation et tentatives de connexion
 *  expirés. `force = true` outrepasse la porte temporelle (tests, scripts
 *  d'exploitation). */
export async function purgeExpirations(force = false): Promise<ResultatPurge> {
  const maintenant = Date.now();
  if (!force && maintenant - dernierPassageMs < INTERVALLE_MS) {
    return { sessions: 0, resets: 0, tentatives: 0 };
  }
  // Positionner la porte AVANT le travail asynchrone : les appels concurrents
  // (autres requêtes simultanées) voient la porte fermée et rendent la main
  // immédiatement — une seule purge s'exécute.
  dernierPassageMs = maintenant;

  const borne = new Date();
  const borneTentatives = new Date(maintenant - RETENTION_TENTATIVES_MS);
  const [sessions, resets, tentatives] = await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: borne } } }),
    prisma.password_resets.deleteMany({ where: { expiresAt: { lt: borne } } }),
    prisma.login_attempts.deleteMany({ where: { createdAt: { lt: borneTentatives } } }),
  ]);
  return { sessions: sessions.count, resets: resets.count, tentatives: tentatives.count };
}

/** Variante tolérante aux pannes pour les middlewares : jamais d'échec propagé. */
export async function purgeExpirationsSilencieuse(): Promise<ResultatPurge> {
  try {
    return await purgeExpirations();
  } catch (e) {
    console.warn("[cleanup] purge des expirations ignorée :", (e as Error).message);
    return { sessions: 0, resets: 0, tentatives: 0 };
  }
}

/** Remise à zéro de la porte — réservé aux tests (isolation entre cas). */
export function __reinitialiserPourTests(): void {
  dernierPassageMs = 0;
}
