# 🚀 Guide de Synchronisation Rapide avec GitHub

## Méthode 1 : Script PowerShell (Recommandé)

Le script `sync-to-github.ps1` automatise tout le processus :

```powershell
# Avec un message personnalisé
.\sync-to-github.ps1 "Ajout de nouvelles fonctionnalités"

# Avec le message par défaut
.\sync-to-github.ps1
```

## Méthode 2 : Alias Git (Rapide)

Un alias Git a été configuré pour vous :

```bash
git sync "Votre message de commit"
```

## Méthode 3 : Commandes Manuelles

Si vous préférez le contrôle total :

```bash
# 1. Vérifier les changements
git status

# 2. Ajouter les fichiers
git add .

# 3. Créer un commit
git commit -m "Votre message de commit"

# 4. Pusher vers GitHub
git push origin main
```

## 📋 Workflow Recommandé

1. **Travailler sur le projet** (modifier les fichiers)
2. **Tester les changements** (vérifier que tout fonctionne)
3. **Synchroniser avec GitHub** :
   ```powershell
   .\sync-to-github.ps1 "Description des changements"
   ```

## ⚠️ Bonnes Pratiques

- ✅ Faites des commits fréquents avec des messages clairs
- ✅ Testez avant de pusher
- ✅ Utilisez des messages de commit descriptifs
- ✅ Ne pushez jamais les fichiers `.env` ou `node_modules/`

## 🔍 Vérifier l'état

```bash
# Voir les changements non commités
git status

# Voir l'historique des commits
git log --oneline -10

# Voir les différences
git diff
```
