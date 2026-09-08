# Audit Terminologique — LE FIDUCIAIRE

> **Date** : 2026-09-06
> **Périmètre** : Ensemble des pages et composants orientés utilisateur
> **Méthode** : Analyse statique du texte affiché (labels, titres, descriptions, placeholders, messages d'erreur, infobulles, mentions légales, page 404)
> **Action** : Document **en lecture seule** — aucune modification de fichier source n'a été effectuée. L'utilisateur valide avant toute réécriture.

---

## Synthèse

| Catégorie | Nombre |
|-----------|--------|
| 1 — Jargon non expliqué | 18 |
| 2 — Ton/style générique « template IA » | 8 |
| 3 — Référence juridique/institutionnelle non tunisienne | 4 |
| 4 — Incohérence de nommage | 8 |
| **Total** | **38** |

---

## Catégorie 1 — Jargon non expliqué

Termes techniques ou juridiques utilisés sans explication pour un utilisateur non expert.

| # | Fichier | Ligne(s) | Texte actuel | Problème | Suggestion |
|---|---------|----------|--------------|----------|------------|
| 1 | `Home.tsx` | 65 | `"Déclarations Néant"` | « Néant » est un terme CNSS spécifique (zéro salarié à déclarer) — opaque pour les non-experts | Ajouter une parenthèse : `"Déclarations néant (aucun salarié)"` |
| 2 | `Home.tsx` | 65 | `"État I3 + Bordereau I16"` | I3 et I16 sont des codes de formulaires CNSS sans explication | Ajouter une expansion : `"État I3 (récapitulatif) + Bordereau I16 (déclaration)"` |
| 3 | `Home.tsx` | 72 | `"fichier TXT CNSS 122 caractères"` | Spécification technique de format CNSS incompréhensible pour un utilisateur non technique | Simplifier : `"fichier de déclaration CNSS"` et mettre « 122 caractères » en infobulle |
| 4 | `Home.tsx` | 79 | `"assiette CNSS"` | « Assiette » est du jargon fiscal/juridique signifiant « base de calcul » | Reformuler : `"base de calcul des cotisations CNSS"` |
| 5 | `Home.tsx` | 79 | `"Décret n° 2003-1098"` | Référence juridique nue sans explication lisible | Ajouter une parenthèse : `"Décret n° 2003-1098 (avantages exclus de l'assiette CNSS)"` |
| 6 | `CalculerSalaire.tsx` | 166 | `"Assiette imposable nette"` | « Assiette imposable » est du jargon juridique sans explication | Ajouter une infobulle : `"Assiette imposable nette (base de calcul de l'impôt après déductions)"` |
| 7 | `CalculerSalaire.tsx` | 175 | `"CSS"` | Acronyme utilisé seul sans expansion | Utiliser : `"CSS (Contribution Sociale de Solidarité)"` à la première occurrence |
| 8 | `PaieCNSS.tsx` | 200 | `"Salaire Imposable"` | Jargon — concept intermédiaire non expliqué | Ajouter une infobulle ou reformuler : `"Salaire imposable (brut − cotisations CNSS)"` |
| 9 | `PaieCNSS.tsx` | 214 | `"Assiette imposable nette"` | Même problème que #6 | Même correction que #6 |
| 10 | `IRPP.tsx` | 248 | `"Assiette imposable nette"` | Même problème que #6 | Même correction que #6 |
| 11 | `IRPP.tsx` | 270 | `"barème IRPP 2025"` | « Barème » est du jargon pour le tableau des taux progressifs | Ajouter : `"barème IRPP 2025 (tableau des taux progressifs)"` |
| 12 | `IRPP.tsx` | 271 | `"crédits d'impôt"` | Jargon fiscal sans explication | Ajouter une parenthèse : `"crédits d'impôt (réduction directe de l'impôt dû)"` |
| 13 | `RetraiteCNSS.tsx` | 164 | `"Salaire de Référence Actualisé"` | Jargon composé — « référence » et « actualisé » nécessitent tous deux une explication | Ajouter une infobulle : `"Salaire moyen revalorisé par les coefficients CNSS"` |
| 14 | `ActualisationSalaire.tsx` | 59-60 | `"plafonné à 6× le SMIG puis actualisé par un coefficient"` | « SMIG » et « actualisation » non expliqués sur cette page | Développer : `"plafonné à 6× le SMIG (salaire minimum interprofessionnel garanti) puis revalorisé par un coefficient d'actualisation"` |
| 15 | `GenerateurFichePaie.tsx` | 247-248 | `"40h/semaine"`, `"48h/semaine"` | « Régime 40h/48h » est du jargon CNSS (horaire non agricole vs agricole) | Ajouter des labels : `"40h/semaine (non agricole)"`, `"48h/semaine (non agricole, régime de droit)"` |
| 16 | `GenerateurFichePaie.tsx` | 731 | `"Assiette imposable nette"` | Même problème que #6 | Même correction que #6 |
| 17 | `ReferentielAvantages.tsx` | 73, 80, 101… | `"SMIG mensuel (régime 48h/semaine)"` | « SMIG » et « régime 48h » utilisés à répétition sans aucune expansion | Ajouter un encadré de définition en haut de page : `"SMIG = Salaire Minimum Interprofessionnel Garanti. Régime 48h = horaire hebdomadaire standard du secteur non agricole."` |
| 18 | `ReferentielAvantages.tsx` | 322 | `"Montant soumis (CNSS + IRPP)"` | Deux acronymes empilés sans expansion | Développer : `"Montant soumis aux cotisations CNSS et à l'impôt IRPP"` |

---

## Catégorie 2 — Ton/style générique « template IA »

Phrases qui sonnent comme du boilerplate SaaS/marketing générique plutôt qu'un ton professionnel de fiduciaire tunisien.

| # | Fichier | Ligne(s) | Texte actuel | Problème | Suggestion |
|---|---------|----------|--------------|----------|------------|
| 1 | `Home.tsx` | 113 | `"Simplifiez votre gestion de paie et vos déclarations sociales en Tunisie."` | Formulation marketing SaaS classique — « simplifiez votre X » | Adopter un ton professionnel tunisien : `"Calculez vos salaires, générez vos fiches de paie et produisez vos déclarations CNSS conformément à la réglementation tunisienne."` |
| 2 | `Home.tsx` | 118 | `"en quelques clics"` | Phrase marketing SaaS/AI générique | Remplacer par une affirmation concrète : `"sans erreur de calcul"` |
| 3 | `Home.tsx` | 88 | `"Conformité Légale"` | Buzz-word marketing SaaS ; un outil de fiduciaire incarne la conformité, il ne la vend pas | Remplacer par : `"Barèmes officiels à jour"` ou `"Taux et barèmes officiels"` |
| 4 | `Home.tsx` | 93 | `"Zéro Saisie Manuelle"` | Superlatif marketing SaaS | Remplacer par : `"Import Excel des déclarations"` |
| 5 | `Home.tsx` | 99 | `"Documents Prêts à l'Emploi"` | Copie marketing SaaS — vague et générique | Remplacer par : `"Fiches de paie PDF et fichiers TXT CNSS normés"` |
| 6 | `Home.tsx` | 129 | `"Accéder à l'espace de travail"` | CTA SaaS générique | Remplacer par : `"Voir les outils"` ou `"Commencer"` |
| 7 | `About.tsx` | 40-42 | `"simplifier les calculs sociaux et fiscaux pour les citoyens tunisiens. Notre objectif est de rendre accessible à tous les informations complexes"` | Mission statement de type ChatGPT — trop abstrait et générique | Réécrire en ton fiduciaire authentique : `"Calculer un salaire net, estimer une pension de retraite ou préparer une déclaration CNSS : ces outils appliquent les barèmes et taux officiels tunisiens, gratuitement et sans envoi de données."` |
| 8 | `About.tsx` | 80 | `"Aucun frais caché. Utilisez tous nos calculateurs gratuitement, à tout moment."` | Boilerplate de page pricing SaaS | Remplacer par : `"Tous les calculateurs sont accessibles gratuitement et sans inscription."` |

---

## Catégorie 3 — Référence juridique/institutionnelle non tunisienne

Références à des institutions, lois ou cadres non tunisiens, ou texte en anglais dans une application franco-tunisienne.

> **Note** : Aucune référence institutionnelle non tunisienne (URSSAF, CAF, etc.) n'a été trouvée. L'application référence correctement CNSS, CNRPS et Ministère des Finances — toutes institutions tunisiennes. Les problèmes de cette catégorie concernent exclusivement du **texte en anglais** qui rompt la cohérence linguistique franco-tunisienne.

| # | Fichier | Ligne(s) | Texte actuel | Problème | Suggestion |
|---|---------|----------|--------------|----------|------------|
| 1 | `NotFound.tsx` | 27 | `"Page Not Found"` | Texte en anglais dans une application franco-tunisienne | Remplacer par : `"Page introuvable"` |
| 2 | `NotFound.tsx` | 31-33 | `"Sorry, the page you are looking for doesn't exist. It may have been moved or deleted."` | Message d'erreur en anglais | Remplacer par : `"Désolé, la page que vous cherchez n'existe pas. Elle a peut-être été déplacée ou supprimée."` |
| 3 | `NotFound.tsx` | 43 | `"Go Home"` | Libellé de bouton en anglais | Remplacer par : `"Retour à l'accueil"` |
| 4 | `ErrorBoundary.tsx` | 34, 51 | `"An unexpected error occurred."` / `"Reload Page"` | Texte d'erreur et de bouton en anglais | Remplacer par : `"Une erreur inattendue s'est produite."` / `"Recharger la page"` |

---

## Catégorie 4 — Incohérence de nommage

Nommage incohérent d'un même concept à travers les pages.

| # | Fichier | Ligne(s) | Texte actuel | Incohérence avec | Suggestion |
|---|---------|----------|--------------|-------------------|------------|
| 1 | `CalculerSalaire.tsx` | 181 | `"Salaire Net"` | `GenerateurFichePaie.tsx` L762, L854 : `"Net à Payer"` | Standardiser en **« Net à Payer »** partout (terminologie officielle de la fiche de paie tunisienne) |
| 2 | `PaieCNSS.tsx` | 228 | `"Salaire Net"` | Idem ci-dessus | Remplacer par `"Net à Payer"` |
| 3 | `PaieCNSS.tsx` | 187 | `"Bulletin de Paie"` | `Home.tsx` L43, `GenerateurFichePaie.tsx` L185, L787 : `"Fiche de Paie"` | Standardiser en **« Fiche de Paie »** (terme utilisé dans l'accueil et le générateur) |
| 4 | `Home.tsx` | 22 | `"Calculer un salaire"` | `About.tsx` L94, `PaieCNSS.tsx` L59 : `"Calculateur de Paie CNSS"` | Standardiser le titre de page en **« Calculateur de Paie CNSS »** (plus descriptif et cohérent avec la page À propos) |
| 5 | `IRPP.tsx` | 240 | `"2 000 DT/an"` | `PaieCNSS.tsx` L69, `IRPP.tsx` L96, `Admin.tsx` L211+ : `"D"` ou `"(D)"` | Standardiser le symbole monétaire en **« DT »** partout (convention ISO du Dinar Tunisien) ; actuellement mélange « D » et « DT » |
| 6 | `Home.tsx` | 78 | `"Référentiel légal"` | `ReferentielAvantages.tsx` L356 : `"Référentiel des avantages exclus de l'assiette des cotisations sociales"` | Le libellé court de navigation est correct, mais le titre de page devrait l'écho. Envisager : `"Référentiel légal — Avantages exclus (Décret 2003-1098)"` |
| 7 | `About.tsx` | 107 | `"Calculateur de Retraite CNSS"` | `Home.tsx` L36, `RetraiteCNSS.tsx` L84, `Layout.tsx` L46 : `"Estimer sa retraite"` | Standardiser en **« Estimer sa retraite CNSS »** (orienté action, cohérent avec les autres pages) |
| 8 | `About.tsx` | 120 | `"Calculateur IRPP"` | `Home.tsx` L30 : `"Impôt sur le revenu (IRPP)"`, `Layout.tsx` L45 : `"Impôt sur le revenu (IRPP)"` | Standardiser en **« Impôt sur le revenu (IRPP) »** comme dans l'accueil et la barre latérale |

---

## Recommandations prioritaires

1. **Priorité maximale** : Corriger les textes en anglais dans `NotFound.tsx` et `ErrorBoundary.tsx` (Catégorie 3) — visibles immédiatement par tout utilisateur rencontrant une erreur.

2. **Haute priorité** : Standardiser « Salaire Net » → « Net à Payer » et « Bulletin de Paie » → « Fiche de Paie » (Catégorie 4, items 1-3) — ces incohérences apparaissent sur les pages de calcul les plus utilisées et minent la crédibilité professionnelle.

3. **Haute priorité** : Résoudre l'incohérence « D » vs « DT » pour la devise (Catégorie 4, item 5) — choisir une convention et l'appliquer partout.

4. **Priorité moyenne** : Ajouter des infobulles ou des parenthèses explicatives pour « Assiette imposable », « SMIG », « régime 48h », « I3/I16 » (Catégorie 1) — ce sont les termes jargon les plus fréquemment rencontrés.

5. **Priorité moyenne** : Réécrire le hero de l'accueil et la section POINTS_FORTS (Catégorie 2) — remplacer le boilerplate marketing SaaS par un langage de fiduciaire authentique.

6. **Priorité faible** : Standardiser les titres de page entre À propos et Accueil/Navigation (Catégorie 4, items 4, 7, 8).

---

*Ce document est produit à titre d'audit en lecture seule. Aucun fichier source n'a été modifié. L'utilisateur doit valider les corrections avant toute réécriture.*
