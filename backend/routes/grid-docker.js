import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate, countSQL } from '../services/sqlService.js';
import websocketService from '../services/websocketService.js';
import mqttService from '../services/mqttService.js';

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'));

/**
 * POST /api/grid/load-shedding
 * Déclenche un délestage intelligent sur une zone
 */
router.post(
  '/load-shedding',
  [
    body('zoneId').trim().notEmpty(),
    body('commandType').isIn(['SHED_HEAVY_LOADS', 'RESTORE']),
    body('targetRelays').optional().isArray(), // ['POWER', 'LIGHTS_PLUGS'] ou null pour tous
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { zoneId, commandType, targetRelays } = req.body;

      // Trouver tous les foyers de la zone
      const homes = await querySQLObjects(
        'SELECT id FROM homes WHERE ville = $1',
        [zoneId],
        ['id']
      );

      // Compter les compteurs en ligne
      let metersAffected = 0;
      for (const home of homes) {
        const meters = await querySQLObjects(
          'SELECT id FROM meters WHERE home_id = $1 AND status = $2',
          [home.id, 'ONLINE'],
          ['id']
        );
        metersAffected += meters.length;
      }

      // Créer l'événement de délestage
      const eventId = generateUUID();
      await executeSQL(
        `INSERT INTO load_shedding_events (id, zone_id, triggered_by, command_type, meters_affected, started_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [eventId, zoneId, req.user.id, commandType, metersAffected, formatDate(new Date())]
      );

      // Envoyer une alerte WebSocket à tous les utilisateurs de la zone
      if (commandType === 'SHED_HEAVY_LOADS') {
        await websocketService.sendToZone(zoneId, {
          type: 'load_shedding',
          event: 'SHED_HEAVY_LOADS',
          zoneId,
          message: 'Mode Économie Réseau activé par EDG',
          timestamp: new Date().toISOString(),
          eventId
        });
      } else if (commandType === 'RESTORE') {
        await websocketService.sendToZone(zoneId, {
          type: 'load_shedding',
          event: 'RESTORE',
          zoneId,
          message: 'Restauration du réseau - Mode normal',
          timestamp: new Date().toISOString(),
          eventId
        });
      }

      // Si targetRelays est spécifié, désactiver uniquement ces relais
      // Sinon, comportement par défaut (couper les charges lourdes = relais POWER)
      const relaysToTarget = targetRelays && Array.isArray(targetRelays) && targetRelays.length > 0
        ? targetRelays
        : (commandType === 'SHED_HEAVY_LOADS' ? ['POWER'] : null); // Par défaut, couper seulement POWER

      // Envoyer la commande MQTT aux boîtiers IoT
      try {
        const mqttCommand = commandType === 'SHED_HEAVY_LOADS' ? 'CMD_REDUCE_LOAD' : 'CMD_RESTORE';
        const mqttResult = await mqttService.sendLoadSheddingCommand(zoneId, mqttCommand, {
          userId: req.user.id,
          targetRelays: relaysToTarget, // Relais spécifiques à cibler
        });
        
        res.status(201).json({
          message: `Délestage ${commandType} déclenché sur la zone ${zoneId}${relaysToTarget ? ` (Relais: ${relaysToTarget.join(', ')})` : ''}`,
          event: { id: eventId, zoneId, commandType, metersAffected, startedAt: new Date(), targetRelays: relaysToTarget },
          metersAffected,
          homesAffected: homes.length,
          targetRelays: relaysToTarget || 'ALL',
          mqtt: mqttResult,
        });
      } catch (mqttError) {
        console.error('Erreur MQTT (continuant sans):', mqttError);
        res.status(201).json({
          message: `Délestage ${commandType} déclenché sur la zone ${zoneId}`,
          event: { id: eventId, zoneId, commandType, metersAffected, startedAt: new Date() },
          metersAffected,
          homesAffected: homes.length,
          mqttError: 'Commande IoT partiellement échouée',
        });
      }
    } catch (error) {
      console.error('Erreur délestage:', error);
      res.status(500).json({ error: 'Erreur lors du délestage' });
    }
  }
);

/**
 * GET /api/grid/zones
 * Liste toutes les zones avec leurs statistiques
 */
router.get('/zones', async (req, res) => {
  try {
    // Récupérer toutes les villes distinctes
    const distinctCities = await querySQLObjects(
      'SELECT DISTINCT ville FROM homes',
      [],
      ['ville']
    );

    const zones = await Promise.all(
      distinctCities.map(async (city) => {
        const zoneHomes = await querySQLObjects(
          'SELECT id FROM homes WHERE ville = $1',
          [city.ville],
          ['id']
        );

        let onlineMeters = 0;
        for (const home of zoneHomes) {
          const meters = await querySQLObjects(
            'SELECT id FROM meters WHERE home_id = $1 AND status = $2',
            [home.id, 'ONLINE'],
            ['id']
          );
          onlineMeters += meters.length;
        }

        return {
          zoneId: city.ville,
          homesCount: zoneHomes.length,
          onlineMeters,
        };
      })
    );

    res.json({ zones });
  } catch (error) {
    console.error('Erreur récupération zones:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/grid/transformers
 * Liste les transformateurs avec leur charge
 */
router.get('/transformers', async (req, res) => {
  try {
    // Récupérer toutes les villes distinctes
    const distinctCities = await querySQLObjects(
      'SELECT DISTINCT ville FROM homes',
      [],
      ['ville']
    );

    const transformers = await Promise.all(
      distinctCities.map(async (zone) => {
        // Récupérer les foyers de la zone
        const homes = await querySQLObjects(
          'SELECT id FROM homes WHERE ville = $1',
          [zone.ville],
          ['id']
        );

        let totalLoad = 0;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        for (const home of homes) {
          const meters = await querySQLObjects(
            'SELECT id FROM meters WHERE home_id = $1',
            [home.id],
            ['id']
          );

          for (const meter of meters) {
            const recentData = await querySQLObjects(
              `SELECT power FROM energy_data
               WHERE meter_id = $1 AND timestamp >= $2
               ORDER BY timestamp DESC
               LIMIT 1`,
              [meter.id, formatDate(oneHourAgo)],
              ['power']
            );

            if (recentData.length > 0 && recentData[0].power) {
              totalLoad += parseFloat(recentData[0].power);
            }
          }
        }

        // Simuler une capacité de transformateur (en kVA)
        const capacity = 630; // 630 kVA par défaut
        const loadPercentage = (totalLoad / (capacity * 1000)) * 100;

        return {
          zoneId: zone.ville,
          transformerId: `TRANS-${zone.ville}`,
          capacity: capacity,
          currentLoad: totalLoad,
          loadPercentage: Math.min(loadPercentage, 100),
          status: loadPercentage > 85 ? 'CRITICAL' : loadPercentage > 70 ? 'WARNING' : 'NORMAL',
        };
      })
    );

    res.json({ transformers });
  } catch (error) {
    console.error('Erreur récupération transformateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/grid/mqtt-log
 * Historique des commandes MQTT
 */
router.get('/mqtt-log', async (req, res) => {
  try {
    const { zone, limit = 50 } = req.query;
    const commands = await mqttService.getCommandHistory({ zone, limit: parseInt(limit) });
    res.json({ commands });
  } catch (error) {
    console.error('Erreur récupération log MQTT:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/grid/zone-connectivity/:zoneId
 * Vérifie la connectivité IoT d'une zone
 */
router.get('/zone-connectivity/:zoneId', async (req, res) => {
  try {
    const { zoneId } = req.params;
    const connectivity = await mqttService.checkZoneConnectivity(zoneId);
    res.json({ connectivity });
  } catch (error) {
    console.error('Erreur vérification connectivité:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

/**
 * GET /api/grid/zones/:zoneId/relays
 * Récupérer les statistiques des relais pour une zone
 */
router.get('/zones/:zoneId/relays', async (req, res) => {
  try {
    const { zoneId } = req.params;

    // Récupérer tous les compteurs de la zone
    const meters = await querySQLObjects(
      `SELECT m.id, m.status, h.id as home_id
       FROM meters m
       JOIN homes h ON m.home_id = h.id
       WHERE h.ville ILIKE $1`,
      [`%${zoneId}%`],
      ['id', 'status', 'home_id']
    );

    const onlineMeters = meters.filter(m => m.status === 'ONLINE');
    
    // Statistiques par type de relais
    const relayStats = {
      POWER: { total: 0, enabled: 0, disabled: 0, totalPower: 0 },
      LIGHTS_PLUGS: { total: 0, enabled: 0, disabled: 0, totalPower: 0 },
      ESSENTIAL: { total: 0, enabled: 0, disabled: 0, totalPower: 0 },
    };

    // Pour chaque compteur en ligne, récupérer ses relais
    for (const meter of onlineMeters) {
      const relays = await querySQLObjects(
        `SELECT circuit_type, is_enabled, is_active, current_power, max_power
         FROM meter_relays
         WHERE meter_id = $1`,
        [meter.id],
        ['circuit_type', 'is_enabled', 'is_active', 'current_power', 'max_power']
      );

      for (const relay of relays) {
        const type = relay.circuit_type;
        if (relayStats[type]) {
          relayStats[type].total++;
          if (relay.is_enabled && relay.is_active) {
            relayStats[type].enabled++;
          } else {
            relayStats[type].disabled++;
          }
          relayStats[type].totalPower += parseFloat(relay.current_power || 0);
        }
      }
    }

    res.json({
      zoneId,
      totalMeters: meters.length,
      onlineMeters: onlineMeters.length,
      relayStats,
      summary: {
        totalRelays: Object.values(relayStats).reduce((sum, stat) => sum + stat.total, 0),
        enabledRelays: Object.values(relayStats).reduce((sum, stat) => sum + stat.enabled, 0),
        disabledRelays: Object.values(relayStats).reduce((sum, stat) => sum + stat.disabled, 0),
        totalPower: Object.values(relayStats).reduce((sum, stat) => sum + stat.totalPower, 0),
      },
    });
  } catch (error) {
    console.error('Erreur récupération statistiques relais:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

export default router;
