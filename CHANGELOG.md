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
- Propriétaire : `proprietaire@lefiduciaire.tn` / `Fiduciaire2026!`
- Gestionnaire : `gestionnaire@lefiduciaire.tn` / `Gestion2026!`
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
