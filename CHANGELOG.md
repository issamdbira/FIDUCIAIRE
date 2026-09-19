# CHANGELOG.md — Historique des modifications

## 2026-09-13 — Phase 1 : Neon + Prisma + Auth

### Infrastructure base de données
- **Neon PostgreSQL** connecté via `DATABASE_URL`
- **Prisma 6.19** : schéma enrichi, migration `20260912235826_init_auth_payroll` appliquée
- **8 tables créées** : users, sessions, workspaces, workspace_members, payroll_configs, tranches_irpp, contacts, employees

### Authentification réelle
- **bcryptjs + JWT** : hash/verify mots de passe, sign/verify tokens
- **Sessions DB** : invalidation possible, expiration 7 jours
- **Rôles** : PROPRIETAIRE (accès global), GESTIONNAIRE (par workspace), LECTEUR (consultation)
- **Validation obligatoire** : inscription → EN_ATTENTE → validation par PROPRIETAIRE
- **API routes** : POST /api/auth/register, /login, /logout, GET /me, /pending, POST /validate

### Config paie en base
- **payroll_configs** : CNSS, CSS, IRPP, déductions familiales par workspace
- **tranches_irpp** : barème IRPP en tranches séparées (flexibilité par workspace)
- **API routes** : GET/PUT /api/config/:workspaceId, POST /reset

### Utilisateurs seedés
- Les emails seedés (`proprietaire@lefiduciaire.tn`, `gestionnaire@lefiduciaire.tn`) ne sont plus créés par défaut — **le seeding nécessite désormais des variables d'environnement** `SEED_PROPRIETAIRE_PASSWORD` et `SEED_GESTIONNAIRE_PASSWORD` (voir `prisma/seed.ts`).
- Les mots de passe par défaut ont été retirés de ce document — **ne jamais committer de credentials en clair** (cf. Lot 8-0.1 audit).
- Workspace : `Fiduciaire — Cabinet principal`

### Fichiers créés
- `server/lib/prisma.ts` — Client Prisma singleton
- `server/lib/auth.ts` — bcrypt + JWT
- `server/routes/auth.ts` — API auth
- `server/routes/config.ts` — API config paie
- `prisma/seed.ts` — Script seed
- `.env.example` — Variables d'environnement template

### Vérifications
- 79 tests passent ✅
- TypeScript `--noEmit` OK ✅
- Vite build OK ✅

- Commit : `0158d45`

---

## 2026-09-13 — Phase 2 : Entreprises clientes & établissements

- **Modèles** : `ClientCompany`, `Establishment` (multi-établissement par entreprise)
- **Migration** : `20260913070000_phase2_clients_establishments`
- **API routes** : POST/GET/PUT `/api/clients`, PATCH archive/activate, POST/PUT établissements
- **Champs** : raisonSociale, matriculeFiscal, matriculeCnss, codeTVA, secteur, adresse, contacts
- Commit : intégré dans le build Phase 1-9

---

## 2026-09-13 — Phase 3 : Contrats de travail & conventions collectives

- **Modèles** : `Contract`, `ContractVersion`, `ConventionCollective`, `ConventionArticle`, `ConventionGrilleSalariale`, `ConventionAdaptation`, `WorkCalendar`, `WorkCalendarDay`, `RegleReglementaire`
- **Migration** : `20260913120000_phase3_contracts_referentiels`
- **API routes** : `/api/contracts` (CRUD + versions + résilier/suspendre), `/api/conventions` (CRUD + articles + grille + adaptations), `/api/calendars`, `/api/regles`

---

## 2026-09-13 — Phase 4 : Pointage mensuel

- **Modèles** : `AttendanceImport`, `AttendanceSummary`, `PayrollVariable`
- **Migration** : `20260913090000_phase4_pointage_mensuel`
- **API routes** : `/api/attendance` (import, validate, summaries, variables)

---

## 2026-09-13 — Phase 5 : Paie mensuelle

- **Modèles** : `PayrollPeriod`, `Payslip`, `Anomaly`
- **Migration** : `20260913140000_phase5_paie_mensuelle`
- **API routes** : `/api/payroll` (périodes, calcul, validation, fiches, anomalies, audit)
- **Lib** : `server/lib/payroll-engine.ts` — moteur de calcul central

---

## 2026-09-13 — Phase 6 : Documents & stockage

- **Modèle** : `DocumentStorage`
- **Migration** : `20260913150000_phase6_documents`
- **API routes** : `/api/documents` (génération PDF/Excel, export, stockage)
- **Lib** : `server/lib/document-generator.ts`

---

## 2026-09-13 — Phase 7 : Déclarations CNSS

