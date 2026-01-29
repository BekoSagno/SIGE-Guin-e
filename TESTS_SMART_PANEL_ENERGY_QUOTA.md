# Plan de Test - Smart Panel & Energy Quota

## 🎯 Objectif
Valider que les nouvelles fonctionnalités Smart Panel et Energy Quota fonctionnent correctement selon la logique décrite.

## 📋 Checklist de Test

### 1. Smart Panel (Dashboard Citoyen)

#### Test 1.1 : Affichage des Relais
- [ ] Se connecter au dashboard citoyen
- [ ] Accéder à la section "Smart Panel"
- [ ] Vérifier que les 3 relais s'affichent :
  - Relais 1 : Éclairage et Prises
  - Relais 2 : Puissance (Climatiseurs, Chauffe-eau)
  - Relais 3 : Essentiel (Réfrigérateur)
- [ ] Vérifier les statistiques (puissance actuelle, max, nombre d'appareils)

#### Test 1.2 : Contrôle des Relais
- [ ] Cliquer sur "Désactiver" pour un relais
- [ ] Vérifier que le relais passe en état désactivé
- [ ] Cliquer sur "Activer" pour réactiver
- [ ] Vérifier que le relais repasse en état activé

#### Test 1.3 : Affichage dans DeviceAnalytics
- [ ] Accéder à "Analyse NILM"
- [ ] Vérifier que les appareils affichent leur circuit (Relais)
- [ ] Vérifier l'icône et le label du circuit

### 2. Transfert d'Énergie avec Quota

#### Test 2.1 : Transfert GNF → Création Quota
- [ ] Se connecter au dashboard citoyen
- [ ] Accéder à "Transfert d'Énergie"
- [ ] Effectuer un transfert de 10000 GNF vers un autre foyer
- [ ] Vérifier le message de succès avec le quota kWh calculé
- [ ] Vérifier dans les logs backend que :
  - Un EnergyQuota a été créé
  - Un signal MQTT a été envoyé

#### Test 2.2 : Vérification du Quota dans la Base
- [ ] Vérifier dans la base de données que :
  - `energy_quotas` contient une nouvelle entrée
  - `quota_kwh` est calculé correctement (10000 / 1000 = 10 kWh)
  - `quota_gnf` = 10000
  - `meter_id` correspond au compteur du foyer destinataire

#### Test 2.3 : Affichage du Quota dans l'Interface
- [ ] Vérifier que le formulaire de transfert affiche :
  - Le quota équivalent en kWh quand on saisit un montant GNF
  - Le message indiquant que le Kit IoT sera notifié

### 3. Délestage EDG avec Sélection de Relais

#### Test 3.1 : Affichage des Statistiques de Relais
- [ ] Se connecter au dashboard EDG
- [ ] Accéder à "Délestage IoT"
- [ ] Vérifier que chaque zone affiche :
  - Les statistiques des relais (POWER, LIGHTS_PLUGS, ESSENTIAL)
  - Le pourcentage de relais activés par type

#### Test 3.2 : Sélection des Relais
- [ ] Cliquer sur "Délester" pour une zone
- [ ] Vérifier que le modal de sélection des relais s'affiche
- [ ] Sélectionner uniquement "POWER"
- [ ] Vérifier que "ESSENTIAL" est protégé (ne peut pas être sélectionné)
- [ ] Confirmer la sélection

#### Test 3.3 : Exécution du Délestage
- [ ] Vérifier que la commande est envoyée avec les relais sélectionnés
- [ ] Vérifier dans les logs backend que :
  - La route `/api/grid/load-shedding` reçoit `targetRelays: ['POWER']`
  - Le service MQTT envoie des commandes de contrôle de relais
  - Seuls les relais POWER sont désactivés

#### Test 3.4 : Rétablissement
- [ ] Cliquer sur "Rétablir" pour une zone en délestage
- [ ] Vérifier que tous les relais sont réactivés
- [ ] Vérifier que la commande `CMD_RESTORE` est envoyée

### 4. Vérification Backend

#### Test 4.1 : Routes API Relais
- [ ] Tester `GET /api/energy/meters/:meterId/relays`
- [ ] Vérifier que les 3 relais sont retournés avec leurs statistiques

#### Test 4.2 : Routes API Quota
- [ ] Tester `GET /api/energy/meters/:meterId/check-quota`
- [ ] Vérifier la réponse avec `hasQuota`, `availableKwh`, etc.

#### Test 4.3 : Route Statistiques Relais par Zone
- [ ] Tester `GET /api/grid/zones/:zoneId/relays`
- [ ] Vérifier les statistiques agrégées par type de relais

## 🔍 Points de Vérification Critiques

1. **Cohérence Base de Données** :
   - Les relais sont créés automatiquement pour chaque nouveau compteur
   - Les quotas sont créés lors des transferts GNF
   - Les relais peuvent être contrôlés individuellement

2. **Cohérence Frontend-Backend** :
   - Les données affichées correspondent aux données de la base
   - Les actions utilisateur déclenchent les bonnes commandes MQTT

3. **Logique Métier** :
   - Le relais ESSENTIAL ne peut jamais être coupé
   - Le quota est calculé correctement (1 kWh = 1000 GNF)
   - Le délestage cible uniquement les relais sélectionnés

## 📝 Résultats Attendus

Après les tests, tous les points de la checklist doivent être validés pour confirmer que :
- ✅ Le Smart Panel fonctionne correctement
- ✅ Le transfert d'énergie crée bien les quotas
- ✅ Le délestage EDG permet de choisir les relais
- ✅ La cohérence est maintenue entre tous les dashboards
