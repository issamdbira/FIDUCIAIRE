# Lot 8 (optionnel) — Purger le mot de passe Neon DB de l'historique git

**⚠️ OPERATION DESTRUCTIVE — à exécuter uniquement après double confirmation**

## Contexte

Le mot de passe Neon DB (`neondb_owner:***@ep-jolly-heart-aymmh63q-pooler.c-5.us-east-2.aws.neon.tech`) a été committé en clair dans 14 commits entre `6af3fa2` et `8e2cc91`. Bien que les fichiers aient été supprimés par le commit `8e2cc91`, le mot de passe reste lisible dans l'historique git.

Le mot de passe doit être rotaté en premier (action humaine — console Neon). Cette opération `git filter-repo` ne fait que nettoyer l'historique pour éviter que des outils de scan (gitleaks, GitHub secret scanning) ne détectent le vieux secret dans le futur.

## Prérequis (tous obligatoires)

1. ✅ Le mot de passe Neon DB a été rotaté (nouveau mot de passe dans Vercel → DATABASE_URL)
2. ✅ L'ancien mot de passe Neon ne fonctionne plus (vérifié sur la console Neon activity log)
3. ✅ Le token GitHub `ghp_x60M...` a été révoqué (https://github.com/settings/tokens)
4. ✅ Tous les collaborateurs ont été notifiés du rewrite d'historique (ils devront re-cloner)
5. ✅ Une sauvegarde complète du dépôt a été faite (`git bundle create fiduciaire-backup-$(date +%Y%m%d).bundle --all`)
6. ✅ L'outil `git filter-repo` est installé (`pip install git-filter-repo`)

## Procédure

```bash
# 1. Faire une sauvegarde complète
cd /home/z/my-project/repos/FIDUCIAIRE
git bundle create /home/z/my-project/download/fiduciaire-backup-$(date +%Y%m%d).bundle --all

# 2. Installer git-filter-repo si nécessaire
pip install --user git-filter-repo

# 3. Lister les commits concernés (audit)
git log --all --pretty=format:"%h %s" | grep -i "test-phase\|fuite\|securite" | head -20

# 4. Lister les fichiers à purger
git log --all --name-only --pretty=format:"" | grep "server/test-phase" | sort -u

# 5. Créer un fichier de remplacement
# Pour remplacer le mot de passe par *** dans l'historique :
cat > /tmp/replace-credentials.txt << 'EOF'
neondb_owner:***@ep-jolly-heart-aymmh63q-pooler.c-5.us-east-2.aws.neon.tech
==>REDACTED<=
EOF

# 6. Exécuter le rewrite (DESTRUCTIF)
git filter-repo --replace-text /tmp/replace-credentials.txt --force

# 7. Vérifier que le mot de passe n'apparaît plus
git log --all -p | grep "neondb_owner" || echo "OK — purgé"
git log --all -p | grep "ep-jolly-heart" || echo "OK — host purgé"

# 8. Forcer le push vers GitHub (⚠️ écrase l'historique distant)
git push --force origin main

# 9. Vérifier sur GitHub que les commits historiques ne contiennent plus le secret
# (aller sur https://github.com/issamdbira/FIDUCIAIRE/commits/main et inspecter
# les commits supprimés — ils ne devraient plus exister)

# 10. Notifier tous les collaborateurs :
#     - Supprimer leur clone local
#     - Re-cloner depuis https://github.com/issamdbira/FIDUCIAIRE
#     - Réinstaller les hooks (pre-commit gitleaks)
```

## Impact

- ✅ Tous les commits historiques sont réécrits — les anciens SHAs (`6af3fa2`, `fa1007b`, `4015611`, `8e2cc91`, etc.) **n'existent plus**
- ✅ Le mot de passe Neon n'apparaît plus dans `git log --all -p`
- ✅ Les nouveaux commits conservent leurs messages et contenus (sauf le mot de passe remplacé)
- ⚠️ **Tous les collaborateurs doivent re-cloner** — l'historique diverge du distant
- ⚠️ Les PRs ouvertes deviennent invalides (les commits référencés n'existent plus)
- ⚠️ Le tag `v1.0.1` doit être recréé (les anciens tags pointent vers des commits n'existant plus)

## Alternative : GitHub Secret Scanning (non-destructive)

Si la procédure destructive est trop risquée, alternative non-destructive :
1. Le mot de passe Neon est rotaté → l'ancien ne fonctionne plus (✅ sécurité restaurée)
2. GitHub Secret Scanning détectera le vieux secret dans l'historique → alerte
3. Marquer l'alerte comme "revoked" (rotated) dans GitHub Security Advisories
4. Ne pas faire le rewrite — accepter que le secret mort soit encore dans l'historique

Cette alternative est acceptable car le mot de passe rotaté ne donne plus accès à rien.

## Validation finale (après rewrite)

```bash
# Vérifier que git-filter-repo a nettoyé le fichier
cat .git/filter-repo/already_ran 2>/dev/null

# Lancer le workflow gitleaks pour confirmer
gh workflow run gitleaks.yml
gh run watch
```

## Contact

Si tu hésites, NE FAIS PAS LE REWRITE. La rotation du mot de passe suffit à restaurer la sécurité. Le rewrite d'historique est cosmétique — il nettoie l'alerte gitleaks mais ne change rien à la sécurité réelle une fois le mot de passe rotaté.
