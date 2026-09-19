# Lot 8-2 — Décision d'arrondi : Centimes (2 décimales) vs Millimes (3 décimales)

**Date d'analyse :** 19 Septembre 2026
**Statut :** READ-ONLY — aucune modification de code dans cette phase, par règle Lot 8
**Auteur :** Lot 8 agent

---

## 1. Contexte

Le moteur de paie tunisien (Le Fiduciaire) manipule des montants en Dinars Tunisiens (DT). Le millime (mille millimes = 1 DT) est l'unité subdivisionnaire officielle. La question se pose :

> Faut-il arrondir les montants stockés et affichés à 2 décimales (centimes — pratique courante) ou à 3 décimales (millimes — conformité réglementaire stricte) ?

L'analyse ci-dessous liste l'état actuel du code, l'impact d'un passage aux millimes sur un bulletin de paie, et l'impact de migration sur les bulletins déjà stockés.

---

## 2. État actuel — lecture du code (`READ IN CODE`)

### 2.1 — Module `server/lib/money.ts`

Deux fonctions d'arrondi sont définies :

```typescript
// server/lib/money.ts:11
export function round2Exact(n: number): number { /* arrondi à 2 décimales */ }

// server/lib/money.ts:17
export function round3Exact(n: number): number { /* arrondi à 3 décimales (millimes) */ }
```

### 2.2 — Call sites `round2Exact` dans le moteur de paie serveur

Le moteur `server/lib/payroll-engine.ts` utilise `round2Exact` sur **22 champs** du bulletin :

| Ligne | Champ arrondi | Type d'arrondi actuel |
|---|---|---|
| 315 | `salaireBrutContractuel` | 2 décimales |
| 320 | `salaireBrutEffectif` | 2 décimales |
| 321 | `montantHeuresSup` | 2 décimales |
| 322 | `montantAbsence` | 2 décimales |
| 323 | `baseImposable` | 2 décimales |
| 324 | `retenueCnssSalarial` | 2 décimales |
| 325 | `retenueCss` | 2 décimales |
| 326 | `totalRetenuesSalariales` | 2 décimales |
| 327 | `retenueCnssPatronal` | 2 décimales |
| 328 | `fraisProfessionnels` | 2 décimales |
| 329 | `netImposableAvantDeductions` | 2 décimales |
| 330 | `deductionChefFamille` | 2 décimales |
| 331 | `deductionEnfants` | 2 décimales |
| 332 | `deductionParents` | 2 décimales |
| 333 | `totalDeductionsFamiliales` | 2 décimales |
| 334 | `baseIrpp` | 2 décimales |
| 335 | `retenueIrpp` | 2 décimales |
| 336 | `salaireNet` | 2 décimales |
| 337 | `tauxHoraire` | 2 décimales |
| 727 | `salaireBaseGrilleFinal` (mode CONVENTIONNEL, Lot 8-A) | 2 décimales |
| 728 | `indemniteSupplementaireFinal` (mode CONVENTIONNEL, Lot 8-A) | 2 décimales |
| 730 | `salaireBrutEffectifFinal` (mode CONVENTIONNEL, Lot 8-A) | 2 décimales |

### 2.3 — Call sites `round3Exact`

