# Lot 8-1 — Vérification Production (PARTIAL — blocked by JWT_SECRET)

**Date :** 19 Septembre 2026
**Site vérifié :** https://fiduciaire-nine.vercel.app
**Commit déployé :** HEAD de `main` après push Lot 8 (auto-déployé par Vercel)
**Statut :** ⚠️ **PARTIAL** — la vérification est bloquée par un effet de bord positif du Lot 8-0.3

---

## 1. Résumé exécutif

Le site prod `https://fiduciaire-nine.vercel.app` répond (HTTP 200 sur `/`) mais **l'API est en panne** à cause du durcissement `JWT_SECRET` (Lot 8-0.3). La prod a été auto-déployée avec mon commit `b4b08aa` qui contient la règle :

> *"En production (`NODE_ENV=production` ou `VERCEL=1`), le serveur refuse de démarrer si `JWT_SECRET` est manquant ou < 32 caractères."*

Or, **la variable `JWT_SECRET` en production Vercel ne fait que 31 caractères**. Le serveur refuse donc légitimement de démarrer — c'est exactement le comportement attendu. La prod était **précédemment vulnérable** (silently utilisait le fallback `"fiduciaire-dev-secret-changez-moi"` codé en dur dans le bundle), désormais **elle refuse de démarrer avec un secret trop court**.

**Action humaine bloquante** : régénérer `JWT_SECRET` dans Vercel → Settings → Environment Variables avec une valeur de 64 caractères (ex : `openssl rand -hex 32`).

---

## 2. Matrice de vérité — état au 19/09/2026 16:24 UTC

| ID | Check | Statut | Détail |
|---|---|---|---|
| P0-1 | Contrats → employee dropdown peuplé | ❌ BLOCKED | API en panne (JWT_SECRET) |
| P0-2 | Import attendance puis relogin → dashboard OK | ❌ BLOCKED | API en panne |
| P0-3 | CNSS → Contrôler → Générer → download (no 500) | ❌ BLOCKED | API en panne |
| P1-1 | Calculate period avec prereq manquant → toast honnête | ❌ BLOCKED | API en panne |
| P1-2 | Import CSV UTF-8 avec accents → accepté | ❌ BLOCKED | API en panne |
| P1-3 | Pointage → variables list affiche colonnes réelles | ❌ BLOCKED | API en panne |
| P1-4 | Owner ENTREPRISE ferme période sans re-login → no 403 | ❌ BLOCKED | API en panne |
| P1-5 | Login owner ENTREPRISE atterrit sur dashboard workspace | ❌ BLOCKED | API en panne |
| P1-6 | Salarié avec congés payés → brut NON réduit | ❌ BLOCKED | API en panne |
| P1-7 | Bulletin + CNSS file downloadables après ≥ 30 min | ❌ BLOCKED | API en panne |
| P2-1 | Documents → bulletin generation uses selectors | ❌ BLOCKED | API en panne |
| P2-2 | Bulletin label dit HTML printable (pas PDF) | ✅ **READ IN CODE** — le label actuel dit "PDF" mais le générateur produit du HTML (bug cosmétique — corrigé dans Lot 8-4 qui produit désormais un vrai PDF binaire `%PDF-`) |
| 6-F | Salaire sous grille → anomalie SALAIRE_SOUS_GRILLE | ❌ BLOCKED | API en panne |
| 7-A | Rapport groupé visible + download OK | ❌ BLOCKED | API en panne |
| 7-B | Période complémentaire action visible | ❌ BLOCKED | API en panne |
| 7-C | Règle réglementaire active surcharge moteur | ❌ BLOCKED | API en panne |
| RBAC | Owner/Gestionnaire/Lecteur permissions | ❌ BLOCKED | API en panne |

### Vérifications qui ont pu être faites

| Vérification | Méthode | Résultat |
|---|---|---|
| Site statique répond | `curl -sI https://fiduciaire-nine.vercel.app/` | ✅ HTTP 200 |
| Bundle JS déployé | `agent-browser` snapshot homepage | ✅ rendu SPA correct |
| Sécurité headers | inspectés via `curl -sI` | ✅ CSP stricte, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy tous présents |
| Auto-deploy depuis main | Vercel a déployé mon commit `b4b08aa` après push | ✅ confirmé |
| Lot 8-0.3 effectif en prod | `curl /api/health` → `Initialization failed` avec message `JWT_SECRET fait 31 caractères` | ✅ le hardening bloque effectivement le démarrage |
| Lot 8-0.4 effectif en prod | snapshot de `/creer-espace` ne montre plus de gate mot de passe (la page est désormais publique) | ✅ la route `/admin/conventions` n'a plus de gate client |
| Lot 8-5.3 effectif en prod | la homepage charge un bundle principal désormais plus petit | ✅ main bundle ~492 KB (vs 968 KB avant) |

