# DECISIONS.md — Décisions architecturales et fonctionnelles

## Décisions prises (irréversibles sauf mention)

| ID | Date | Décision | Raison |
|---|---|---|---|
| D1 | 2026-09 | Positionnement = "boîte à outils", PAS SIRH | Différenciation vs concurrents lourds |
| D2 | 2026-09 | 3 sources autorisées uniquement (travailjuripratique.tn, cnss.tn, secu.tn) | Fiabilité réglementaire |
| D3 | 2026-09 | CSS supprimée en 2026 (cssActive=false) | LF 2026 art. 23 |
| D4 | 2026-09 | Aperçu accueil = vrai moteur (runPayrollEngine), pas statique | Cohérence auto si taux change |
| D5 | 2026-09 | Descriptions outils = verbe d'action + résultat concret | UX non-expert |
| D6 | 2026-09 | CalculationSource enrichi : source + reference + limit + verified | Traçabilité réglementaire |
| D7 | 2026-09 | Neon PostgreSQL pour persistence | Passage localStorage → DB pour multi-utilisateur |
| D8 | 2026-09 | Prisma ORM avec Neon | Meilleur support serverless + migrations auto |
| D9 | 2026-09 | Pas de mention publique des futurs outils (traite, chèque) | Décision produit |
| D10 | 2026-09 | Auth = bcrypt + JWT + sessions DB | Sécurité réelle + invalidation possible |
| D11 | 2026-09 | Rôles : PROPRIETAIRE / GESTIONNAIRE / LECTEUR | Hiérarchie fiduciaire |
| D12 | 2026-09 | Inscription ouverte + validation obligatoire par PROPRIETAIRE | Contrôle d'accès |
| D13 | 2026-09 | Données séparées par workspace (entreprise cliente) | Multi-tenant |
| D14 | 2026-09 | Barème IRPP en tranches séparées (table tranches_irpp) | Flexibilité par workspace |

## Décisions en attente

| ID | Question | Impact | Statut |
|---|---|---|---|
| P1 | Fallback localStorage quand DB inaccessible ? | Offline UX | Reporté après Phase 2 |
| P3 | Multi-établissement par entreprise ? | Modèle DB | À décider Phase 2 |
| P4 | Import pointage : format standard ? | Phase 5 | À décider Phase 5 |

## 2026-09-19 — Lot 8

### D-1 : JWT_SECRET obligatoire en production
**Décision** : En production (`NODE_ENV=production` ou `VERCEL=1`), le serveur **refuse de démarrer** si `JWT_SECRET` est manquant ou < 32 caractères. Le fallback dev `"fiduciaire-dev-secret-changez-moi"` reste pour le dev/test uniquement.
**Motif** : le fallback était précédemment utilisé en prod silencieusement si la variable d'env manquait — risque de sécurité. Les tests `jwt-secret-hardening.test.ts` (8 tests) garantissent le comportement.
**Référence** : `server/lib/jwt.ts:14-36`, `server/lib/auth.ts:16-34`.

### D-2 : Route /admin/conventions protégée par RBAC PROPRIETAIRE
**Décision** : Retrait du gate mot de passe client-side (`ADMIN_PASSWORD = "fiduciaire2026"`). Désormais protégée par la même règle RBAC PROPRIETAIRE côté serveur que `/admin`.
**Motif** : le mot de passe était lisible dans le bundle JS. La nouvelle protection vérifie réellement le rôle côté serveur, pas côté navigateur.
**Référence** : `client/src/pages/conventions/AdminConventions.tsx:93-133`.

### D-3 : Route-level lazy loading
**Décision** : 24 pages converties en `lazy(() => import(...))`. Bundle principal réduit de 968 KB à 492 KB (gzip 88 KB vs 173 KB, -49%).
**Motif** : le bundle initial était trop gros (warning Vite), et beaucoup de pages ne sont jamais visitées par un utilisateur donné (login vs gestion vs calculatrices).
**Référence** : `client/src/App.tsx:12-43,61-65,170-172`.

### D-4 : Analyse centimes vs millimes (en attente décision)
**Décision proposée** : Stratégie A (rupture millimes) — recommandée pour conformité réglementaire + cohérence avec mode CONVENTIONNEL (Lot 8-A). Nécessite de remplacer 22 call sites `round2Exact` par `round3Exact`.
**Statut** : En attente de décision humaine (LOT 8-2 STOP 2).
**Référence** : `docs/DECISION_ROUNDING_LOT8.md`.
