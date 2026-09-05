# Audit de terminologie, cohérence et contexte tunisien

> **Document de synthèse — AUCUNE modification de code ou de texte affiché.**
> Ce document cataloge les problèmes terminologiques détectés dans l'interface
> utilisateur de FIDUCIAIRE. Chaque entrée est classée dans une des quatre
> catégories définies ci-dessous. Il appartient au validateur de trancher,
> terme par terme, avant qu'une tâche de réécriture soit lancée.

**Date de l'audit** : 2026-09-06
**Périmètre** : toutes les pages et composants visibles par l'utilisateur final
(calculateurs, générateur de fiche de paie, référentiel, messages d'erreur,
tooltips, placeholders, mentions légales, page 404, panneau admin).

**Catégories de problèmes** :

1. **Jargon non expliqué** — terme technique affiché sans info-bulle ni reformulation accessible à un non-spécialiste.
2. **Ton/style générique « template IA »** — formulations, titres ou messages qui ressemblent à un texte par défaut de générateur plutôt qu'à un contenu écrit pour ce produit précis.
3. **Référence juridique/institutionnelle non tunisienne** — mention de lois, d'organismes, de formulaires ou de terminologie qui ne correspond pas au cadre légal tunisien, ou qui manque de précision sur le contexte tunisien.
4. **Incohérence de nommage** — un champ de formulaire dont le libellé visible ne correspond pas à la convention de nommage utilisée dans le code (variables, id de champ, nom de fichier du module) ou dont le libellé diffère d'un calculateur à l'autre pour désigner la même notion.

---

## 1. Jargon non expliqué

| # | Terme / texte affiché | Emplacement | Problème |
|---|---|---|---|
| 1.1 | « IRPP » | Home, PaieCNSS, CalculerSalaire, IRPP (titre + résultats), About, Admin | Sigle jamais développé en clair dans l'interface. L'explication « Impôt sur le Revenu des Personnes Physiques » n'apparaît qu'en commentaire de code ou en description de page About. Un utilisateur non-fiscaliste ne sait pas ce que signifie IRPP. |
| 1.2 | « CSS » | PaieCNSS (résultat), Admin (section dédiée) | Sigle « Contribution Sociale de Solidarité » jamais développé en clair dans les calculateurs. L'Admin affiche le nom complet, mais les pages de résultat utilisent uniquement « CSS ». |
| 1.3 | « Assiette imposable nette » | CalculerSalaire (résultat), PaieCNSS (résultat), IRPP (résultat) | Terme fiscal technique. Aucune info-bulle n'explique que c'est le revenu après déduction des frais professionnels et des déductions familiales, sur lequel l'IRPP est calculé. |
| 1.4 | « Abattement frais professionnels (10 %, plafond 2 000 DT/an) » | CalculerSalaire, PaieCNSS, IRPP | La notion d'« abattement » et le mécanisme de plafond sont compris par les experts mais obscurs pour un salarié lambda. Aucune info-bulle. |
| 1.5 | « Assiette des cotisations sociales » | ReferentielAvantages (titre de page) | « Assiette » est un jargon technique. Le titre complet « avantages exclus de l'assiette des cotisations sociales » est juridiquement exact mais opaque pour un non-initié. |
| 1.6 | « SMIG » | ReferentielAvantages, ActualisationSalaire | Sigle « Salaire Minimum Interprofessionnel Garanti » jamais développé. |
| 1.7 | « Régime 48h/semaine » | ReferentielAvantages (points 1-5, 8, 13-14) | Seuls les professionnels RH connaissent la distinction régime 48h vs 40h. Aucune explication. |
| 1.8 | « Matricule » / « Matricule CNSS » | DeclarationsCNSS, DeclarationsNeant, TesteurTXT | Utilisé comme label de champ sans expliquer qu'il s'agit du numéro d'affiliation CNSS à 8 chiffres de l'employeur (ou du salarié selon le contexte). |
| 1.9 | « JORT n°41 » | ReferentielAvantages | Sigle « Journal Officiel de la République Tunisienne » jamais expliqué. |
| 1.10 | « Décret n° 2003-1098 » | ReferentielAvantages, Home | Référence légale citée mais aucun lien vers le texte officiel ni explication de son objet. |
| 1.11 | « Écart de déclaration (soumis − déclaré) » | ReferentielAvantages (simulateur) | Le concept d'écart entre montant soumis et montant déclaré est technique. Aucune explication de son utilité pratique (vérification de conformité de la déclaration de l'employeur). |
| 1.12 | « Zone vierge » | TesteurTXT (détail ligne par ligne) | Terme technique du format CNSS 122 caractères. Non expliqué. |
| 1.13 | « Coefficient d'Actualisation » | ActualisationSalaire (résultat) | Pas d'explication de ce que représente ce coefficient ni pourquoi il est nécessaire pour le calcul de retraite. |
| 1.14 | « Salaire de Référence Actualisé » | RetraiteCNSS (résultat) | Pas d'explication du concept ni de son rôle dans le calcul de la pension. |
| 1.15 | « Pension Brute Mensuelle » / « pension minimale » | RetraiteCNSS (résultat) | La distinction entre pension brute et pension minimale garantie n'est pas expliquée. Le message conditionnel « Le montant calculé étant inférieur au minimum garanti… » aide, mais arrive trop tard. |
| 1.16 | « Cotisation patronale (à la charge de l'employeur, n'affecte pas le net) » | GenerateurFichePaie (résultat) | La parenthèse est utile mais le terme « cotisation patronale » reste du jargon. |
| 1.17 | « État I3 » / « Bordereau I16 » | Home, DeclarationsNeant | Noms des formulaires CNSS cités sans explication. Un employeur novice ne sait pas ce que sont l'État Récapitulatif I3 et le Bordereau I16. |
| 1.18 | « Plafond global de 5% (art. 3) » | ReferentielAvantages | Référence à l'article 3 du décret sans expliquer la règle : le total des avantages exclus (hors points 16-19, 23-24) ne peut dépasser 5% de la masse salariale. |
| 1.19 | « Rémunération brute » | CalculerSalaire (résultat) | Terme plus générique que « salaire brut ». Un salarié comprend « salaire brut » mais « rémunération brute » peut prêter à confusion (inclut-il les primes ? les avantages en nature ?). |
| 1.20 | « Retenue à la source mensuelle » | Admin (parents à charge) | Jargon fiscal sans explication. |

