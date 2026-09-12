# PROJECT_CONTEXT.md — Le Fiduciaire

## Identité
- **Nom** : Le Fiduciaire
- **Positionnement** : La boîte à outils de gestion tunisienne (PAS un SIRH complet)
- **Spécialité actuelle** : Paie, CNSS, IRPP

## Stack technique
- React 19 + TypeScript + Vite 7.1 + Tailwind CSS 4 + shadcn/ui + Wouter routing
- **Serveur** : Vite SSR / Vercel serverless (`server/index.ts`)
- **Base de données** : Neon PostgreSQL (à connecter — Phase 1)
- **ORM** : Prisma (schéma existant `prisma/schema.prisma` — à enrichir)
- **Identité visuelle** : navy `#1e3a5f` / gold `#c9a84c` / Montserrat-Inter

## Architecture actuelle
```
repo/
├── client/src/
│   ├── lib/payroll/          # Moteur de paie (config.ts, engine.ts, irpp.ts, cnss.ts, netToBrut.ts)
│   ├── lib/conventions/      # Moteur conventions collectives (engine.ts, data/, types.ts)
│   ├── lib/cnss-declarations/ # Déclarations CNSS (validator, generator, import, tester)
│   ├── pages/                # Pages (Home, Admin, calculateurs/, conventions/, guides/)
│   ├── components/           # Composants UI (CalculationSource, Layout, ThemeToggle)
│   └── contexts/             # ThemeContext
├── server/index.ts           # Serveur Vite SSR
├── prisma/schema.prisma      # Schéma DB (existe, à enrichir)
└── public/formulaires/       # PDFs locaux CNSS
```

## Persistence actuelle
- `localStorage` : config paie (key `fiduciaire_payroll_config`)
- `sessionStorage` : session admin (mdp `fiduciaire2026`)
- Statique `.ts` : conventions collectives, grilles salariales, coefficients

## Valeurs de calcul vérifiées (2026-09-13)
- Barème IRPP : 8 tranches (0–40%) — CORRECT
- CNSS non-agricole : 9.68% salarial / 17.07% patronal — CORRECT
- CSS 2026 : 0% (supprimée LF 2026 art. 23) — CORRIGÉ
- SMIG 2026 48h : 554.736 DT/mois (2.667 DT/h) — CORRIGÉ
- Déductions IRPP : chef 300 DT, enfant 100 DT (max 4), parents 5% plafonné 450 DT — CORRECT

## Sources autorisées (3 uniquement)
1. travailjuripratique.tn (FR)
2. cnss.tn (bilingue FR/AR)
3. secu.tn (FR)

## Déploiement
- GitHub : `github.com/issamdbira/FIDUCIAIRE`
- Vercel : `https://fiduciaire-nine.vercel.app/`
- Admin : `/admin` et `/admin/conventions` (mdp `fiduciaire2026`)

## Dernière mise à jour
- 2026-09-13 : Accueil 3 groupes outils + descriptions résultat + aperçu calcul réel + CalculationSource enrichi
