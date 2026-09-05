# AUDIT TERMINOLOGIE — FIDUCIAIRE

> **Objectif** : recenser, sans les corriger, tous les termes/textes affichés à l'utilisateur
> présentant un problème de jargon, de ton générique, de référence non tunisienne ou d'incohérence
> de nommage. Ce document est la base de décision avant toute tâche de réécriture.
>
> **Date** : 2026-09-05
> **Périmètre** : toutes les pages et composants visibles par l'utilisateur final.
> **Aucun fichier de code n'a été modifié pour cet audit.**

---

## Catégories de problèmes

| Code | Catégorie | Description |
|------|-----------|-------------|
| **J** | Jargon non expliqué | Terme technique affiché sans info-bulle ni reformulation accessible |
| **T** | Ton/style générique « template IA » | Formulation ou titre qui ressemble à un texte par défaut de générateur |
| **R** | Référence non tunisienne | Mention d'une loi, d'un organisme ou d'une terminologie qui ne correspond pas au cadre légal tunisien |
| **N** | Incohérence de nommage | Libellé visible qui diffère d'un calculateur à l'autre pour la même notion, ou qui ne correspond pas à la convention de nommage du code |

---

## 1. Page 404 — NotFound.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 1 | `Page Not Found` | NotFound.tsx:27 | Texte en anglais alors que tout le site est en français | **R** | La page 404 est la seule page intégralement en anglais (« Page Not Found », « Sorry, the page you are looking for doesn't exist. It may have been moved or deleted. », « Go Home »). Un utilisateur tunisien s'attendrait à « Page introuvable ». |
| 2 | `Go Home` | NotFound.tsx:42 | Bouton en anglais, calque de template anglophone | **T** | « Go Home » est un intitulé de bouton typique des templates Vite/React. Devrait être « Retour à l'accueil » pour rester cohérent avec le reste du site. |

---

## 2. Sidebar — Layout.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 3 | `LE FIDUCIAIRE` | Layout.tsx:139, 166, 179 | Nom du produit affiché en majuscules | **N** | Le nom « LE FIDUCIAIRE » est systématiquement en capitales dans la sidebar. Cohérent, mais à vérifier : « fiduciaire » est un adjectif français signifiant « de confiance ». En tant que nom de produit, les capitales sont acceptables, mais le « LE » en majuscule est inhabituel. Pas de problème bloquant. |

---

## 3. Page Accueil — Home.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 4 | `Simplifiez votre gestion de paie et vos déclarations sociales en Tunisie.` | Home.tsx:113-114 | Ton marketing générique | **T** | La promesse hero est vague et ressemble à un template SaaS. « Simplifiez votre gestion de paie » ne précise pas en quoi FIDUCIAIRE est différent d'un logiciel de paie classique. La mention « en Tunisie » est bienvenue mais la formulation reste générique. |
| 5 | `Générez vos fiches de paie, simulez vos impôts et exportez vos déclarations CNSS sans erreur et en quelques clics.` | Home.tsx:117-118 | Ton promotionnel générique | **T** | « en quelques clics » est un cliché de landing page. « sans erreur » est une promesse forte qui mériterait d'être nuancée (le site affiche lui-même un disclaimer disant que les calculs sont « à titre informatif uniquement »). |
| 6 | `Accéder à l'espace de travail` | Home.tsx:129 | Intitulé de bouton générique | **T** | « Espace de travail » est un terme vague qui ne dit pas ce que l'utilisateur va trouver. Les boutons de CTA hero, dans un contexte tunisien, pourraient être plus directs : « Voir les outils » ou « Commencer un calcul ». |
| 7 | `Conformité Légale` | Home.tsx:88 | Terme sans explication | **J** | « Conformité Légale » est affiché sans définir à quelle législation on se réfère. Un non-spécialiste ne sait pas s'il s'agit du Code du travail tunisien, du barème IRPP ou des conventions CNSS. |
| 8 | `Zéro Saisie Manuelle` | Home.tsx:93 | Formulation marketing | **T** | « Zéro Saisie Manuelle » avec la description qui suit contredit le fait que tous les calculateurs (PaieCNSS, IRPP, etc.) nécessitent une saisie manuelle. Seul l'import CSV/Excel évite la saisie. |
| 9 | `Documents Prêts à l'Emploi` | Home.tsx:98 | Formulation marketing générique | **T** | Formulation calquée sur des templates SaaS B2B. Un utilisateur RH tunisien comprendrait mieux « Fiches de paie et déclarations conformes ». |
| 10 | `Brut → Net ou Net → Brut, pour les salariés du secteur privé (CNSS)` | Home.tsx:23 | Jargon « Brut → Net » sans explication | **J** | La flèche « → » n'est pas une notation compréhensible pour un non-spécialiste. Un employé tunisien qui cherche à connaître son salaire net ne comprend pas forcément « Brut → Net ». |
| 11 | `Estimez votre IRPP annuel selon votre situation familiale` | Home.tsx:30 | Acronyme IRPP sans expansion | **J** | « IRPP » (Impôt sur le Revenu des Personnes Physiques) est utilisé sans développement ni info-bulle. Le lien dans la sidebar indique « Impôt sur le revenu (IRPP) » mais la carte d'accueil ne le fait pas. |
| 12 | `Consultez les plafonds des avantages exclus de l'assiette CNSS (Décret n° 2003-1098)` | Home.tsx:79 | Jargon « assiette CNSS » | **J** | « Assiette CNSS » est un terme technique de droit social tunisien. Un non-spécialiste ne comprend pas ce qu'est l'assiette (la base de calcul des cotisations). |
| 13 | `Sélectionnez un outil pour commencer.` | Home.tsx:168 | Texte d'instruction générique | **T** | Instruction vide de sens — le titre « Outils » suffit. Ce placeholder est typique des templates. |