- **Modèle** : `CNSSDeclaration`
- **API routes** : `/api/cnss` (déclarations trimestrielles, export TXT, validation)
- **Lib** : `server/lib/cnss-export.ts`

---

## 2026-09-13 — Phase 8 : Audit & paie complémentaire

- **Modèle** : `AuditLog`
- **Lib** : `server/lib/audit-log.ts`
- **API routes** : compléments paie dans `/api/payroll`

---

## 2026-09-13 — Phase 9 : Dashboard & alertes

- **API routes** : `/api/dashboard` (cabinet, workspace, alerts), `/api/reports`

---

## 2026-09-14 — Fix : Crash Vercel SyntaxError `_fu` déjà déclaré

- **Problème** : `scripts/vercel-build.mjs` injectait un polyfill CJS qui redéclarait `_fu` (fileURLToPath) déjà présent dans le bundle esbuild
- **Correction** : Suppression des imports dupliqués du polyfill, réutilisation de `_fu` et `_dn` du bundle
- **Résultat** : `/api/health` retourne `200 OK` avec `database: "connected"`
- Commit : `151db69`

---

## 2026-09-13 — Session IM (précédent)

### Corrections valeurs de calcul
- **CSS 2026** : `cssActive: true, cssTaux: 0.005` → `cssActive: false, cssTaux: 0` (LF 2026 art. 23)
- **SMIG horaire 48h** : `2.668` → `2.667` (554.736 / 208 = 2.667 DT/h)
- Commit : `2eb490f`

### Accueil — 4 modifications
- **MOD1** : 11 outils regroupés en 3 sections
- **MOD2** : Descriptions orientées résultat
- **MOD3** : Aperçu calcul réel via `runPayrollEngine`
- **MOD4** : `CalculationSource` enrichi
- Commit : `dbb303f`

### Fichiers de contexte créés
- `PROJECT_CONTEXT.md`, `DECISIONS.md`, `ROADMAP.md`, `CHANGELOG.md`
- Commit : `5775d0d`

## 2026-09-19 — Lot 8 : Contenir, prouver, fiabiliser

### Lot 8-0 — Containment (sécurité)
- **8-0.1** : Audit secrets de l'historique git (193 commits scannés) → `docs/AUDIT_SECRETS_LOT8.md`. 14 occurrences du mot de passe Neon DB identifiées dans les commits `6af3fa2`, `fa1007b`, `4015611`, `8e2cc91`. **En attente de rotation du mot de passe par l'humain**.
- **8-0.2** : Credentials par défaut retirés de `CHANGELOG.md`, `PROJECT_CONTEXT.md`, `README.md` (`Fiduciaire2026!`, `Gestion2026!`, `fiduciaire2026` ne sont plus dans HEAD).
- **8-0.3** : `server/lib/jwt.ts` et `server/lib/auth.ts` refusent désormais de démarrer en production (`NODE_ENV=production` ou `VERCEL=1`) si `JWT_SECRET` est manquant ou < 32 chars. 8 tests unitaires `jwt-secret-hardening.test.ts`.
- **8-0.4** : Route `/admin/conventions` — retrait du gate client-side (mot de passe `fiduciaire2026` dans le bundle JS). Désormais protégée par la même règle RBAC PROPRIETAIRE que `/admin` (vérification côté serveur). Variable `VITE_ADMIN_PASSWORD` dépréciée.
- **8-0.5** : Workflow `.github/workflows/gitleaks.yml` ajouté — scanne l'historique git complet à chaque push/PR avec gitleaks-action@v2 (rapport SARIF uploadé en code scanning + artifact).

### Lot 8-2 — Analyse arrondi (centimes vs millimes)
- `docs/DECISION_ROUNDING_LOT8.md` : analyse read-only des 22 call sites `round2Exact` et du code mort `round3Exact`. Recommandation : Stratégie A (rupture millimes) pour conformité réglementaire + cohérence avec mode CONVENTIONNEL (Lot 8-A). **En attente de décision humaine**.

### Lot 8-3 — Tests
- **8-3.1** : 40 nouveaux tests unitaires serveur pour `server/lib/money.test.ts` (16), `server/lib/payroll-engine.test.ts` (11), `server/lib/cnss-export.test.ts` (13). Cas à la main : salaire 1500 DT, CNSS 9.68%, IRPP barème progressif, déductions familiales annuelles, plafond CNSS 6000 DT, secteurs agricole/non-agricole, congés payés rémunérés (P1-6), SMIG floor.
- **8-3.2** : Cross-test serveur → client — `cnss-export.test.ts` CNSS-5 extrait les matricules du TXT généré et les valide via `validerSalarie()` du client.
- **8-3.3** : Tag `v1.0.1` poussé pour déclencher le workflow CI défini dans `.github/workflows/ci.yml` (lane E2E avec `postgres:16-alpine` service + `prisma migrate deploy` + 36 tests E2E). CI : https://github.com/issamdbira/FIDUCIAIRE/actions
- Total tests : **307 unitaires / 36 E2E** (343 au total).

