# 🔄 Guide du Workflow SIGE-Guinée

Ce document décrit tous les scripts et outils disponibles pour travailler sur le projet SIGE-Guinée.

## 📋 Scripts Disponibles

### 🚀 Installation et Configuration

#### `setup.ps1` - Installation complète
Installe toutes les dépendances et configure le projet.

```powershell
.\setup.ps1
```

**Ce que fait le script :**
- ✅ Vérifie les prérequis (Node.js, Docker, Git, npm)
- ✅ Installe les dépendances dans tous les projets
- ✅ Configure les fichiers `.env`
- ✅ Démarre PostgreSQL avec Docker
- ✅ Génère le client Prisma
- ✅ Applique les migrations
- ✅ Peuple la base de données

#### `check-env.ps1` - Validation de l'environnement
Vérifie que toutes les variables d'environnement sont correctement configurées.

```powershell
.\check-env.ps1
```

**Ce que fait le script :**
- ✅ Vérifie l'existence des fichiers `.env`
- ✅ Valide les variables requises
- ✅ Vérifie la configuration Docker/PostgreSQL
- ✅ Affiche les erreurs et avertissements

### 💻 Développement

#### `dev.ps1` - Script de développement amélioré
Démarre les services de développement avec des options flexibles.

```powershell
# Démarrer tous les services
.\dev.ps1

# Démarrer seulement le backend
.\dev.ps1 backend

# Démarrer un frontend spécifique
.\dev.ps1 frontend citoyen
.\dev.ps1 frontend edg
.\dev.ps1 frontend etat

# Vérifier l'état des services
.\dev.ps1 status

# Arrêter tous les services
.\dev.ps1 stop
```

**Avantages :**
- 🎯 Démarrage sélectif des services
- 📊 Vérification de l'état en temps réel
- 🛑 Arrêt propre des services
- ⚡ Plus rapide pour le développement

#### `start-servers.ps1` - Démarrage classique
Démarre tous les services (script original amélioré).

```powershell
.\start-servers.ps1
```

### 🗄️ Base de Données

#### `db-backup.ps1` - Sauvegarde
Crée une sauvegarde complète de la base de données.

```powershell
# Sauvegarde avec nom automatique (timestamp)
.\db-backup.ps1

# Sauvegarde avec nom personnalisé
.\db-backup.ps1 "ma_sauvegarde.sql"
```

**Emplacement :** `backups/sige_guinee_backup_YYYYMMDD_HHMMSS.sql`

#### `db-restore.ps1` - Restauration
Restaure la base de données depuis une sauvegarde.

```powershell
.\db-restore.ps1 "sige_guinee_backup_20240128_120000.sql"
```

**⚠️ Attention :** Cette opération écrase toutes les données actuelles !

#### `db-reset.ps1` - Réinitialisation complète
Réinitialise complètement la base de données.

```powershell
.\db-reset.ps1
```

**Ce que fait le script :**
- 🗑️ Supprime toutes les données
- 📝 Réapplique toutes les migrations
- 🌱 Repeuple avec les données de test

### 🔄 Synchronisation Git

#### `sync-to-github.ps1` - Push automatique
Synchronise automatiquement les changements vers GitHub.

```powershell
.\sync-to-github.ps1 "Description des changements"
```

## 📁 Structure des Dossiers

```
Smart_ENERGIE/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── backend/
│   ├── tests/                  # Tests du backend
│   ├── jest.config.js          # Configuration Jest
│   └── ...
├── frontend/
│   ├── common/
│   ├── citoyen/
│   ├── edg/
│   └── etat/
├── backups/                    # Sauvegardes de la DB (créé automatiquement)
├── setup.ps1                   # Installation complète
├── check-env.ps1               # Validation environnement
├── dev.ps1                     # Développement amélioré
├── start-servers.ps1           # Démarrage classique
├── db-backup.ps1              # Sauvegarde DB
├── db-restore.ps1              # Restauration DB
├── db-reset.ps1                # Reset DB
└── sync-to-github.ps1          # Synchronisation Git
```

## 🔄 Workflow Recommandé

### Pour un nouveau développeur

1. **Cloner le projet**
   ```bash
   git clone https://github.com/BekoSagno/SIGE-Guin-e.git
   cd SIGE-Guin-e
   ```

2. **Installation complète**
   ```powershell
   .\setup.ps1
   ```

3. **Vérifier la configuration**
   ```powershell
   .\check-env.ps1
   ```

4. **Démarrer le développement**
   ```powershell
   .\dev.ps1
   ```

### Pour le développement quotidien

1. **Vérifier l'état**
   ```powershell
   .\dev.ps1 status
   ```

2. **Démarrer seulement ce dont vous avez besoin**
   ```powershell
   .\dev.ps1 backend
   .\dev.ps1 frontend edg
   ```

3. **Travailler sur le code**

4. **Synchroniser avec GitHub**
   ```powershell
   .\sync-to-github.ps1 "Description des changements"
   ```

### Pour la gestion de la base de données

1. **Sauvegarder avant un changement important**
   ```powershell
   .\db-backup.ps1
   ```

2. **Faire vos modifications**

3. **Si problème, restaurer**
   ```powershell
   .\db-restore.ps1 "nom_du_fichier.sql"
   ```

4. **Ou réinitialiser complètement**
   ```powershell
   .\db-reset.ps1
   ```

## 🧪 Tests

### Structure des tests

Les tests sont organisés dans `backend/tests/` :

```
backend/tests/
├── setup.js              # Configuration globale
├── example.test.js       # Exemple de test
└── [autres tests].test.js
```

### Exécuter les tests

```bash
cd backend

# Tous les tests
npm test

# Mode watch (re-exécute à chaque changement)
npm run test:watch

# Avec couverture de code
npm run test:coverage
```

## 🔧 GitHub Actions (CI/CD)

Le workflow CI/CD s'exécute automatiquement à chaque push sur `main` ou `develop`.

**Ce qui est vérifié :**
- ✅ Installation des dépendances
- ✅ Build de tous les projets
- ✅ Tests (quand disponibles)
- ✅ Audit de sécurité npm

**Voir les résultats :** https://github.com/BekoSagno/SIGE-Guin-e/actions

## 📝 Bonnes Pratiques

### Avant de commencer à travailler

1. ✅ Vérifier l'état : `.\dev.ps1 status`
2. ✅ Vérifier l'environnement : `.\check-env.ps1`
3. ✅ Faire une sauvegarde si nécessaire : `.\db-backup.ps1`

### Pendant le développement

1. ✅ Tester vos changements
2. ✅ Vérifier que les services fonctionnent
3. ✅ Faire des commits fréquents avec des messages clairs

### Avant de pusher

1. ✅ Synchroniser : `.\sync-to-github.ps1 "Message descriptif"`
2. ✅ Vérifier que le push a réussi
3. ✅ Vérifier GitHub Actions (si configuré)

## 🆘 Dépannage

### Les services ne démarrent pas

```powershell
# Vérifier l'état
.\dev.ps1 status

# Vérifier l'environnement
.\check-env.ps1

# Vérifier Docker
docker ps
```

### Problème de base de données

```powershell
# Réinitialiser complètement
.\db-reset.ps1

# Ou restaurer depuis une sauvegarde
.\db-restore.ps1 "nom_fichier.sql"
```

### Problème de dépendances

```powershell
# Réinstaller tout
.\setup.ps1
```

## 📚 Ressources

- [Guide de Test des APIs](./backend/TEST_API_GUIDE.md)
- [README Principal](./README.md)
- [README Backend](./backend/README.md)
- [Guide de Synchronisation Git](./QUICK_SYNC.md)
