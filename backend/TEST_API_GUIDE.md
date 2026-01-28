# Guide de Test des APIs EDG

## 🔐 Pourquoi "Token manquant ou invalide" ?

Les routes EDG sont **protégées par authentification JWT**. Vous ne pouvez pas les tester directement dans le navigateur sans être connecté.

## 📋 Méthode 1 : Tester depuis le Frontend (Recommandé)

### Étape 1 : Se connecter
1. Ouvrez l'application EDG : `http://localhost:3002`
2. Connectez-vous avec :
   - Email: `agent@edg.gn`
   - Mot de passe: `password123`
3. Le token est automatiquement stocké dans `localStorage`

### Étape 2 : Ouvrir la Console du navigateur
1. Appuyez sur `F12` (ou `Ctrl+Shift+I`)
2. Allez dans l'onglet **Console**
3. Tapez :
```javascript
// Récupérer le token
const token = localStorage.getItem('token');
console.log('Token:', token);

// Tester une API
fetch('http://localhost:5000/api/broadcast/zones', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('Résultat:', data))
.catch(err => console.error('Erreur:', err));
```

## 📋 Méthode 2 : Utiliser Postman ou Insomnia

### Étape 1 : Obtenir un token
```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "agent@edg.gn",
  "password": "password123"
}
```

**Réponse :**
```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "nom": "Agent EDG",
    "email": "agent@edg.gn",
    "role": "AGENT_EDG"
  },
  "requiresOTP": false
}
```

### Étape 2 : Utiliser le token
Copiez le `token` et utilisez-le dans toutes les requêtes suivantes :

```http
GET http://localhost:5000/api/broadcast/zones
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📋 Méthode 3 : Utiliser curl (Terminal)

### Étape 1 : Se connecter
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@edg.gn","password":"password123"}'
```

### Étape 2 : Copier le token et tester
```bash
# Remplacez YOUR_TOKEN par le token reçu
curl -X GET http://localhost:5000/api/broadcast/zones \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📋 Méthode 4 : Script de test automatique

Créez un fichier `test-api.js` :

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAPIs() {
  try {
    // 1. Se connecter
    console.log('🔐 Connexion...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'agent@edg.gn',
      password: 'password123'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Token obtenu:', token.substring(0, 20) + '...');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 2. Tester les APIs principales
    console.log('\n📡 Test des APIs principales...\n');
    
    // Broadcast
    try {
      const broadcast = await axios.get(`${API_BASE}/broadcast/zones`, { headers });
      console.log('✅ Broadcast zones:', broadcast.data);
    } catch (err) {
      console.log('⚠️  Broadcast:', err.response?.data?.error || err.message);
    }
    
    // Réconciliation
    try {
      const reconciliation = await axios.get(`${API_BASE}/reconciliation/zones`, { headers });
      console.log('✅ Réconciliation:', reconciliation.data);
    } catch (err) {
      console.log('⚠️  Réconciliation:', err.response?.data?.error || err.message);
    }
    
    // Transformateurs
    try {
      const transformers = await axios.get(`${API_BASE}/transformers`, { headers });
      console.log('✅ Transformateurs:', transformers.data);
    } catch (err) {
      console.log('⚠️  Transformateurs:', err.response?.data?.error || err.message);
    }
    
    // Grid
    try {
      const grid = await axios.get(`${API_BASE}/grid/zones`, { headers });
      console.log('✅ Grid zones:', grid.data);
    } catch (err) {
      console.log('⚠️  Grid:', err.response?.data?.error || err.message);
    }
    
    // Personnel
    try {
      const personnel = await axios.get(`${API_BASE}/personnel`, { headers });
      console.log('✅ Personnel:', personnel.data);
    } catch (err) {
      console.log('⚠️  Personnel:', err.response?.data?.error || err.message);
    }
    
    // Tâches
    try {
      const tasks = await axios.get(`${API_BASE}/tasks`, { headers });
      console.log('✅ Tâches:', tasks.data);
    } catch (err) {
      console.log('⚠️  Tâches:', err.response?.data?.error || err.message);
    }
    
    // Notifications
    try {
      const notifications = await axios.get(`${API_BASE}/notifications`, { headers });
      console.log('✅ Notifications:', notifications.data);
    } catch (err) {
      console.log('⚠️  Notifications:', err.response?.data?.error || err.message);
    }
    
    console.log('\n✅ Tests terminés !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testAPIs();
```

Exécutez : `node test-api.js`

## 🧪 Routes de Test Publiques (Sans authentification)

Pour faciliter les tests, voici les routes qui ne nécessitent PAS de token :

