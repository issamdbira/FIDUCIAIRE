# 📋 LETTRE D'ORIENTATION TECHNIQUE - LE FIDUCIAIRE

**Date:** 31 Mai 2026  
**Projet:** LE FIDUCIAIRE - Plateforme de Calculateurs Sociaux Tunisiens  
**Version:** 1.0 (Production-Ready)  
**Repository:** https://github.com/issamdbira/FIDUCIAIRE  
**Déploiement:** Vercel (https://fiduciaire.vercel.app)

---

## 🎯 RÉSUMÉ EXÉCUTIF

LE FIDUCIAIRE est une plateforme web gratuite permettant aux citoyens tunisiens de calculer :
- **Paie CNSS** (Salariés secteur privé)
- **Retraite CNSS** (Pension de retraite)
- **IRPP** (Impôt sur le revenu)
- **Paie CNRPS** (Fonctionnaires publics)

**État actuel :** Page d'accueil + Calculateur Paie CNSS fonctionnels. Prêt pour ajout des autres calculateurs.

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Stack Technologique
```
Frontend:
- React 19 + TypeScript
- Vite 7.1 (Build tool)
- Tailwind CSS 4 (Styling)
- shadcn/ui (Components)
- Wouter (Routing client-side)
- Framer Motion (Animations)

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
│   │   │   ├── Home.tsx                    # Page d'accueil
│   │   │   ├── NotFound.tsx                # Page 404
│   │   │   └── calculateurs/
│   │   │       ├── PaieCNSS.tsx            # ✅ Implémenté
│   │   │       ├── RetraiteCNSS.tsx        # À faire
│   │   │       ├── IRPP.tsx                # À faire
│   │   │       └── PaieCNRPS.tsx           # À faire
│   │   ├── components/
│   │   │   └── ui/                         # shadcn/ui components
│   │   ├── App.tsx                         # Router principal
│   │   ├── index.css                       # Design tokens globaux
│   │   └── main.tsx                        # Entry point
│   ├── index.html                          # HTML template
│   └── public/                             # Assets statiques
├── package.json                            # Dépendances
├── vercel.json                             # Config Vercel
├── tsconfig.json                           # Config TypeScript
└── vite.config.ts                          # Config Vite
```

---

## 🎨 DESIGN SYSTEM

### Palette de Couleurs (Minimaliste & Professionnel)
```
Primaire:     Bleu Marine (oklch(0.35 0.12 258))
Accent:       Or/Jaune (oklch(0.75 0.15 50))
Fond:         Blanc (oklch(0.99 0.001 0))
Texte:        Bleu Foncé (oklch(0.2 0.01 258))
Erreur:       Rouge (oklch(0.577 0.245 27.325))
```

### Typographie
```
Titres:       Montserrat (500, 600, 700, 800)
Corps:        Inter (400, 500, 600)
Polices:      Importées via Google Fonts dans client/index.html
```

### Composants Réutilisables
Tous les composants UI utilisent **shadcn/ui** :
- `Button`, `Card`, `Input`, `Label`, `Select`, `Checkbox`, `Dialog`, etc.
- Localisation : `client/src/components/ui/`

---

## 📊 FORMULES DE CALCUL IMPLÉMENTÉES

### 1. CALCULATEUR PAIE CNSS (✅ Implémenté)
**Fichier:** `client/src/pages/calculateurs/PaieCNSS.tsx`

#### Formules Utilisées (2025)
```
1. Cotisations CNSS:
   Cotisations = Salaire Brut × 9.68%

2. Salaire Imposable:
   Salaire Imposable = Salaire Brut - Cotisations CNSS

3. Déductions IRPP:
   - Chef de famille: 300 D
   - Enfants (< 20 ans): 100 D/enfant (max 4)
   - Étudiants sans bourse: 1000 D/étudiant (max 4)
   - Enfants handicapés: 2000 D/enfant
   - Autres déductions: Annuelles / 12

4. IRPP (Barème Progressif 2025):
   - 0 à 5000 D: 0%
   - 5000 à 10000 D: 15%
   - 10000 à 20000 D: 25%
   - 20000 à 30000 D: 30%
   - 30000 à 40000 D: 33%
   - 40000 à 50000 D: 36%
   - 50000 à 70000 D: 38%
   - > 70000 D: 40%

5. CSS (Contribution Sociale):
   CSS = Salaire Imposable × 0.5% (supprimée à partir de janvier 2026)

6. Salaire Net:
   Salaire Net = Salaire Brut - Cotisations CNSS - IRPP - CSS
```

#### État du Calculateur
- ✅ Calcul du salaire net
- ✅ Gestion situation familiale
- ✅ Affichage bulletin de paie détaillé
- ✅ Formules 2025 correctes
- ⚠️ Note: CSS à supprimer pour 2026+

---

### 2. CALCULATEUR RETRAITE CNSS (À FAIRE)
**Fichier à créer:** `client/src/pages/calculateurs/RetraiteCNSS.tsx`

#### Formules à Implémenter
```
1. Actualisation des Salaires:
   Salaire Actualisé = Salaire Moyen × Indice Actualisation

2. Taux de Pension:
   - 10 à 14 ans: 30%
   - 15 à 19 ans: 40%
   - 20 à 24 ans: 50%
   - 25 à 29 ans: 60%
   - 30 à 34 ans: 70%
   - 35+ ans: 80%

3. Pension Mensuelle:
   Pension = Salaire Actualisé × Taux de Pension

4. Minimum Garanti:
   Pension = Max(Pension Calculée, Minimum Garanti)
```

#### Données Requises
- Salaire moyen des 10 dernières années
- Durée de cotisation
- Indice d'actualisation (à récupérer de secu.tn)

---

### 3. CALCULATEUR IRPP (À FAIRE)
**Fichier à créer:** `client/src/pages/calculateurs/IRPP.tsx`

#### Formules à Implémenter
```
1. Revenu Imposable Annuel:
   Revenu = Salaire Annuel - Cotisations CNSS Annuelles

2. Déductions Fiscales (Annuelles):
   - Chef de famille: 300 D × 12
   - Enfants: 100 D × 12 × nombre
   - Étudiants: 1000 D × 12 × nombre
   - Enfants handicapés: 2000 D × 12 × nombre
   - Intérêts crédit immobilier: Jusqu'à 2000 D/an
   - Cotisations syndicales: Jusqu'à 5% du revenu

3. Assiette Fiscale:
   Assiette = Revenu - Déductions

4. IRPP (Appliquer barème par tranche)

5. Crédits d'Impôt:
   - Enfants: 50 D/enfant
   - Handicap: 500 D
```

---

### 4. CALCULATEUR PAIE CNRPS (À FAIRE)
**Fichier à créer:** `client/src/pages/calculateurs/PaieCNRPS.tsx`

#### Différences CNRPS vs CNSS
```
Cotisations CNRPS: 8.5% (vs 9.68% CNSS)
Régime: Fonctionnaires publics
Pension: Calculée différemment (80% du dernier salaire après 30 ans)
```

---

## 🔄 WORKFLOW GIT & DÉPLOIEMENT

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
# Accès: http://localhost:5173

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

**Étapes de déploiement:**
1. Effectuer les modifications localement
2. Tester avec `pnpm run dev`
3. Committer et pousser sur GitHub
4. Vercel détecte automatiquement le push
5. Build et déploiement automatique (~2 minutes)
6. Vérifier sur https://fiduciaire.vercel.app

---

## 📱 AJOUTER UN NOUVEAU CALCULATEUR

### Procédure Standard

#### 1. Créer le fichier composant
```typescript
// client/src/pages/calculateurs/NouveauCalculateur.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NouveauCalculateur() {
  const [input, setInput] = useState(0);
  const [result, setResult] = useState(null);

  const handleCalculer = () => {
    // Implémentation des formules
    setResult(/* résultat */);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structure identique à PaieCNSS.tsx */}
    </div>
  );
}
```

#### 2. Ajouter la route dans App.tsx
```typescript
import NouveauCalculateur from "./pages/calculateurs/NouveauCalculateur";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/calculateurs/paie-cnss" component={PaieCNSS} />
      <Route path="/calculateurs/nouveau" component={NouveauCalculateur} />
      {/* ... autres routes */}
    </Switch>
  );
}
```

#### 3. Ajouter le lien dans Home.tsx
```typescript
const calculators = [
  // ... existants
  {
    id: "nouveau",
    title: "Titre du Calculateur",
    description: "Description",
    icon: IconName,
    href: "/calculateurs/nouveau",
    color: "from-blue-600 to-blue-700"
  }
];
```

#### 4. Tester localement
```bash
pnpm run dev
# Tester la nouvelle route
```

#### 5. Committer et pousser
```bash
git add .
git commit -m "feat: Ajouter calculateur [Nom]"
git push origin main
```

---

## 🔐 SÉCURITÉ & BONNES PRATIQUES

### Points Importants
1. **Pas de stockage de données utilisateur** - Tous les calculs se font côté client
2. **Pas de backend** - Projet statique uniquement
3. **Pas de base de données** - Pas de données persistantes
4. **HTTPS automatique** - Vercel fournit SSL/TLS

### À Éviter
- ❌ Stocker des données sensibles en localStorage
- ❌ Faire des appels API non sécurisés
- ❌ Ajouter du code backend sans `webdev_add_feature`
- ❌ Modifier `server/index.ts` (non utilisé)

---

## 🧪 TESTING & VALIDATION

### Tester Localement
```bash
pnpm run dev
# Ouvrir http://localhost:5173
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
# Vérifier que dist/public contient les fichiers
```

---

## 📚 RESSOURCES & RÉFÉRENCES

### Sources des Formules
- **CNSS:** https://www.cnss.tn (Caisse Nationale de Sécurité Sociale)
- **IRPP:** https://www.finances.gov.tn (Ministère des Finances)
- **CNRPS:** https://www.cnrps.tn (Caisse Nationale de Retraite et de Prévoyance Sociale)

### Documentation Technique
- React: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- shadcn/ui: https://ui.shadcn.com
- Vite: https://vitejs.dev
- Vercel: https://vercel.com/docs

### Fichier Original Analysé
- Site source: https://www.secu.tn
- Calculateurs extraits et modernisés

---

## ⚠️ LIMITATIONS ACTUELLES & TODO

### ✅ Complété
- [x] Page d'accueil professionnelle
- [x] Design minimaliste & professionnel
- [x] Calculateur Paie CNSS fonctionnel
- [x] Configuration Vercel
- [x] Déploiement automatique

### ⏳ À Faire (Priorité)
- [ ] Calculateur Retraite CNSS
- [ ] Calculateur IRPP
- [ ] Calculateur Paie CNRPS
- [ ] Page "À propos" avec sources
- [ ] Tests unitaires
- [ ] Responsive design mobile (améliorer)
- [ ] Internationalisation (FR/AR)

### 🔮 Futures Améliorations
- [ ] Export PDF des résultats
- [ ] Historique des calculs (localStorage)
- [ ] Comparaison de scénarios
- [ ] API publique pour intégration tiers
- [ ] Mode sombre
- [ ] Notifications push

---

## 👥 CONTACTS & SUPPORT

**Propriétaire du Projet:** issamdbira  
**Repository:** https://github.com/issamdbira/FIDUCIAIRE  
**Déploiement:** https://fiduciaire.vercel.app  

---

## 📝 NOTES IMPORTANTES POUR LES AGENTS IA

1. **Ne pas modifier** `server/` - Ce répertoire n'est pas utilisé
2. **Toujours tester localement** avant de pousser
3. **Respecter le design system** - Utiliser les couleurs et typographie définies
4. **Ajouter des commentaires** dans le code pour les formules complexes
5. **Mettre à jour cette lettre** si des changements majeurs sont apportés
6. **Vérifier les dates** - Les formules fiscales changent annuellement
7. **Utiliser `pnpm`** et non `npm` ou `yarn`

---

**Dernière mise à jour:** 31 Mai 2026  
**Statut:** Production-Ready v1.0