---

## 4. Page À Propos — About.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 14 | `À Propos de LE FIDUCIAIRE` | About.tsx:31 | Typographie : « À Propos » | **N** | « À Propos » avec un P majuscule est inhabituel en français — on écrit « À propos ». Le titre de la page utilise une casse non standard. |
| 15 | `Sécurité` (emoji 🔒) | About.tsx:53 | Terme ambigu | **J** | Le titre « Sécurité » avec un emoji cadenas suggère la cybersécurité, mais la description parle du fait que les calculs se font localement. « Confidentialité » ou « Données locales » serait plus précis. |
| 16 | `Transparence` (emoji 📊) | About.tsx:65 | Terme vague | **T** | « Transparence » est un terme marketing utilisé par de nombreux SaaS sans définition précise. L'emoji graphique ne correspond pas au concept de transparence réglementaire. |
| 17 | `Gratuit` (emoji 💰) | About.tsx:77 | Ton promotionnel | **T** | « Gratuit » est un argument marketing classique. L'emoji sac d'argent peut sembler déplacé dans un contexte professionnel tunisien. |
| 18 | `Réglementation CNSS 2025` (×2) | About.tsx:101, 114 | Référence année 2025 | **R** | L'année 2025 est codée en dur dans le texte alors que nous sommes en 2026. Les barèmes ont été mis à jour pour 2026. La mention devrait être dynamique ou mise à jour. |
| 19 | `Calculateur de Paie CNRPS` | About.tsx:133 | Calculateur CNRPS non implémenté | **R** | La page À Propos décrit un « Calculateur de Paie CNRPS » qui n'existe pas dans l'application (aucune route `/calculateurs/paie-cnrps`). C'est une promesse non tenue. |
| 20 | `Réglementation CNRPS 2025` | About.tsx:140 | Référence CNRPS sans implémentation | **R** | Même problème : le CNRPS est mentionné mais aucun calculateur n'existe dans le code. |
| 21 | `Avis Important` | About.tsx:209 | Formulation standard | **T** | « Avis Important » est la formulation standard des disclaimers français. Pas de problème majeur, mais « Avertissement » ou « Mention légale » pourrait être plus précis dans un contexte fiscal tunisien. |
| 22 | `Mentions légales`, `Confidentialité`, `Contact` | About.tsx:245-251 | Liens factices `href="#"` | **T** | Les trois liens du footer pointent vers `#` (rien). Un utilisateur qui clique s'attend à trouver du contenu. Ce sont des placeholders de template. |
| 23 | `Besoin d'a8aide ?` | About.tsx:222 | Section contact vide | **T** | La section « Besoin d'aide ? » ne propose aucun moyen de contact réel (pas d'email, pas de formulaire). Le bouton « Retour aux Calculateurs » renvoie juste à l'accueil. |

---

