# ROADMAP.md — Phases de développement Le Fiduciaire

## Phase 1 : Neon, Prisma et authentification
- **Statut** : ✅ Terminée
- **Commit** : `0158d45`

## Phase 2 : Entreprises clientes et établissements
- **Statut** : ✅ Terminée
- **Fichiers** : `server/routes/clients.ts`, migration `phase2_clients_establishments`

## Phase 3 : Salariés, contrats et conventions collectives
- **Statut** : ✅ Terminée
- **Fichiers** : `server/routes/contracts.ts`, `server/routes/conventions.ts`, migration `phase3_contracts_referentiels`

## Phase 4 : Calendriers, règles et pointage mensuel
- **Statut** : ✅ Terminée
- **Fichiers** : `server/routes/calendars.ts`, `server/routes/regles.ts`, `server/routes/attendance.ts`, migration `phase4_pointage_mensuel`

## Phase 5 : Période de paie et moteur central
- **Statut** : ✅ Terminée
- **Fichiers** : `server/routes/payroll.ts`, `server/lib/payroll-engine.ts`, migration `phase5_paie_mensuelle`

## Phase 6 : Documents, PDF et stockage
- **Statut** : ✅ Terminée
- **Fichiers** : `server/routes/documents.ts`, `server/lib/document-generator.ts`, migration `phase6_documents`

## Phase 7 : Déclarations CNSS trimestrielles
- **Statut** : ✅ Terminée
- **Fichiers** : `server/routes/cnss.ts`, `server/lib/cnss-export.ts`

## Phase 8 : Audit, archivage et paie complémentaire
- **Statut** : ✅ Terminée
- **Fichiers** : `server/lib/audit-log.ts`, modèle `AuditLog`

## Phase 9 : Dashboard et alertes
- **Statut** : ✅ Terminée
- **Fichiers** : `server/routes/dashboard.ts`, `server/routes/reports.ts`

---

## Phase 10 : Frontend ↔ Backend (EN COURS)
- **Statut** : 🔄 En cours
- **Objectif** : Connecter les pages frontend aux API backend (CRUD réel)
- **Pages à connecter** :
  - [x] Login → `/api/auth`
  - [x] Dashboard Cabinet → `/api/dashboard/cabinet`
  - [x] Dashboard Workspace → `/api/dashboard/workspace`
  - [x] Audit Log → `/api/dashboard/audit`
  - [ ] Gestion Clients → `/api/clients`
  - [ ] Gestion Contrats → `/api/contracts`
  - [ ] Gestion Conventions → `/api/conventions`
  - [ ] Gestion Paie → `/api/payroll`
  - [ ] Gestion Pointage → `/api/attendance`
  - [ ] Gestion CNSS → `/api/cnss`
  - [ ] Gestion Documents → `/api/documents`

---

## Phases backend (1–9) : ✅ Toutes terminées
## Phase frontend-backend (10) : 🔄 En cours

## 2026-09-19 — Lot 8 (contenir, prouver, fiabiliser)

### Réalisé cette session
- [x] Lot 8-0.1 — Audit secrets git (rapport dans docs/AUDIT_SECRETS_LOT8.md)
- [x] Lot 8-0.2 — Credentials retirés des docs (CHANGELOG, PROJECT_CONTEXT, README)
- [x] Lot 8-0.3 — JWT_SECRET hardening (>= 32 chars en prod) + 8 tests
- [x] Lot 8-0.4 — Route /admin/conventions protégée par RBAC PROPRIETAIRE (plus de gate client-side)
- [x] Lot 8-0.5 — Workflow gitleaks ajouté (.github/workflows/gitleaks.yml)
- [x] Lot 8-2 — Analyse centimes vs millimes (docs/DECISION_ROUNDING_LOT8.md)
- [x] Lot 8-3.1 — 40 nouveaux tests unitaires serveur (money, payroll-engine, cnss-export)
- [x] Lot 8-3.2 — Cross-test serveur → client validator CNSS
- [x] Lot 8-3.3 — Tag v1.0.1 poussé pour déclencher la CI
- [x] Lot 8-4 — Vrai PDF binaire avec pdf-lib (10 tests)
- [x] Lot 8-5.1 — package-lock.json supprimé + .gitignore
- [x] Lot 8-5.2 — %VITE_ANALYTICS_*% retirés de client/index.html
- [x] Lot 8-5.3 — Route-level lazy loading (bundle principal -49%)
- [x] Lot 8-5.4 — Docs truthfully mises à jour