---

## 2. Ton / style générique « template IA »

| # | Terme / texte affiché | Emplacement | Problème |
|---|---|---|---|
| 2.1 | « Page Not Found » + « Sorry, the page you are looking for doesn't exist. It may have been moved or deleted. » + « Go Home » | NotFound.tsx | **Intégralité de la page 404 en anglais**. C'est le texte par défaut d'un template Vite/React. Pour un produit 100% francophone ciblant la Tunisie, la page 404 doit être en français et contextualisée (ex : « Page introuvable — l'outil que vous cherchez n'existe pas ou a été déplacé. Retour à l'accueil. »). |
| 2.2 | « Accéder à l'espace de travail » | Home (CTA principal) | Formulation vague et générique. « Espace de travail » ne désigne rien de concret. Préférer une formulation plus spécifique comme « Découvrir les outils » ou « Commencer un calcul ». |
| 2.3 | « Sélectionnez un outil pour commencer. » | Home (sous-titre section Outils) | Phrase générique de type dashboard template. Pourrait être plus engageante / contextualisée. |
| 2.4 | « Besoin d'aide ? » + « Pour toute question ou suggestion concernant LE FIDUCIAIRE, n'hésitez pas à nous contacter. » | About | Placeholder de type SaaS template. Aucun canal de contact n'est fourni (ni email, ni formulaire, ni lien). La phrase est creuse sans moyen de contact. |
| 2.5 | « Mentions légales » / « Confidentialité » / « Contact » | About (footer, liens href="#") | Liens placeholder avec `href="#"` — typique d'un template non personnalisé. Ces liens ne mènent nulle part. |
| 2.6 | « Retour aux Calculateurs » | About (CTA en bas) | Le lien pointe vers `/` (page d'accueil) mais le libellé suggère une page dédiée aux calculateurs qui n'existe pas. Incohérent. |
| 2.7 | « Simplifiez votre gestion de paie et vos déclarations sociales en Tunisie. » | Home (hero h1) | Formulation marketing générique de type landing page IA. Manque de personnalité et de spécificité produit. |
| 2.8 | « Aucun avantage ne correspond à cette recherche. » | ReferentielAvantages | Message fonctionnel correct mais pourrait être plus aidant (ex : proposer des termes de recherche ou indiquer le nombre total de points). |

---

## 3. Référence juridique / institutionnelle non tunisienne

| # | Terme / texte affiché | Emplacement | Problème |
|---|---|---|---|
| 3.1 | « Réglementation CNSS 2025 » | About (Calculateur de Paie CNSS, Calculateur de Retraite CNSS) | L'année « 2025 » est obsolète (nous sommes en 2026). De plus, le terme « Réglementation CNSS » sans « tunisienne » est ambigu : il existe des organismes CNSS dans d'autres pays (Maroc, etc.). Devrait être « Réglementation CNSS tunisienne 2026 ». |
| 3.2 | « Réglementation CNRPS 2025 » | About (Calculateur de Paie CNRPS) | Même problème : année obsolète et contexte tunisien implicite mais non explicite. |
| 3.3 | « Barème IRPP 2025 - Ministère des Finances » | About | Année obsolète. Devrait être « Barème IRPP 2026 — Ministère des Finances (République Tunisienne) ». |
| 3.4 | « ministère des affaires sociales » | ActualisationSalaire (note de source) | Minuscules incorrectes pour un nom d'institution (« Ministère des Affaires Sociales ») et absence de la mention « de Tunisie » ou « de la République Tunisienne ». |
| 3.5 | « Code du travail » | ReferentielAvantages (point 23 : « indemnité prévue par le Code du travail ») | Devrait être « Code du Travail tunisien » pour lever toute ambiguïté sur le cadre juridique applicable. |
| 3.6 | « inspection du travail » / « commission de contrôle des licenciements » | ReferentielAvantages (point 23) | Institutions tunisiennes citées correctement mais en minuscules et sans préciser « tunisienne ». Pour un produit qui pourrait être consulté hors contexte, la précision pays est importante. |
| 3.7 | « Ce calculateur utilise le barème IRPP 2025. » | IRPP (note en bas de résultat) | Année obsolète. Le barème en vigueur est 2026. |

---

## 4. Incohérence de nommage

| # | Terme / texte affiché | Emplacement | Variable / id code | Problème |
|---|---|---|---|---|
| 4.1 | « Rémunération brute » | CalculerSalaire (résultat) | `resultat.totalRemunerationBrute` | Incohérent avec PaieCNSS qui affiche « Salaire Brut » pour le même champ `totalRemunerationBrute`. Le libellé « Rémunération brute » est plus large (inclut primes/avantages) mais crée une confusion pour l'utilisateur qui passe d'un calculateur à l'autre. |
| 4.2 | « Salaire Brut » | PaieCNSS (résultat) | `result.totalRemunerationBrute` | Même variable que 4.1, libellé différent. |
| 4.3 | « Revenu Annuel Brut (D) » | IRPP (champ de saisie) | `revenuAnnuel` | Concept similaire au salaire brut mais libellé totalement différent car le calculateur IRPP travaille sur une base annuelle. L'absence de lien explicite entre les trois dénominations est source de confusion. |
| 4.4 | « Salaire Imposable » | PaieCNSS (résultat, ligne intermédiaire) | `result.baseFiscaleMensuelle` | Ce libellé intermédiaire (salaire après cotisations CNSS, avant frais pro) n'apparaît que dans PaieCNSS. CalculerSalaire et IRPP ne l'affichent pas, créant une asymétrie dans le détail de calcul. |
| 4.5 | « Assiette imposable nette » | CalculerSalaire, PaieCNSS | `resultat.assietteImposableNetteMensuelle` | — |
| 4.6 | « Assiette fiscale » | IRPP (variable interne) | `result.assietteFiscale` | **Même notion que 4.5 mais libellé et nom de variable différents.** La variable code est `assietteFiscale` (IRPP) vs `assietteImposableNetteMensuelle` (PaieCNSS/CalculerSalaire). L'IRPP affiche « Assiette imposable nette » mais la variable est `assietteFiscale`. |
| 4.7 | « Déductions familiales » | CalculerSalaire, PaieCNSS, GenerateurFichePaie | `deductionsFamilialesMensuelles` | — |
| 4.8 | « Déductions Fiscales » | IRPP (résultat) | `result.deductions` | **Même notion que 4.7** mais libellé différent. L'IRPP agrège les déductions familiales + autres déductions (intérêt crédit, cotisations syndicales), d'où le libellé plus large, mais la différence avec les autres calculateurs n'est pas expliquée. |
| 4.9 | « Salaire Net » | CalculerSalaire, PaieCNSS (résultat final) | `resultat.netAPayer` | **Le libellé « Salaire Net » ne correspond pas au nom de variable `netAPayer`.** Le GenerateurFichePaie utilise le libellé correct « Net à Payer ». |
| 4.10 | « Net à Payer » | GenerateurFichePaie (résultat) | `resultat.netAPayer` | Libellé cohérent avec la variable mais incohérent avec CalculerSalaire/PaieCNSS qui disent « Salaire Net ». |
| 4.11 | « Calculer » | CalculerSalaire, PaieCNSS (bouton) | — | Libellé générique. |
| 4.12 | « Calculer mon IRPP » | IRPP (bouton) | — | Libellé personnalisé. Incohérent avec les autres calculateurs. |
| 4.13 | « Calculer ma Pension » | RetraiteCNSS (bouton) | — | Libellé personnalisé. Incohérent avec CalculerSalaire/PaieCNSS. |
| 4.14 | « Actualiser » | ActualisationSalaire (bouton) | — | Verbe différent, cohérent avec le contexte mais contraste avec les autres. |
| 4.15 | « Bulletin de Paie » | PaieCNSS (titre du résultat) | — | Suggère un bulletin officiel, mais c'est un résumé de calcul. |
| 4.16 | « Détail du calcul » | CalculerSalaire (titre du résultat) | — | Plus neutre et exact. |
| 4.17 | « Détail de l'Impôt » | IRPP (titre du résultat) | — | Spécifique mais incohérent avec les autres. |
| 4.18 | « Estimation de Pension » | RetraiteCNSS (titre du résultat) | — | Spécifique mais incohérent. |
| 4.19 | « (D) » | CalculerSalaire, PaieCNSS, IRPP (labels de champs) | — | Abréviation « D » pour dinar, mais la fonction `formatMontantDT` affiche « DT ». Incohérence entre le label du champ et le format de sortie. |
| 4.20 | « DT » / « D/an » | Résultats (via `formatMontantDT`) et Admin | — | La fonction de formatage utilise « DT » mais les labels utilisent parfois « D » ou « D/an ». Devrait être unifié en « DT » partout (dinar tunisien). |
| 4.21 | « Salaire Brut Mensuel (D) » | CalculerSalaire, PaieCNSS | — | Le « (D) » en suffixe du label utilise l'abréviation « D » tandis que les résultats affichent « DT ». |
| 4.22 | « Enfants (moins de 20 ans) » | PaieCNSS, IRPP | `config.deductionEnfant` | Cohérent entre les deux calculateurs mais le seuil d'âge (20 ans) est une règle fiscale tunisienne qui n'est pas expliquée. |
| 4.23 | « Étudiants sans bourse » | PaieCNSS, IRPP | `config.deductionEtudiant` | Cohérent, mais la condition « sans bourse » et le seuil d'âge (<25 ans) ne sont pas mentionnés dans PaieCNSS (seulement dans IRPP et Admin). |
| 4.24 | « Chef de famille » | CalculerSalaire, PaieCNSS, IRPP | `chefFamille` | Terme tunisien standard pour la situation de chef de famille (déduction de 3 600 DT/an). Pas de problème de nommage mais le montant n'est pas toujours affiché (CalculerSalaire ne l'affiche pas, PaieCNSS oui). |

