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

**Dernière mise à jour :** 19/07/2026 — Phase 1 terminée (audit + corrections PaieCNSS, RetraiteCNSS, IRPP). Volet 2 démarré (moteur de paie central).

---

# VOLET 2 — MOTEUR DE PAIE & GÉNÉRATEUR DE FICHE DE PAIE

Nouvelle direction du projet (cf. PROMPT MAÎTRE et PROMPT STRATÉGIE reçus le 19/07/2026) :
faire évoluer Le Fiduciaire vers un MVP de génération de fiche de paie, en 4 couches :
1. Calculateurs gratuits (existant, conservés)
2. Moteur central de paie (`PayrollInput → PayrollEngine → PayrollResult`)
3. Générateur de fiche de paie (parcours guidé, 1 salarié / 1 période / 1 fiche, gratuit)
4. Extensions futures (multi-salariés, conventions collectives, export...) — hors MVP

**Règle absolue :** ne jamais inventer de règle pour les avantages en nature (décret 1098-2003).
Tout élément sans règle validée reste `traitement: "en_attente_de_regle"` et est exclu du calcul,
remonté séparément à l'utilisateur plutôt que de produire un résultat silencieusement faux.

## Avancement

- [x] **Étape 1 (audit)** : fait en Phase 1 ci-dessus — formules CNSS/IRPP identifiées, dupliquées entre `PaieCNSS.tsx` et `IRPP.tsx`.
- [x] **Étape 2 (extraction)** : créé `client/src/lib/payroll/` avec `cnss.ts`, `irpp.ts` — fonctions centralisées, `PaieCNSS.tsx` refactorisé pour les utiliser (formules non dupliquées).
- [x] **Étape 3 (moteur central)** : créé `client/src/lib/payroll/types.ts` (PayrollInput/PayrollItem/PayrollResult) et `engine.ts` (`runPayrollEngine`), indépendant de React. Validé numériquement (CSS=0 en 2026 ✓).
- [x] **Étape 5 (BenefitEngine, en parallèle)** : créé `client/src/lib/payroll/benefits.ts` — registre `BENEFIT_RULES` **volontairement vide**, aucune règle inventée. Structure prête à recevoir des règles une fois sourcées.
- [x] **Étape 4 (générateur de fiche de paie)** : créé `GenerateurFichePaie.tsx` — parcours guidé 6 étapes (Salarié → Période → Éléments → Vérification → Résultat → Fiche), route `/fiche-de-paie`, lien mis en avant sur l'accueil. Utilise `runPayrollEngine` (aucune formule dupliquée). Les éléments de type "avantage" sont automatiquement exclus du calcul et signalés (aucune règle inventée, conformément à la contrainte).
- [x] Refactoriser `IRPP.tsx` pour utiliser `lib/payroll/irpp.ts` et `lib/payroll/cnss.ts` — barème, frais professionnels 10% et déduction enfants (150D/mois) désormais cohérents avec le reste du projet. Ses déductions propres (intérêts crédit immobilier, cotisations syndicales) sont conservées, non dupliquées ailleurs.
- [ ] Table SMIG à compléter (2016-2019 manquants) dans `lib/payroll/cnss.ts`.
- [ ] Sourcer les règles d'avantages en nature (décret 1098-2003) avant d'en implémenter une seule.

## Mise à jour du 19/07/2026 — Référence CNSS-DS

L'utilisateur a fourni un outil de référence local (CNSS-DS) avec un barème IRPP et des déductions
différents de ceux sourcés depuis secu.tn. Décision : **la référence CNSS-DS fait foi** pour l'IRPP.
`lib/payroll/irpp.ts` et `engine.ts` ont été mis à jour et validés numériquement (10.659 D d'IRPP
mensuel sur 600D brut, 0 enfant — identique dans les deux implémentations).

