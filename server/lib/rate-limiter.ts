// =============================================================================
// Le Fiduciaire — Limiteur de tentatives de connexion (Lot 3 — persistance)
// =============================================================================
// Roadmap §4.1 « limitation des tentatives » : seuil, délai et journalisation.
//
//   - 5 échecs max par (email, IP) sur une fenêtre glissante de 15 minutes ;
//   - le succès réinitialise le compteur de l'email (toutes IP confondues) ;
//   - les échecs sont journalisés dans l'audit (action LOGIN_FAILED) ;
//   - verrou STRICT : tant que la fenêtre n'est pas expirée, même le bon mot
//     de passe est refusé (empêche le « force brute avec oracle »).
//
// Niveau 2 (Lot 2) — verrou PAR COMPTE, toutes IP confondues :
//   - 20 échecs sur 1 h pour un même email (quelle que soit l'origine) →
//     verrou du COMPTE 30 min. Cible : force brute répartie (IP tournantes) ;
//   - seuil volontairement élevé pour laisser le niveau 1 gérer l'usage
//     humain légitime (mots de passe oubliés) sans verrouiller le compte.
//
// Lot 3 — PERSISTANCE EN BASE (fin de la limite mémoire) :
//   les compteurs des Lot 1/2 vivaient en mémoire process ; en serverless
//   multi-instances (Vercel), chaque instance chaude multipliait les seuils
//   effectifs. Chaque échec est désormais une ligne `login_attempts` ; les
//   fenêtres glissantes et verrous se calculent depuis PostgreSQL — résultats
//   strictement identiques sur toutes les instances, sans Redis ni service
//   externe. La réussite supprime les lignes de l'email ; la purge
//   opportuniste (session-cleanup) retire les lignes de plus de 2 h.
//
//   Lecture en UNE requête : toutes les lignes de l'email sur la fenêtre 1 h
//   (fenêtre ⊇ fenêtre 15 min du niveau 1) — les deux niveaux se déduisent
//   en mémoire. Fréquence de connexion d'un cabinet : dérisoire pour Postgres.
//
//   Tolérance aux pannes : en cas d'erreur de base, les lectures échouent
//   OUVERTES (limiteur inopérant, connexion possible — la panne ne doit pas
//   verrouiller l'application) et l'échec est journalisé. L'authentification
//   elle-même reste soumise à la vérification du mot de passe.
// =============================================================================

import prisma from "./prisma.js";

const FENETRE_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ECHECS = 5;

// Niveau 2 (Lot 2) — verrou par compte
const FENETRE_COMPTE_MS = 60 * 60 * 1000; // 1 h
const MAX_ECHECS_COMPTE = 20;
const BLOCAGE_COMPTE_MS = 30 * 60 * 1000; // 30 min

interface EtatDeuxNiveaux {
  echecs: number; // niveau 1 (email + IP, 15 min)
  blocageRestantMs: number; // niveau 1
  echecsCompte: number; // niveau 2 (email, toutes IP, 1 h)
  blocageCompteRestantMs: number; // niveau 2
}

function emailNormalise(email: string): string {
  return email.trim().toLowerCase();
}

/** État neutre — utilisé en cas d'erreur de base (échec ouvert). */
function etatNeutre(): EtatDeuxNiveaux {
  return {
    echecs: 0,
    blocageRestantMs: 0,
    echecsCompte: 0,
    blocageCompteRestantMs: 0,
  };
}

/** Lit l'état des DEUX niveaux depuis la base (une seule requête).
 *  Toutes les lignes de la fenêtre 1 h sont ramenées ; le niveau 1 se déduit
 *  en filtrant sur l'IP et la fenêtre de 15 min. */