- `GET /api/health` - Vérifier que le serveur fonctionne
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/register` - S'inscrire
- `GET /api/routes` - Documentation automatique de toutes les routes API

### Documentation automatique

Vous pouvez obtenir la documentation complète des routes en appelant :

```bash
curl http://localhost:5000/api/routes
```

Ou dans le navigateur :
```
http://localhost:5000/api/routes
```

Cette route retourne un JSON avec toutes les routes disponibles, leurs méthodes, et les rôles requis.

## 📝 Liste Complète des Routes Protégées EDG

Toutes ces routes nécessitent un token JWT valide :

### Broadcast (Diffusion de messages)
- `GET /api/broadcast/zones` - Liste des zones pour diffusion
- `GET /api/broadcast/clients?search=...` - Recherche clients
- `POST /api/broadcast/send` - Envoyer un message
- `GET /api/broadcast/history` - Historique des messages
- `GET /api/broadcast/templates` - Modèles de messages
- `DELETE /api/broadcast/:id` - Annuler un message programmé

### Réconciliation (Audit énergétique)
- `GET /api/reconciliation/zones` - Données de réconciliation par zone
- `POST /api/reconciliation/run` - Lancer un calcul complet
- `POST /api/reconciliation/ticket` - Créer un ticket d'audit
- `GET /api/reconciliation/tickets` - Liste des tickets
- `PUT /api/reconciliation/tickets/:id` - Mettre à jour un ticket

### Transformateurs (Maintenance réseau)
- `GET /api/transformers` - Liste tous les transformateurs
- `GET /api/transformers/:id` - Détails d'un transformateur
- `POST /api/transformers/:id/maintenance` - Planifier maintenance
- `GET /api/transformers/stats/summary` - Statistiques globales

### Grid (Gestion du réseau)
- `GET /api/grid/zones` - Liste des zones
- `GET /api/grid/transformers` - Transformateurs avec charge
- `POST /api/grid/load-shedding` - Délestage intelligent
- `GET /api/grid/mqtt-log` - Journal des commandes MQTT

### Personnel EDG (Gestion des agents)
- `GET /api/personnel` - Liste du personnel
- `GET /api/personnel/:id` - Détails d'un agent
- `POST /api/personnel` - Ajouter un agent
- `PUT /api/personnel/:id` - Modifier un agent
- `POST /api/personnel/:id/assign-zone` - Assigner une zone
- `GET /api/personnel/available-agents` - Agents disponibles
- `GET /api/personnel/pending` - Demandes en attente
- `PUT /api/personnel/:id/approve` - Approuver une demande
- `GET /api/personnel/audit-logs` - Logs d'audit

### Tâches (Assignation de travaux)
- `GET /api/tasks` - Liste des tâches
- `POST /api/tasks` - Créer une tâche
- `PUT /api/tasks/:id/accept` - Accepter une tâche
- `PUT /api/tasks/:id/start` - Démarrer une tâche
- `PUT /api/tasks/:id/complete` - Terminer une tâche
- `GET /api/tasks/my-tasks` - Mes tâches assignées
- `GET /api/tasks/stats` - Statistiques des tâches

### Programmation d'appareils
- `GET /api/schedules` - Liste des programmations
- `POST /api/schedules` - Créer une programmation
- `PUT /api/schedules/:id` - Modifier une programmation
- `DELETE /api/schedules/:id` - Supprimer une programmation
- `POST /api/schedules/:id/toggle` - Activer/Désactiver
- `GET /api/schedules/ai-suggestions` - Suggestions IA
- `POST /api/schedules/ai-suggestions/:id/accept` - Accepter suggestion
- `POST /api/schedules/ai-suggestions/:id/reject` - Rejeter suggestion
- `POST /api/schedules/log-usage` - Enregistrer utilisation

### Mode Économie Intelligent
- `GET /api/economy-mode/settings` - Paramètres du mode économie
- `POST /api/economy-mode/toggle` - Activer/Désactiver
- `PUT /api/economy-mode/settings` - Modifier paramètres
- `POST /api/economy-mode/device-priority` - Définir priorités
- `GET /api/economy-mode/stats` - Statistiques d'économie
- `GET /api/economy-mode/recommendations` - Recommandations

### Système ID SIGE
- `GET /api/sige-id/search/:sigeId` - Rechercher par ID SIGE
- `GET /api/sige-id/user/:userId` - ID SIGE d'un utilisateur
- `POST /api/sige-id/generate` - Générer un ID SIGE

### Notifications
- `GET /api/notifications` - Liste des notifications
- `PUT /api/notifications/:id/read` - Marquer comme lu
- `PUT /api/notifications/read-all` - Tout marquer comme lu
- `GET /api/notifications/unread-count` - Nombre de non lues

### Messagerie ÉTAT-EDG
- `GET /api/etat-edg-messages` - Liste des messages
- `POST /api/etat-edg-messages` - Envoyer un message
- `PUT /api/etat-edg-messages/:id/read` - Marquer comme lu
- `GET /api/etat-edg-messages/unread-count` - Nombre de non lues

### Rapports de Tâches
- `GET /api/task-reports` - Liste des rapports
- `POST /api/task-reports` - Créer un rapport
- `GET /api/task-reports/:id` - Détails d'un rapport
- `PUT /api/task-reports/:id` - Modifier un rapport

## 🔑 Permissions et Rôles

### Rôles disponibles
- **CITOYEN** : Accès limité (dashboard personnel uniquement)
- **AGENT_EDG** : Accès complet aux fonctionnalités EDG
- **ADMIN_ETAT** : Accès complet + administration système

### Routes par rôle

**Routes accessibles à AGENT_EDG et ADMIN_ETAT :**
- Toutes les routes `/api/broadcast/*`
- Toutes les routes `/api/reconciliation/*`
- Toutes les routes `/api/transformers/*`
- Toutes les routes `/api/grid/*`
- Toutes les routes `/api/personnel/*`
- Toutes les routes `/api/tasks/*`
- Toutes les routes `/api/schedules/*`
- Toutes les routes `/api/economy-mode/*`
- Toutes les routes `/api/sige-id/*`
- Toutes les routes `/api/notifications/*`
- Toutes les routes `/api/etat-edg-messages/*`
- Toutes les routes `/api/task-reports/*`

**Routes accessibles à tous les utilisateurs authentifiés :**
- `/api/notifications` (notifications personnelles)
- `/api/tasks/my-tasks` (mes tâches assignées)

## ⚠️ Erreurs Courantes

### "Token manquant ou invalide"
- Vous n'êtes pas connecté
- Le token a expiré (durée : 24h)
- Le format du header est incorrect

**Solution :** Reconnectez-vous et obtenez un nouveau token

### "Accès refusé" ou "Permission refusée"
- Votre rôle n'est pas `AGENT_EDG` ou `ADMIN_ETAT`
- Vous êtes connecté en tant que `CITOYEN`
- Vous n'avez pas la permission spécifique requise (système RBAC)

**Solution :** 
- Utilisez un compte agent EDG (`agent@edg.gn`)
- Vérifiez que votre compte a les permissions nécessaires

### "Format ID SIGE invalide"
- L'ID SIGE doit suivre le format : `GUI-ZONE-NUMERO`
- Exemple valide : `GUI-DIX-00123`

**Solution :** Vérifiez le format de l'ID avant de l'utiliser

### "Ressource non trouvée"
- L'ID fourni n'existe pas dans la base de données
- La route n'existe pas ou a été modifiée

**Solution :** Vérifiez que l'ID existe et que la route est correcte

## 🎯 Test Rapide dans le Navigateur

1. Ouvrez `http://localhost:3002` (Frontend EDG)
2. Connectez-vous
3. Ouvrez la Console (F12)
4. Collez ce code :

```javascript
// Test automatique de toutes les APIs EDG
async function testAll() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ Pas de token. Connectez-vous d\'abord !');
    return;
  }
  
  const headers = { 'Authorization': `Bearer ${token}` };
  const base = 'http://localhost:5000/api';
  
  const apis = [
    { name: 'Broadcast Zones', url: `${base}/broadcast/zones` },
    { name: 'Réconciliation', url: `${base}/reconciliation/zones` },
    { name: 'Transformateurs', url: `${base}/transformers` },
    { name: 'Grid Zones', url: `${base}/grid/zones` },
    { name: 'Personnel', url: `${base}/personnel` },
    { name: 'Tâches', url: `${base}/tasks` },
    { name: 'Notifications', url: `${base}/notifications` },
    { name: 'Programmations', url: `${base}/schedules` },
    { name: 'Mode Économie', url: `${base}/economy-mode/settings` },
  ];
  
  console.log('🚀 Démarrage des tests...\n');
  
  for (const api of apis) {
    try {
      const res = await fetch(api.url, { headers });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ ${api.name}:`, data);
      } else {
        console.warn(`⚠️  ${api.name}:`, data.error || data.message);
      }
    } catch (err) {
      console.error(`❌ ${api.name}:`, err.message);
    }
    // Petite pause entre les requêtes
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n✅ Tests terminés !');
}

testAll();
```

## 📝 Exemples de Requêtes POST avec Données

### Envoyer un message de diffusion

```javascript
// Dans la console du navigateur (après connexion)
const token = localStorage.getItem('token');

fetch('http://localhost:5000/api/broadcast/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    zone: 'Dixinn',
    message: 'Coupure prévue demain de 8h à 12h',
    priority: 'high',
    scheduled_at: null // null = envoyer immédiatement
  })
})
.then(r => r.json())
.then(data => console.log('Message envoyé:', data))
.catch(err => console.error('Erreur:', err));
```

### Créer une tâche

```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:5000/api/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Vérification transformateur DIX-001',
    description: 'Inspection préventive du transformateur',
    zone: 'Dixinn',
    priority: 'medium',
    assigned_to: null // null = non assignée
  })
})
.then(r => r.json())
.then(data => console.log('Tâche créée:', data))
.catch(err => console.error('Erreur:', err));
```

### Planifier une maintenance

```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:5000/api/transformers/TRANSFORMER_ID/maintenance', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    scheduled_date: '2024-12-20T10:00:00Z',
    type: 'preventive',
    description: 'Maintenance préventive trimestrielle',
    assigned_personnel_id: null
  })
})
.then(r => r.json())
.then(data => console.log('Maintenance planifiée:', data))
.catch(err => console.error('Erreur:', err));
```

### Créer un ticket de réconciliation

```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:5000/api/reconciliation/ticket', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    zone: 'Dixinn',
    discrepancy_amount: 150.5,
    description: 'Écart détecté lors de la réconciliation mensuelle',
    priority: 'high'
  })
})
.then(r => r.json())
.then(data => console.log('Ticket créé:', data))
.catch(err => console.error('Erreur:', err));
```

### Activer le mode économie

```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:5000/api/economy-mode/toggle', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: true,
    home_id: 'HOME_ID' // Optionnel, null pour tous les foyers
  })
})
.then(r => r.json())
.then(data => console.log('Mode économie:', data))
.catch(err => console.error('Erreur:', err));
```

## 🔍 Conseils de Débogage

### Vérifier le token dans le navigateur

```javascript
// Afficher les informations du token décodé
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expirera le:', new Date(payload.exp * 1000));
  console.log('Rôle:', payload.role);
  console.log('Email:', payload.email);
}
```

### Tester une route spécifique

```javascript
async function testRoute(method, endpoint, body = null) {
  const token = localStorage.getItem('token');
  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(`http://localhost:5000/api/${endpoint}`, options);
    const data = await res.json();
    console.log(`Status: ${res.status}`, data);
    return data;
  } catch (err) {
    console.error('Erreur:', err);
  }
}

// Exemples d'utilisation
testRoute('GET', 'broadcast/zones');
testRoute('POST', 'broadcast/send', { zone: 'Dixinn', message: 'Test' });
```

## 🛠️ Outils Recommandés

### Postman
- **Avantages** : Interface graphique, sauvegarde des requêtes, collections
- **Téléchargement** : https://www.postman.com/downloads/
- **Configuration** : 
  - Créer une collection "SIGE-Guinée"
  - Ajouter une variable d'environnement `token`
  - Utiliser `{{token}}` dans les headers Authorization

### Insomnia
- **Avantages** : Interface moderne, gestion des environnements
- **Téléchargement** : https://insomnia.rest/download
- **Alternative légère** à Postman

### Thunder Client (VS Code)
- **Avantages** : Extension VS Code, intégré à l'éditeur
- **Installation** : Extension VS Code "Thunder Client"
- **Idéal pour** : Développeurs utilisant VS Code

### curl (Terminal)
- **Avantages** : Disponible partout, scriptable
- **Exemple** :
```bash
# Sauvegarder le token dans une variable
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@edg.gn","password":"password123"}' \
  | jq -r '.token')

# Utiliser le token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/broadcast/zones
```

### Scripts Node.js
- **Avantages** : Automatisation, intégration CI/CD
- **Fichier** : `backend/test-edg-apis.js` (déjà disponible)

## 📚 Ressources Supplémentaires

- **Documentation API** : `GET /api/routes` (route automatique)
- **Health Check** : `GET /api/health` (vérifier l'état du serveur)
- **Test Seed** : `GET /api/test/seed` (vérifier les données de test)

## ✅ Checklist de Test Rapide

Avant de commencer à tester :

- [ ] Le serveur backend est démarré (`npm run dev`)
- [ ] La base de données est accessible
- [ ] Vous avez un compte agent EDG (`agent@edg.gn`)
- [ ] Vous avez obtenu un token JWT valide
- [ ] Le header `Authorization: Bearer <token>` est configuré

## 🎯 Prochaines Étapes

1. **Tester les routes principales** : Broadcast, Réconciliation, Transformateurs
2. **Explorer les fonctionnalités avancées** : Tâches, Personnel, Mode Économie
3. **Intégrer dans votre application** : Utiliser les endpoints dans le frontend
4. **Automatiser les tests** : Créer des scripts de test pour CI/CD

---

**Note** : Ce guide est mis à jour régulièrement. Pour la dernière version, consultez le fichier `backend/TEST_API_GUIDE.md` dans le dépôt.