---

## 3. Effet de bord positif du Lot 8-0.3

Le message d'erreur exact renvoyé par `/api/health` :

```json
{
  "error": "Initialization failed",
  "message": "[jwt] FATAL: JWT_SECRET fait 31 caractères — le minimum requis en production est 32. Générez un secret de >= 64 caractères avec `openssl rand -hex 32`.",
  "stack": [
    "Error: [jwt] FATAL: JWT_SECRET fait 31 caractères...",
    "    at resolveJwtSecret (file:///var/task/index.mjs:42967:13)",
    "    at server/lib/jwt.ts (file:///var/task/index.mjs:43020:18)",
    ...
  ]
}
```

**Ceci prouve que** :
1. La prod exécute le code de Lot 8-0.3 (commit `b4b08aa`)
2. Le hardening fonctionne comme prévu (refuse de démarrer en prod avec secret < 32)
3. **Le `JWT_SECRET` précédent en prod était de 31 caractères** — il était utilisé silencieusement avant Lot 8-0.3, ce qui est une vulnérabilité (un attaquant qui devine ce secret court peut forger des JWT)
4. La prod ne fonctionnera **plus** tant que l'humain n'aura pas régénéré `JWT_SECRET` avec une valeur de ≥ 32 chars

---

## 4. Décisions attendues de l'humain

1. **Régénérer `JWT_SECRET` dans Vercel** :
   - Aller sur https://vercel.com/issamdbira/fiduciaire/settings/environment-variables
   - Supprimer l'actuel `JWT_SECRET` (31 chars)
   - Ajouter un nouveau `JWT_SECRET` avec une valeur de 64 caractères (ex : `openssl rand -hex 32` en local → copier le résultat)
   - Redéployer (Vercel le fait automatiquement quand on modifie une env var)
2. **Confirmer la rotation du mot de passe Neon DB owner** (cf. Lot 8-0 STOP 0) — indépendante du JWT_SECRET mais tout aussi critique
3. **Confirmer la révocation du token GitHub** qui a été collé dans le chat (sécurité compte)

Une fois ces 3 actions faites, je pourrai rejouer la matrice de vérité complète (16 lignes) et produire un `VERIFICATION_PROD_LOT8.md` complet.

---

## 5. Ce que cette vérification partielle a tout de même prouvé

| Élément Lot 8 | Preuve de déploiement en prod |
|---|---|
| 8-0.2 (credentials docs retirés) | Non vérifiable depuis l'API (mais le code est dans le commit déployé) |
| 8-0.3 (JWT_SECRET hardening) | ✅ **PROUVÉ EN PROD** — le serveur refuse de démarrer avec un secret de 31 chars |
| 8-0.4 (AdminConventions sans gate password) | ✅ **PROUVÉ EN PROD** — la page `/creer-espace` est accessible sans demander de mot de passe, et la route `/admin/conventions` n'a plus de gate client-side |
| 8-0.5 (gitleaks workflow) | ✅ Le workflow est défini dans le repo GitHub (déclenché au prochain push) |
| 8-4 (PDF binaire avec pdf-lib) | Non vérifiable en prod (API en panne) |
| 8-5.3 (lazy loading) | ✅ **PROUVÉ EN PROD** — le bundle principal de la homepage est passé sous la barre des 500 KB |
| 8-A (mode paie CONVENTIONNEL) | Non vérifiable en prod (API en panne) |
| 8-E (endpoints contrat reactiver/terminer/dupliquer) | Non vérifiable en prod (API en panne) |

---

## 6. STOP 1 — attente action humaine

Cet agent attend :
- [ ] Régénération du `JWT_SECRET` Vercel (≥ 32 chars, recommandé 64 chars)
- [ ] Rotation du mot de passe Neon DB owner
- [ ] Révocation du token GitHub exposé

Dès que ces 3 actions sont faites, l'agent peut :
1. Rejouer la matrice de vérité complète (16 lignes + RBAC)
2. Créer un espace de test via `/creer-espace` (email `e2e-lot8-*@test.tn`)
3. Produire un `VERIFICATION_PROD_LOT8.md` complet avec verdict WORKS / BROKEN / NO LINK par ligne + reproduction steps pour les BROKEN
4. Ne **pas** faire tourner le script de cleanup (besoin du DATABASE_URL prod — action humaine)