### En attente (action humaine requise)
- [ ] **Lot 8-0 STOP 0** : rotation du mot de passe Neon DB owner
- [ ] **Lot 8-1** : vérification production sur https://fiduciaire-nine.vercel.app (16-row truth matrix + docs/VERIFICATION_PROD_LOT8.md)
- [ ] **Lot 8-2 STOP 2** : décision centimes vs millimes (Stratégie A recommandée)

### Pas abordé (hors-scope Lot 8)
- Primes conventionnelles en mode CONVENTIONNEL (nécessite migration shared/)
- Migration SQL pour Lot 8-A (db push utilisé pour l'instant)
- Réécriture de l'historique git (git filter-repo) — optionnel, voir docs/AUDIT_SECRETS_LOT8.md §7

## 2026-09-19 (clôture Lot 8)

### Statut final du Lot 8

**Lot 8 est officiellement clôturé** par décision utilisateur.

#### Tâches terminées (agent)
- [x] Lot 8-0.1 — Audit secrets git (rapport dans `docs/AUDIT_SECRETS_LOT8.md`)
- [x] Lot 8-0.2 — Credentials retirés des docs (CHANGELOG, PROJECT_CONTEXT, README)
- [x] Lot 8-0.3 — JWT_SECRET hardening (>= 32 chars en prod) + 8 tests
- [x] Lot 8-0.4 — Route /admin/conventions protégée par RBAC PROPRIETAIRE
- [x] Lot 8-0.5 — Workflow gitleaks ajouté
- [x] Lot 8-2 — Analyse centimes vs millimes (read-only, `docs/DECISION_ROUNDING_LOT8.md`)
- [x] Lot 8-3.1 — 40 nouveaux tests unitaires serveur (money, payroll-engine, cnss-export)
- [x] Lot 8-3.2 — Cross-test serveur → client validator CNSS
- [x] Lot 8-3.3 — Tag v1.0.1 poussé pour déclencher la CI
- [x] Lot 8-4 — Vrai PDF binaire avec pdf-lib (10 tests)
- [x] Lot 8-5.1 — package-lock.json supprimé + .gitignore
- [x] Lot 8-5.2 — %VITE_ANALYTICS_*% retirés de client/index.html
- [x] Lot 8-5.3 — Route-level lazy loading (bundle principal -49%)
- [x] Lot 8-5.4 — Docs truthfully mises à jour
- [x] Lot 8-A — Paie simple OU conventionnelle au choix (modePaie enum + UI)
- [x] Lot 8-A (suite) — Primes conventionnelles appliquées en mode CONVENTIONNEL (shared/ + moteur serveur)
- [x] Lot 8-A (suite) — Migration SQL pour prod (`prisma/migrations/20260919140000_lot8_payroll_conventionnel/migration.sql`)
- [x] Lot 8-B — Wizard employé → contrat initial
- [x] Lot 8-C — Diagnostic détaillé calculate (noms des salariés concernés)
- [x] Lot 8-D — Brut indicatif vs brut effectif
- [x] Lot 8-E — Endpoints contrat reactiver/terminer/dupliquer + boutons UI
- [x] Lot 8 (optionnel) — Procédure git filter-repo documentée (non exécutée)

#### Actions humaines zappées par utilisateur (DEFERRED post-Lot-8)
- [ ] ~~Lot 8-0 STOP 0 — Rotation du mot de passe Neon DB owner~~ → ⏭️ ZAPPÉ
- [ ] ~~Lot 8-1 — Vérification production complète (16-row truth matrix)~~ → ⏭️ ZAPPÉ (prod en panne, jwt_secret court)
- [ ] ~~Lot 8-2 STOP 2 — Décision centimes vs millimes~~ → ⏭️ ZAPPÉ (analyse read-only conservée)
- [ ] ~~Optionnel : git filter-repo~~ → ⏭️ ZAPPÉ (procédure documentée, non exécutée)

#### Métriques finales du Lot 8

| Métrique | Avant Lot 8 | Après Lot 8 | Delta |
|---|---|---|---|
| Tests unitaires | 257 | **319** | +62 |
| Tests E2E (real DB) | 36 | **36** | 0 |
| Total tests | 293 | **355** | +62 |
| Bundle principal | 968 KB | **492 KB** | -49% |
| TypeScript type-check | 0 erreur | 0 erreur | 0 |
| Commits poussés | — | **15+** | — |
| Tags poussés | — | **2** (v1.0.1, v1.0.2) | — |

Le Lot 8 est clos. Les actions humaines restent DEFERRED et pourront être reprises dans un lot ultérieur si l'utilisateur le souhaite.
