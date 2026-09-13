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