### Lot 8-4 — Vrai PDF bulletins
- `server/lib/document-generator.ts` : nouvelle fonction `generateBulletinPdf()` utilisant **pdf-lib** (déjà en deps).
- Produit un vrai PDF binaire : header `%PDF-1.7`, footer `%%EOF`, streams `FlateDecode`, métadonnées Title/Author/Creator.
- Contenu : en-tête employeur + identification salarié + tableau éléments de paie + NET À PAYER en gras.
- 10 tests unitaires `document-generator.test.ts` (vérifient magic bytes, structure, mimeType `application/pdf`).
- `generateBulletinHtml()` conservé pour l'affichage inline navigateur (fallback).

### Lot 8-5 — Hygiène
- **5-1** : `package-lock.json` supprimé (531 KB) + ajouté à `.gitignore`. CI utilise `pnpm install --frozen-lockfile`.
- **5-2** : Placeholders `%VITE_ANALYTICS_ENDPOINT%` et `%VITE_ANALYTICS_WEBSITE_ID%` retirés de `client/index.html`. Plus de warnings Vite au build. L'analytics (Umami) doit être injecté côté serveur (Vercel rewrite), pas via env vars client.
- **5-3** : Route-level lazy loading dans `client/src/App.tsx` — 24 pages converties en `lazy(() => import(...))`, Suspense wrapper. Bundle principal : **968 KB → 492 KB** (gzip 173 → 88 KB, -49%). 14 chunks lazy-loadables.
- **5-4** : Mise à jour truthful de `CHANGELOG.md`, `PROJECT_CONTEXT.md`, `README.md` (cette entrée).

### Lot 8-A — Paie simple OU conventionnelle (au choix)
- `prisma/schema.prisma` : enum `ModePaie` (SIMPLE / CONVENTIONNEL) + `PayrollPeriod.modePaie` (default SIMPLE) + `Payslip.salaireBaseGrille` + `Payslip.indemniteSupplementaire` (nullable).
- `server/lib/payroll-engine.ts` : `MassPayrollInput.modePaie` + `MassPayrollResult.diagnostics` (salariesSansContratActif[], salariesSansPointage[], salariesSansConvention[], salariesSalaireSousGrille[]).
- En mode CONVENTIONNEL : décompose le brut en `salaireBaseGrille` (grille échelle×échelon×année) + `indemniteSupplementaire` (excédent). Anomalie `CONVENTION_MANQUANTE` si le contrat n'a pas de convention.
- `server/routes/payroll.ts` : POST /periods accepte `modePaie` ; PATCH /calculate le passe au moteur.
- `client/src/pages/gestion/GestionPaie.tsx` : sélecteur Mode de paie dans le dialog de création de période + diagnostics détaillés dans le toast.
- `client/src/pages/gestion/GestionContrats.tsx` : label "Salaire brut mensuel indicatif (TND)" + help text sur la décomposition.

### Lot 8-B — Wizard employé → contrat
- `client/src/pages/gestion/GestionEmployes.tsx` : après création, le toast propose un lien vers Gestion des contrats avec le nom du salarié créé.

### Lot 8-C — Diagnostic détaillé du calcul
- `MassPayrollResult.diagnostics` retourné dans la réponse API de PATCH /calculate.
- Toast UI affiche les noms des salariés concernés (sans contrat, sans pointage, sans convention, sous-grille) pendant 9 s.

### Lot 8-D — Brut indicatif vs brut effectif
- `GestionContrats.tsx` : label "Salaire brut mensuel indicatif" + help text.
- `Payslip` stocke `salaireBaseGrille` + `indemniteSupplementaire` quand mode CONVENTIONNEL.

### Lot 8-E — Endpoints contrat manquants
- `server/routes/contracts.ts` : 3 nouvelles routes
  - `PATCH /:ws/:id/reactiver` — réactiver un contrat SUSPENDU → ACTIF
  - `PATCH /:ws/:id/terminer` — terminer un CDD/SAISONNIER/STAGE/INTERIM (CDI non-éligible)
  - `POST /:ws/:id/dupliquer` — créer un nouveau contrat par duplication (renouvellement)
- `GestionContrats.tsx` : 3 nouveaux boutons dans le dropdown menu (PlayCircle/CheckCircle2/Copy icons) + affichage contextuel.
- Audit log pour chaque action : CONTRACT_REACTIVER, CONTRACT_TERMINER, CONTRACT_DUPLIQUER.

