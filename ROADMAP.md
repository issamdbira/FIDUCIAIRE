# ROADMAP.md — Phases de développement Le Fiduciaire

## Phase 1 : Neon, Prisma et authentification
- **Statut** : 🔴 À démarrer
- **Estimation tokens** : ~15 000
- **Fichiers concernés** :
  - `prisma/schema.prisma` (enrichir)
  - `server/index.ts` (API routes DB)
  - `client/src/lib/payroll/config.ts` (migration localStorage → DB)
  - `.env` / `.env.example` (DATABASE_URL)
  - Nouveau : `client/src/lib/db.ts` (client Prisma)
  - Nouveau : `client/src/lib/auth.ts` (auth)
  - Nouveau : `server/routes/auth.ts`
  - Nouveau : `server/routes/config.ts`
- **Sous-étapes** :
  1. Configurer Neon + Prisma + `.env` + migration initiale
  2. Schéma DB : `users`, `payroll_config`, `organizations`
  3. API routes CRUD config paie
  4. Migration `config.ts` : localStorage → fetch API
  5. Auth simple (JWT ou session)
  6. Build + test + commit

## Phase 2 : Entreprises clientes et établissements
- **Statut** : ⚪ En attente Phase 1
- **Estimation tokens** : ~12 000
- **Fichiers concernés** :
  - `prisma/schema.prisma` (tables `entreprises`, `etablissements`)
  - Nouveau : `server/routes/entreprises.ts`
  - Nouveau : `client/src/pages/Entreprises.tsx`
  - Nouveau : `client/src/pages/Etablissements.tsx`
- **Sous-étapes** :
  1. Schéma entreprises + établissements
  2. CRUD API + UI
  3. Navigation + commit

## Phase 3 : Salariés et contrats
- **Statut** : ⚪ En attente Phase 2
- **Estimation tokens** : ~15 000
- **Fichiers concernés** :
  - `prisma/schema.prisma` (tables `salaries`, `contrats`)
  - Nouveau : `server/routes/salaries.ts`
  - Nouveau : `client/src/pages/Salaries.tsx`

## Phase 4 : Conventions et paramètres client
- **Statut** : ⚪ En attente Phase 3
- **Estimation tokens** : ~10 000
- **Fichiers concernés** :
  - `client/src/lib/conventions/` (liaison DB)
  - `prisma/schema.prisma` (table `convention_params`)

## Phase 5 : Import pointage mensuel Excel/CSV
- **Statut** : ⚪ En attente Phase 4
- **Estimation tokens** : ~12 000
- **Fichiers concernés** :
  - Nouveau : `client/src/lib/import-pointage.ts`
  - Nouveau : `client/src/pages/ImportPointage.tsx`

## Phase 6 : Période de paie et moteur central
- **Statut** : ⚪ En attente Phase 5
- **Estimation tokens** : ~15 000
- **Fichiers concernés** :
  - `client/src/lib/payroll/engine.ts` (enrichir)
  - `prisma/schema.prisma` (tables `periodes_paie`, `lignes_paie`)

## Phase 7 : Bulletins PDF individuels
- **Statut** : ⚪ En attente Phase 6
- **Estimation tokens** : ~10 000
- **Fichiers concernés** :
  - `client/src/pages/calculateurs/GenerateurFichePaie.tsx` (enrichir)

## Phase 8 : Déclarations CNSS trimestrielles
- **Statut** : ⚪ En attente Phase 7
- **Estimation tokens** : ~12 000
- **Fichiers concernés** :
  - `client/src/lib/cnss-declarations/` (enrichir)
  - `prisma/schema.prisma` (table `declarations_cnss`)

## Phase 9 : Audit, archivage et accès client limité
- **Statut** : ⚪ En attente Phase 8
- **Estimation tokens** : ~10 000
- **Fichiers concernés** :
  - Nouveau : `client/src/pages/Audit.tsx`
  - Nouveau : `client/src/pages/ClientPortal.tsx`

---

## Total estimé : ~111 000 tokens (9 phases)
