# ROADMAP.md — Phases de développement Le Fiduciaire

## Phase 1 : Neon, Prisma et authentification
- **Statut** : ✅ Terminée
- **Commit** : `0158d45`
- **Tokens consommés** : ~14 000

## Phase 2 : Entreprises clientes et établissements
- **Statut** : 🔴 À démarrer
- **Estimation tokens** : ~12 000
- **Fichiers concernés** :
  - `prisma/schema.prisma` (enrichir Workspace + Etablissement)
  - `server/routes/entreprises.ts`
  - `client/src/pages/Entreprises.tsx`
  - `client/src/pages/Etablissements.tsx`
  - `client/src/App.tsx` (routes)

## Phase 3 : Salariés et contrats
- **Statut** : ⚪ En attente Phase 2
- **Estimation tokens** : ~15 000

## Phase 4 : Conventions et paramètres client
- **Statut** : ⚪ En attente Phase 3
- **Estimation tokens** : ~10 000

## Phase 5 : Import pointage mensuel Excel/CSV
- **Statut** : ⚪ En attente Phase 4
- **Estimation tokens** : ~12 000

## Phase 6 : Période de paie et moteur central
- **Statut** : ⚪ En attente Phase 5
- **Estimation tokens** : ~15 000

## Phase 7 : Bulletins PDF individuels
- **Statut** : ⚪ En attente Phase 6
- **Estimation tokens** : ~10 000

## Phase 8 : Déclarations CNSS trimestrielles
- **Statut** : ⚪ En attente Phase 7
- **Estimation tokens** : ~12 000

## Phase 9 : Audit, archivage et accès client limité
- **Statut** : ⚪ En attente Phase 8
- **Estimation tokens** : ~10 000

---

## Total estimé : ~96 000 tokens restants (phases 2–9)
