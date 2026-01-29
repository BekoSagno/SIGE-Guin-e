import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';
let authToken = null;
let userId = null;
let meterId = null;
let homeId = null;

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
  log(`  ${title}`, 'cyan');
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

function logTest(name) {
  log(`\n🧪 Test: ${name}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test 1: Connexion et récupération des informations utilisateur
async function testLogin() {
  logSection('TEST 1: Connexion Citoyen');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'mamadou@test.com',
        password: 'password123',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      logError(`Échec de connexion (${response.status}): ${JSON.stringify(data)}`);
      return false;
    }
    
    if (data.token) {
      authToken = data.token;
      userId = data.user.id;
      homeId = data.user.homeId;
      logSuccess(`Connexion réussie - User ID: ${userId}, Home ID: ${homeId || 'N/A'}`);
      return true;
    } else {
      logError(`Échec de connexion: ${data.error || 'Token manquant'} - Réponse: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logError(`Erreur de connexion: ${error.message}`);
    return false;
  }
}

// Test 2: Récupération des compteurs et relais
async function testGetMetersAndRelays() {
  logSection('TEST 2: Récupération des Compteurs et Relais');
  
  if (!homeId) {
    logError('Home ID manquant - Impossible de continuer');
    return false;
  }

  try {
    // D'abord, récupérer les compteurs du foyer
    const metersResponse = await fetch(`${API_BASE}/energy/meters?homeId=${homeId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (!metersResponse.ok) {
      logError(`Erreur récupération compteurs: ${metersResponse.status}`);
      return false;
    }

    const metersData = await metersResponse.json();
    logSuccess(`Compteurs trouvés: ${metersData.meters?.length || 0}`);

    if (metersData.meters && metersData.meters.length > 0) {
      meterId = metersData.meters[0].id;
      logSuccess(`Compteur sélectionné: ${meterId.substring(0, 8)}...`);

      // Maintenant, récupérer les relais de ce compteur
      const relaysResponse = await fetch(`${API_BASE}/energy/meters/${meterId}/relays`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!relaysResponse.ok) {
        logError(`Erreur récupération relais: ${relaysResponse.status}`);
        return false;
      }

      const relaysData = await relaysResponse.json();
      logSuccess(`Relais trouvés: ${relaysData.relays?.length || 0}`);

      if (relaysData.relays && relaysData.relays.length > 0) {
        relaysData.relays.forEach((relay, index) => {
          log(`  Relais ${index + 1}:`, 'cyan');
          log(`    - ID: ${relay.id.substring(0, 8)}...`);
          log(`    - Numéro: ${relay.relayNumber}`);
          log(`    - Type: ${relay.circuitType}`);
          log(`    - Label: ${relay.label || 'N/A'}`);
          log(`    - Actif: ${relay.isActive ? 'Oui' : 'Non'}`);
          log(`    - Puissance max: ${relay.maxPower}W`);
        });
        return true;
      } else {
        logWarning('Aucun relais trouvé - Les relais par défaut ont peut-être besoin d\'être créés');
        return false;
      }
    } else {
      logWarning('Aucun compteur trouvé pour ce foyer');
      return false;
    }
  } catch (error) {
    logError(`Erreur: ${error.message}`);
    return false;
  }
}

// Test 3: Contrôle d'un relais
async function testControlRelay() {
  logSection('TEST 3: Contrôle d\'un Relais');
  
  if (!meterId) {
    logError('Meter ID manquant - Impossible de continuer');
    return false;
  }

  try {
    // D'abord, récupérer les relais
    const relaysResponse = await fetch(`${API_BASE}/energy/meters/${meterId}/relays`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const relaysData = await relaysResponse.json();
    
    if (!relaysData.relays || relaysData.relays.length === 0) {
      logError('Aucun relais disponible pour le test');
      return false;
    }

    const relay = relaysData.relays[0]; // Prendre le premier relais (non-ESSENTIAL)
    const initialState = relay.isActive;

    logTest(`Contrôle du relais ${relay.label} (${relay.circuitType})`);
    log(`État initial: ${initialState ? 'Actif' : 'Inactif'}`);

    // Désactiver le relais
    const action = initialState ? 'disable' : 'enable';
    log(`Action: ${action}`);

    const controlResponse = await fetch(`${API_BASE}/energy/meters/${meterId}/relays/${relay.id}/control`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (!controlResponse.ok) {
      const errorData = await controlResponse.json();
      logError(`Erreur contrôle relais: ${errorData.error || controlResponse.status}`);
      return false;
    }

    const controlData = await controlResponse.json();
    logSuccess(controlData.message || `Relais ${action === 'enable' ? 'activé' : 'désactivé'}`);

    // Vérifier le nouvel état
    const verifyResponse = await fetch(`${API_BASE}/energy/meters/${meterId}/relays`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    const verifyData = await verifyResponse.json();
    const updatedRelay = verifyData.relays.find(r => r.id === relay.id);

    if (updatedRelay && updatedRelay.isActive !== initialState) {
      logSuccess(`État vérifié: ${updatedRelay.isActive ? 'Actif' : 'Inactif'}`);
      return true;
    } else {
      logWarning('L\'état du relais n\'a pas changé comme prévu');
      return false;
    }
  } catch (error) {
    logError(`Erreur: ${error.message}`);
    return false;
  }
}

// Test 4: Vérification du quota énergétique
async function testCheckQuota() {
  logSection('TEST 4: Vérification du Quota Énergétique');
  
  if (!meterId) {
    logError('Meter ID manquant - Impossible de continuer');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/energy/meters/${meterId}/check-quota`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (!response.ok) {
      logError(`Erreur vérification quota: ${response.status}`);
      return false;
    }

    const data = await response.json();
    logSuccess('Quota récupéré avec succès');
    log(`  - A un quota: ${data.hasQuota ? 'Oui' : 'Non'}`);
    log(`  - Quota disponible: ${data.availableKwh || 0} kWh`);
    log(`  - Quota total: ${data.totalQuotaKwh || 0} kWh`);
    log(`  - Expire le: ${data.expiresAt || 'Jamais'}`);

    return true;
  } catch (error) {
    logError(`Erreur: ${error.message}`);
    return false;
  }
}

// Test 5: Connexion EDG et test des statistiques de relais par zone
async function testEDGLogin() {
  logSection('TEST 5: Connexion EDG');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'agent@edg.gn',
        password: 'password123',
      }),
    });

    const data = await response.json();
    
    if (data.token) {
      authToken = data.token;
      logSuccess(`Connexion EDG réussie - User ID: ${data.user.id}`);
      return true;
    } else {
      logError(`Échec de connexion EDG: ${data.error || 'Token manquant'}`);
      return false;
    }
  } catch (error) {
    logError(`Erreur de connexion EDG: ${error.message}`);
    return false;
  }
}