Changements :
- [x] Nouveau barème IRPP (0/15/20/25/30/35/40% sur 5000/8333/12500/16666/25000/70000)
- [x] Ajout de la déduction "frais professionnels" (10% forfaitaire du net annuel avant impôt) — **absente de l'ancien code, correction importante**
- [x] Déduction enfants passée de 100 D/mois à 150 D/mois (source CNSS-DS), sans plafond
- [x] Nouveau fichier `lib/payroll/constantes-complementaires.ts` : SMIG 2026 (40h/48h), primes transport/présence par défaut, taux CNSS par secteur (agricole/non-agricole), taux horaire heures sup, taux accident du travail

## Mise à jour du 19/07/2026 (suite) — Finalisation MVP : employeur, détail technique, PDF

Comparaison HTML de référence (CNSS-DS) vs générateur React — fonctionnalités identifiées comme
manquantes et maintenant intégrées :
- [x] Étape "Employeur" ajoutée (nom, adresse, téléphone, email, matricule CNSS, **logo** en base64 côté client, aucun stockage serveur)
- [x] `PayrollItem` enrichi de champs de traçabilité (`inclusDansBrut`, `inclusBaseCNSS`, `inclusBaseFiscale`, `regleAppliquee`) — détail technique par élément affiché à l'étape Résultat (tableau ligne par ligne)
- [x] Fiche de paie : logo + infos employeur affichés en en-tête
- [x] Export PDF fonctionnel via `html2pdf.js` (nouvelle dépendance npm, à installer par `pnpm install` — Vercel le fera automatiquement au prochain déploiement), déclaration de type manuelle ajoutée (`client/src/types/html2pdf.d.ts`)
- [x] Parcours passé de 6 à 7 étapes : Employeur → Salarié → Période → Éléments → Vérification → Résultat → Fiche

**Aucun taux/formule n'a été modifié dans ce lot** — uniquement de la structure/UI, conformément à la
répartition des rôles (taux/règles = utilisateur, développement = Claude).

## Mise à jour du 19/07/2026 (suite) — Déclarations CNSS + Testeur TXT (portés depuis CNSS-DS)

À la demande explicite de l'utilisateur ("ne pas abandonner de fonction déjà prête"), l'intégralité des
fonctions de l'outil HTML de référence CNSS-DS a été portée dans l'application React. Il s'agit de
logique de **formatage pur** (format fixe 122 caractères, spécification CNSS 2012), sans aucun taux ni
barème — donc rien à valider côté utilisateur ici.

- [x] `client/src/lib/cnss-declarations/` : `types.ts`, `validator.ts`, `generator.ts` (génération lignes/fichiers TXT), `tester.ts` (parsing/validation TXT), `import.ts` (import CSV/Excel via papaparse + xlsx), `zip.ts` (export groupé via jszip)
- [x] `DeclarationsCNSS.tsx` (route `/calculateurs/declarations-cnss`) : configuration employeur, saisie manuelle, import CSV/Excel, liste des déclarations avec aperçu TXT, téléchargement individuel ou ZIP groupé — persistance locale via `localStorage` (aucune transmission serveur, cohérent avec le principe de confidentialité du projet)
- [x] `TesteurTXT.tsx` (route `/calculateurs/testeur-txt-cnss`) : glisser-déposer de fichiers TXT, validation ligne par ligne, récapitulatif global
- [x] Nouvelles dépendances : `papaparse`, `xlsx`, `jszip`, `@types/papaparse` — installées et vérifiées (`pnpm run check` + `pnpm run build` réussis en local avant push)
- [x] Lien ajouté sur l'accueil

**Note de cohérence architecture :** ce module introduit une gestion multi-salariés (déclarations
trimestrielles), ce qui dépasse le périmètre "1 salarié/1 période" défini pour le générateur de fiche de
paie dans les prompts précédents. C'est un choix assumé de l'utilisateur, présenté comme un service
distinct et complémentaire (déclaration CNSS ≠ fiche de paie individuelle), pas une fusion des deux.

## Mise à jour du 19/07/2026 (suite) — Réorganisation MVP autour des besoins utilisateur

