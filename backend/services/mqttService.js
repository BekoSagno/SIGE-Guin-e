/**
 * Service MQTT pour la communication avec les boîtiers IoT
 * Pour l'instant, ce service simule les commandes MQTT
 * En production, il se connectera à un broker Mosquitto réel
 */

import { executeSQL, generateUUID, formatDate, querySQLObjects } from './sqlService.js';

// Configuration MQTT (pour une future implémentation réelle)
const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
  clientId: 'sige-guinee-backend',
  username: process.env.MQTT_USERNAME || 'sige',
  password: process.env.MQTT_PASSWORD || 'sige_secret',
  topics: {
    loadShedding: 'sige/loadshedding/{zoneId}',
    meterStatus: 'sige/meters/{meterId}/status',
    meterCommand: 'sige/meters/{meterId}/command',
    alerts: 'sige/alerts/{zoneId}',
  },
};

// Types de commandes MQTT supportées
const MQTT_COMMANDS = {
  CMD_REDUCE_LOAD: 'CMD_REDUCE_LOAD', // Couper charges lourdes (AC, chauffe-eau)
  CMD_RESTORE: 'CMD_RESTORE', // Restaurer l'alimentation normale
  CMD_EMERGENCY_CUTOFF: 'CMD_EMERGENCY_CUTOFF', // Coupure d'urgence totale
  CMD_READ_STATUS: 'CMD_READ_STATUS', // Demander le statut
  CMD_REBOOT: 'CMD_REBOOT', // Redémarrer le boîtier
};

// Simulation: stockage en mémoire des états des boîtiers
const meterStates = new Map();

/**
 * Initialise le service MQTT
 * En production, cette fonction établirait la connexion au broker
 */
async function initialize() {
  console.log('🔌 Service MQTT initialisé (mode simulation)');
  console.log(`📡 Broker configuré: ${MQTT_CONFIG.broker}`);
  
  // TODO: Connexion réelle au broker MQTT
  // const mqtt = require('mqtt');
  // client = mqtt.connect(MQTT_CONFIG.broker, { ... });
  
  return true;
}

/**
 * Envoie une commande de délestage à une zone
 * @param {string} zoneId - Identifiant de la zone
 * @param {string} command - Type de commande (CMD_REDUCE_LOAD, CMD_RESTORE)
 * @param {string} userId - ID de l'utilisateur qui initie la commande
 * @returns {Object} Résultat de l'envoi
 */
