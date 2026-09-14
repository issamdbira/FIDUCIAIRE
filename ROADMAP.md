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