async function testZoneRelayStats() {
  logSection('TEST 6: Statistiques de Relais par Zone');
  
  try {
    // Récupérer les zones
    const zonesResponse = await fetch(`${API_BASE}/grid/zones`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (!zonesResponse.ok) {
      logError(`Erreur récupération zones: ${zonesResponse.status}`);
      return false;
    }

    const zonesData = await zonesResponse.json();
    logSuccess(`Zones trouvées: ${zonesData.zones?.length || 0}`);

    if (zonesData.zones && zonesData.zones.length > 0) {
      const zone = zonesData.zones[0];
      const zoneIdentifier = zone.id || zone.name || zone.ville || zonesData.zones[0].ville;
      log(`Zone sélectionnée: ${zoneIdentifier}`);

      // Récupérer les statistiques de relais pour cette zone
      const statsResponse = await fetch(`${API_BASE}/grid/zones/${encodeURIComponent(zoneIdentifier)}/relays`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!statsResponse.ok) {
        logWarning(`Statistiques de relais non disponibles pour cette zone (${statsResponse.status})`);
        return false;
      }

      const statsData = await statsResponse.json();
      logSuccess('Statistiques de relais récupérées');
      log(`  - Compteurs totaux: ${statsData.totalMeters || 0}`);
      log(`  - Compteurs en ligne: ${statsData.onlineMeters || 0}`);
      log(`  - Relais POWER: ${statsData.relayStats?.POWER?.total || 0} total, ${statsData.relayStats?.POWER?.enabled || 0} activés`);
      log(`  - Relais LIGHTS_PLUGS: ${statsData.relayStats?.LIGHTS_PLUGS?.total || 0} total, ${statsData.relayStats?.LIGHTS_PLUGS?.enabled || 0} activés`);
      log(`  - Relais ESSENTIAL: ${statsData.relayStats?.ESSENTIAL?.total || 0} total, ${statsData.relayStats?.ESSENTIAL?.enabled || 0} activés`);

      return true;
    } else {
      logWarning('Aucune zone trouvée');
      return false;
    }
  } catch (error) {
    logError(`Erreur: ${error.message}`);
    return false;
  }
}

// Fonction principale
async function runAllTests() {
  console.log(`\n${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  TESTS SMART PANEL & ENERGY QUOTA                        ║${colors.reset}`);
  console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const results = {
    login: false,
    metersRelays: false,
    controlRelay: false,
    checkQuota: false,
    edgLogin: false,
    zoneStats: false,
  };

  // Tests Citoyen
  results.login = await testLogin();
  if (results.login) {
    results.metersRelays = await testGetMetersAndRelays();
    if (results.metersRelays) {
      results.controlRelay = await testControlRelay();
    }
    results.checkQuota = await testCheckQuota();
  }

  // Tests EDG
  results.edgLogin = await testEDGLogin();
  if (results.edgLogin) {
    results.zoneStats = await testZoneRelayStats();
  }

  // Résumé
  logSection('RÉSUMÉ DES TESTS');
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  
  log(`Tests réussis: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  Object.entries(results).forEach(([test, result]) => {
    if (result) {
      logSuccess(`${test}`);
    } else {
      logError(`${test}`);
    }
  });

  console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

// Exécuter les tests
runAllTests().catch(error => {
  logError(`Erreur fatale: ${error.message}`);
  process.exit(1);
});
