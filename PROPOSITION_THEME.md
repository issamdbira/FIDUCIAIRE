# Proposition de thème visuel — LE FIDUCIAIRE

> **Date** : 2026-09-06
> **Phase** : Découverte / proposition — **aucun fichier de production modifié**
> **Sujet** : Un document financier tunisien dense en chiffres, qui doit être lu et vérifié rapidement

---

## 1. Plan — Palette

Le point de départ est l'identité navy/gold déjà en place. La proposition remplace le salmon/coral actuel (`#f88e77`, ton SaaS generic) par un or authentique de fiduciaire, et resserre la palette sur 5 couleurs nommées.

| Nom | Hex | Rôle | Justification |
|-----|-----|------|---------------|
| **Navy** | `#0B2545` | Primary, titres, labels, barre de navigation | Profondeur institutionnelle. C'est la couleur d'un cachet d'entreprise, d'un en-tête de fiche de paie officielle. Plus sombre que le `#073766` actuel pour plus de gravitas. |
| **Or** | `#C5973E` | Accent unique — résultat net à payer, CTA principal, soulignement du header | La seule couleur qui attire l'œil. Or foncé (dark goldenrod), pas jaune vif ni or flashy. Évoque la fiabilité financière et le document officiel timbré. Utilisé **une seule fois par écran** comme moment visuel. |
| **Papier** | `#FAF9F7` | Fond de page | Tons chauds infimes — évoque le papier fiscal, pas le « fond crème SaaS ». La nuance est suffisamment subtile pour que personne ne le perçoive comme « crème » : c'est un blanc chaud de document, pas un ton décoratif. |
| **Encre** | `#0B1D35` | Texte courant | Noir légèrement teinté navy. Lisible à petite taille (11-13px), contraste > 12:1 sur Papier. |
| **Ardoise** | `#5C6B7A` | Texte secondaire, labels, métadonnées | Gris-bleu froid pour les informations contextuelles (régime, période, conditions). Contraste ~5:1 sur Papier — suffisant pour le texte informatif. |

### Couleurs sémantiques (dérivées, pas de nouvelle teinte)

| Nom | Hex | Usage |
|-----|-----|-------|
| **Hairline** | `#D9DDE3` | Séparateurs de tableau, bordures fines (1px) |
| **Succès** | `#1A7A5C` | Montants exonérés, statut conforme au plafond 5 % |
| **Alerte** | `#B91C1C` | Montants négatifs (retenues), dépassement de plafond |
| **Navy-mid** | `#13415C` | Hover/active sur navy, titres de colonne déductions |

---

## 2. Plan — Typographie

| Police | Rôle | Graisses | Tailles | Justification |
|--------|------|----------|---------|---------------|
| **Montserrat** | Titres (H1-H3), labels de section, CTA | 700, 800 | 10-20px | Géométrique, nette, lisible en capitales espacées pour les labels de section. Déjà en place — conservée. |
| **Inter** | Corps, tableaux, montants, UI | 400, 500, 600 | 11-15px | Excellente lisibilité à petite taille. **Chiffres tabulaires** natifs via `font-variant-numeric: tabular-nums`. C'est le choix structurant pour l'alignement des montants. |

### Hiérarchie typographique (dense — pas d'espacement généreux)

| Niveau | Taille | Graisse | Police | Exemple |
|--------|--------|---------|--------|---------|
| H1 page | 18-20px | 700 | Montserrat | « Calculateur de paie CNSS » |
| H2 section | 12-14px | 700 | Montserrat | « PARAMÈTRES », « RÉSULTAT » |
| H3 sous-section | 10-11px | 700 | Montserrat | « AVANTAGES EXCLUS — DÉCRET 2003-1098 » |
| Corps | 13px | 400 | Inter | Texte courant, labels de champ |
| Montant | 13px | 500 | Inter + tabular-nums | « 1 800,000 » |
| Montant total | 15-18px | 700 | Inter + tabular-nums | « 1 519,367 DT » (Net à Payer) |
| Caption | 10-11px | 400-500 | Inter | Métadonnées, mentions légales |

### Règle tabular-nums

**Tous les montants financiers** (salaires, cotisations, impôts, plafonds) utilisent `font-variant-numeric: tabular-nums` sur Inter. Cela garantit que chaque chiffre (0-9) occupe la même largeur fixe, alignant parfaitement les colonnes de nombres — comme sur un tableur comptable ou un bordereau CNSS.

