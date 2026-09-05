# AUDIT TERMINOLOGIQUE — LE FIDUCIAIRE

> Document en lecture seule. Aucune modification de code existant ne sera effectuée sans validation préalable de l'utilisateur.

Date : 2026-09-06  
Pages scannées : Home, About, NotFound, Admin, CalculerSalaire, PaieCNSS, IRPP, RetraiteCNSS, ActualisationSalaire, GenerateurFichePaie, DeclarationsCNSS, DeclarationsNeant, ReferentielAvantages, Layout, ThemeToggle

---

## Résumé

| Catégorie | Occurrences |
|-----------|-------------|
| 1. Jargon non expliqué | 18 |
| 2. Ton/style générique « template IA » | 6 |
| 3. Référence juridique/institutionnelle non tunisienne | 2 |
| 4. Incohérence de nommage | 13 |
| **Total** | **39** |

---

## Catégorie 1 — Jargon non expliqué

| # | Fichier | Ligne | Texte exact | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 1 | `Home.tsx` | 79 | `"Consultez les plafonds des avantages exclus de l'assiette CNSS (Décret n° 2003-1098)"` | `"Consultez les montants maximum des avantages qui ne sont pas soumis aux cotisations sociales (assiette CNSS), selon le Décret n° 2003-1098"` |
| 2 | `Home.tsx` | 65 | `"Générez par lot vos déclarations néant (État I3 + Bordereau I16) avec calibrage PDF"` | `"Générez par lot vos déclarations néant — formulaire I3 (état récapitulatif) et I16 (bordereau de paiement) — prêts à déposer à la CNSS"` |
| 3 | `Home.tsx` | 72 | `"Vérifiez la conformité d'un fichier TXT CNSS 122 caractères"` | `"Vérifiez que votre fichier de déclaration CNSS respecte le format officiel (122 caractères par ligne)"` |
| 4 | `About.tsx` | 97 | `"Prend en compte les cotisations CNSS, l'IRPP et la CSS selon votre situation familiale"` | `"Prend en compte les cotisations CNSS (sécurité sociale), l'IRPP (impôt sur le revenu) et la CSS (contribution de solidarité) selon votre situation familiale"` |
| 5 | `About.tsx` | 110 | `"Applique les indices d'actualisation et le barème de taux de pension"` | `"Applique les coefficients officiels d'actualisation des salaires et le barème de taux de pension"` |
| 6 | `About.tsx` | 123 | `"Gère les déductions fiscales et les crédits d'impôt selon votre situation"` | `"Prend en compte les réductions d'impôt liées à votre situation familiale (chef de famille, enfants, etc.)"` |
| 7 | `CalculerSalaire.tsx` | 166 | `"Assiette imposable nette"` | `"Base imposable nette (revenu après déductions sur lequel l'impôt est calculé)"` |
| 8 | `CalculerSalaire.tsx` | 170 | `"IRPP"` | `"IRPP (Impôt sur le Revenu)"` — au minimum au premier usage |
| 9 | `CalculerSalaire.tsx` | 175 | `"CSS"` | `"CSS (Contribution Sociale de Solidarité)"` |
| 10 | `PaieCNSS.tsx` | 237 | `"Assiette imposable nette"` | `"Base imposable nette (revenu après déductions)"` |
| 11 | `IRPP.tsx` | 248 | `"Assiette imposable nette"` | Idem |
| 12 | `IRPP.tsx` | 232 | `"Cotisations CNSS (9.68%)"` | `"Cotisations sécurité sociale CNSS (9.68 % du salaire)"` |
| 13 | `GenerateurFichePaie.tsx` | 731 | `"Assiette imposable nette"` | Idem + tooltip |
| 14 | `GenerateurFichePaie.tsx` | 683 | `"Base CNSS"` / `"Base fiscale"` | `"Base CNSS (plafond des cotisations)"`, `"Base fiscale (revenu soumis à l'impôt)"` |
| 15 | `RetraiteCNSS.tsx` | 127 | `"Moins de 5 ans : pas de pension (remboursement des cotisations)…"` | Garder mais ajouter un encart « Glossaire » ou des tooltips sur « cotisations », « pension », « plafonné » |
| 16 | `ActualisationSalaire.tsx` | 59 | `"plafonné à 6× le SMIG puis actualisé par un coefficient"` | `"limité à 6 fois le SMIG (salaire minimum interprofessionnel garanti), puis recalculé avec un coefficient officiel pour refléter la valeur actuelle"` |
| 17 | `Admin.tsx` | 117 | `"Contribution Sociale de Solidarité (CSS)"` | OK comme label admin, mais ajouter une ligne `"La CSS est un prélèvement exceptionnel sur les revenus nets imposables supérieurs à 5 000 D/an"` |
| 18 | `Admin.tsx` | 216 | `"retenue à la source mensuelle"` | `"prélèvement à la source (retenu chaque mois sur le salaire)"` |

