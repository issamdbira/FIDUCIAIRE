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
| Email | Rôle | Mot de passe |
|---|---|---|
| proprietaire@lefiduciaire.tn | PROPRIETAIRE | Fiduciaire2026! |
| gestionnaire@lefiduciaire.tn | GESTIONNAIRE | Gestion2026! |

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
- Admin : `/admin` et `/admin/conventions` (mdp `fiduciaire2026`)

## Dernière mise à jour
- 2026-09-13 : Phase 1 — Neon + Prisma + auth JWT + roles + sessions + config paie DB