### Non fait (encore en attente)
- **Lot 8-1 — Vérification production** : pas encore effectuée. Nécessite la rotation du mot de passe Neon (Lot 8-0 STOP 0) + création d'un espace de test via `/creer-espace` sur `https://fiduciaire-nine.vercel.app` + replay de la matrice de vérité 16 lignes.
- **Lot 8-2 — Décision arrondi** : analyse produite, décision humaine en attente (Stratégie A recommandée).
- **Primes conventionnelles** : le mode CONVENTIONNEL (Lot 8-A) décompose le brut en grille + indemnité mais n'applique pas encore les primes de la convention (prime de caisse, prime de responsabilité, etc.). Nécessite de migrer les fichiers statiques `client/src/lib/conventions/data/{cadre,commerce-gros}.ts` vers un module `shared/` que le serveur peut importer. Itération future.
- **Migration SQL pour Lot 8-A** : `prisma/migrations/..._lot8_payroll_conventionnel/migration.sql` non créée — le schéma est appliqué via `db push` (pas via `migrate deploy`). À créer pour la prod.

### Vérification (VERIFIED LOCALLY contre PGlite WASM)
- TypeScript type-check : 0 erreur
- Suite unitaire + sécurité : 307/307 passent (27 fichiers)
- Suite E2E (real DB, no mocks) : 36/36 passent (2 fichiers)
- Production Vite build : 2676 modules, 10.8 s, bundle principal 492 KB (gzip 88 KB)

### Lot 8 — CLÔTURE OFFICIELLE (2026-09-19)

Le Lot 8 est officiellement clôturé par décision utilisateur. Les 5 actions humaines bloquantes (rotation JWT_SECRET, rotation mot de passe Neon, révocation token GitHub, décision centimes vs millimes, git filter-repo) ont été **zappées et dépassées** par l'utilisateur.

#### Commits poussés pendant le Lot 8 (15+ commits)
- `27de252` — Lot 8-0.1 : audit secrets git
- `820a4a2` — Lot 8-0.2 : credentials retirés des docs
- `9420372` — Lot 8-0.3 : JWT_SECRET hardening + 8 tests
- `4807b92` — Lot 8-0.4 : AdminConventions sans gate password
- `f2b3c8d` — Lot 8-0.5 : workflow gitleaks
- `46b157d` — Lot 8-2 : analyse centimes vs millimes (read-only)
- `94d6c31` — Lot 8-3.1 : 40 tests unitaires serveur
- `18ab02c` — Lot 8-3.2 : cross-test CNSS
- `d6b66fd` — Lot 8-4 : PDF binaire avec pdf-lib
- `9739083` — Lot 8-5.1/2/3 : hygiène (package-lock retiré, VITE_ANALYTICS retiré, lazy loading)
- `b4b08aa` — Lot 8-5.4 : docs truthfully
- `2cf0488` — Lot 8-1 (PARTIAL puis DEFERRED) : prod verification
- `3f4f2d6` — Lot 8 (suite) : primes conventionnelles (shared/)
- `c34a114` — Lot 8-A : migration SQL pour prod
- `9aaf0b1` — Lot 8 (optionnel) : procédure git filter-repo documentée

#### Vérifications finales (VERIFIED LOCALLY)
- TypeScript type-check : 0 erreur
- Tests unitaires : 319/319 passent (28 fichiers)
- Tests E2E : 36/36 passent (2 fichiers)
- Vite build : bundle principal 492 KB (gzip 88 KB)

#### État de la prod (NON vérifié complètement)
- Site statique : ✅ HTTP 200 (rendu SPA OK)
- Sécurité headers : ✅ tous présents (CSP, HSTS, XFO, Referrer, Permissions)
- Auto-deploy depuis main : ✅ confirmé (Vercel)
- API : ⚠️ en panne — JWT_SECRET Vercel actuel fait 31 caractères, le hardening Lot 8-0.3 refuse de démarrer (comportement attendu)
- Matrice 16 lignes (P0-1 à RBAC) : ❌ NOT VERIFIED — reporté à un lot ultérieur

#### Actions humaines DEFERRED (zappées par utilisateur)
- [DEFERRED] Régénérer `JWT_SECRET` Vercel avec ≥ 32 caractères
- [DEFERRED] Rotater le mot de passe Neon DB owner
- [DEFERRED] Révoquer le token GitHub `ghp_x60M...`
- [DEFERRED] Décider centimes vs millimes (Stratégie A recommandée, non appliquée)
- [DEFERRED] Exécuter git filter-repo (procédure documentée)