---

## Catégorie 2 — Ton/style générique « template IA »

| # | Fichier | Ligne | Texte exact | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 1 | `Home.tsx` | 113 | `"Simplifiez votre gestion de paie et vos déclarations sociales en Tunisie."` | `"Calculez vos salaires, générez vos fiches de paie et produisez vos déclarations CNSS — conformément à la réglementation tunisienne."` |
| 2 | `Home.tsx` | 118 | `"… sans erreur et en quelques clics."` | `"… sans erreur, directement dans votre navigateur."` |
| 3 | `Home.tsx` | 129 | `"Accéder à l'espace de travail"` | `"Découvrir les outils"` ou `"Voir les calculateurs"` |
| 4 | `About.tsx` | 40 | `"plateforme gratuite et transparente dédiée à simplifier les calculs sociaux et fiscaux pour les citoyens tunisiens"` | `"outil gratuit qui vous permet de calculer vous-même votre paie, votre impôt et votre retraite selon les barèmes officiels tunisiens"` |
| 5 | `About.tsx` | 80 | `"Aucun frais caché. Utilisez tous nos calculateurs gratuitement, à tout moment."` | `"Entièrement gratuit, sans inscription ni abonnement."` |
| 6 | `IRPP.tsx` | 89 | `"Calculez votre impôt annuel sur le revenu selon votre situation familiale et vos déductions."` | `"Estimez l'impôt annuel sur le revenu (IRPP) d'après votre situation familiale et vos déductions, selon le barème officiel tunisien."` |

---

## Catégorie 3 — Référence juridique/institutionnelle non tunisienne

| # | Fichier | Ligne | Texte exact | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 1 | `About.tsx` | 155 | `"CNSS (Caisse Nationale de Sécurité Sociale)"` | `"CNSS (Caisse Nationale de Sécurité Sociale de Tunisie)"` — le terme « Sécurité Sociale » sans qualificatif renvoie en priorité à l'institution française |
| 2 | `About.tsx` | 175 | `"Organisme responsable de la retraite et de la prévoyance sociale des fonctionnaires publics."` | `"Organisme responsable de la retraite et de la prévoyance sociale des fonctionnaires publics en Tunisie."` |

---

## Catégorie 4 — Incohérence de nommage

