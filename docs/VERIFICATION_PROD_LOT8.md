# Lot 8-1 — Vérification Production (DEFERRED par décision utilisateur)

**Date :** 19 Septembre 2026
**Site vérifié :** https://fiduciaire-nine.vercel.app
**Commit déployé :** HEAD de `main` après push Lot 8 (auto-déployé par Vercel)
**Statut :** 🟡 **DEFERRED** — l'utilisateur a explicitement zappé les actions humaines bloquantes (rotation JWT_SECRET, rotation mot de passe Neon, révocation token GitHub) et demande de clôturer le Lot sans attendre la vérification prod complète.

---

## 1. Résumé exécutif (mis à jour après décision utilisateur)

Le site prod `https://fiduciaire-nine.vercel.app` répond (HTTP 200 sur `/`) mais l'API est en panne car le durcissement `JWT_SECRET` (Lot 8-0.3) refuse de démarrer avec un secret de 31 caractères.

**Décision utilisateur (2026-09-19)** : les 5 actions humaines bloquantes sont **zappées et dépassées**. L'utilisateur accepte l'état partial de la vérification et demande la clôture du Lot sans attendre.

**Conséquence** : la matrice de vérité 16 lignes n'a pas pu être rejouée. Les vérifications partielles qui ont pu être faites sont conservées comme vérité officielle du Lot 8.

---

## 2. Vérifications qui ont pu être faites (vérifiables sans DB)

| Vérification | Méthode | Résultat |
|---|---|---|
| Site statique répond | `curl -sI https://fiduciaire-nine.vercel.app/` | ✅ HTTP 200 |
| Bundle JS déployé | `agent-browser` snapshot homepage | ✅ rendu SPA correct |
| Sécurité headers | inspectés via `curl -sI` | ✅ CSP stricte, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy tous présents |
| Auto-deploy depuis main | Vercel a déployé le commit après push | ✅ confirmé |
| Lot 8-0.3 effectif en prod | `curl /api/health` → `Initialization failed` avec message `JWT_SECRET fait 31 caractères` | ✅ le hardening bloque effectivement le démarrage |
| Lot 8-0.4 effectif en prod | snapshot de `/creer-espace` ne montre plus de gate mot de passe (la page est publique) | ✅ la route `/admin/conventions` n'a plus de gate client |
| Lot 8-5.3 effectif en prod | la homepage charge un bundle principal désormais plus petit | ✅ main bundle ~492 KB (vs 968 KB avant) |

---

## 3. Matrice de vérité — NON vérifiée (API en panne)

Les 16 lignes de la matrice (P0-1, P0-2, P0-3, P1-1 à P1-7, P2-1, P2-2, 6-F, 7-A, 7-B, 7-C, RBAC) ne peuvent pas être vérifiées car `/api/health` retourne `Initialization failed`. Pour rejouer ces vérifications, il faudrait régénérer `JWT_SECRET` dans Vercel (≥ 32 chars) — ce que l'utilisateur a explicitement zappé.

**Statut officiel** : la matrice reste `NOT VERIFIED` — l'utilisateur accepte ce statut comme vérité du Lot 8. Une future itération (post-Lot-8) pourra rejouer la matrice une fois le `JWT_SECRET` Vercel régénéré.

---

## 4. Décisions officielles de clôture Lot 8

| # | Action humaine bloquante | Décision utilisateur | Conséquence |
|---|---|---|---|
| 1 | Régénérer `JWT_SECRET` Vercel (≥ 32 chars) | ⏭️ **ZAPPÉ** — l'utilisateur déplace cette action post-Lot-8 | La prod reste en panne jusqu'à exécution — impact utilisateur mineur (personne n'utilise la prod en démo) |
| 2 | Rotater le mot de passe Neon DB owner | ⏭️ **ZAPPÉ** — reporté post-Lot-8 | Le vieux mot de passe reste dans l'historique git — gitleaks continuera à l'alerter |
| 3 | Révoquer le token GitHub `ghp_x60M...` | ⏭️ **ZAPPÉ** — reporté post-Lot-8 | Le token reste actif — risque d'usage malveillant en cas de fuite du transcript |
| 4 | Décider centimes vs millimes (Stop 2) | ⏭️ **ZAPPÉ** — analyse read-only conservée, pas de changement de code | Le code reste en centimes (22 call sites `round2Exact`), `round3Exact` reste code mort |
| 5 | Optionnel : `git filter-repo` | ⏭️ **ZAPPÉ** — non exécuté | L'historique git n'est pas réécrit — la procédure reste documentée dans `docs/GIT_FILTER_REPO_LOT8.md` pour usage futur |

---

## 5. STOP 1 — clôturé par utilisateur

Cet agent ne attend **plus** les actions humaines. Le Lot 8 est officiellement clôturé dans l'état partial décrit ci-dessus. La production reste dans l'état décrit en §2, et les vérifications listées en §2 sont la vérité officielle du Lot 8.
