# Lot 8-0.1 — Audit secrets de l'historique Git

**Date d'audit :** 19 Septembre 2026
**Portée :** Historique complet du dépôt `issamdbira/FIDUCIAIRE` (193 commits)
**Méthode :** `git log --all -p` filtré pour les motifs `DATABASE_URL`, `JWT_SECRET`, `password`, `secret`, `neondb`, `postgres://`, `postgresql://`. Toutes les valeurs sensibles sont **masquées** dans ce rapport.

---

## 1. Résumé exécutif

| Type d'exposition | Commits concernés | Statut |
|---|---|---|
| Connection string Neon PostgreSQL avec mot de passe en clair | 14 occurrences dans l'historique | **LEAKED** |
| Fallback `JWT_SECRET` hardcodé dans test scripts supprimés | 1 occurrence dans l'historique | **LEAKED** (mais valeur redondante avec fallback encore présent dans `jwt.ts` / `auth.ts`) |
| Identifiants par défaut dans docs HEAD | 5 occurrences | **EXPOSED** (cf. Lot 8-0.2 — commit séparé) |
| Fichiers `.env` jamais commités | 0 (`git log --diff-filter=A` ne retourne que `.env.example`) | ✅ OK |

---

## 2. Détail — Neon DB password en clair (14 occurrences)

### 2.1 — Fichiers supprimés contenant le mot de passe

Les scripts de test suivants contenaient `process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:***@ep-jolly-heart-aymmh63q-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require"` comme fallback :

- `server/test-integration.ts` (supprimé)
- `server/test-phase2.ts` (supprimé)
- `server/test-phase3.ts` (supprimé)
- `server/test-phase4.ts` (supprimé)
- `server/test-phase5.ts` (supprimé)
- `server/test-phase6.ts` (supprimé)
- `server/test-phase7.ts` (supprimé)
- `server/test-phase8.ts` (supprimé)

### 2.2 — Commits qui ont introduit / modifié / supprimé ces fichiers

| SHA | Date | Action | Sujet du commit |
|---|---|---|---|
| `6af3fa2` | 2026-09-13 | ADD | "feat: intégration chirurgicale du moteur de paie (Phases 1-7)" — ajoute tous les scripts `test-phase*.ts` avec le mot de passe en fallback |
| `fa1007b` | 2026-09-14 | ADD | "feat: Phase 8 — Professionnalisation" — ajoute `test-phase8.ts` avec le même mot de passe |
| `4015611` | 2026-09-15 | ADD | "feat: Phase 9 — Tableaux de bord" — référence dans des fichiers de config |
| `8e2cc91` | 2026-09-16 | DELETE | "fix(securite): purger les scripts de test manuels — mot de passe Neon DB en clair (fuite git)" — supprime les fichiers mais **ne supprime pas l'historique** |

### 2.3 — Effet de la purge

Le commit `8e2cc91` supprime les fichiers du HEAD mais **laisse le mot de passe dans l'historique git**. N'importe qui peut extraire la valeur en clair via :

```bash
git show 6af3fa2 -- server/test-phase5.ts | grep DATABASE_URL
# ou
git log -p --all | grep "neondb_owner:"
```

**La rotation du mot de passe Neon est impérative.** La suppression des fichiers ne suffit pas.

---

## 3. Détail — `JWT_SECRET` hardcodé (1 occurrence)

Une seule occurrence historique d'un `JWT_SECRET = ***` (valeur masquée) dans un test script supprimé. La valeur a été partiellement réutilisée comme fallback dans :

- `server/lib/jwt.ts:7` → `JWT_SECRET = process.env.JWT_SECRET || "fiduciaire-dev-secret-changez-moi"`
- `server/lib/auth.ts:9` → `JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod"`

**Ces fallbacks sont toujours présents dans HEAD.** Cf. Lot 8-0.3 — commit séparé pour durcir.

---

## 4. Recommandations

| # | Action | Qui | Statut |
|---|---|---|---|
| 1 | **Rotater le mot de passe Neon DB owner** (rôle `neondb_owner`) immédiatement | Humain (Neon console) | **BLOQUANT — à faire avant tout autre chose** |
| 2 | Mettre à jour `DATABASE_URL` dans Vercel + local `.env` | Humain | Après #1 |
| 3 | Redéployer Vercel pour valider la nouvelle connexion | Humain | Après #2 |
| 4 | Révoquer le token GitHub qui a été collé dans le chat | Humain (GitHub settings) | Indépendant |
| 5 | Auditer l'activité Neon depuis le 13 Sept pour détecter un usage malveillant | Humain (Neon activity log) | Après #1 |
| 6 | Vérifier que les 2 comptes seedés (`proprietaire@lefiduciaire.tn`, `gestionnaire@lefiduciaire.tn`) n'existent pas en production | Humain | Après #2 |
| 7 | (Optionnel) Réécrire l'historique git avec `git filter-repo` pour purger le mot de passe | Humain + coordination | Après Lot 8 validé — hors-scope pour cet agent |

---

## 5. Ce que cet agent a fait (Lot 8-0.1)

- ✅ Scanné l'historique git complet (193 commits)
- ✅ Identifié les 14 occurrences du mot de passe Neon en clair
- ✅ Identifié le commit `8e2cc91` qui admet la fuite dans son titre
- ✅ Identifié les 4 commits cités par le prompt Lot 8 (`6af3fa2`, `fa1007b`, `4015611`, `8e2cc91`)
- ✅ Produit ce rapport masqué — aucune valeur sensible n'est reproduite
- ❌ **N'a pas rotaté le mot de passe** (action humaine requise — console Neon)
- ❌ **N'a pas réécrit l'historique git** (hors-scope de Lot 8, voir §7)

---

## 6. STOP 0 — attente

Cet agent attend la confirmation humaine que :
- [ ] Le mot de passe Neon a été rotaté
- [ ] La variable `DATABASE_URL` a été mise à jour dans Vercel + local
- [ ] Le token GitHub exposé a été révoqué
- [ ] Les comptes seedés ont été vérifiés (supprimés si existants en prod)

Avant cette confirmation, **les phases suivantes (Phase 1 = prod verification) ne peuvent pas être exécutées en toute sécurité** car l'ancien mot de passe pourrait encore être utilisé par un attaquant ayant lu l'historique.