- [x] Nouveau `lib/payroll/netToBrut.ts` : calcul Net→Brut par **recherche dichotomique sur le moteur central** (`runPayrollEngine`), pas de formule inverse inventée — validé numériquement (convergence à 0.001 D près)
- [x] `CalculerSalaire.tsx` (route `/calculateurs/calculer-salaire`) : page unique Brut→Net / Net→Brut, un seul moteur pour les deux sens
- [x] Accueil réorganisé en 3 catégories orientées action : **Traiter une paie** (Générer une fiche de paie, mis en avant en premier), **Calculer** (salaire, IRPP, retraite, actualisation, CNRPS), **Préparer une déclaration** (déclarations CNSS)
- [x] `PaieCNSS.tsx` conservé tel quel (route toujours active, non supprimée) mais retiré de la mise en avant de l'accueil au profit de `CalculerSalaire.tsx`, plus clair pour l'utilisateur
- [x] `pnpm run check` + `pnpm run build` vérifiés avec succès avant push

**Aucune fonction existante supprimée** — uniquement réorganisation de la présentation et ajout du calcul inverse.

## Mise à jour du 19/07/2026 (suite) — Champs structurels manquants ajoutés au générateur

Comme dans le HTML CNSS-DS : valeurs par défaut pré-remplies, mais **tous les champs restent modifiables**
(rien n'est figé).
- [x] `Employeur` : secteur d'activité (agricole/non-agricole) → détermine le taux CNSS utilisé par le moteur
- [x] `Salarie` : mode de paiement (espèce/virement + banque/RIB), affiché sur la fiche de paie
- [x] `PayrollResult` : nouveau champ `cotisationPatronale` (informatif, n'affecte pas le net, affiché en petit dans le détail)
- [x] Étape "Éléments" : ajouts rapides Transport (36.112D), Présence (2.080D), Avance, et un mini-calculateur d'heures supplémentaires (régime 40h/48h → taux horaire automatique, majoration 25/50/100%)
- [x] `pnpm run check` + `pnpm run build` vérifiés avec succès

## Mise à jour du 19/07/2026 (suite) — VÉRIFICATION COMPLÈTE contre secu.tn (demandée par l'utilisateur)

Vérification directe (pages officielles secu.tn fetchées, pas de recherche approximative) de tous
les taux/formules du projet. **Plusieurs erreurs réelles trouvées et corrigées** — la décision
précédente de faire confiance à la référence CNSS-DS plutôt qu'à secu.tn s'est révélée en partie
mauvaise sur l'IRPP.

### Barème IRPP — CORRIGÉ (retour au barème secu.tn, CNSS-DS était faux)
secu.tn/fr/calculateur-irpp-tunisie.html donne un barème daté et sourcé ("appliqué à partir du
1-1-2025"), avec exemple chiffré vérifiable (23 500 D → 4 300 D). Barème confirmé et validé
numériquement : **0-5000:0% / 5000-10000:15% / 10000-20000:25% / 20000-30000:30% / 30000-40000:33%
/ 40000-50000:36% / 50000-70000:38% / >70000:40%** (c'était le barème d'origine de PaieCNSS.tsx,
que j'avais remplacé à tort par celui de CNSS-DS le 19/07/2026 plus tôt dans la journée).

### Frais professionnels — CORRIGÉ (plafond ajouté)
secu.tn : 10% du salaire imposable, **plafonné à 2000 D/an** pour les salariés actifs. Notre code
n'avait pas de plafond. Corrigé.

### Déductions enfants/étudiants/infirmes — CORRIGÉ (montants annuels, pas mensuels)
secu.tn : 100 D/an/enfant (<20 ans) et 1000 D/an/étudiant sans bourse (<25 ans), **partageant le même
plafond de 4** ; 2000 D/an/enfant handicapé, sans plafond. Notre code utilisait 150D/mois (1800D/an,
sans lien avec le plafond de 4) suite à l'adoption CNSS-DS. Corrigé.

### Bug supplémentaire trouvé et corrigé dans IRPP.tsx
La fonction locale multipliait par 12 des montants déjà annuels (chef de famille 300D devenait
3600D, enfants/étudiants/infirmes pareil) — bug introduit lors d'une édition précédente. Corrigé en
utilisant `calculerDeductionsAnnuelles` centralisé.

### Section "crédits d'impôt" SUPPRIMÉE (invention non sourcée)
`IRPP.tsx` contenait un mécanisme de "crédit d'impôt" (50D/enfant, 500D handicap) qui ne correspond
à **aucun** mécanisme documenté par secu.tn. Probablement une invention du code d'origine (bootstrap
du projet, avant mon intervention). Supprimé pour ne pas produire un résultat faux présenté comme
certain.

### Taux CNSS patronal non-agricole (17.07%) — CONFIRMÉ CORRECT
Vérifié par 3 sources indépendantes + citation directe secu.tn : 9.68%/17.07% depuis janvier 2025
(9.18%/16.57% avant). Le point de vigilance signalé précédemment (écart avec Jornata) est levé — pas
d'erreur ici.

### Taux CNSS secteur agricole — CORRIGÉ (erreur confirmée)
secu.tn cite un régime spécial agricole à **19.47% total (6.99% salarié + 12.48% patronal)** —
complètement différent des 9.18%/16.57% repris de CNSS-DS (qui étaient en fait les anciens taux
NON-agricoles d'avant 2025, pas des taux agricoles). Corrigé dans `constantes-complementaires.ts`.

### Heures supplémentaires — approximation restant à améliorer (non corrigée, signalée)
secu.tn précise une règle plus fine que notre implémentation actuelle : régime 48h → toujours
majoration 75% (option absente de notre liste 25/50/100%) ; régime 40h → 8 premières heures sup à
25%, heures suivantes à 50% (règle par palier, pas un taux unique appliqué à tout). Notre calculateur
actuel applique un taux unique choisi manuellement à toutes les heures saisies — approximation
correcte si l'utilisateur choisit le bon taux, mais n'applique pas automatiquement la règle par
palier ni le 75% du régime 48h. **Non corrigé pour l'instant** (nécessite une refonte du composant) —
à faire si tu le juges prioritaire.

### CSS 2026 et taux patronal — plus aucun point réellement "ouvert" niveau taux
Le seul point réellement encore incertain (pas une erreur, une vraie question de choix) reste la CSS
2026 (0% chez nous, cohérent avec secu.tn qui confirme la suppression depuis janvier 2026 — donc en
réalité **ce n'était pas un point ouvert, c'était déjà correct**, confirmé maintenant).

### Heures supplémentaires — CORRIGÉ (nouvelle règle par palier, plus de sélection manuelle)
Nouvelle fonction `calculerMontantHeuresSupplementaires` dans `constantes-complementaires.ts` :
régime 48h → majoration 75% automatique ; régime 40h → 8 premières heures à 25%, au-delà à 50%
(règle exacte secu.tn, tableau daté 03-03-2025). Le sélecteur manuel de majoration (25/50/100%) a
été retiré de l'UI — le calcul est maintenant automatique selon le régime choisi. Validé
numériquement contre l'exemple officiel secu.tn (11h à 4D/h, régime 40h → 58D, exact).

### Table SMIG — CORRIGÉE (valeurs officielles réelles, régime 40h/48h séparés)
Table précédente (325/372/385/406/441.6/472.6/508 par année) : approximée, ne correspondant à aucun
décret réel. Remplacée par les vraies valeurs datées de jurisitetunisie.com/tunisie/index/SMIG.htm
(table 2000-2025, référence décrets), avec distinction régime 40h/48h (le SMIG diffère selon le
régime, ce que l'ancienne table ignorait). Exemple d'écart : 2025 réel = 528,320D (48h)/448,238D
(40h), ancienne table avait 508D (ni l'un ni l'autre).

**Bug de duplication corrigé en même temps** : `RetraiteCNSS.tsx` avait sa propre copie de la même
table SMIG (fausse), au lieu d'utiliser `cnss.ts`. Corrigé pour importer `getSmigPourAnnee` centralisé.

**Non vérifié indépendamment** : les valeurs 2026 (528,320×1,049≈554,793 / 448,238×1,049≈470,251)
restent celles de CNSS-DS, jurisitetunisie.com ne les liste pas encore au 19/07/2026. Cohérentes avec
la tendance d'augmentation observée, mais pas confirmées par une deuxième source indépendante.

### CSS — CORRIGÉE (mauvaise assiette utilisée, exonération sous 5000D/an manquante)
Vérification croisée avec un second simulateur professionnel tunisien : la CSS doit être calculée
sur la **même assiette annuelle que l'IRPP** (après frais professionnels et déductions familiales),
et elle est **exonérée si cette assiette ne dépasse pas 5000 D/an**. Notre code la calculait sur le
salaire imposable brut, AVANT ces abattements — assiette trop large, CSS surestimée pour les revenus
modestes, et l'exonération de 5000D/an était totalement absente. Corrigé (`calculerCSSAnnuelle` dans
`cnss.ts`, utilisée par `engine.ts` et `PaieCNSS.tsx`). Cette correction n'a d'effet que sur les
années où la CSS existe encore (jusqu'à 2025 ; supprimée en 2026, donc sans impact sur les calculs
2026 par défaut).

## Mise à jour du 19/07/2026 (suite) — Fiche de paie vérifiée contre les mentions légales obligatoires

Comparaison avec la liste des mentions obligatoires du Code du travail tunisien (art. 29-34), telle
que documentée par un guide professionnel spécialisé. Mentions manquantes trouvées et ajoutées :

- [x] **Employeur** : matricule fiscal, registre de commerce (en plus du matricule CNSS déjà présent)
- [x] **Salarié** : poste/emploi, catégorie professionnelle (n'existaient pas du tout dans le formulaire)
- [x] **Bug trouvé** : la date d'embauche était déjà collectée à l'étape Salarié mais **jamais affichée**
  sur la fiche imprimée — corrigé
- [x] Cotisation patronale CNSS ajoutée sur la fiche imprimée (mentionnée dans le modèle standard),
  avec le taux salarial affiché en clair
- [x] Note de transparence ajoutée : les cumuls annuels (brut/assiette CNSS/IRPP cumulés, nécessaires
  à la déclaration annuelle) ne sont pas gérés — limite assumée du MVP single-période, indiquée
  clairement plutôt que silencieusement absente

**Reste hors périmètre, non ajouté (limite du MVP 1-période, pas une erreur)** : nombre de jours
travaillés/congés dans la période, cumuls annuels. Nécessiteraient un traitement multi-périodes.

**`pnpm run check` + `pnpm run build` vérifiés avec succès.**

## Mise à jour du 19/07/2026 (suite) — Champs de la fiche de paie rendus optionnels

À la demande de l'utilisateur : les mentions ajoutées à l'étape précédente (matricule fiscal,
registre de commerce, poste, catégorie professionnelle, date d'embauche, mode de paiement,
cotisation patronale) sont maintenant **optionnelles**, avec des cases à cocher à l'étape
Vérification ("Champs à afficher sur la fiche de paie"). Tout est coché par défaut ; l'utilisateur
peut décocher ce qu'il ne veut pas voir apparaître sur le document final. Les mentions strictement
obligatoires (identité employeur/salarié, période, rémunération, CNSS salariale, IRPP, net à payer)
restent toujours affichées, non désactivables.

## Mise à jour du 19/07/2026 (suite) — CORRECTION MAJEURE : la CSS n'était PAS supprimée en 2026

**Erreur significative trouvée et corrigée.** L'utilisateur a comparé notre "Calculer un salaire"
contre paie-tunisie.com (2550D brut, chef de famille, 1 enfant) : CNSS et IRPP identiques, mais notre
net (1901.38) différait de 10.52D par rapport au leur (1890.863) — exactement le montant de la CSS.

Vérification : notre code affirmait "CSS supprimée à partir de janvier 2026" (sourcé sur une page
secu.tn). **C'était faux.** Confirmé par de multiples sources datées et convergentes (WebManagerCenter,
La Presse, Business News, Deloitte, Finco, Compta.tn) + la note commune officielle DGELF N°01-2026 :
la loi de finances 2026 (loi n°2025-17 du 12/12/2025, article 87) **prolonge** la mesure exceptionnelle
de CSS à 0,5% pour toute l'année 2026 (le projet initial prévoyait une prolongation jusqu'en 2027,
réduite à la seule année 2026 après réexamen parlementaire — d'où une possible confusion de lecture
initiale).

**Corrigé :** `getTauxCSS()` applique maintenant 0,5% de 2023 à 2026 inclus (au lieu de 0% dès 2026).
Libellés UI corrigés dans `PaieCNSS.tsx` et `PaieCNRPS.tsx` (CNRPS hors périmètre actif mais note
trompeuse corrigée par cohérence). Validé numériquement contre l'exemple fourni par l'utilisateur :
net 1890.86 D vs 1890.863 D attendu (écart d'arrondi uniquement).

**Portée de l'erreur :** cette CSS étant calculée dans le moteur central (`engine.ts`), l'erreur
affectait TOUS les calculs de paie 2026 de l'application (Calculer un salaire, Générer une fiche de
paie, PaieCNSS.tsx) depuis la correction initiale du 19/07/2026 qui avait (à tort) introduit cette
règle de suppression.

**`pnpm run check` + `pnpm run build` vérifiés avec succès.**

## Mise à jour du 19/07/2026 (suite) — Validation croisée avec une seconde source indépendante

Une source de vérification externe indépendante (formules de paie Tunisie 2025, fournie par
l'utilisateur) a été comparée à notre moteur sur 3 profils différents (brut simple, chef de famille +
2 enfants, chef de famille + 4 enfants). **Correspondance exacte** sur CNSS, IRPP et CSS (écarts de
l'ordre du millime, dus à l'arrondi). Ceci confirme indépendamment les corrections apportées
précédemment (barème IRPP, frais professionnels plafonnés à 2000D/an, déduction enfants 100D/enfant
plafonnée à 4). Aucune correction supplémentaire nécessaire suite à cette validation — elle confirme
que l'état actuel du moteur est correct.

## Mise à jour du 19/07/2026 (suite) — Panneau d'administration (paramétrage centralisé)

**Nouveau : moteur de calcul unifié piloté par un panneau d'administration** (`/admin`), en réponse
à une demande explicite de l'utilisateur incluant une nouvelle exigence contradictoire sur la CSS
2026. Plutôt que trancher unilatéralement, la CSS (et tous les autres taux/barèmes/déductions)
deviennent des paramètres configurables depuis `/admin`, stockés dans `lib/payroll/config.ts`
(persistance locale).

- [x] `lib/payroll/config.ts` : `PayrollConfig` centralisant CNSS (salarial/patronal, agricole/non-agricole), CSS (actif/taux/seuil), barème IRPP (tranches éditables), frais professionnels (actifs plafonnés, retraités progressifs), déductions familiales, parents à charge (nouveau, désactivé par défaut car applicable uniquement en déclaration annuelle)
- [x] `cnss.ts` et `irpp.ts` réécrits pour lire exclusivement `getPayrollConfig()` — plus aucune constante en dur pour les valeurs courantes (historique pré-2025 et SMIG restent figés, non éditables : référentiel légal daté)
- [x] `engine.ts` mis à jour pour utiliser la config au lieu de `constantes-complementaires.ts` (constante `TAUX_CNSS_PAR_SECTEUR` retirée, redondante)
- [x] Page `/admin` créée : formulaires pour chaque catégorie de paramètres, boutons Enregistrer/Réinitialiser
- [x] CNRPS retiré définitivement (fichier supprimé, route et carte accueil retirées) — demande explicite
- [x] Références à des sites externes retirées des textes affichés à l'utilisateur (restent uniquement dans les commentaires de code, non visibles) : ActualisationSalaire, GenerateurFichePaie, RetraiteCNSS
- [x] Libellé "cotisation patronale (informative)" simplifié sur la fiche de paie

**⚠️ Incident technique** : le bac à sable de développement a été réinitialisé en cours de session
(système de fichiers non persistant entre les tâches). Tout le travail de ce lot avait été fait une
première fois puis perdu avant d'être poussé — refait intégralement à l'identique après reclonage du
dépôt. Aucune perte de travail côté GitHub (rien n'avait encore été commité).

**Validé numériquement** : le moteur reproduit toujours exactement le résultat de référence
(2550D brut, chef de famille, 1 enfant → net 1890.86D) après le refactor vers la config centralisée.

**Reste à faire (portée trop large pour ce lot) :**
- Restructuration complète du template de fiche de paie selon le modèle Excel fourni (colonnes Base/Taux/Gain/Retenue séparées salarial/patronal, congés, avance)
- Simulateur de retraite simplifié (cas de base salarié régime général)
- Extension de la table de coefficients d'actualisation (1976-2029, image fournie) et intégration directe dans le simulateur de retraite
- Ajout de "parents à charge" dans les calculateurs eux-mêmes (la config existe, l'UI de saisie reste à ajouter)

**`pnpm run check` + `pnpm run build` vérifiés avec succès.**

Tests exécutés sur le vrai code (bundlé via esbuild, pas des simulations manuelles) :

- [x] **Moteur multi-éléments** : base+prime+indemnité+absence+retenue agrégés correctement (1200+300+50-80-100=1370 D brut), CNSS 132.62 D (9.68%), net 1222.84 D
- [x] **Avantage en nature (règle non validée)** : correctement exclu du calcul, remonté dans `elementsEnAttente` avec `inclusDansBrut/CNSS/Fiscale = false` et la note réglementaire — aucun calcul silencieusement faux
- [x] **Secteur agricole** : taux CNSS 9.18%/16.57% correctement appliqués (vs 9.68%/17.07% non-agricole), écart confirmé par calcul (91.80 D et 165.70 D sur 1000 D brut)
- [x] **Déclaration CNSS round-trip** : génération TXT (122 caractères/ligne) → reparsing par le testeur → salariés, salaires (1200.000/850.000 DT), nom en majuscules tous retrouvés à l'identique
- [x] **Net→Brut avec vrai moteur** (2 enfants, 2026) : brut trouvé 1142.37 D pour un net de 1000 D, écart de reconversion = 0
- [x] `pnpm run check` + `pnpm run build` déjà vérifiés aux commits précédents

**Non testable depuis cet environnement (pas de navigateur réel) :** rendu visuel du PDF (logo, mise en page, coupures de page) — à vérifier manuellement sur le site déployé. Le code d'export (`html2pdf.js`) est typé et compile sans erreur, mais le rendu final nécessite un test humain dans le navigateur.

**État du MVP au 19/07/2026 :** les 3 parcours de la mission de finalisation (Calculer un salaire, Générer une fiche de paie, Préparer une déclaration CNSS) sont fonctionnels et vérifiés côté logique. Reste à vérifier manuellement : rendu PDF réel, et les points de taux/règles toujours en attente ci-dessous.

**Points toujours ouverts (côté utilisateur, taux/règles) :**
- ⚠️ CSS en 2026 : CNSS-DS l'applique encore à 0.5%, notre code la met à 0% (supprimée depuis janvier 2026 selon secu.tn). **Décision actuelle : on garde 0% en 2026**, à confirmer.
- ⚠️ Déductions "chef de famille" (300D), "étudiants" (1000D), "infirmes" (2000D) : présentes dans l'ancien code mais absentes de la référence CNSS-DS — montants non confirmés.
- ⚠️ Taux patronal CNSS : 17,07% chez nous vs un taux global de 25,75% mentionné par Jornata (suggérant peut-être 16,07% patronal) — à vérifier.
- ⚠️ Avantages en nature (décret 1098-2003) : toujours aucune règle, registre `BENEFIT_RULES` vide.
