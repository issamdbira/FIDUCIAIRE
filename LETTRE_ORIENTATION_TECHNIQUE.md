# LETTRE D'ORIENTATION TECHNIQUE - LE FIDUCIAIRE

**Date :** 5 Septembre 2026  
**Projet :** LE FIDUCIAIRE — Plateforme de Calculateurs Sociaux Tunisiens  
**Version :** 2.0 (Production-Ready)  
**Repository :** https://github.com/issamdbira/FIDUCIAIRE  
**Déploiement :** Vercel (https://fiduciaire.vercel.app)

---

## RÉSUMÉ EXÉCUTIF

LE FIDUCIAIRE est une plateforme web gratuite permettant aux citoyens tunisiens de calculer et générer :
- **Calculer un salaire** (Brut vers Net / Net vers Brut, secteur privé CNSS)
- **Paie CNSS** (Salariés secteur privé)
- **Retraite CNSS** (Pension de retraite)
- **IRPP** (Impôt sur le revenu progressif)
- **Actualisation des salaires** (Coefficients CNSS pour retraite)
- **Fiche de paie** (Génération PDF complète)
- **Déclarations CNSS** (Saisie, import CSV/Excel, fichier TXT)
- **Déclarations Néant** (Génération lot I3 + I16 PDF)
- **Testeur TXT CNSS** (Vérification conformité 122 caractères)
- **Référentiel légal** (Avantages exclus, Décret n° 2003-1098)
- **Panneau Admin** (Paramétrage centralisé du moteur de paie)

**État actuel :** Tous les calculateurs et générateurs sont implémentés et fonctionnels. Mode sombre disponible.

---

## ARCHITECTURE TECHNIQUE

### Stack Technologique
```
Frontend:
- React 19 + TypeScript
- Vite 7.1 (Build tool)
- Tailwind CSS 4 (Styling)
- shadcn/ui (Composants UI)
- Wouter (Routing client-side)
- Framer Motion (Animations)
- react-hook-form + Zod (Formulaires & validation)
- pdf-lib (Génération PDF)
- xlsx / PapaParse (Import Excel/CSV)
- JSZip (Compression ZIP pour déclarations)

Déploiement:
- Vercel (Hosting statique)
- GitHub (Version control)
- pnpm (Package manager)
```

### Structure du Projet
```
le-fiduciaire/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx                       # Page d'accueil
│   │   │   ├── About.tsx                      # Page À propos
│   │   │   ├── Admin.tsx                      # Paramétrage centralisé
│   │   │   ├── NotFound.tsx                   # Page 404
│   │   │   └── calculateurs/
│   │   │       ├── CalculerSalaire.tsx        # ✅ Brut/Net
│   │   │       ├── PaieCNSS.tsx               # ✅ Paie CNSS
│   │   │       ├── RetraiteCNSS.tsx           # ✅ Retraite
│   │   │       ├── IRPP.tsx                   # ✅ IRPP progressif
│   │   │       ├── ActualisationSalaire.tsx   # ✅ Coefficients CNSS
│   │   │       ├── GenerateurFichePaie.tsx    # ✅ Fiche de paie PDF
│   │   │       ├── DeclarationsCNSS.tsx       # ✅ Déclarations CNSS
│   │   │       ├── DeclarationsNeant.tsx      # ✅ Déclarations Néant I3/I16
│   │   │       ├── TesteurTXT.tsx             # ✅ Testeur TXT 122 car.
│   │   │       └── ReferentielAvantages.tsx   # ✅ Référentiel légal
│   │   ├── lib/
│   │   │   ├── payroll/                       # Moteur de paie unifié
│   │   │   │   ├── config.ts                  # Configuration centralisée
│   │   │   │   ├── engine.ts                  # Moteur de calcul
│   │   │   │   ├── cnss.ts                    # Cotisations CNSS
│   │   │   │   ├── irpp.ts                    # Calcul IRPP
│   │   │   │   ├── benefits.ts               # Avantages
│   │   │   │   ├── netToBrut.ts              # Conversion Net→Brut
│   │   │   │   ├── types.ts                   # Types partagés
│   │   │   │   └── ...                        # Autres modules
│   │   │   ├── cnss-declarations/             # Génération TXT CNSS
│   │   │   └── utils.ts                       # Utilitaires (cn, formatMontantDT)
│   │   ├── components/
│   │   │   ├── Layout.tsx                     # Layout avec sidebar
│   │   │   ├── ThemeToggle.tsx                # Bascule thème clair/sombre
│   │   │   ├── ErrorBoundary.tsx              # Limite d'erreurs
│   │   │   └── ui/                            # shadcn/ui components
│   │   ├── contexts/ThemeContext.tsx           # Contexte thème
│   │   ├── hooks/                             # Hooks personnalisés
│   │   ├── App.tsx                            # Router principal
│   │   ├── index.css                          # Design tokens globaux
│   │   └── main.tsx                           # Point d'entrée React
│   ├── index.html                             # Template HTML
│   └── public/                                # Assets statiques (PDF modèles)
├── server/index.ts                            # Serveur Express (statique)
├── shared/const.ts                            # Constantes partagées
├── package.json                               # Dépendances
├── vercel.json                                # Config Vercel
├── tsconfig.json                              # Config TypeScript
└── vite.config.ts                             # Config Vite
```

---

## DESIGN SYSTEM

### Palette de Couleurs (Minimaliste & Professionnel)
```
Primaire:     Bleu Marine (oklch(0.35 0.12 258))
Accent:       Or/Jaune (oklch(0.75 0.15 50))
Fond:         Blanc (oklch(0.99 0.001 0))
Texte:        Bleu Foncé (oklch(0.2 0.01 258))
Erreur:       Rouge (oklch(0.577 0.245 27.325))
Sidebar:      Bleu 950 (bg-blue-950)
```

### Typographie
```
Titres:       Montserrat (500, 600, 700, 800)
Corps:        Inter (400, 500, 600)
Polices:      Importées via Google Fonts dans client/index.html
```

### Composants Réutilisables
Tous les composants UI utilisent **shadcn/ui** :
- `Button`, `Card`, `Input`, `Label`, `Select`, `Checkbox`, `Dialog`, `Sheet`, `Tabs`, etc.
- Localisation : `client/src/components/ui/`

---

## FORMULES DE CALCUL IMPLÉMENTÉES

### 1. CALCULATEUR SALAIRE BRUT/NET (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/CalculerSalaire.tsx`  
**Moteur :** `client/src/lib/payroll/engine.ts` + `netToBrut.ts`

### 2. CALCULATEUR PAIE CNSS (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/PaieCNSS.tsx`

### 3. CALCULATEUR RETRAITE CNSS (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/RetraiteCNSS.tsx`  
**Données :** Indices d'actualisation dans `coefficients-actualisation.ts`

### 4. CALCULATEUR IRPP (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/IRPP.tsx`  
**Moteur :** `client/src/lib/payroll/irpp.ts`  
**Barème :** Progressif 2025 (configurable via Admin)

### 5. ACTUALISATION DES SALAIRES (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/ActualisationSalaire.tsx`

### 6. GÉNÉRATEUR DE FICHE DE PAIE (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/GenerateurFichePaie.tsx`  
**Export :** PDF via html2pdf.js

### 7. DÉCLARATIONS CNSS (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/DeclarationsCNSS.tsx`  
**Fonctionnalités :** Saisie manuelle, import CSV/Excel, génération TXT, test

### 8. DÉCLARATIONS NÉANT (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/DeclarationsNeant.tsx`  
**Export :** PDF I3 + I16 via pdf-lib (injection sur modèles)

### 9. TESTEUR TXT CNSS (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/TesteurTXT.tsx`  
**Validation :** Format 122 caractères CNSS

### 10. RÉFÉRENTIEL LÉGAL (✅ Implémenté)
**Fichier :** `client/src/pages/calculateurs/ReferentielAvantages.tsx`  
**Source :** Décret n° 2003-1098

### 11. PANNEAU ADMIN (✅ Implémenté)
**Fichier :** `client/src/pages/Admin.tsx`  
**Configuration :** `client/src/lib/payroll/config.ts`  
**Persistance :** localStorage (traitement 100% local)

---

## WORKFLOW GIT & DÉPLOIEMENT

### Repository GitHub
```
URL: https://github.com/issamdbira/FIDUCIAIRE
Branch: main (production)
Accès: Privé
```

### Commandes Git Essentielles
```bash
# Cloner le projet
git clone https://github.com/issamdbira/FIDUCIAIRE.git
cd FIDUCIAIRE

# Installer les dépendances
pnpm install

# Développement local
pnpm run dev

# Build production
pnpm run build

# Vérifier les erreurs TypeScript
pnpm run check

# Formater le code
pnpm run format

# Pousser les modifications
git add .
git commit -m "Description du changement"
git push origin main
```

### Déploiement Vercel
```
Configuration: vercel.json
Build Command: pnpm run build
Output Directory: dist/public
Déploiement: Automatique à chaque push sur main
URL Production: https://fiduciaire.vercel.app
```

---

## AJOUTER UN NOUVEAU CALCULATEUR

### Procédure Standard

#### 1. Créer le fichier composant
```typescript
// client/src/pages/calculateurs/NouveauCalculateur.tsx
```

#### 2. Ajouter la route dans App.tsx
```typescript
import NouveauCalculateur from "./pages/calculateurs/NouveauCalculateur";
// Ajouter: <Route path="/calculateurs/nouveau" component={NouveauCalculateur} />
```

#### 3. Ajouter le lien dans Layout.tsx (NAV_GROUPS) et Home.tsx (OUTILS)

#### 4. Tester localement avec `pnpm run dev`

#### 5. Committer et pousser

---

## SÉCURITÉ & BONNES PRATIQUES

### Points Importants
1. **Pas de stockage de données utilisateur** — Tous les calculs se font côté client
2. **Pas de backend** — Projet statique uniquement
3. **Pas de base de données** — Pas de données persistantes (sauf localStorage pour config)
4. **HTTPS automatique** — Vercel fournit SSL/TLS
5. **Validation des entrées** — Zod schemas sur tous les formulaires

### À Éviter
- Stocker des données sensibles en localStorage
- Faire des appels API non sécurisés
- Ajouter du code backend sans nécessité
- Coder des taux/barèmes en dur — utiliser `getPayrollConfig()`

---

## TESTING & VALIDATION

### Tester Localement
```bash
pnpm run dev
# Ouvrir http://localhost:3000
# Tester tous les calculateurs
# Vérifier les calculs avec des exemples connus
```

### Vérifier les Erreurs TypeScript
```bash
pnpm run check
```

### Vérifier le Build Production
```bash
pnpm run build
```

---

## RESSOURCES & RÉFÉRENCES

### Sources des Formules
- **CNSS :** https://www.cnss.tn
- **IRPP :** https://www.finances.gov.tn
- **CNRPS :** https://www.cnrps.tn
- **Secu.tn :** https://www.secu.tn (source originale)

### Documentation Technique
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com
- Vite: https://vitejs.dev
- Vercel: https://vercel.com/docs

---

## LIMITATIONS ACTUELLES & TODO

### Complété
- [x] Page d'accueil professionnelle
- [x] Design minimaliste & professionnel + mode sombre
- [x] Calculateur Salaire Brut/Net
- [x] Calculateur Paie CNSS
- [x] Calculateur Retraite CNSS
- [x] Calculateur IRPP progressif
- [x] Actualisation des salaires
- [x] Générateur de fiche de paie (PDF)
- [x] Déclarations CNSS (saisie + import + TXT)
- [x] Déclarations Néant (I3 + I16 PDF)
- [x] Testeur TXT CNSS
- [x] Référentiel légal (avantages exclus)
- [x] Panneau Admin (paramétrage centralisé)
- [x] Page À propos
- [x] Sidebar responsive (mobile + desktop)
- [x] Configuration Vercel + déploiement automatique

### À Faire (Priorité)
- [ ] Tests unitaires (vitest configuré mais pas de tests écrits)
- [ ] Vérifier/mettre à jour les indices d'actualisation CNSS (données codées en dur)
- [ ] CSS : désactiver par défaut pour 2026+ (suppression prévue par la loi)
- [ ] Barème IRPP 2026 : vérifier contre la loi de finances 2026

### Futures Améliorations
- [ ] Calculateur retraite non-salariés CNSS
- [ ] Calculateur CNRPS (fonctionnaires publics)
- [ ] Historique des calculs (localStorage)
- [ ] Comparaison de scénarios
- [ ] Internationalisation (FR/AR)
- [ ] Export PDF amélioré pour tous les résultats

---

## NOTES IMPORTANTES POUR LES AGENTS IA

1. **Ne pas modifier** `server/` — Ce répertoire n'est pas utilisé
2. **Toujours tester localement** avant de pousser
3. **Respecter le design system** — Utiliser les couleurs et typographie définies
4. **Ajouter des commentaires** dans le code pour les formules complexes
5. **Mettre à jour cette lettre** si des changements majeurs sont apportés
6. **Vérifier les dates** — Les formules fiscales changent annuellement
7. **Utiliser `pnpm`** et non `npm` ou `yarn`
8. **Plus AUCUN taux/barème en dur** — Tout passe par `getPayrollConfig()`

---

**Dernière mise à jour :** 5 Septembre 2026  
**Statut :** Production-Ready v2.0