async function lireEtat(email: string, ip: string | undefined): Promise<EtatDeuxNiveaux> {
  const maintenant = Date.now();
  const lignes = await prisma.login_attempts.findMany({
    where: {
      email: emailNormalise(email),
      createdAt: { gte: new Date(maintenant - FENETRE_COMPTE_MS) },
    },
    select: { ip: true, createdAt: true },
  });

  // Niveau 1 — même email, même origine, fenêtre 15 min
  const horizonN1 = maintenant - FENETRE_MS;
  const ipCle = ip ?? null;
  const n1 = lignes.filter((l) => l.ip === ipCle && l.createdAt.getTime() >= horizonN1);
  const dernierN1 = n1.reduce((max, l) => Math.max(max, l.createdAt.getTime()), 0);

  // Niveau 2 — toutes les lignes ramenées sont déjà dans la fenêtre 1 h
  const dernierN2 = lignes.reduce((max, l) => Math.max(max, l.createdAt.getTime()), 0);

  const blocageN1 =
    n1.length >= MAX_ECHECS && dernierN1 + FENETRE_MS > maintenant
      ? dernierN1 + FENETRE_MS - maintenant
      : 0;
  const blocageN2 =
    lignes.length >= MAX_ECHECS_COMPTE && dernierN2 + BLOCAGE_COMPTE_MS > maintenant
      ? dernierN2 + BLOCAGE_COMPTE_MS - maintenant
      : 0;

  return {
    echecs: n1.length,
    blocageRestantMs: blocageN1,
    echecsCompte: lignes.length,
    blocageCompteRestantMs: blocageN2,
  };
}

/** Nombre d'échecs actifs et fin de blocage éventuelle (niveau 1 : email+IP).
 *  Tolérante aux pannes : état neutre si la base est injoignable. */
export async function etatTentatives(
  email: string,
  ip: string | undefined
): Promise<{ echecs: number; blocageRestantMs: number }> {
  try {
    const e = await lireEtat(email, ip);
    return { echecs: e.echecs, blocageRestantMs: e.blocageRestantMs };
  } catch (err) {
    console.warn("[rate-limiter] lecture impossible (échec ouvert) :", (err as Error).message);
    return { echecs: 0, blocageRestantMs: 0 };
  }
}

/** La tentative est-elle refusée (compteur saturé et fenêtre non expirée) ? */
export async function estBloque(email: string, ip: string | undefined): Promise<boolean> {
  return (await etatTentatives(email, ip)).blocageRestantMs > 0;
}

// ── Niveau 2 (Lot 2) : état du verrou par compte ───────────────────────────

/** Nombre d'échecs (toutes IP) et fin de verrou éventuelle du COMPTE.
 *  Tolérante aux pannes : état neutre si la base est injoignable. */
export async function etatCompte(
  email: string
): Promise<{ echecs: number; blocageRestantMs: number }> {
  try {
    const e = await lireEtat(email, undefined);
    return { echecs: e.echecsCompte, blocageRestantMs: e.blocageCompteRestantMs };
  } catch (err) {
    console.warn("[rate-limiter] lecture compte impossible (échec ouvert) :", (err as Error).message);
    return { echecs: 0, blocageRestantMs: 0 };
  }
}

/** Le COMPTE est-il verrouillé (échecs répandus sur plusieurs origines) ? */
export async function estBloqueCompte(email: string): Promise<boolean> {
  return (await etatCompte(email)).blocageRestantMs > 0;
}

/** À appeler sur chaque échec d'authentification. Retourne le nouveau décompte
 *  des DEUX niveaux ; `verrouCompteMin` n'est renseigné que sur l'échec qui
 *  DÉCLENCHE le verrou du compte (tracé dans l'audit LOGIN_FAILED).
 *  Tolérante aux pannes : décompte à zéro si l'écriture est impossible. */
export async function enregistrerEchec(
  email: string,
  ip: string | undefined
): Promise<{
  echecs: number;
  blocageRestantMs: number;
  echecsCompte: number;
  verrouCompteMin?: number;
}> {
  const e = emailNormalise(email);
  try {
    await prisma.login_attempts.create({ data: { email: e, ip: ip ?? null } });
    const etat = await lireEtat(e, ip);
    return {
      echecs: etat.echecs,
      blocageRestantMs: etat.blocageRestantMs,
      echecsCompte: etat.echecsCompte,
      ...(etat.blocageCompteRestantMs > 0
        ? { verrouCompteMin: Math.round(etat.blocageCompteRestantMs / 60000) }
        : {}),
    };
  } catch (err) {
    console.warn("[rate-limiter] enregistrement impossible (échec non compté) :", (err as Error).message);
    return { echecs: 0, blocageRestantMs: 0, echecsCompte: 0 };
  }
}

/** À appeler sur connexion réussie : purge les compteurs de l'email (niveaux 1
 *  et 2) — toutes les lignes de tentatives de cet email sont supprimées. */
export async function reussite(email: string): Promise<void> {
  try {
    await prisma.login_attempts.deleteMany({ where: { email: emailNormalise(email) } });
  } catch (err) {
    console.warn("[rate-limiter] purge sur réussite impossible :", (err as Error).message);
  }
}