| Fichier | Ligne | Usage |
|---|---|---|
| `server/lib/money.ts` | 17 | Définition de la fonction |
| `client/src/lib/payroll/money.ts` | 24 | Définition miroir côté client |
| `client/src/lib/payroll/money.test.ts` | 9, 36-40 | Tests (la fonction existe mais **n'est jamais appelée en production**) |

**`round3Exact` est défini mais jamais utilisé dans le moteur de paie.** C'est du code mort.

### 2.4 — Type Prisma des champs monétaires

Tous les champs d'argent sont `Float` (32 bits IEEE 754) :

```prisma
salaireBrut Float
salaireBrutEffectif Float
salaireNet Float
retenueCnssSalarial Float
...
```

**`Float` a une précision de ~7 chiffres significatifs**, ce qui suffit pour 3 décimales jusqu'à ~9999.999 DT. Au-delà (masses salariales groupées), la précision flottante peut introduire des erreurs de l'ordre du millime.

---

## 3. Impact d'un passage aux millimes (3 décimales)

### 3.1 — Sur un bulletin de paie unitaire

Prenons un exemple concret : salaire brut 1 500,000 DT, présence 100%, CNSS 9.68%, IRPP barème progressif.

| Champ | Actuel (centimes) | Millimes | Différence |
|---|---|---|---|
| `salaireBrutContractuel` | 1500.00 | 1500.000 | 0 |
| `retenueCnssSalarial` (1500 × 0.0968) | 145.20 | 145.200 | 0 (mais la valeur exacte est 145.200, donc millimes = vrai) |
| `baseImposable` | 1354.80 | 1354.800 | 0 |
| `fraisProfessionnels` (10%, plafond 2000/an → mensuel 166.667) | 135.48 (10% de 1354.80) | 135.480 | 0 |
| `netImposableAvantDeductions` | 1219.32 | 1219.320 | 0 |
| `deductionChefFamille` (marié) | 25.00 (300/12) | 25.000 | 0 |
| `baseIrpp` | 1194.32 | 1194.320 | 0 |
| `retenueIrpp` (tranches : 5000×0% + 5000×15% sur assiette annuelle 14331.84 → 1907.96/an / 12) | 158.99 → 158.99 | 158.997 → 158.997 | **+0.007 DT/mois** (≈ 7 millimes) |
| `salaireNet` | 1219.32 - 158.99 = 1060.33 | 1219.320 - 158.997 = 1060.323 | **+0.007 DT** |

**Sur un bulletin unitaire**, le passage aux millimes change typiquement **le net à payer de 1 à 10 millimes** (soit 0.001 à 0.010 DT). C'est invisible sur le bulletin affiché (le format DT affiche 3 décimales), mais c'est **réel sur la base de données**.

### 3.2 — Sur la masse salariale groupée

Pour une entreprise de 100 salariés avec des bulletins unitaires variant de 800 à 5000 DT :

- En centimes, l'erreur cumulée de ~5 millimes × 100 salariés = ~0.5 DT par mois de dérive
- En millimes, l'erreur disparaît (chaque bulletin est exact à 1 millime près)
- Sur 12 mois : ~6 DT de dérive annuelle en centimes

C'est négligeable pour le net à payer individuel, mais **significatif pour les déclarations CNSS agrégées** (qui additionnent les bulletins de 3 mois × N salariés × plusieurs entreprises).

### 3.3 — Sur les déclarations CNSS (fichier TXT 122 caractères)

Le fichier CNSS officiel attend des montants **en millimes** (le champ salaire fait 9 caractères, soit jusqu'à 9 999 999 millimes = 9 999.999 DT). Le format attendu est 3 décimales implicites.

**Si le moteur arrondit en centimes**, la conversion en millimes pour le TXT introduit un zéro parasite : `1500.20` centimes devient `1500200` millimes (avec une troncature de 0.005 DT potentiellement perdue à chaque ligne).

**Mode CONVENTIONNEL (Lot 8-A)** : la décomposition `salaireBaseGrille + indemniteSupplementaire` produit naturellement des valeurs à 3 décimales (car `grille.salaireMinimum` est souvent un nombre rond en millimes). En centimes, l'arrondi perd l'information.

---

## 4. Impact de migration sur les bulletins déjà stockés

### 4.1 — État des bulletins en production

Tous les bulletins stockés dans `payslips` ont des valeurs arrondies à 2 décimales. **La précision originale (avant arrondi) est perdue** — il est impossible de "reconstruire" les millimes à partir des centimes stockés.

### 4.2 — Stratégies de migration possibles

| Stratégie | Description | Avantages | Inconvénients |
|---|---|---|---|
| **A — Rupture** | Changer `round2Exact` → `round3Exact` partout, ne pas migrer l'historique | Simple, immédiat | Bulletins historiques restent en centimes → incohérence d'affichage entre anciens et nouveaux |
| **B — Migration soft** | Ajouter un champ `precisionArrondi` (2 ou 3) sur `Payslip`, double-arrondi pendant la lecture | Pas de rupture | Complexe, augmente la dette technique |
| **C — Recalcul** | Recalculer tous les bulletins historiques avec le nouveau moteur | Cohérence parfaite | Cher (N bulletins × recalcul), risque d'écarts SI le moteur a changé depuis |
| **D — Statut quo** | Garder `round2Exact`, documenter la décision, supprimer le code mort `round3Exact` | Aucun risque | Conformité réglementaire potentiellement non strict |

### 4.3 — Impact sur les exports

- **CNSS TXT** : déjà conforme (la conversion en millimes se fait au moment du formatage du TXT, pas au stockage) — pas d'impact
- **Excel/CSV** : les valeurs sont affichées telles que stockées — en centimes actuellement, en millimes après migration
- **PDF/HTML bulletins** : affichent déjà 3 décimales (`1500.000 DT`) — pas d'impact visible

---

## 5. Recommandation

| Critère | Centimes (statu quo) | Millimes (migration) |
|---|---|---|
| Conformité réglementaire stricte | ❌ le millime est l'unité officielle | ✅ conforme |
| Précision des masses salariales | ❌ dérive ~6 DT/an pour 100 salariés | ✅ dérive < 1 DT/an |
| Cohérence avec le moteur CONVENTIONNEL (Lot 8-A) | ❌ perd l'info grille + indemnité | ✅ conserve la précision grille |
| Effort de migration | 0 (statu quo) | ~4h (changer 22 call sites + supprimer code mort + tests) |
| Risque sur bulletins historiques | 0 | Incohérence d'affichage (peut être masquée par formatage) |
| Code mort actuel | `round3Exact` défini mais inutilisé (warning de dette technique) | `round3Exact` enfin utilisé |

### Recommandation

**Passer aux millimes (Stratégie A — rupture)** pour les raisons suivantes :

1. **Conformité réglementaire** : le millime est l'unité officielle tunisienne. Les déclarations CNSS attendent des millimes.
2. **Cohérence avec Lot 8-A** : le mode CONVENTIONNEL introduit `salaireBaseGrille` et `indemniteSupplementaire` — ces valeurs sont naturellement à 3 décimales, les tronquer en centimes perd de l'information.
3. **Code mort à éliminer** : `round3Exact` existe mais n'est jamais appelé en production — c'est de la dette technique.
4. **Migration acceptable** : l'incohérence d'affichage des bulletins historiques peut être masquée en formatant l'affichage (les anciens bulletins afficheront 3 décimales, le dernier chiffre sera toujours 0).

### Risque à surveiller

- **Prisma `Float`** : la précision 32 bits est suffisante jusqu'à ~9999.999 DT. Pour les masses salariales agrégées > 10 000 DT, envisager un passage à `Decimal` (migration plus lourde, hors-scope de cette analyse).

### Décision attendue

Le code n'est **pas modifié** dans cette phase (Lot 8 règle : arrondis non modifiés). En attente de validation humaine pour appliquer la stratégie A (ou B/C/D) dans un lot ultérieur.

---

## 6. STOP 2 — attente de décision

Cet agent attend la décision humaine parmi :

- **[A] Rupture millimes** (recommandé) — je modifierai les 22 call sites dans un commit `Lot 8-2-applicatif` séparé, après validation
- **[B] Migration soft** avec champ `precisionArrondi` — non recommandé (dette technique)
- **[C] Recalcul** des bulletins historiques — cher, à éviter
- **[D] Statu quo** + suppression du code mort `round3Exact` — option pragmatique si la conformité n'est pas critique

Avant toute modification, je attends ton feu vert.
