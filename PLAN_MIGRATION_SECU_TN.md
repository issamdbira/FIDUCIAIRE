# PLAN DE MIGRATION — SECU.TN → LE FIDUCIAIRE

**Objectif :** répliquer l'intégralité des calculateurs et informations de secu.tn sur Le Fiduciaire, avec le style moderne (navy #1e3a5f / gold #c9a84c, Montserrat + Inter), en gardant les formules exactes de la source.

**Statut au 19/07/2026 :** 4 pages sur 10 existent dans le code, avec des données parfois provisoires (à vérifier contre secu.tn avant mise en prod).

---

## 1. Cartographie des rubriques (secu.tn → Fiduciaire)

| # | Rubrique secu.tn | Page secu.tn | Route Fiduciaire | Statut | Note |
|---|---|---|---|---|---|
| 1 | Salariés privés CNSS | Calculateur de la paie | `/calculateurs/paie-cnss` | ✅ Fait | À revérifier vs formules 2026 (CSS supprimée) |
| 2 | Salariés privés CNSS | Calculateur retraite des salariés | `/calculateurs/retraite-cnss` | ⚠️ Fait mais provisoire | Indices d'actualisation codés en dur "exemple 2024-2025" — à remplacer par les vrais indices CNSS |
| 3 | Salariés privés CNSS | Calculateur retraite complémentaire | `/calculateurs/retraite-complementaire-cnss` | ❌ À faire | — |
| 4 | Salariés privés CNSS | Calculateur actualisation des salaires | `/calculateurs/actualisation-salaire-cnss` | ❌ À faire | Dépend des mêmes indices que #2 |
| 5 | Non-salariés CNSS | Calculateur retraite (indépendants) | `/calculateurs/retraite-non-salaries` | ❌ À faire | Catégories de cotisation spécifiques |
| 6 | Non-salariés CNSS | Classes et cotisations | `/calculateurs/cotisation-non-salaries` | ❌ À faire | Page informative + calcul |
| 7 | Retraités | Calculateur de la paie des retraités (pension) | `/calculateurs/paie-pension` | ❌ À faire | Net ↔ brut sur pension |
| 8 | Divers | Calculateur IRPP | `/calculateurs/irpp` | ✅ Fait | Vérifier barème 2026 |
| 9 | Divers | SMIG et SMAG en Tunisie | `/divers/smig-smag` | ❌ À faire | Page informative, pas de calcul |

**Pages transverses secu.tn non calculateurs :** Accueil, About/Contact — déjà présents (`Home.tsx`, `About.tsx`).

**CNRPS : hors périmètre.** Décision du 19/07/2026 — on n'implémente pas les calculateurs CNRPS (paie/retraite fonction publique). `PaieCNRPS.tsx` reste dans le code mais n'est plus une priorité de développement ; à retirer de la page d'accueil si on veut un site 100% focus secteur privé/CNSS.

---

## 2. Principe directeur (comme pour le dossier CNSS)

> Chaque formule migrée doit être **justifiée par une source écrite officielle** : page secu.tn correspondante, texte de loi, ou barème CNSS/CNRPS/DGI publié. Pas de valeur "exemple" en production — chaque constante (taux, barème, indice) doit être tracée à sa source dans un commentaire de code.

---

## 3. Phases de travail

Ordre choisi pour l'efficacité : corriger l'existant avant d'empiler du neuf dessus (une formule fausse dupliquée sur 3 nouvelles pages coûte plus cher qu'une corrigée une fois), puis avancer par blocs qui partagent la même logique (indices, catégories de cotisation) pour éviter de recoder deux fois la même chose.

### Phase 1 — Audit et correction des 3 calculateurs existants
- [x] `PaieCNSS.tsx` : **bug corrigé le 19/07/2026.** Le taux CNSS 9.68% et le barème IRPP sont conformes à secu.tn. Mais la CSS (0.5%) était appliquée sans condition d'année, alors qu'elle est supprimée depuis janvier 2026 — en production aujourd'hui, chaque bulletin affichait une retenue de 0.5% qui n'existe plus. Ajout d'un sélecteur d'année (2025/2026) avec `getTauxCSS(annee)` : 0.5% en 2025, 0% en 2026+.
- [x] `IRPP.tsx` : **audité le 19/07/2026, conforme.** Même barème que `PaieCNSS.tsx` (0/15/25/30/33/36/38/40%), mêmes déductions (chef de famille 300D, enfants 100D, étudiants 1000D, handicap 2000D). Pas de dépendance à une CSS, donc pas de bug équivalent à celui de PaieCNSS. Le barème IRPP lui-même reste à confirmer contre le texte officiel de la loi de finances 2026 si elle l'a modifié (non trouvé dans les sources secu.tn consultées).
- [x] `RetraiteCNSS.tsx` : **corrigé le 19/07/2026.** L'ancien barème (30%/10-14ans, 40%/15-19ans...) était faux. Formule réelle CNSS : 40% pour les 10 premières années + 2%/an au-delà, plafond 80% (source : secu.tn/fr/calculateur-retraite-cnss.html, màj 30/03/2025). Validé contre les 3 exemples officiels du site (25 ans→70%, 19 ans→58%, 41.25 ans→80% cap). Coefficients d'actualisation 2004-2023 (publiés 19/07/2024) intégrés avec source citée en commentaire. Plafond de 6x SMIG par année intégré (table SMIG 2015-2025 à compléter).
  - ⚠️ Reste simplifié : suppose un salaire constant sur 10 ans au lieu de 10 salaires réels saisis un par un (annoncé dans l'UI comme limite connue, "Phase 1 bis").
  - ⚠️ Table SMIG incomplète (années 2016-2019 manquantes) — à compléter avant mise en production.

### Phase 2 — Compléter le bloc "Salariés privés CNSS" (réutilise les indices de la Phase 1)
- [ ] Calculateur actualisation des salaires (même table d'indices que RetraiteCNSS)
- [ ] Calculateur retraite complémentaire

### Phase 3 — Non-salariés CNSS
- [ ] Page classes et cotisations (prérequis informatif)
- [ ] Calculateur retraite indépendants (dépend des classes ci-dessus)

### Phase 4 — Retraités & Divers (rapide, peu de dépendances)
- [ ] Calculateur paie des retraités (pension net ↔ brut)
- [ ] Page SMIG / SMAG

### Phase 5 — Finitions transverses
- [ ] Mettre à jour `LETTRE_ORIENTATION_TECHNIQUE.md` (obsolète depuis mai 2026)
- [ ] Retirer/masquer CNRPS de `Home.tsx` (hors périmètre)
- [ ] Navigation par catégorie entre calculateurs (absente actuellement)
- [ ] Vérifier responsive mobile
- [ ] (Optionnel, non prioritaire) FR/AR, export PDF, mode sombre

---

## 4. Règles de style à respecter pour chaque nouvelle page

- Couleurs : navy `#1e3a5f` (primaire), gold `#c9a84c` (accent)
- Typographie : Montserrat (titres), Inter (corps)
- Structure identique aux calculateurs existants : header avec bouton retour, `Card` shadcn/ui, résultats dans une section séparée avec mise en avant du résultat final
- Toujours ajouter une note de source/date de validité des formules (ex: "Formules 2026 - CNSS")

---

## 5. Suivi

Mettre à jour ce fichier au fur et à mesure : cocher les cases, ajouter une ligne "Dernière mise à jour" en bas.

**Dernière mise à jour :** 19/07/2026 — Phase 1 terminée (audit + corrections PaieCNSS, RetraiteCNSS, IRPP). Prochaine étape : Phase 2 (actualisation salaires + retraite complémentaire).
