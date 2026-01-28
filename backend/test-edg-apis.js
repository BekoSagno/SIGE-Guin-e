/**
 * Script de test automatique des APIs EDG
 * Usage: node test-edg-apis.js
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const TEST_EMAIL = 'agent@edg.gn';
const TEST_PASSWORD = 'password123';

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`📋 ${message}`, 'blue');
  log('='.repeat(60), 'blue');
}

async function testAPIs() {
  let token = null;

  try {
    // ========== ÉTAPE 1: CONNEXION ==========
    logSection('ÉTAPE 1: Authentification');
    logInfo(`Connexion avec ${TEST_EMAIL}...`);

    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (!loginRes.data.token) {
      logError('Token non reçu dans la réponse');
      return;
    }

    token = loginRes.data.token;
    logSuccess(`Token obtenu: ${token.substring(0, 30)}...`);
    logSuccess(`Utilisateur: ${loginRes.data.user?.nom} (${loginRes.data.user?.role})`);

    if (loginRes.data.user?.role !== 'AGENT_EDG') {
      logError(`Rôle incorrect: ${loginRes.data.user?.role}. Attendu: AGENT_EDG`);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // ========== ÉTAPE 2: TEST BROADCAST ==========
    logSection('ÉTAPE 2: API Broadcast');
    
    try {
      const broadcastZones = await axios.get(`${API_BASE}/broadcast/zones`, { headers });
      logSuccess(`Broadcast zones: ${broadcastZones.data.zones?.length || 0} zone(s)`);
      if (broadcastZones.data.zones?.length > 0) {
        logInfo(`  → ${broadcastZones.data.zones[0].name} (${broadcastZones.data.zones[0].subscribers} abonnés)`);
      }
    } catch (err) {
      logError(`Broadcast zones: ${err.response?.data?.error || err.message}`);
    }

    try {
      const broadcastClients = await axios.get(`${API_BASE}/broadcast/clients?limit=5`, { headers });
      logSuccess(`Broadcast clients: ${broadcastClients.data.clients?.length || 0} client(s)`);
    } catch (err) {
      logError(`Broadcast clients: ${err.response?.data?.error || err.message}`);
    }

    try {
      const broadcastTemplates = await axios.get(`${API_BASE}/broadcast/templates`, { headers });
      logSuccess(`Broadcast templates: ${broadcastTemplates.data.templates?.length || 0} modèle(s)`);
    } catch (err) {
      logError(`Broadcast templates: ${err.response?.data?.error || err.message}`);
    }

    // ========== ÉTAPE 3: TEST RÉCONCILIATION ==========
    logSection('ÉTAPE 3: API Réconciliation');
    
    try {
      const reconciliationZones = await axios.get(`${API_BASE}/reconciliation/zones`, { headers });
      logSuccess(`Réconciliation zones: ${reconciliationZones.data.reconciliation?.length || 0} zone(s)`);
      if (reconciliationZones.data.reconciliation?.length > 0) {
        const first = reconciliationZones.data.reconciliation[0];
        logInfo(`  → ${first.zone}: Delta ${first.deltaPercent.toFixed(1)}% (${first.status})`);
      }
    } catch (err) {
      logError(`Réconciliation zones: ${err.response?.data?.error || err.message}`);
    }

    try {
      const reconciliationTickets = await axios.get(`${API_BASE}/reconciliation/tickets?limit=5`, { headers });
      logSuccess(`Tickets d'audit: ${reconciliationTickets.data.tickets?.length || 0} ticket(s)`);
    } catch (err) {
      logError(`Tickets d'audit: ${err.response?.data?.error || err.message}`);
    }

    // ========== ÉTAPE 4: TEST TRANSFORMATEURS ==========
    logSection('ÉTAPE 4: API Transformateurs');
    
    try {
      const transformers = await axios.get(`${API_BASE}/transformers`, { headers });
      logSuccess(`Transformateurs: ${transformers.data.transformers?.length || 0} transformateur(s)`);
      if (transformers.data.transformers?.length > 0) {
        const first = transformers.data.transformers[0];
        logInfo(`  → ${first.name}: ${first.loadPercentage.toFixed(1)}% charge (${first.status})`);
        logInfo(`  → Score santé: ${first.healthScore}% (Risque: ${first.riskLevel})`);
      }
    } catch (err) {
      logError(`Transformateurs: ${err.response?.data?.error || err.message}`);
    }

    try {
      const transformersStats = await axios.get(`${API_BASE}/transformers/stats/summary`, { headers });
      const stats = transformersStats.data.summary;
      logSuccess(`Statistiques transformateurs:`);
      logInfo(`  → Total: ${stats.totalTransformers}`);
      logInfo(`  → Critiques: ${stats.critical}, Avertissements: ${stats.warning}`);
      logInfo(`  → Score moyen: ${stats.avgHealthScore}%`);
    } catch (err) {
      logError(`Statistiques transformateurs: ${err.response?.data?.error || err.message}`);
    }

    // ========== ÉTAPE 5: TEST GRID ==========
    logSection('ÉTAPE 5: API Grid');
    
    try {
      const gridZones = await axios.get(`${API_BASE}/grid/zones`, { headers });
      logSuccess(`Grid zones: ${gridZones.data.zones?.length || 0} zone(s)`);
      if (gridZones.data.zones?.length > 0) {
        const first = gridZones.data.zones[0];
        logInfo(`  → ${first.zoneId}: ${first.onlineMeters} compteurs en ligne`);
      }
    } catch (err) {
      logError(`Grid zones: ${err.response?.data?.error || err.message}`);
    }

    try {
      const gridTransformers = await axios.get(`${API_BASE}/grid/transformers`, { headers });
      logSuccess(`Grid transformateurs: ${gridTransformers.data.transformers?.length || 0} transformateur(s)`);
    } catch (err) {
      logError(`Grid transformateurs: ${err.response?.data?.error || err.message}`);
    }

    try {
      const mqttLog = await axios.get(`${API_BASE}/grid/mqtt-log?limit=5`, { headers });
      logSuccess(`Journal MQTT: ${mqttLog.data.commands?.length || 0} commande(s)`);
    } catch (err) {
      logError(`Journal MQTT: ${err.response?.data?.error || err.message}`);
    }

    // ========== RÉSUMÉ ==========
    logSection('RÉSUMÉ');
    logSuccess('Tous les tests sont terminés !');
    logInfo('Si vous voyez des erreurs, vérifiez :');
    logInfo('  1. Que le backend est démarré (npm run dev)');
    logInfo('  2. Que la base de données est accessible');
    logInfo('  3. Que le compte agent@edg.gn existe');

  } catch (error) {
    if (error.response) {
      logError(`Erreur HTTP ${error.response.status}: ${error.response.data?.error || error.message}`);
      if (error.response.status === 401) {
        logError('Token invalide ou expiré. Vérifiez vos identifiants.');
      }
    } else if (error.request) {
      logError('Aucune réponse du serveur. Vérifiez que le backend est démarré.');
      logInfo(`URL testée: ${API_BASE}`);
    } else {
      logError(`Erreur: ${error.message}`);
    }
    process.exit(1);
  }
}

// Lancer les tests
console.log('\n');
log('🚀 Démarrage des tests des APIs EDG', 'cyan');
log('='.repeat(60), 'blue');
testAPIs().then(() => {
  log('\n✨ Tests terminés !\n', 'green');
  process.exit(0);
}).catch(err => {
  logError(`\n💥 Erreur fatale: ${err.message}\n`);
  process.exit(1);
});
