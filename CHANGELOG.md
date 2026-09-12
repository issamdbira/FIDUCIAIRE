# CHANGELOG.md — Historique des modifications

## 2026-09-13 — Session IM

### Corrections valeurs de calcul
- **CSS 2026** : `cssActive: true, cssTaux: 0.005` → `cssActive: false, cssTaux: 0` (LF 2026 art. 23)
- **SMIG horaire 48h** : `2.668` → `2.667` (554.736 / 208 = 2.667 DT/h)
- Commit : `2eb490f`

### Accueil — 4 modifications
- **MOD1** : 11 outils regroupés en 3 sections (Calculs & simulations, Documents & déclarations, Références)
- **MOD2** : Descriptions orientées résultat (verbe d'action + bénéfice concret) pour les 11 outils
- **MOD3** : 3 cartes réassurance remplacées par aperçu calcul réel via `runPayrollEngine` (2500 DT brut, célibataire, 2026)
- **MOD4** : `CalculationSource` enrichi avec props `reference` + `limit` (décret+JORT+date+limite), mis à jour sur 6 calculateurs
- Commit : `dbb303f`

### Fichiers de contexte créés
- `PROJECT_CONTEXT.md` — Architecture, stack, valeurs vérifiées
- `DECISIONS.md` — Décisions prises et en attente
- `ROADMAP.md` — 9 phases avec estimations tokens
- `CHANGELOG.md` — Ce fichier