async function sendLoadSheddingCommand(zoneId, command, userId) {
  const commandId = generateUUID();
  const now = formatDate(new Date());
  
  try {
    // Récupérer les compteurs de la zone
    const meters = await querySQLObjects(
      `SELECT m.id, m.status, h.id as home_id
       FROM meters m
       JOIN homes h ON m.home_id = h.id
       WHERE h.ville ILIKE $1`,
      [`%${zoneId}%`],
      ['id', 'status', 'home_id']
    );

    const totalMeters = meters.length;
    const onlineMeters = meters.filter(m => m.status === 'ONLINE');
    
    // Enregistrer la commande dans le log
    await executeSQL(
      `INSERT INTO mqtt_command_log 
       (id, zone_name, command, meters_targeted, status, initiated_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [commandId, zoneId, command, onlineMeters.length, 'PENDING', userId, now]
    );

    // Simuler l'envoi MQTT aux compteurs en ligne
    let deliveredCount = 0;
    const deliveryResults = [];

    for (const meter of onlineMeters) {
      // Simuler une latence réseau
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      // Simuler un taux de succès de 98%
      const success = Math.random() < 0.98;
      
      if (success) {
        deliveredCount++;
        
        // Mettre à jour l'état simulé du compteur
        meterStates.set(meter.id, {
          lastCommand: command,
          lastCommandTime: new Date(),
          sheddingActive: command === MQTT_COMMANDS.CMD_REDUCE_LOAD,
        });
        
        deliveryResults.push({
          meterId: meter.id,
          status: 'DELIVERED',
          timestamp: new Date().toISOString(),
        });
      } else {
        deliveryResults.push({
          meterId: meter.id,
          status: 'FAILED',
          error: 'Timeout',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Mettre à jour le log de commande
    const finalStatus = deliveredCount === onlineMeters.length ? 'DELIVERED' : 
                        deliveredCount > 0 ? 'PARTIAL' : 'FAILED';
    
    await executeSQL(
      `UPDATE mqtt_command_log 
       SET meters_delivered = $1, status = $2, completed_at = $3
       WHERE id = $4`,
      [deliveredCount, finalStatus, formatDate(new Date()), commandId]
    );

    console.log(`📡 MQTT [${command}] envoyé à ${zoneId}: ${deliveredCount}/${onlineMeters.length} livrés`);

    return {
      success: true,
      commandId,
      command,
      zone: zoneId,
      metersTargeted: onlineMeters.length,
      metersDelivered: deliveredCount,
      status: finalStatus,
      timestamp: new Date().toISOString(),
      details: deliveryResults,
    };
  } catch (error) {
    console.error('Erreur envoi MQTT:', error);
    
    // Enregistrer l'échec
    await executeSQL(
      `UPDATE mqtt_command_log SET status = 'FAILED' WHERE id = $1`,
      [commandId]
    ).catch(() => {});

    return {
      success: false,
      commandId,
      command,
      zone: zoneId,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Envoie une commande à un compteur spécifique
 * @param {string} meterId - ID du compteur
 * @param {string} command - Commande à envoyer
 * @returns {Object} Résultat
 */
async function sendMeterCommand(meterId, command) {
  // Simuler l'envoi
  const success = Math.random() < 0.95;
  
  if (success) {
    meterStates.set(meterId, {
      lastCommand: command,
      lastCommandTime: new Date(),
    });
  }
  
  return {
    success,
    meterId,
    command,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Récupère l'état simulé d'un compteur
 * @param {string} meterId - ID du compteur
 * @returns {Object} État du compteur
 */
function getMeterState(meterId) {
  return meterStates.get(meterId) || {
    lastCommand: null,
    lastCommandTime: null,
    sheddingActive: false,
  };
}

/**
 * Récupère l'historique des commandes MQTT
 * @param {Object} params - Paramètres de filtrage
 * @returns {Array} Liste des commandes
 */
async function getCommandHistory(params = {}) {
  const { zone, limit = 50 } = params;
  
  let query = `
    SELECT id, zone_name, command, meters_targeted, meters_delivered, 
           status, created_at, completed_at,
           u.nom as initiated_by_name
    FROM mqtt_command_log m
    LEFT JOIN users u ON m.initiated_by = u.id
  `;
  
  const queryParams = [];
  if (zone) {
    query += ' WHERE zone_name ILIKE $1';
    queryParams.push(`%${zone}%`);
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1}`;
  queryParams.push(parseInt(limit));
  
  const commands = await querySQLObjects(
    query,
    queryParams,
    ['id', 'zone_name', 'command', 'meters_targeted', 'meters_delivered',
     'status', 'created_at', 'completed_at', 'initiated_by_name']
  );
  
  return commands.map(c => ({
    id: c.id,
    zone: c.zone_name,
    command: c.command,
    metersTargeted: parseInt(c.meters_targeted) || 0,
    metersDelivered: parseInt(c.meters_delivered) || 0,
    status: c.status,
    createdAt: c.created_at,
    completedAt: c.completed_at,
    initiatedBy: c.initiated_by_name || 'Système',
  }));
}

/**
 * Simule la réception d'une mise à jour de statut d'un compteur
 * En production, cela serait déclenché par un message MQTT entrant
 * @param {string} meterId - ID du compteur
 * @param {Object} status - Données de statut
 */
async function handleMeterStatusUpdate(meterId, status) {
  const { power, voltage, current, frequency, temperature } = status;
  
  // Enregistrer les données énergétiques
  await executeSQL(
    `INSERT INTO energy_data (id, meter_id, power, voltage, current, frequency, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      generateUUID(),
      meterId,
      power || 0,
      voltage || 220,
      current || 0,
      frequency || 50,
      formatDate(new Date()),
    ]
  ).catch(err => console.error('Erreur enregistrement données:', err));
  
  return true;
}

// Exporter le service
const mqttService = {
  initialize,
  sendLoadSheddingCommand,
  sendMeterCommand,
  getMeterState,
  getCommandHistory,
  handleMeterStatusUpdate,
  COMMANDS: MQTT_COMMANDS,
  CONFIG: MQTT_CONFIG,
};

export default mqttService;
