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
// Limite V1 assumée et documentée : compteur en mémoire process. En déploiement
// serverless multi-instances, le seuil effectif est multiplié par le nombre
// d'instances chaudes — suffisant pour le volume V1 d'un cabinet tunisien ;
// montée en charge → passer à Redis/Upstash (non requis V1).
// =============================================================================

const FENETRE_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ECHECS = 5;

interface Tentative {
  echecs: number[]; // timestamps des échecs dans la fenêtre
  bloqueJusqua?: number;
}

const compteurs = new Map<string, Tentative>();

function cle(email: string, ip: string | undefined): string {
  return `${email.toLowerCase()}|${ip ?? "inconnu"}`;
}

/** Nombre d'échecs actifs et fin de blocage éventuelle. */
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

/** À appeler sur chaque échec d'authentification. Retourne le nouveau décompte. */
export function enregistrerEchec(email: string, ip: string | undefined): {
  echecs: number;
  blocageRestantMs: number;
} {
  const k = cle(email, ip);
  const maintenant = Date.now();
  const t = compteurs.get(k) ?? { echecs: [] };

  // Purger les échecs hors fenêtre
  t.echecs = t.echecs.filter((ts) => maintenant - ts < FENETRE_MS);
  t.echecs.push(maintenant);

  if (t.echecs.length >= MAX_ECHECS) {
    t.bloqueJusqua = maintenant + FENETRE_MS;
  }
  compteurs.set(k, t);
  return { echecs: t.echecs.length, blocageRestantMs: t.bloqueJusqua ? Math.max(0, t.bloqueJusqua - maintenant) : 0 };
}

/** À appeler sur connexion réussie : purge les compteurs de l'email. */
export function reussite(email: string): void {
  const prefix = `${email.toLowerCase()}|`;
  for (const k of compteurs.keys()) {
    if (k.startsWith(prefix)) compteurs.delete(k);
  }
}
