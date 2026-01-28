# SIGE-Guinée - Système Intégré de Gestion Énergétique

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)

Architecture complète avec trois frontends séparés et un backend unique pour la gestion énergétique en Guinée.

## Structure du Projet

```
Smart_ENERGIE/
├── backend/              # API Node.js + Express + Prisma
├── frontend/
│   ├── common/          # Code commun partagé (services, utils, types)
│   ├── citoyen/         # Frontend pour les citoyens (port 3001)
│   ├── edg/             # Frontend pour les agents EDG (port 3002)
│   └── etat/            # Frontend pour le ministère (port 3003)
├── docker-compose.dev.yml
└── README.md
```

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- Docker Desktop (pour PostgreSQL)
- Git
- npm ou yarn

### Installation Automatique (Recommandé)

```powershell
# Cloner le projet
git clone https://github.com/BekoSagno/SIGE-Guin-e.git
cd SIGE-Guin-e

# Installation complète automatique
.\setup.ps1
```

Le script `setup.ps1` fait tout automatiquement :
- ✅ Vérifie les prérequis
- ✅ Installe toutes les dépendances
- ✅ Configure les fichiers `.env`
- ✅ Démarre PostgreSQL
- ✅ Initialise la base de données

### Installation Manuelle

Si vous préférez installer manuellement :

```bash
# Backend
cd backend
npm install
cp env.example .env
# Éditer .env avec vos paramètres

# Démarrer PostgreSQL
docker-compose -f ../docker-compose.dev.yml up -d

# Générer Prisma Client
npm run db:generate

# Créer les migrations
npm run db:migrate

# Peupler la base de données
npm run db:seed

# Démarrer le serveur
npm run dev
```

Le backend sera accessible sur `http://localhost:5000`

### Frontend Commun

```bash
cd frontend/common
npm install
```

### Frontend Citoyen

```bash
cd frontend/citoyen
npm install
npm run dev
```

Accessible sur `http://localhost:3001`

### Frontend EDG

```bash
cd frontend/edg
npm install
npm run dev
```

Accessible sur `http://localhost:3002`

### Frontend État

```bash
cd frontend/etat
npm install
npm run dev
```

Accessible sur `http://localhost:3003`

## 📚 Documentation

- [Guide du Workflow](./WORKFLOW.md) - **NOUVEAU** - Tous les scripts et outils disponibles
- [Guide de Test des APIs](./backend/TEST_API_GUIDE.md) - Documentation complète pour tester toutes les APIs
- [README Backend](./backend/README.md) - Documentation détaillée du backend
- [Guide de Synchronisation Git](./QUICK_SYNC.md) - Comment synchroniser avec GitHub

## 🛠️ Scripts Disponibles

### Installation et Configuration
- `.\setup.ps1` - Installation complète automatique
- `.\check-env.ps1` - Vérifier la configuration de l'environnement

### Développement
- `.\dev.ps1` - Démarrage flexible des services (recommandé)
- `.\start-servers.ps1` - Démarrage classique de tous les services

### Base de Données
- `.\db-backup.ps1` - Sauvegarder la base de données
- `.\db-restore.ps1` - Restaurer depuis une sauvegarde
- `.\db-reset.ps1` - Réinitialiser complètement la base

### Git
- `.\sync-to-github.ps1` - Synchroniser automatiquement vers GitHub

**📖 Voir [WORKFLOW.md](./WORKFLOW.md) pour la documentation complète de tous les scripts**

## 🧪 Comptes de Test

Après avoir exécuté le seed :

- **Citoyen**: mamadou@test.com / password123
- **Agent EDG**: agent@edg.gn / password123
- **Admin État**: admin@energie.gn / password123

## 🔗 URLs des Applications

- **Frontend Citoyen**: http://localhost:3001
- **Frontend EDG**: http://localhost:3002
- **Frontend État**: http://localhost:3003
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## Architecture

### Backend
- Express.js
- Prisma ORM avec PostgreSQL
- JWT pour l'authentification
- MQTT pour l'IoT (à venir)
- WebSocket pour les alertes temps réel (à venir)

### Frontend Commun
- Services API (authService, energyService, homesService)
- Utilitaires (formatCurrency, formatDate, etc.)
- Constantes et types partagés

### Frontends Spécialisés
- **Citoyen**: Interface mobile-first pour la gestion des foyers
- **EDG**: Interface pro pour la supervision du réseau
- **État**: Interface stratégique pour le pilotage national

## ✨ Fonctionnalités

### Backend
- ✅ Authentification JWT avec rôles (CITOYEN, AGENT_EDG, ADMIN_ETAT)
- ✅ API REST complète pour gestion énergétique
- ✅ Système de réconciliation et détection de fraude
- ✅ Gestion des transformateurs et maintenance prédictive
- ✅ Diffusion de messages (Broadcast)
- ✅ Gestion des incidents
- ✅ WebSocket pour alertes temps réel
- ✅ Système ID SIGE unique par citoyen

### Frontend Citoyen
- ✅ Dashboard personnel
- ✅ Suivi de consommation
- ✅ Gestion des foyers
- ✅ Signalement d'incidents
- ✅ Mode économie intelligent

### Frontend EDG
- ✅ Centre de contrôle réseau
- ✅ Carte SCADA temps réel
- ✅ Gestion des clients
- ✅ Délestage intelligent IoT
- ✅ Gestion du personnel
- ✅ Système de tâches et rapports

### Frontend État
- ✅ Vue d'ensemble nationale
- ✅ Gap financier
- ✅ Planification hydroélectrique
- ✅ Impact social
- ✅ Audit de performance

## 📝 License

[À définir]

## 👥 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.
