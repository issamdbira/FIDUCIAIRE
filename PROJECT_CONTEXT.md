# PROJECT_CONTEXT.md — Le Fiduciaire

## Identité
- **Nom** : Le Fiduciaire
- **Positionnement** : La boîte à outils de gestion tunisienne (PAS un SIRH complet)
- **Spécialité actuelle** : Paie, CNSS, IRPP

## Stack technique
- React 19 + TypeScript + Vite 7.1 + Tailwind CSS 4 + shadcn/ui + Wouter routing
- **Serveur** : Express + Vite SSR / Vercel serverless (`server/index.ts`)
- **Base de données** : Neon PostgreSQL (connectée — Phase 1 terminée)
- **ORM** : Prisma 6.19 (schéma `prisma/schema.prisma`, migration appliquée)
- **Auth** : bcryptjs + JWT + sessions DB (roles PROPRIETAIRE/GESTIONNAIRE/LECTEUR)
- **Identité visuelle** : navy `#1e3a5f` / gold `#c9a84c` / Montserrat-Inter

## Architecture actuelle
```
repo/
├── client/src/
│   ├── lib/payroll/          # Moteur de paie (config.ts, engine.ts, irpp.ts, cnss.ts, netToBrut.ts)
│   ├── lib/conventions/      # Moteur conventions collectives (engine.ts, data/, types.ts)
│   ├── lib/cnss-declarations/ # Déclarations CNSS (validator, generator, import, tester)
│   ├── pages/                # Pages (Home, Admin, calculateurs/, conventions/, guides/)
│   ├── components/           # Composants UI (CalculationSource, Layout, ThemeToggle)
│   └── contexts/             # ThemeContext
├── server/
│   ├── index.ts              # Express + API routes + SSR
│   ├── lib/prisma.ts         # Client Prisma singleton (Neon serverless)
│   ├── lib/auth.ts           # bcrypt + JWT (sign/verify/hash)
│   └── routes/
│       ├── auth.ts           # /api/auth/* (register, login, logout, me, pending, validate)
│       └── config.ts         # /api/config/* (GET/PUT/POST reset par workspace)
├── prisma/
│   ├── schema.prisma         # 8 tables (users, sessions, workspaces, workspace_members, payroll_configs, tranches_irpp, contacts, employees)
│   ├── seed.ts               # 2 utilisateurs + workspace + config par défaut
│   └── migrations/           # 20260912235826_init_auth_payroll
└── public/formulaires/       # PDFs locaux CNSS
```

## Persistence
- **Base de données Neon** : users, sessions, workspaces, payroll_configs, tranches_irpp
- **localStorage (fallback)** : config paie côté client (sera migré en Phase 2)
- **Statique .ts** : conventions collectives, grilles salariales, coefficients

## Tables DB (Neon PostgreSQL)
| Table | Description |
|---|---|
| `users` | Utilisateurs avec rôles (PROPRIETAIRE/GESTIONNAIRE/LECTEUR) + statut validation |
| `sessions` | Sessions JWT (token, expiration) |
| `workspaces` | Entreprises clientes de la fiduciaire |
| `workspace_members` | Lien utilisateur ↔ workspace avec rôle |
| `payroll_configs` | Config paie par workspace (CNSS, CSS, IRPP, déductions) |
| `tranches_irpp` | Barème IRPP par config (8 tranches, ordre garanti) |
| `contacts` | Contacts (clients/fournisseurs) |
| `employees` | Employés/salariés |

## Utilisateurs seedés
⚠️ **Aucun mot de passe n'est committé** — le seeding nécessite les variables d'environnement `SEED_PROPRIETAIRE_PASSWORD` et `SEED_GESTIONNAIRE_PASSWORD`. Les emails seedés (`proprietaire@lefiduciaire.tn`, `gestionnaire@lefiduciaire.tn`) ne doivent **jamais** être utilisés en production — réservés au dev local.