| # | Fichier | Ligne | Texte trouvé | Conflit avec | Fix suggéré |
|---|---------|-------|--------------|--------------|-------------|
| 1 | `PaieCNSS.tsx` | 210 | `"Bulletin de Paie"` | `GenerateurFichePaie.tsx:787` → `"Fiche de Paie"`, `Home.tsx:43` → `"fiche de paie"` | Standardiser sur **« Fiche de paie »** |
| 2 | `CalculerSalaire.tsx` | 181 | `"Salaire Net"` | `GenerateurFichePaie.tsx:762,854` → `"Net à Payer"` | Standardiser sur **« Net à Payer »** (terme juridique tunisien) |
| 3 | `PaieCNSS.tsx` | 251 | `"Salaire Net"` | Idem | → `"Net à Payer"` |
| 4 | `CalculerSalaire.tsx` | 148 | `"Rémunération brute"` | `CalculerSalaire.tsx:89` → `"Salaire Brut Mensuel"` | Standardiser sur **« Salaire Brut »** pour la ligne de détail |
| 5 | `GenerateurFichePaie.tsx` | 705 | `"Rémunération brute"` | Contexte : total avec primes → acceptable | Ajouter tooltip explicatif |
| 6 | `PaieCNSS.tsx` | 223 | `"Salaire Imposable"` | `IRPP.tsx:236` → `"Revenu Imposable"` | `"Salaire imposable (après CNSS)"` dans PaieCNSS, `"Revenu Imposable (annuel)"` dans IRPP |
| 7 | `DeclarationsNeant.tsx` | 357 | `"Declarations Neant"` (sans accent) | `Home.tsx:64` → `"Déclarations Néant"` | Corriger → **« Déclarations Néant »** (accent circonflexe obligatoire) |
| 8 | `DeclarationsNeant.tsx` | 360 | `"declarations neant"` (sans accent, minuscule) | Idem | Corriger → **« déclarations néant »** |
| 9 | `RetraiteCNSS.tsx` | 151 | `"Calculer ma Pension"` (bouton) | `RetraiteCNSS.tsx:84` → `"Estimer sa retraite"` (h2) | → **« Estimer ma pension »** |
| 10 | `IRPP.tsx` | 215 | `"Calculer mon IRPP"` (bouton) | `CalculerSalaire.tsx:129` → `"Calculer"` | Homogénéiser : **« Calculer »** partout |
| 11 | `IRPP.tsx` | 86 | `"Calculateur IRPP"` (h2) | `Layout.tsx:45` → `"Impôt sur le revenu (IRPP)"` | → **« Impôt sur le Revenu (IRPP) »** |
| 12 | `GenerateurFichePaie.tsx` | 762,854 | `"Net à Payer"` | Voir #2 — c'est la forme correcte, à propager | — |
| 13 | `IRPP.tsx` | 121 | `"Chef de famille (3600 D/an)"` | `PaieCNSS.tsx:130` → `"Chef de famille (300 D)"` | Ajouter la période : **« Chef de famille (300 D/mois) »** dans PaieCNSS |

---

## Recommandations transversales

### 1. Glossaire intégré
Créer un composant `<TooltipJargon term="assiette" />` qui affiche une définition au survol. L'appliquer systématiquement aux termes : *assiette*, *imposable*, *plafond*, *cotisation*, *contribution*, *retenue à la source*, *barème*, *SMIG*, *IRPP*, *CSS*, *CNSS*, *CNRPS*.

### 2. Expansion au premier usage
Chaque sigle (IRPP, CSS, CNSS, CNRPS, SMIG) doit être écrit en toutes lettres avec le sigle entre parenthèses à sa première apparition sur chaque page :
- `"Impôt sur le Revenu des Personnes Physiques (IRPP)"`
- `"Contribution Sociale de Solidarité (CSS)"`
- `"Caisse Nationale de Sécurité Sociale (CNSS)"`
- `"Salaire Minimum Interprofessionnel Garanti (SMIG)"`

### 3. Charte de nommage à figer
| Concept | Terme standard | Termes bannis |
|---------|---------------|---------------|
| Résultat final | **Net à Payer** | « Salaire Net » |
| Document | **Fiche de paie** | « Bulletin de paie » |
| Brut total (avec primes) | **Rémunération brute** | — (avec tooltip) |
| Brut de base | **Salaire brut** | — |
| Action bouton | **Calculer** / **Estimer** | « Calculer mon/ma… » |
| Déclarations néant | **Déclarations Néant** | « Declarations Neant » |

### 4. Purger le langage SaaS
Bannir : « Simplifiez… », « en quelques clics », « espace de travail », « plateforme dédiée à », « Aucun frais caché ». Remplacer par du langage factuel tunisien : « Conformément au barème CNSS 2025 », « Calcul local dans votre navigateur », etc.
