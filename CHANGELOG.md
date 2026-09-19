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
