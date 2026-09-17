// =============================================================================
// Le Fiduciaire — Limiteur de tentatives de connexion (Lot 1 — sécurité)
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
//     verrou du COMPTE 30 min. Cible : force brute répartie (IP tournantes),
//     insensible au correctif IP réelle du Lot 2-A ;
//   - seuil volontairement élevé pour laisser le niveau 1 gérer l'usage
//     humain légitime (mots de passe oubliés) sans verrouiller le compte.
//
// Limite V1 assumée et documentée : compteurs en mémoire process. En déploiement
// serverless multi-instances, le seuil effectif est multiplié par le nombre
// d'instances chaudes — suffisant pour le volume V1 d'un cabinet tunisien ;
// montée en charge → passer à Redis/Upstash (non requis V1).
// =============================================================================

const FENETRE_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ECHECS = 5;

// Niveau 2 (Lot 2) — verrou par compte
const FENETRE_COMPTE_MS = 60 * 60 * 1000; // 1 h
const MAX_ECHECS_COMPTE = 20;
const BLOCAGE_COMPTE_MS = 30 * 60 * 1000; // 30 min

interface Tentative {
  echecs: number[]; // timestamps des échecs dans la fenêtre
  bloqueJusqua?: number;
}

const compteurs = new Map<string, Tentative>();
const compteursCompte = new Map<string, Tentative>();

function cle(email: string, ip: string | undefined): string {
  return `${email.toLowerCase()}|${ip ?? "inconnu"}`;
}

function cleParCompte(email: string): string {
  return email.toLowerCase();
}

/** Nombre d'échecs actifs et fin de blocage éventuelle (niveau 1 : email+IP). */
export function etatTentatives(email: string, ip: string | undefined): {
  echecs: number;
  blocageRestantMs: number;
} {
  const t = compteurs.get(cle(email, ip));
  if (!t) return { echecs: 0, blocageRestantMs: 0 };
  if (t.bloqueJusqua && t.bloqueJusqua > Date.now()) {
    return { echecs: t.echecs.length, blocageRestantMs: t.bloqueJusqua - Date.now() };
  }
  return { echecs: t.echecs.length, blocageRestantMs: 0 };
}

/** La tentative est-elle refusée (compteur saturé et fenêtre non expirée) ? */
export function estBloque(email: string, ip: string | undefined): boolean {
  return etatTentatives(email, ip).blocageRestantMs > 0;
}

// ── Niveau 2 (Lot 2) : état du verrou par compte ───────────────────────────

/** Nombre d'échecs (toutes IP) et fin de verrou éventuelle du COMPTE. */
export function etatCompte(email: string): {
  echecs: number;
  blocageRestantMs: number;
} {
  const t = compteursCompte.get(cleParCompte(email));
  if (!t) return { echecs: 0, blocageRestantMs: 0 };
  if (t.bloqueJusqua && t.bloqueJusqua > Date.now()) {
    return { echecs: t.echecs.length, blocageRestantMs: t.bloqueJusqua - Date.now() };
  }
  return { echecs: t.echecs.length, blocageRestantMs: 0 };
}

/** Le COMPTE est-il verrouillé (échecs répandus sur plusieurs origines) ? */
export function estBloqueCompte(email: string): boolean {
  return etatCompte(email).blocageRestantMs > 0;
}

/** À appeler sur chaque échec d'authentification. Retourne le nouveau décompte
 *  des DEUX niveaux ; `verrouCompteMin` n'est renseigné que sur l'échec qui
 *  DÉCLENCHE le verrou du compte (tracé dans l'audit LOGIN_FAILED). */
export function enregistrerEchec(email: string, ip: string | undefined): {
  echecs: number;
  blocageRestantMs: number;
  echecsCompte: number;
  verrouCompteMin?: number;
} {
  const maintenant = Date.now();
  const k = cle(email, ip);
  const t = compteurs.get(k) ?? { echecs: [] };

  // Purger les échecs hors fenêtre
  t.echecs = t.echecs.filter((ts) => maintenant - ts < FENETRE_MS);
  t.echecs.push(maintenant);

  if (t.echecs.length >= MAX_ECHECS) {
    t.bloqueJusqua = maintenant + FENETRE_MS;
  }
  compteurs.set(k, t);

  // Niveau 2 — compteur par compte, toutes IP confondues
  const kc = cleParCompte(email);
  const c = compteursCompte.get(kc) ?? { echecs: [] };
  c.echecs = c.echecs.filter((ts) => maintenant - ts < FENETRE_COMPTE_MS);
  c.echecs.push(maintenant);
  let verrouCompteMin: number | undefined;
  if (c.echecs.length >= MAX_ECHECS_COMPTE) {
    c.bloqueJusqua = Math.max(c.bloqueJusqua ?? 0, maintenant + BLOCAGE_COMPTE_MS);
    verrouCompteMin = Math.round((c.bloqueJusqua - maintenant) / 60000);
  }
  compteursCompte.set(kc, c);

  return {
    echecs: t.echecs.length,
    blocageRestantMs: t.bloqueJusqua ? Math.max(0, t.bloqueJusqua - maintenant) : 0,
    echecsCompte: c.echecs.length,
    verrouCompteMin,
  };
}

/** À appeler sur connexion réussie : purge les compteurs de l'email (niveaux 1 et 2). */
export function reussite(email: string): void {
  const prefix = `${email.toLowerCase()}|`;
  for (const k of compteurs.keys()) {
    if (k.startsWith(prefix)) compteurs.delete(k);
  }
  compteursCompte.delete(cleParCompte(email));
}

/** Remise à zéro complète — réservé aux tests (isolation entre cas). */
export function __reinitialiserPourTests(): void {
  compteurs.clear();
  compteursCompte.clear();
}
