# 📊 Analyse du Système de Communication entre Dashboards

**Date :** 2026-01-28  
**Objectif :** Analyser l'état actuel et identifier les améliorations nécessaires

---

## 🔍 État Actuel du Système

### ✅ Ce qui EXISTE (Backend)

#### 1. **Routes API Disponibles**

| Route | Description | Statut |
|-------|-------------|--------|
| `/api/notifications` | Notifications générales | ✅ Existe |
| `/api/broadcast` | Messages diffusés (EDG → Citoyens) | ✅ Existe |
| `/api/etat-edg-messages` | Messages ÉTAT ↔ EDG | ✅ Existe |
| `/api/incidents` | Signalements citoyens | ✅ Existe |
| `/api/personnel` | Gestion personnel EDG | ✅ Existe |

#### 2. **WebSocket**
- ✅ Service WebSocket initialisé
- ✅ Support pour notifications temps réel
- ✅ Broadcast par rôle

#### 3. **Base de Données**
- ✅ Table `state_notifications` pour notifications
- ✅ Table `etat_edg_conversations` et `etat_edg_messages` pour messages ÉTAT-EDG
- ✅ Table `broadcast_messages` pour messages diffusés
- ✅ Table `incidents` pour signalements

---

### ❌ Ce qui MANQUE ou est INCOMPLET

#### 1. **Notification lors de l'inscription d'un citoyen**
- ❌ **PROBLÈME** : Quand un citoyen s'inscrit, aucune notification n'est créée pour l'EDG
- ❌ **MANQUE** : Route pour lister les nouveaux utilisateurs dans le dashboard EDG
- ❌ **MANQUE** : Affichage de l'ID SIGE généré dans le dashboard EDG

#### 2. **Communication Citoyen → EDG**
- ⚠️ **PARTIEL** : Les incidents existent mais pas de notification automatique à l'EDG
- ❌ **MANQUE** : Canal dédié pour les alertes citoyennes visibles par l'EDG

#### 3. **Communication EDG → Citoyen**
- ⚠️ **PARTIEL** : Broadcast existe mais pas intégré dans le dashboard citoyen
- ❌ **MANQUE** : Affichage des messages/annonces EDG dans le dashboard citoyen

#### 4. **Communication ÉTAT ↔ EDG**
- ✅ **EXISTE** : Routes API présentes
- ❌ **MANQUE** : Intégration complète dans les dashboards

#### 5. **Frontend - Composants Manquants**
- ❌ Dashboard EDG : Pas de section "Nouveaux Utilisateurs"
- ❌ Dashboard Citoyen : Pas de section "Messages EDG" / "Annonces"
- ❌ Dashboard État : Intégration partielle des messages EDG

---

## 🎯 Fonctionnalités à Implémenter

### 1. **Notification Automatique lors de l'Inscription**

**Backend :**
- Créer une notification pour l'EDG quand un citoyen s'inscrit
- Inclure : nom, email, ID SIGE, date d'inscription

**Frontend EDG :**
- Section "Nouveaux Utilisateurs" dans le dashboard
- Liste avec ID SIGE, nom, email, date
- Badge "Nouveau" pour les inscriptions récentes (< 24h)

### 2. **Canal d'Alertes Citoyennes → EDG**

**Backend :**
- Notification automatique quand un incident est créé
- Route pour récupérer les alertes non lues

**Frontend EDG :**
- Section "Alertes Citoyennes" avec compteur
- Liste des incidents récents avec priorité
- Actions rapides (assigner, répondre)

### 3. **Messages/Annonces EDG → Citoyens**

**Backend :**
- Utiliser la route `/api/broadcast` existante
- Améliorer pour cibler par zone/individu

**Frontend Citoyen :**
- Section "Messages EDG" / "Annonces"
- Affichage des messages reçus
- Notification visuelle pour nouveaux messages

### 4. **Messagerie ÉTAT ↔ EDG**

**Backend :**
- ✅ Routes existantes
- Améliorer les notifications WebSocket

**Frontend :**
- Dashboard État : Intégrer `EtatEdgMessaging.jsx`
- Dashboard EDG : Créer composant de messagerie

---

## 📋 Plan d'Action

### Phase 1 : Backend - Notifications Automatiques
1. ✅ Modifier `/api/auth/register` pour créer notification EDG
2. ✅ Créer route `/api/personnel/new-users` pour lister nouveaux utilisateurs
3. ✅ Améliorer notifications incidents → EDG

### Phase 2 : Frontend EDG
1. ✅ Créer composant `NewUsersSection.jsx`
2. ✅ Intégrer dans Dashboard EDG
3. ✅ Créer composant `CitizenAlerts.jsx` pour alertes

### Phase 3 : Frontend Citoyen
1. ✅ Créer composant `EDGMessages.jsx`
2. ✅ Intégrer dans Dashboard Citoyen
3. ✅ Connecter WebSocket pour notifications temps réel

### Phase 4 : Frontend État
1. ✅ Vérifier intégration `EtatEdgMessaging.jsx`
2. ✅ Améliorer affichage des conversations

### Phase 5 : Tests et Améliorations
1. ✅ Tester flux complet d'inscription → notification → affichage
2. ✅ Tester communication bidirectionnelle
3. ✅ Optimiser performances WebSocket

---

## 🔧 Corrections Nécessaires

### Erreur Identifiée dans les Logs
```
ERROR: column "fraud_cases_detected" does not exist
```
- **Fichier** : `backend/routes/state-docker.js`
- **Ligne** : ~330
- **Action** : Corriger la requête SQL pour la vue `v_zone_efficiency_ranking`

---

## 📝 Notes Techniques

### WebSocket
- Service existant : `backend/services/websocketService.js`
- Utilisation : `websocketService.sendToUser()`, `websocketService.broadcast()`

### Notifications
- Table : `state_notifications`
- Champs : `recipient_role`, `recipient_user_id`, `notification_type`, `title`, `message`, `data`, `priority`

### Messages Broadcast
- Table : `broadcast_messages`
- Support : ciblage par zone ou individuel
- WebSocket : notification automatique aux destinataires

---

**Prochaine Étape :** Commencer l'implémentation selon le plan d'action ci-dessus.