| Email | Rôle (dev local) |
|---|---|
| proprietaire@lefiduciaire.tn | PROPRIETAIRE |
| gestionnaire@lefiduciaire.tn | GESTIONNAIRE |

## Valeurs de calcul vérifiées (2026-09-13)
- Barème IRPP : 8 tranches (0–40%) — CORRECT
- CNSS non-agricole : 9.68% salarial / 17.07% patronal — CORRECT
- CSS 2026 : 0% (supprimée LF 2026 art. 23) — CORRIGÉ
- SMIG 2026 48h : 554.736 DT/mois (2.667 DT/h) — CORRIGÉ
- Déductions IRPP : chef 300 DT, enfant 100 DT (max 4), parents 5% plafonné 450 DT — CORRECT

## Sources autorisées (3 uniquement)
1. travailjuripratique.tn (FR)
2. cnss.tn (bilingue FR/AR)
3. secu.tn (FR)

## Déploiement
- GitHub : `github.com/issamdbira/FIDUCIAIRE`
- Vercel : `https://fiduciaire-nine.vercel.app/`
- Admin : `/admin` et `/admin/conventions` — **le mot de passe par lot est retiré depuis Lot 8-0.4** (la route `/admin/conventions` est désormais protégée par la même règle RBAC PROPRIETAIRE que `/admin`). La variable `VITE_ADMIN_PASSWORD` ne doit plus être utilisée.

## Dernière mise à jour
- 2026-09-13 : Phase 1 — Neon + Prisma + auth JWT + roles + sessions + config paie DB

## Lot 8 (2026-09-19) — État après "contenir, prouver, fiabiliser"

### Sécurité
- **JWT_SECRET** : obligatoire en production (>= 32 chars) — `server/lib/jwt.ts` et `server/lib/auth.ts` refusent de démarrer sinon
- **Route /admin/conventions** : protégée par RBAC PROPRIETAIRE côté serveur (plus de mot de passe dans le bundle JS)
- **Workflow gitleaks** : `.github/workflows/gitleaks.yml` scanne l'historique git à chaque push/PR
- **Audit secrets** : `docs/AUDIT_SECRETS_LOT8.md` — 14 occurrences du mot de passe Neon DB identifiées dans l'historique git (commits `6af3fa2`, `fa1007b`, `4015611`, `8e2cc91`). **En attente de rotation humaine**.

### Mode de paie SIMPLE / CONVENTIONNEL
- `PayrollPeriod.modePaie` : `SIMPLE` (défaut) ou `CONVENTIONNEL`
- En mode CONVENTIONNEL : décompose le brut en `salaireBaseGrille` (grille échelle×échelon×année) + `indemniteSupplementaire` (excédent)
- N'applique PAS encore les primes conventionnelles (itération future)

### PDF bulletins
- `generateBulletinPdf()` : vrai PDF binaire avec pdf-lib (header `%PDF-`, footer `%%EOF`)
- `generateBulletinHtml()` conservé en fallback pour affichage inline

### Bundle
- Route-level lazy loading : 24 pages en `lazy(() => import(...))`
- Bundle principal : **968 KB → 492 KB** (gzip 88 KB, -49%)
- `manualChunks` (Lot 7) : 5 chunks vendor (pdf, spreadsheet, charts, radix, motion)

### Tests
- 307 unitaires / 36 E2E (343 total)
- Tests serveur nouveaux (Lot 8-3.1) : `money.test.ts`, `payroll-engine.test.ts`, `cnss-export.test.ts`, `document-generator.test.ts`, `jwt-secret-hardening.test.ts`

### Documentation
- `docs/AUDIT_SECRETS_LOT8.md` — rapport masqué de l'audit git history
- `docs/DECISION_ROUNDING_LOT8.md` — analyse centimes vs millimes (read-only, en attente décision)
- `docs/VERIFICATION_PROD_LOT8.md` — À PRODUIRE (Phase 1 non faite)