Aucun `font-mono` pour les montants : mono a des proportions de lettres inadaptées (i, l, m trop étroits/larges) et un espacement visuel trop aéré. Inter tabular-nums est lisse, compact et aligné.

---

## 3. Plan — Concept de mise en page

### Principes

1. **Le tableau est l'élément central** — pas la carte. Les résultats de calcul, les tranches IRPP, les lignes de cotisation sont des `<table>` avec hairlines (`1px solid #D9DDE3`), pas des cartes shadcn avec ombre et arrondi.
2. **Densité assumée** — un comptable compare visuellement plusieurs lignes de cotisations. L'espacement vertical inter-ligne est 6-8px (padding de cellule), pas 24-32px (gap de carte). L'information reste accessible grâce à la hiérarchie typographique (graisse, taille, couleur), pas à l'espacement.
3. **Pas d'ombre** sur les blocs de données. Seul le document fiche de paie a une ombre minimale (`0 1px 3px rgba(0,0,0,0.06)`) pour le détacher du fond — effet « document posé sur le bureau ».
4. **Un seul moment Or** — la ligne « Net à Payer » (ou l'équivalent) est soulignée par une bordure Or de 2px et un fond teinté. C'est le seul endroit où l'accent attire l'œil.

### Wireframe ASCII — Calculateur

```
┌─ NAV ──────────────────────────────────────────────┐
│ LE FIDUCIAIRE    Outils  Calculateur de paie CNSS  │
│────────────────────────────────────────────────────│
│ (navy fond, bordure Or 2px en bas)                │
└────────────────────────────────────────────────────┘

Calculateur de paie CNSS
Salaire brut vers net — régime 40h ou 48h

┌─ PARAMÈTRES ────────────┐  ┌─ RÉSULTAT ───────────────┐
│ Régime horaire     [▼]  │  │ Régime 48h — Juillet 2025│
│ Brut mensuel  1 800,000 │  │──────────────────────────│
│ Chef de famille    [▼]  │  │ Élément          Montant │
│ Enfants             [2] │  │──────────────────────────│
│ Période      [Juil. 25] │  │ Rémunération brute 1 800│
│                          │  │ Base CNSS          1 800│
│ ┌─ CALCULER ──────────┐ │  │ CNSS (9,42%)      −170  │
│ └──────────────────────┘ │  │ Base fiscale      1 630 │
└──────────────────────────┘  │ Frais pro (10%)    163  │
                               │ Déductions fam.    300 │
                               │ Assiette nette   1 167 │
                               │ IRPP              −88  │
                               │ CSS               −23  │
                               │════════════════════════│
                               │ Net à Payer    1 519   │ ← bordure Or 2px
                               └────────────────────────┘

┌─ AVANTAGES EXCLUS — DÉCRET 2003-1098 ──────────────┐
│ Pt 1  Prime rentrée    80,000  Exonéré  80,000     │
│ Plafond global 5% (art. 3) : 90,000 — conforme    │
└─────────────────────────────────────────────────────┘
```

- **Deux colonnes** : entrées à gauche (340px fixe), résultats à droite (tableau pleine largeur)
- **Pas de cartes** : les blocs sont des rectangles à bordure hairline, sans ombre, sans arrondi prononcé
- **Tableau de résultats** : hairlines inter-lignes, montant en tabular-nums aligné à droite
- **Ligne « Net à Payer »** : seul élément avec bordure Or + fond teinté Or

### Wireframe ASCII — Fiche de paie

```
┌─────────────────────────────────────────────────────┐
│ SOCIÉTÉ TUNISIENNE DE CONSEIL SARL    FICHE DE PAIE│
│ 12, rue Hédi Nouira 1000 Tunis          Juillet 2025│
│ MF: 123456789  CNSS: 200500/004                    │
│────────────────────────────────────────────────────│
│ Ben Ahmed Mohamed │ Comptable │ Cadre │ 01/03/2022 │
│────────────────────────────────────────────────────│
│                     │                              │
│ GAINS ET EXONÉRATIONS│ RETENUES ET COTISATIONS     │
│─────────────────────│──────────────────────────────│
│ Élément  Exon. Soumis│ Élément   Base    Montant   │
│ Sal. base      1 800 │ CNSS 9,42% 1 944    183    │
│ Prime rentrée 80     │ IRPP                116    │
│ Prime anc.       90  │ CSS                  29    │
│ HS               54  │ Avances             200    │
│─────────────────────│──────────────────────────────│
│ Total  80  1 944     │ Total             528      │
│                     │                              │
│════════════════════════════════════════════════════│
│ NET À PAYER                          1 496,150 DT │ ← bordure Or
│════════════════════════════════════════════════════│
│ Avantages exclus — Décret 2003-1098               │
│ Pt 1  80,000  exonéré 80,000  soumis 0,000       │
│ Plafond 5% : 97,200 — conforme                   │
│────────────────────────────────────────────────────│
│ CNSS patronale : 322,241 DT  │  Virement — BIAT  │
│────────────────────────────────────────────────────│
│ Employeur (signature)     │ Salarié (lu et approuvé)│
└─────────────────────────────────────────────────────┘
```

- **Format document** : proportions A4, pas de carte, ombre minimale « document sur bureau »
- **Deux colonnes gains/déductions** : séparées par une hairline, pas par des cartes
- **En-têtes colonnes** : navy/medium-navy, capitales Montserrat 10px
- **Net à Payer** : seul moment Or — bordure 2px + fond teinté + montant 22px bold tabular-nums
- **Signature** : zone en bas, séparée par hairline

---

## 4. Relecture critique — ce qui a été changé et pourquoi

### Changement 1 : Accent salmon → Or

| Avant (default SaaS) | Après (proposé) | Pourquoi |
|----------------------|-----------------|----------|
| `#f88e77` (salmon/coral) | `#C5973E` (or foncé) | Le salmon est un accent « tech startup » — on le retrouve dans les thèmes Tailwind par défaut, les landing pages Vercel, les dashboards SaaS. L'or est l'accent d'une fiduciaire : cachet, document timbré, confiance financière. FIDUCIAIRE traite de l'argent tunisien — l'accent doit évoquer la gravité financière, pas la fraîcheur tech. |

### Changement 2 : Card-based layout → Table/document layout

| Avant (default SaaS) | Après (proposé) | Pourquoi |
|----------------------|-----------------|----------|
| Chaque résultat dans une `<Card>` shadcn (shadow-sm, rounded-lg, p-6) | Résultats dans un `<table>` avec hairlines, sans ombre, sans arrondi | Le « kit de cartes SaaS » est explicitement interdit par le cadrage. Un comptable scanne des lignes de cotisation — un tableau à hairlines est le format naturel d'un document comptable. Les cartes découpent l'information en îlots visuels qui forcent le va-et-vient oculaire ; le tableau la maintient en flux continu. |

### Changement 3 : Spacing généreux (p-6/p-8, gap-6) → Dense (padding 4-8px inter-ligne)

| Avant (default SaaS) | Après (proposé) | Pourquoi |
|----------------------|-----------------|----------|
| `p-6`/`p-8`, `gap-4`/`gap-6`, `space-y-6` | Padding cellule 3-6px, gap inter-champ 12px | L'espacement « site vitrine » est interdit pour les écrans de données denses. Un comptable qui compare la cotisation CNSS à l'IRPP sur 5 salariés n'a pas besoin de 24px entre chaque ligne — il a besoin de voir les chiffres alignés et proches. La hiérarchie est assurée par graisse/taille/couleur, pas par l'espacement. |

### Changement 4 : font-mono sur les montants → Inter tabular-nums

| Avant (default SaaS) | Après (proposé) | Pourquoi |
|----------------------|-----------------|----------|
| `font-mono` (monospace) sur certaines cellules de tableau | `font-variant-numeric: tabular-nums` sur Inter pour tous les montants | Le monospace (DejaVu Sans Mono ou similaire) a des proportions de lettres inadaptées aux montants : les « i » et « l » sont trop étroits, les « m » trop larges, l'espacement inter-caractère est visuellement aéré. Inter tabular-nums donne des chiffres à largeur fixe (alignement parfait) tout en conservant les proportions naturelles des lettres — c'est l'approche utilisée par les logiciels comptables (Sage, SAP). |

### Changement 5 : Hero marketing SaaS → Hero compact fiduciaire

| Avant (default SaaS) | Après (proposé) | Pourquoi |
|----------------------|-----------------|----------|
| Grande section gradient, 3 cartes « points forts », CTA marketing | Header navy compact (2.5rem de haut), description factuelle, CTA sobre | L'accueil d'un outil de paie n'est pas une landing page SaaS. L'utilisateur vient faire un calcul, pas découvrir un produit. Le hero donne le contexte en 2 lignes et renvoie vers les outils. Pas de « Simplifiez votre gestion », pas de « en quelques clics ». |

### Changement 6 : Accueil en cartes → Accueil en tableau d'outils

| Avant (default SaaS) | Après (proposé) | Pourquoi |
|----------------------|-----------------|----------|
| 3×3 grid de `<Card>` avec icône, titre, description | Tableau simple (outil, description, catégorie) | Les cartes sur l'accueil sont du boilerplate SaaS. Un tableau est plus dense, plus scannable, et traite les outils comme des entrées de référence — cohérent avec le reste de l'interface. |

### Éléments volontairement absents (conformes aux interdictions)

| Élément interdit | Présent dans la proposition ? |
|------------------|-------------------------------|
| Fond crème + terracotta | Non. Le fond `#FAF9F7` est un blanc chaud de papier, pas un crème décoratif. Aucun terracotta. |
| Kit de cartes SaaS | Non. Aucune Card shadcn dans les maquettes. Tables et rectangles à hairline uniquement. |
| Eyebrows MAJUSCULES espacées | Non. Les labels de section sont en Montserrat 10-11px uppercase, mais **pas au-dessus des titres** — ils *sont* les titres de section (h2/h3). |
| « MOT — fragment » avec tiret cadratin | Non. Les libellés utilisent des parenthèses pour les expansions (ex: « CNSS (9,42 %) »), pas de tirets cadratin décoratifs. |
| Flèches « → » en fin de bouton | Non. Les CTA sont en majuscules Montserrat sans flèche (ex: « CALCULER », « OUVRIR LES OUTILS »). |
| Animations fondu-glissement au scroll | Non. Aucune animation dans les maquettes. L'animation unique justifiée serait un flash discret sur le résultat quand l'utilisateur modifie un champ de calcul — à implémenter au moment de l'intégration, pas dans les maquettes statiques. |
| Espacement généreux uniforme | Non. Padding inter-ligne 3-6px, gap inter-champ 12px. Dense comme un document comptable. |

---

## 5. Maquettes statiques

Trois maquettes HTML/CSS autonomes, sans dépendance au projet React :

| Maquette | Fichier | Description |
|----------|---------|-------------|
| **Accueil** | [`maquettes/accueil.html`](maquettes/accueil.html) | Page d'accueil — hero compact, tableau d'outils, bandeau barèmes |
| **Calculateur** | [`maquettes/calculateur.html`](maquettes/calculateur.html) | Calculateur de paie — deux colonnes (inputs/tableau), section avantages exclus |
| **Fiche de paie** | [`maquettes/fiche-paie.html`](maquettes/fiche-paie.html) | Fiche de paie — format document A4, gains/déductions deux colonnes, Net à Payer accentué |

### Comment visualiser

Ouvrir chaque fichier directement dans un navigateur (aucun serveur requis). Les polices Inter et Montserrat sont chargées via Google Fonts CDN.

---

## 6. Résumé des décisions clés

1. **Or (`#C5973E`)** remplace le salmon comme accent unique — motivé par le sujet (fiduciaire/financier), pas par la mode tech
2. **Tableau hairline** remplace la carte shadcn — motivé par le sujet (document comptable dense), pas par le template SaaS
3. **Inter tabular-nums** pour tous les montants — alignement parfait des chiffres sans recourir au monospace
4. **Densité** (padding 3-6px inter-ligne) — un comptable scanne, il ne « découvre » pas
5. **Un seul moment Or** (Net à Payer) — l'accent est rare, pas décoratif
6. **Aucune animation** dans les maquettes — l'animation unique sera un flash de résultat au changement de champ, à l'implémentation

---

*Cette proposition est en lecture seule. Aucun fichier de production n'a été modifié. Les maquettes statiques sont dans le dossier `maquettes/` et peuvent être ouvertes directement dans un navigateur.*