## 5. Calculateur Paie CNSS — PaieCNSS.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 24 | `Salaire Brut Mensuel (D)` | PaieCNSS.tsx:69 | Abréviation « (D) » | **J** | « D » pour dinar tunisien n'est pas défini. La norme ISO est TND. L'abréviation « D » est courante en Tunisie mais jamais explicitée pour un visiteur non averti. Vérifier la cohérence : certains endroits utilisent « D », d'autres « DT » (via formatMontantDT qui suffixe « DT »). |
| 25 | `Chef de famille (3600 D/an)` | PaieCNSS.tsx:107 | Montant codé en dur | **N** | Le montant « 3600 D/an » (300 D × 12) est calculé dynamiquement via `config.deductionChefFamille`, mais l'affichage montre le montant sans indiquer que c'est annuel vs mensuel. Le montant affiché est celui de la config (300 D annuel), mais le libellé dit « 3600 D/an » ce qui est 300 × 12. Incohérence potentielle selon le contenu de `config.deductionChefFamille`. |
| 26 | `Autres déductions annuelles (D)` | PaieCNSS.tsx:161 | Label'annuelles' sans contexte | **J** | Le champ « Aut&es déductions annuelles » ne précise pas quelles déductions sont éligibles (intérêts de crédit, cotisations syndicales, dons, etc.). Un utilisateur non averti ne saura pas quoi saisir. |
| 27 | `CSS (0.5%)` | PaieCNSS.tsx:234 | Acronyme CSS sans développement | **J** | « CSS » (Contribution Sociale de Solidarité) est un acronyme ambigu : en informatique, CSS signifie Cascading Style Sheets. Dans un contexte de paie tunisien, c'est la Contribution Sociale de Solidarité. Aucune info-bulle ne l'explique. |
| 28 | `IRPP` | PaieCNSS.tsx:218 | Acronyme sans développement | **J** | « IRPP » est affiché dans le bulletin de paie sans développement (Impôt sur le Revenu des Personnes Physiques). Le calculateur IRPP dédié le développe partiellement (« Impôt sur le revenu (IRPP) ») mais pas ici. |
| 29 | `Abattement frais professionnels (10 %, plafond 2 000 DT/an)` | PaieCNSS.tsx:204 | Taux codé en dur dans le label | **N** | Le taux de 10 % et le plafond de 2 000 DT sont codés en dur dans le texte affiché (via `config.fraisProTauxActifs` et `config.fraisProPlafondActifsAnnuel`), ce3s qui est correct dynamiquement. Cependant, le libellé « Abattement frais professionnels » utilise le terme « abattement » alors que l'administration fiscale tunisienne parle de « déduction pour frais professionnels ». |

---