---

## Récapitulatif

| Catégorie | Nombre d'entrées |
|---|---|
| 1. Jargon non expliqué | 20 |
| 2. Ton/style générique « template IA » | 8 |
| 3. Référence juridique/institutionnelle non tunisienne | 7 |
| 4. Incohérence de nommage | 24 |
| **Total** | **59** |

---

## Priorités suggérées

### Critique (impact utilisateur immédiat)
- **2.1** — Page 404 entièrement en anglais : corriger en priorité, c'est le premier contact en cas d'erreur de navigation.
- **4.9 / 4.10** — « Salaire Net » vs « Net à Payer » : unifier, car c'est le résultat le plus important pour l'utilisateur.
- **4.1 / 4.2** — « Rémunération brute » vs « Salaire Brut » : unifier pour éviter la confusion.
- **4.19 / 4.20 / 4.21** — Incohérence « D » vs « DT » : unifier la devise.

### Important (crédibilité et professionnalisme)
- **1.1** — « IRPP » non expliqué : ajouter au moins un tooltip au premier affichage.
- **1.2** — « CSS » non expliqué : même chose.
- **3.1 / 3.2 / 3.3 / 3.7** — Années « 2025 » obsolètes dans les références réglementaires.
- **2.5** — Liens placeholder `href="#"` dans le footer.
- **2.4** — Section contact sans canal de contact.

### Souhaitable (polish et cohérence)
- **4.5 / 4.6** — « Assiette imposable nette » vs « Assiette fiscale » : unifier le vocabulaire.
- **4.7 / 4.8** — « Déductions familiales » vs « Déductions Fiscales » : clarifier la distinction.
- **4.11–4.14** — Boutons de calcul : adopter une convention uniforme.
- **4.15–4.18** — Titres des cartes de résultat : adopter une convention uniforme.
- **1.3–1.20** — Jargon technique : ajouter des tooltips progressivement.