## 6. Calculer un Salaire — CalculerSalaire.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 30 | `Brut → Net` / `Net → Brut` | CalculerSalaire.tsx:76, 82 | Notation flèche non standard | **J** | Même problème que #10 : la notation « → » est un jargon technique de RH/paie. Un employé tunisien comprendrait mieux « Du brut au net » / « Du net au brut ». |
| 31 | `Situation familiale (pour l'IRPP)` | CalculerSalaire.tsx:107 | Parenthèse jargon | **J** | La précision « (pour l'IRPP) » suppose que l'utilisateur sait ce qu'est l'IRPP. Le calculateur IRPP dédié utilise le même pattern. |
| 32 | `Abattement frais professionnels (10 %, plafond 2 000 DT/an)` | CalculerSalaire.tsx:156 | Cohérence avec PaieCNSS | **N** | Même libellé que #29. Les deux calculateurs sont cohérents entre eux (bon point), mais le terme « abattement » vs « déduction » reste un problème de nommage par rapport à la terminologie officielle tunisienne. |
| 33 | `CSS` | CalculerSalaire.tsx:175 | Acronyme sans développement | **J** | Même problème que #27. Dans ce calculateur, « CSS » est affiché sans aucune expansion. |

---

## 7. Calculateur IRPP — IRPP.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 34 | `Chef de famille (3600 D/an)` | IRPP.tsx:121 | Montant codé en dur | **N** | Le montant « 3600 D/an » est codé en dur dans le libellé (300 × 12). Si la config admin change la déduction chef de famille, ce label ne sera plus correct. PaieCNSS.tsx utilise `formatMontantDT(config.deductionChefFamille)` dynamiquement. Incohérence de nommage entre les deux calculateurs. |
| 35 | `Cotisations CNSS (9.68%)` | IRPP.tsx:232 | Taux codé en dur | **N** | Le taux « 9.68 % » est codé en dur dans le libellé. Or le taux CNSS salarial a changé (9.18 % historiquement, 9.68 % depuis 2025). Ce taux devrait être dynamique ou au moins correct pour l'année sélectionnée. |
| 36 | `Intérêts crédit immobilier (D/an, max 2000)` | IRPP.tsx:183 | Terme « crédit immobilier » | **J** | Le détail dit « crédit immobilier » mais la loi de finances tunisienne prévoit la déduction pour « intérêts des crédits de logement » (pas spécifiquement « immobilier »). De plus, le plafond de 2000 D est codé en dur. |
| 37 | `Cotisations syndicales (D/an, max 5% du revenu)` | IRPP.tsx:197 | Terminologie | **J** | « Cotisations syndicales » est correct, mais le plafond « 5% du revenu » est affiché sans référence à l'article de loi. Le plafond est calculé en dur dans le code (`revenuAnnuel * 0.05`) sans passer par la config centralisée. |
| 38 | `Ce calculateur utilise le barème IRPP 2025.` | IRPP.tsx:270 | Référence année 2025 | **R** | L'année 2025 est codée en dur. Nous sommes en 2026. Le barème a été mis à jour. La note devrait mentionner 2026 ou être dynamique. |
| 39 | `Les crédits d'impôt pour enfants sont de 50 D/enfant/mois.` | IRPP.tsx:271 | Affirmation non implémentée | **R** | Le texte mentionne des « crédits d'impôt pour enfants » de 50 D/enfant/mois. Cette fonctionnalité n'est pas implémentée dans le code du calculateur IRPP — les déductions familiales sont calculées différemment (déduction par enfant de 100 D/an, pas 50 D/mois). Le texte est inexact par rapport au comportement réel. |
| 40 | `Calculer mon IRPP` | IRPP.tsx:215 | Ton personnel | **T** | « Calculer **mon** IRPP » est le seul bouton utilisant un pronom personnel. Tous les autres calculateurs utilisent « Calculer » ou « Calculer ma Pension ». L'utilisation du possessif est un pattern de template IA. |

---

## 8. Estimer sa Retraite — RetraiteCNSS.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 41 | `Simplification actuelle` | RetraiteCNSS.tsx:92 | Avertissement technique | **J** | Le message dit « ce calculateur suppose un salaire mensuel constant sur les 10 dernières années ». C'est une limitation majeure du calcul, mais le terme « Simplification actuelle » est vague. « Limitation du calcul » serait plus honnête. |
| 42 | `Calculer ma Pension` | RetraiteCNSS.tsx:151 | Ton personnel | **T** | « Calculer **ma** Pension » utilise un pronom personnel, comme « Calculer mon IRPP » (#40). Les autres calculateurs utilisent « Calculer ». Incohérence. |
| 43 | `coefficients publiés le 19/07/2024, barème retraite mis à jour le 30/03/2025` | RetraiteCNSS.tsx:192 | Date codée en dur | **N** | Les dates de publication sont codées en dur dans un texte informatif. Si les coefficients changent, ce texte devra être mis à jour manuellement. |

---

## 9. Actualisation des Salaires — ActualisationSalaire.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 44 | `6× le SMIG` | ActualisationSalaire.tsx:60, 114 | Jargon « SMIG » sans explication | **J** | « SMIG » (Salaire Minimum Interprofessionnel Garanti) est utilisé sans développement ni info-bulle. C'est le salaire minimum en Tunisie, mais un utilisateur non averti ne connaît pas cet acronyme. |
| 45 | `Coefficient d'Actualisation` | ActualisationSalaire.tsx:118 | Terme technique | **J** | « Coefficient d'actualisation » est un concept actuariel que peu de non-spécialistes comprennent. Aucune explication n'est fournie sur ce que signifie ce coefficient ou comment il est calculé. |
| 46 | `ministère des affaires sociales` | ActualisationSalaire.tsx:128 | Référence institutionnelle | **R** | En Tunisie, le ministère compétent est le « Ministère des Affaires Sociales » (MAS). La minuscule « ministère des affaires sociales » est correcte en français, mais l'absence de majuscule pour le nom du ministère est un choix éditorial. Pas de problème bloquant. |

---

## 10. Déclaration CNSS — DeclarationsCNSS.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 47 | `N° Employeur *` | DeclarationsCNSS.tsx:160 | Terme « N° » | **J** | « N° Employeur » est le matricule CNSS de l'employeur. Le terme « N° » est vague — « Matricule CNSS employeur » serait plus précis et cohérent avec la terminologie CNSS. |
| 48 | `Clé Employeur *` | DeclarationsCNSS.tsx:164 | Terme « Clé » | **J** | « Clé Employeur » est la clé de contrôle du matricule CNSS. Un non-spécialiste ne comprend pas ce qu'est une « clé » dans ce contexte (clé de contrôle à 2 chiffres). |
| 49 | `Code Exploitation` | DeclarationsCNSS.tsx:168 | Jargon CNSS | **J** | « Code Exploitation » est un jargon spécifique au format de déclaration CNSS. Aucune explication n'est fournie sur ce que représente ce code à 4 chiffres. |
| 50 | `Salaire (millimes)` | DeclarationsCNSS.tsx:231 | Unité « millimes » | **J** | « Millimes » est l'unité monétaire tunisienne (1/1000 de dinar). Le fait que le salaire soit saisi en millimes dans le fichier TXT est une spécificité du format CNSS, mais cela peut porter à confusion avec les autres calculateurs qui affichent en DT. Aucune info-bulle n'explique la conversion. |
| 51 | `format TXT 122 caractères` | DeclarationsCNSS.tsx:138 | Spécification technique | **J** | « format TXT 122 caractères » est une spécification technique de la CNSS. Un utilisateur non technique ne comprend pas ce que signifie « 122 caractères ». |
| 52 | `Glissez ou cliquez pour importer un fichier CSV/Excel` | DeclarationsCNSS.tsx:190 | Texte générique d'upload | **T** | Formulation standard de composant d'upload. Pas de problème majeur, mais le ton est moins soigné que le reste de l'interface. |

---

## 11. Déclarations Néant — DeclarationsNeant.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 53 | `Matricule CNSS` | DeclarationsNeant.tsx:317 | Cohérence avec DeclarationsCNSS | **N** | Ici on utilise « Matricule CNSS » alors que DeclarationsCNSS utilise « N° Employeur » pour le même concept (le matricule de l'employeur). Incohérence de nommage. |
| 54 | `Raison sociale` | DeclarationsNeant.tsx:322 | Cohérence | **N** | « Raison sociale » est utilisé ici alors que DeclarationsCNSS utilise « Nom Entreprise ». Ces deux termes désignent la même notion. Incohérence de nommage. |
| 55 | `Décalage Horizontal I3 (X)` / `Décalage Vertical I3 (Y)` | DeclarationsNeant.tsx:425, 429 | Jargon technique PDF | **J** | Les labels de calibrage utilisent « I3 », « X », « Y » et « pt » (points). C'est du jargon de mise en page PDF qui ne parle qu'aux utilisateurs avertis. Un utilisateur ordinaire ne comprend pas ce qu'il calibre. |
| 56 | `État Récapitulatif I3 + Bordereau I16` | DeclarationsNeant.tsx:303 | Références I3/I16 sans explication | **J** | « État Récapitulatif I3 » et « Bordereau I16 » sont des formulaires CNSS spécifiques. Un utilisateur non familier avec les déclarations CNSS ne sait pas ce que sont l'I3 et l'I16. |

---

## 12. Testeur de Fichier TXT — TesteurTXT.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 57 | `Spécification CNSS 2012` | TesteurTXT.tsx:41 | Référence année 2012 | **R** | La mention « Spécification CNSS 2012 » est codée en dur. Le format 122 caractères est stable, mais l'année 2012 n'est pas sourcée. Est-ce toujours la spécification en vigueur en 2026 ? |
| 58 | Détail des colonnes du format | TesteurTXT.tsx:42-43 | Jargon technique | **J** | La description détaillée du format (N°Employeur(8) + Clé(2) + Code(4) + …) est un jargon de format de fichier. Utile pour les experts, mais illisible pour un employeur qui veut juste vérifier son fichier. |
| 59 | `Anomalies` | TesteurTXT.tsx:85 | Terminologie | **N** | Le terme « Anomalies » est utilisé ici, alors que DeclarationsCNSS utilise « erreurs » (via `errorsList`). Les deux termes désignent des problèmes de validation, mais le vocabulaire diffère. |

---

## 13. Référentiel Avantages Exclus — ReferentielAvantages.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 60 | `assiette des cotisations sociales` | ReferentielAvantages.tsx:356 | Jargon juridique | **J** | « Assiette des cotisations sociales » est un terme technique de droit social. Un non-spécialiste ne comprend pas que l'assiette est la base de calcul sur laquelle les cotisations sont prélevées. |
| 61 | `Décret n° 2003-1098 du 19 mai 2003 (JORT n°41 du 23/05/2003)` | ReferentielAvantages.tsx:359 | Référence juridique dense | **J** | La référence complète au Journal Officiel (JORT) est correcte et précise, mais très dense. Un utilisateur non juriste ne sait pas ce qu'est le JORT. |
| 62 | `Hors plafond 5%` | ReferentielAvantages.tsx:399 | Jargon | **J** | « Hors plafond 5% » est un badge qui suppose que l'utilisateur comprend le plafond global de 5% de l'article 3 du décret. Le concept est expliqué plus bas, mais le badge lui-même est cryptique. |
| 63 | `Écart de déclaration (soumis − déclaré)` | ReferentielAvantages.tsx:327 | Formule mathématique | **J** | La formule « soumis − déclaré » est affichée sans explication sur ce qu'elle signifie concrètement pour l'employeur (un écart positif = sous-déclaration). |

---

## 14. Générateur de Fiche de Paie — GenerateurFichePaie.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 64 | `Salaire de base` / `Prime` / `Indemnité` / `Absence (retenue)` / `Retenue` / `Avantage en nature` / `Autre élément` | GenerateurFichePaie.tsx:29-37 | Jargon « retenue » | **J** | Le type « Retenue » est distinct d'« Absence (retenue) » — la parenthèse clarifie partiellement, mais un utilisateur ne comprend pas la différence entre les deux. De plus, « Avantage en nature » est un concept juridique précis (logement, véhicule) qui mériterait une info-bulle. |
| 65 | `Matricule CNSS` | GenerateurFichePaie.tsx (employeur) | Cohérence | **N** | « Matricule CNSS » est utilisé pour l'employeur ici et dans DeclarationsNeant, mais DeclarationsCNSS utilise « N° Employeur ». Incohérence de nommage pour le même champ. |
| 66 | `Régime 40h / 48h` | GenerateurFichePaie.tsx | Jargon | **J** | Le régime horaire (40h ou 48h/semaine) détermine le SMIG applicable en Tunisie. Ce choix technique n'est expliqué nulle part — un utilisateur ne sait pas quel régime choisir. |

---

## 15. Panneau Admin — Admin.tsx

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 67 | `Accès administrateur` | Admin.tsx:66 | Terminologie | **J** | Le terme « administrateur » est standard en informatique mais peut être confus dans un contexte RH tunisien. Un « administrateur » est-il un admin système ou un gestionnaire de paie ? |
| 68 | `Cotisations CNSS` | Admin.tsx:177 | Section générique | **N** | La section admin dit « Cotisations CNSS » mais les champs sont « Salarial non-agricole », « Patronal non8agricole », etc. Ces termes sont corrects mais très techniques. |
| 69 | `Contribution Sociale de Solidarité (CSS)` | Admin.tsx:200 | Acronyme CSS | **J** | Même problème que #27. L'admin développe l'acronyme, ce qui est bien, mais les calculateurs ne le font pas. Incohérence. |
| 70 | `Barème IRPP` | Admin.tsx:219 | Jargon « barème » | **J** | « Barème IRPP » suppose que l'utilisateur sait ce qu'est un barème fiscal (tranches progressives). Le libellé « Tranches d'imposition IRPP » serait plus accessible. |
| 71 | `Frais professionnels` | Admin.tsx:248 | Cohérence terminologique | **N** | L'admin utilise « Frais professionnels » alors que les calculateurs utilisent « Abattement frais professionnels ». Incohérence : « frais » vs « abattement frais ». |
| 72 | `Parents à charge` | Admin.tsx:297 | Cohérence | **N** | « Parents à charge » est utilisé uniquement dans l'admin. Aucun calculateur ne permet de déclarer des parents à charge. Le champ est désactivé par défaut (`parentsEnChargeActif: false`). Le libellé est correct mais la fonctionnalité est inactive. |
| 73 | `Enregistré ✓` | Admin.tsx:157, 322 | Caractère Unicode ✓ | **T** | Le caractère « ✓ » est utilisé dans le bouton après sauvegarde. C'est un pattern d'UI moderne, pas un problème bloquant, mais à noter pour la cohérence (aucun autre bouton du site n'utilise ce pattern). |
| 74 | `Loi de finances 2026 : le taux retraités doit progresser à 30% (2027), 40% (2028), 50% (2029)` | Admin.tsx:264 | Référence légale | **J** | L'information est précieuse mais le format est dense. Un non-spécialiste ne comprend pas l'impact concret de cette progression. |

---

## 16. Messages de validation — validation-salaire.ts

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 75 | `Veuillez saisir un montant valide.` | validation-salaire.ts:19 | Message générique | **T** | Message d'erreur standard — pourrait être plus spécifique (ex: « Le salaire doit être un nombre positif en dinars tunisiens »). |
| 76 | `Le montant doit être supérieur à 0 DT.` | validation-salaire.ts:20 | Abréviation « DT » | **J** | L'abréviation « DT » (dinar tunisien) est utilisée dans le message de validation. Cohérent avec formatMontantDT, mais jamais défini pour l'utilisateur. |
| 77 | `Le montant semble irréaliste (maximum 1 000 000,000 DT).` | validation-salaire.ts:21 | Message | **T** | « semble irréaliste » est un jugement qualitatif qui pourrait être perçu comme condescendant. « Dépasse le plafond autorisé » serait plus neutre. |

---

## 17. Sidebar — Groupes de navigation

| # | Terme/texte affiché | Emplacement | Problème | Code | Détail |
|---|---------------------|-------------|----------|------|--------|
| 78 | `Simulateurs RH` | Layout.tsx:42 | Terminologie | **N** | « Simulateurs RH » dans la sidebar, mais les cartes d'accueil disent « Nos Calculateurs » (About.tsx:88) et « Outils » (Home.tsx:164). Trois termes différents pour le même concept. |
| 79 | `Gestion de la Paie` | Layout.tsx:50 | Cohérence | **N** | Le groupe « Gestion de la Paie » contient « Générer une fiche de paie » et « Actualisation des salaires ». « Actualisation des salaires » est un concept de retraite, pas de paie courante. Le regroupement est discutable. |
| 80 | `Déclarations Sociales` | Layout.tsx:57 | Cohérence | **N** | Le groupe « Déclarations Sociales » contient « Testeur de fichier TXT » qui est un outil de validation, pas une déclaration. Le regroupement est discutable. |
| 81 | `Référentiel légal` | Layout.tsx:67 | Cohérence | **N** | La sidebar dit « Référentiel légal » mais la page s'intitule « Référentiel des avantages exclus de l'assiette des cotisations sociales ». La version sidebar est une simplification acceptable. |

---

## Résumé statistique

| Catégorie | Nombre | Exemples marquants |
|-----------|--------|--------------------G|
| **J** — Jargon non expliqué | 26 | IRPP, CSS, assiette, SMIG, matricule, millimes, barème, coefficient d'actualisation |
| **T** — Ton/style générique template | 15 | « Go Home », « en quelques clics », « Accéder à l'espace de travail », liens `href="#"` |
| **R** — Référence non tunisienne | 6 | Page 404 en anglais, « année 2025 » codée en dur, calculateur CNRPS non implémenté |
| **N** — Incohérence de nommage | 12 | « N° Employeur » vs « Matricule CNSS », « Abattement frais » vs « Frais professionnels », « Simulateurs RH » vs « Outils » vs « Calculateurs » |
| **Total** | **59** | |

---

## Recommandations prioritaires (à valider avant action)

1. **Page 404 en français** — Impact immédiat : seul contenu anglophone du site (#1, #2)
2. **Acronymes sans expansion** — Ajouter des info-bulles sur IRPP, CSS, SMIG, CNSS, CNRPS au premier affichage (#11, #27, #28, #44)
3. **Incohérences de nommage** — Aligner « N° Employeur » / « Matricule CNSS » / « Nom Entreprise » / « Raison sociale » (#47, #53, #54, #65)
4. **Liens factices du footer** — Supprimer ou implémenter « Mentions légales », « Confidentialité », « Contact » (#22)
5. **Calculateur CNRPS fantôme** — Retirer de la page À Propos ou implémenter (#19, #20)
6. **Années codées en dur** — Dynamiser les références « 2025 » (#18, #38)
7. **Terminologie « abattement frais professionnels »** — Aligner sur « déduction pour frais professionnels » (terminologie DGFi tunisienne) (#29, #32, #71)
8. **Aligner le vocabulaire des groupes de navigation** — Unifier « Simulateurs RH » / « Outils » / « Calculateurs » (#78)
