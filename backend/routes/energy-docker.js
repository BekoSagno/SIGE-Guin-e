import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { querySQLObjects, executeSQL, insertSQL, generateUUID, formatDate } from '../services/sqlService.js';
import { detectFraud } from '../services/fraudDetection.js';
import mqttService from '../services/mqttService.js';

const router = express.Router();

/**
 * POST /api/energy/telemetry
 * Reçoit les données de télémétrie des kits IoT
 */
router.post(
  '/telemetry',
  [
    body('meterId').isUUID(),
    body('voltage').optional().isFloat({ min: 0 }),
    body('current').optional().isFloat({ min: 0 }),
    body('power').optional().isFloat({ min: 0 }),
    body('energySource').isIn(['GRID', 'SOLAR', 'BATTERY']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { meterId, voltage, current, power, energySource } = req.body;

      // Vérifier que le compteur existe
      const meters = await querySQLObjects(
        'SELECT id, home_id FROM meters WHERE id = $1',
        [meterId],
        ['id', 'home_id']
      );

      if (meters.length === 0) {
        return res.status(404).json({ error: 'Compteur non trouvé' });
      }

      const meter = meters[0];

      // Récupérer les infos du foyer
      const homes = await querySQLObjects(
        'SELECT id, latitude, longitude FROM homes WHERE id = $1',
        [meter.home_id],
        ['id', 'latitude', 'longitude']
      );
      const home = homes[0];

      // Créer l'enregistrement de données énergétiques
      const dataId = generateUUID();
      await executeSQL(
        `INSERT INTO energy_data (id, meter_id, timestamp, voltage, current, power, energy_source, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          dataId,
          meterId,
          formatDate(new Date()),
          voltage || null,
          current || null,
          power || null,
          energySource,
          formatDate(new Date())
        ]
      );

      // Mettre à jour le statut du compteur (en ligne)
      await executeSQL(
        `UPDATE meters SET status = 'ONLINE', last_seen = $1, updated_at = $2 WHERE id = $3`,
        [formatDate(new Date()), formatDate(new Date()), meterId]
      );

      // Détection automatique de fraude
      if (power && energySource === 'GRID') {
        const fraudDetected = await detectFraud(meterId, power);
        
        if (fraudDetected) {
          // Créer un incident de fraude suspectée
          const incidentId = generateUUID();
          await executeSQL(
            `INSERT INTO incidents (id, reporter_id, home_id, description, latitude, longitude, status, incident_type, created_at, updated_at)
             VALUES ($1, NULL, $2, $3, $4, $5, 'OPEN', 'FRAUDE_SUSPECTEE', $6, $7)`,
            [
              incidentId,
              meter.home_id,
              `Suspicion de fraude détectée: Puissance consommée (${power}W) dépasse l'index du compteur de plus de 15%`,
              home.latitude || null,
              home.longitude || null,
              formatDate(new Date()),
              formatDate(new Date())
            ]
          );

          // Retourner un avertissement
          return res.status(201).json({
            message: 'Données enregistrées avec succès',
            data: { id: dataId, meterId, timestamp: new Date(), voltage, current, power, energySource },
            warning: 'Suspicion de fraude détectée',
            fraudDetected: true,
          });
        }
      }

      res.status(201).json({
        message: 'Données enregistrées avec succès',
        data: { id: dataId, meterId, timestamp: new Date(), voltage, current, power, energySource },
      });
    } catch (error) {
      console.error('Erreur télémétrie:', error);
      res.status(500).json({ error: 'Erreur lors de l\'enregistrement des données' });
    }
  }
);

/**
 * GET /api/energy/consumption
 * Récupère la consommation d'un foyer sur une période
 */
router.get('/consumption', authMiddleware, async (req, res) => {
  try {
    const { homeId, startDate, endDate } = req.query;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier que l'utilisateur a accès à ce foyer
    const homes = await querySQLObjects(
      `SELECT id, proprietaire_id FROM homes WHERE id = '${homeId}'`,
      [],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];
    const userId = req.user.id;

    // Vérifier les permissions (propriétaire, membre, ou agent EDG/admin)
    const isOwner = home.proprietaire_id === userId;
    const isAgentOrAdmin = req.user.role === 'AGENT_EDG' || req.user.role === 'ADMIN_ETAT';
    
    let isMember = false;
    if (!isOwner && !isAgentOrAdmin) {
      const memberships = await querySQLObjects(
        `SELECT role FROM home_members WHERE home_id = '${homeId}' AND user_id = '${userId}'`,
        [],
        ['role']
      );
      isMember = memberships.length > 0;
    }

    if (!isOwner && !isMember && !isAgentOrAdmin) {
      return res.status(403).json({ error: 'Accès refusé à ce foyer' });
    }

    // Récupérer les compteurs du foyer
    const meters = await querySQLObjects(
      `SELECT id FROM meters WHERE home_id = '${homeId}'`,
      [],
      ['id']
    );

    const meterIds = meters.map((m) => m.id);

    if (meterIds.length === 0) {
      return res.json({
        homeId,
        period: { startDate: startDate || null, endDate: endDate || null },
        statistics: { totalRecords: 0, averagePower: 0, totalGridConsumption: 0, totalSolarConsumption: 0 },
        data: [],
      });
    }

    // Construire la requête avec filtres de date
    const meterIdsList = meterIds.map(id => `'${id}'`).join(', ');
    let sql = `SELECT id, meter_id, timestamp, voltage, current, power, energy_source
               FROM energy_data
               WHERE meter_id IN (${meterIdsList})`;

    if (startDate) {
      sql += ` AND timestamp >= '${startDate}'`;
    }
    if (endDate) {
      sql += ` AND timestamp <= '${endDate}'`;
    }

    sql += ` ORDER BY timestamp DESC LIMIT 1000`;

    // Récupérer les données énergétiques
    const energyData = await querySQLObjects(
      sql,
      [],
      ['id', 'meter_id', 'timestamp', 'voltage', 'current', 'power', 'energy_source']
    );

    // Calculer les statistiques
    const totalPower = energyData.reduce((sum, data) => sum + (parseFloat(data.power) || 0), 0);
    const avgPower = energyData.length > 0 ? totalPower / energyData.length : 0;
    const gridConsumption = energyData
      .filter((d) => d.energy_source === 'GRID')
      .reduce((sum, data) => sum + (parseFloat(data.power) || 0), 0);
    const solarConsumption = energyData
      .filter((d) => d.energy_source === 'SOLAR')
      .reduce((sum, data) => sum + (parseFloat(data.power) || 0), 0);

    res.json({
      homeId,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      statistics: {
        totalRecords: energyData.length,
        averagePower: avgPower,
        totalGridConsumption: gridConsumption,
        totalSolarConsumption: solarConsumption,
      },
      data: energyData.map(d => ({
        id: d.id,
        meterId: d.meter_id,
        timestamp: d.timestamp,
        voltage: d.voltage ? parseFloat(d.voltage) : null,
        current: d.current ? parseFloat(d.current) : null,
        power: d.power ? parseFloat(d.power) : null,
        energySource: d.energy_source,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération consommation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/energy/device-costs
 * Calcule le coût en GNF pour chaque appareil détecté par NILM
 */
router.get('/device-costs', authMiddleware, async (req, res) => {
  try {
    const { homeId, period = '24h' } = req.query; // period: '24h', '7d', '30d'

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    const userId = req.user.id;
    
    // Vérifier que l'utilisateur a accès à ce foyer
    const homes = await querySQLObjects(
      `SELECT id, proprietaire_id FROM homes WHERE id = '${homeId}'`,
      [],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];

    // Vérifier les permissions (propriétaire, membre, ou agent EDG/admin)
    const isOwner = home.proprietaire_id === userId;
    const isAgentOrAdmin = req.user.role === 'AGENT_EDG' || req.user.role === 'ADMIN_ETAT';
    
    let isMember = false;
    if (!isOwner && !isAgentOrAdmin) {
      const memberships = await querySQLObjects(
        `SELECT role FROM home_members WHERE home_id = '${homeId}' AND user_id = '${userId}'`,
        [],
        ['role']
      );
      isMember = memberships.length > 0;
    }

    if (!isOwner && !isMember && !isAgentOrAdmin) {
      return res.status(403).json({ error: 'Accès refusé à ce foyer' });
    }

    // Récupérer les compteurs du foyer
    const meters = await querySQLObjects(
      `SELECT id FROM meters WHERE home_id = '${homeId}'`,
      [],
      ['id']
    );

    if (meters.length === 0) {
      return res.json({ homeId, devices: [], totalCost: 0, currency: 'GNF' });
    }

    // Calculer la date de début selon la période
    const now = new Date();
    let startDate = new Date();
    if (period === '24h') {
      startDate.setHours(now.getHours() - 24);
    } else if (period === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(now.getDate() - 30);
    }

    // Tarif EDG (GNF par kWh) - configurable, par défaut 1000 GNF/kWh
    const TARIFF_GNF_PER_KWH = parseFloat(process.env.EDG_TARIFF_GNF_PER_KWH || '1000');

    // Récupérer les signatures NILM actives
    const meterIds = meters.map((m) => m.id);
    const meterIdsList = meterIds.map(id => `'${id}'`).join(', ');
    const nilmSignatures = await querySQLObjects(
      `SELECT ns.id, ns.meter_id, ns.device_name, ns.device_type, ns.power_signature, ns.detected_at, ns.is_active
       FROM nilm_signatures ns
       WHERE ns.meter_id IN (${meterIdsList})
       AND ns.is_active = true`,
      [],
      ['id', 'meter_id', 'device_name', 'device_type', 'power_signature', 'detected_at', 'is_active']
    );

    // Pour chaque appareil, calculer le coût
    const deviceCosts = await Promise.all(
      nilmSignatures.map(async (device) => {
        // Récupérer les données énergétiques où cet appareil était actif
        // On simule en utilisant la puissance de l'appareil et l'historique global
        const startDateStr = startDate.toISOString();
        const energyData = await querySQLObjects(
          `SELECT power, timestamp, energy_source
           FROM energy_data
           WHERE meter_id = '${device.meter_id}'
           AND timestamp >= '${startDateStr}'
           AND energy_source = 'GRID'
           ORDER BY timestamp ASC`,
          [],
          ['power', 'timestamp', 'energy_source']
        );

        // Calculer la durée d'utilisation et l'énergie consommée
        let totalEnergyWh = 0; // Watt-heures
        let usageHours = 0;

        if (energyData.length > 0) {
          // Estimer que l'appareil était actif proportionnellement à sa puissance
          const devicePower = parseFloat(device.power_signature) || 0;
          
          // Pour chaque point de données, estimer si l'appareil était actif
          for (let i = 0; i < energyData.length - 1; i++) {
            const current = energyData[i];
            const next = energyData[i + 1];
            const currentPower = parseFloat(current.power) || 0;
            
            // Si la puissance totale est proche de la signature de l'appareil, il était probablement actif
            if (currentPower >= devicePower * 0.8) {
              const timeDiff = (new Date(next.timestamp) - new Date(current.timestamp)) / (1000 * 60 * 60); // heures
              usageHours += timeDiff;
              totalEnergyWh += devicePower * timeDiff;
            }
          }
        }

        // Convertir Wh en kWh et calculer le coût
        const energyKWh = totalEnergyWh / 1000;
        const costGNF = energyKWh * TARIFF_GNF_PER_KWH;

        return {
          deviceId: device.id,
          deviceName: device.device_name,
          deviceType: device.device_type,
          powerSignature: parseFloat(device.power_signature) || 0,
          usageHours: Math.round(usageHours * 10) / 10,
          energyKWh: Math.round(energyKWh * 100) / 100,
          costGNF: Math.round(costGNF),
          period,
        };
      })
    );

    // Calculer le coût total
    const totalCost = deviceCosts.reduce((sum, device) => sum + device.costGNF, 0);

    res.json({
      homeId,
      period,
      tariffGnfPerKwh: TARIFF_GNF_PER_KWH,
      devices: deviceCosts,
      totalCost: Math.round(totalCost),
      currency: 'GNF',
    });
  } catch (error) {
    console.error('Erreur calcul coûts appareils:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des coûts' });
  }
});

/**
 * GET /api/energy/history
 * Récupère l'historique des données d'un compteur
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { meterId, limit = 100 } = req.query;

    if (!meterId) {
      return res.status(400).json({ error: 'meterId requis' });
    }

    const userId = req.user.id;
    
    // Vérifier que le compteur existe et que l'utilisateur y a accès
    const meters = await querySQLObjects(
      `SELECT m.id, m.home_id, h.proprietaire_id
       FROM meters m
       JOIN homes h ON m.home_id = h.id
       WHERE m.id = '${meterId}'`,
      [],
      ['id', 'home_id', 'proprietaire_id']
    );

    if (meters.length === 0) {
      return res.status(404).json({ error: 'Compteur non trouvé' });
    }

    const meter = meters[0];

    // Vérifier les permissions (propriétaire, membre, ou agent EDG/admin)
    const isOwner = meter.proprietaire_id === userId;
    const isAgentOrAdmin = req.user.role === 'AGENT_EDG' || req.user.role === 'ADMIN_ETAT';
    
    let isMember = false;
    if (!isOwner && !isAgentOrAdmin) {
      const memberships = await querySQLObjects(
        `SELECT role FROM home_members WHERE home_id = '${meter.home_id}' AND user_id = '${userId}'`,
        [],
        ['role']
      );
      isMember = memberships.length > 0;
    }

    if (!isOwner && !isMember && !isAgentOrAdmin) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Récupérer l'historique
    const limitInt = parseInt(limit);
    const history = await querySQLObjects(
      `SELECT id, meter_id, timestamp, voltage, current, power, energy_source
       FROM energy_data
       WHERE meter_id = '${meterId}'
       ORDER BY timestamp DESC
       LIMIT ${limitInt}`,
      [],
      ['id', 'meter_id', 'timestamp', 'voltage', 'current', 'power', 'energy_source']
    );

    res.json({
      meterId,
      count: history.length,
      data: history.map(d => ({
        id: d.id,
        meterId: d.meter_id,
        timestamp: d.timestamp,
        voltage: d.voltage ? parseFloat(d.voltage) : null,
        current: d.current ? parseFloat(d.current) : null,
        power: d.power ? parseFloat(d.power) : null,
        energySource: d.energy_source,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/energy/smart-save
 * Récupérer le statut Smart Save pour un foyer
 */
router.get('/smart-save', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    const userId = req.user.id;
    
    // Vérifier que l'utilisateur a accès au foyer
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Récupérer le statut Smart Save (pour l'instant, on simule)
    // Dans une vraie implémentation, cela viendrait d'une table smart_save_settings
    res.json({
      enabled: false,
      settings: {
        targetTemperature: 4,
        restCycleMinutes: 30,
        maxRestMinutes: 120,
      },
    });
  } catch (error) {
    console.error('Erreur récupération Smart Save:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/energy/smart-save/toggle
 * Activer/désactiver Smart Save
 */
router.post('/smart-save/toggle', authMiddleware, [
  body('homeId').isUUID(),
  body('deviceId').optional().isUUID(),
  body('enabled').isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { homeId, deviceId, enabled, settings } = req.body;
    const userId = req.user.id;

    // Vérifier les permissions
    const homes = await querySQLObjects(
      `SELECT id, proprietaire_id FROM homes WHERE id = '${homeId}'`,
      [],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];
    const isOwner = home.proprietaire_id === userId;

    // Vérifier les permissions de membre
    if (!isOwner) {
      const members = await querySQLObjects(
        `SELECT role FROM home_members WHERE home_id = '${homeId}' AND user_id = '${userId}'`,
        [],
        ['role']
      );

      if (members.length === 0 || members[0].role !== 'ADMIN') {
        return res.status(403).json({ error: 'Seuls les administrateurs peuvent contrôler Smart Save' });
      }
    }

    // Dans une vraie implémentation, on enverrait une commande MQTT au device
    // Ici, on simule juste la réponse
    console.log(`Smart Save ${enabled ? 'activé' : 'désactivé'} pour foyer ${homeId}, device ${deviceId || 'N/A'}`);

    res.json({
      enabled,
      message: `Smart Save ${enabled ? 'activé' : 'désactivé'} avec succès`,
      settings: settings || {
        targetTemperature: 4,
        restCycleMinutes: 30,
        maxRestMinutes: 120,
      },
    });
  } catch (error) {
    console.error('Erreur toggle Smart Save:', error);
    res.status(500).json({ error: 'Erreur lors de l\'activation/désactivation' });
  }
});

/**
 * PUT /api/energy/smart-save/settings
 * Mettre à jour les paramètres Smart Save
 */
router.put('/smart-save/settings', authMiddleware, [
  body('homeId').isUUID(),
  body('deviceId').optional().isUUID(),
  body('settings').isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { homeId, deviceId, settings } = req.body;
    const userId = req.user.id;

    // Vérifier les permissions (même logique que toggle)
    const homes = await querySQLObjects(
      `SELECT id, proprietaire_id FROM homes WHERE id = '${homeId}'`,
      [],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];
    const isOwner = home.proprietaire_id === userId;

    if (!isOwner) {
      const members = await querySQLObjects(
        `SELECT role FROM home_members WHERE home_id = '${homeId}' AND user_id = '${userId}'`,
        [],
        ['role']
      );

      if (members.length === 0 || members[0].role !== 'ADMIN') {
        return res.status(403).json({ error: 'Seuls les administrateurs peuvent modifier les paramètres' });
      }
    }

    // Valider les paramètres
    if (settings.targetTemperature && (settings.targetTemperature < 2 || settings.targetTemperature > 6)) {
      return res.status(400).json({ error: 'Température cible doit être entre 2°C et 6°C' });
    }

    console.log(`Paramètres Smart Save mis à jour pour foyer ${homeId}:`, settings);

    res.json({
      message: 'Paramètres mis à jour avec succès',
      settings,
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètres Smart Save:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * GET /api/energy/smart-save/stats
 * Récupérer les statistiques d'économie Smart Save
 */
router.get('/smart-save/stats', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier l'accès au foyer
    const userId = req.user.id;
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Dans une vraie implémentation, on calculerait les stats depuis energy_data
    // Ici, on retourne des stats simulées
    res.json({
      energySavedKWh: 0,
      costSavedGNF: 0,
      restTimeHours: 0,
      cyclesAvoided: 0,
    });
  } catch (error) {
    console.error('Erreur récupération stats Smart Save:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/energy/maintenance/diagnostics
 * Récupérer les diagnostics IA pour tous les appareils d'un foyer
 */
router.get('/maintenance/diagnostics', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier l'accès au foyer
    const userId = req.user.id;
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Récupérer les appareils détectés via NILM
    const meters = await querySQLObjects(
      `SELECT id FROM meters WHERE home_id = '${homeId}'`,
      [],
      ['id']
    );

    if (meters.length === 0) {
      return res.json({ devices: [] });
    }

    const meterId = meters[0].id;
    const devices = await querySQLObjects(
      `SELECT id, device_name, device_type, power_signature, is_active, detected_at FROM nilm_signatures WHERE meter_id = '${meterId}'`,
      [],
      ['id', 'device_name', 'device_type', 'power_signature', 'is_active', 'detected_at']
    );

    // Analyser les données énergétiques récentes pour calculer la santé des appareils
    // Dans une vraie implémentation, cela utiliserait l'IA pour prédire les défaillances
    // Ici, on simule des diagnostics basés sur les patterns de consommation

    const diagnostics = devices.map(device => {
      // Simuler un score de santé basé sur l'âge et la consommation
      const daysActive = Math.floor((Date.now() - new Date(device.detected_at).getTime()) / (1000 * 60 * 60 * 24));
      const baseHealthScore = Math.max(50, 100 - (daysActive / 10)); // Dégradation avec le temps
      const healthScore = Math.round(baseHealthScore + (Math.random() * 20 - 10)); // Variation aléatoire

      let status = 'GOOD';
      if (healthScore >= 85) status = 'EXCELLENT';
      else if (healthScore >= 70) status = 'GOOD';
      else if (healthScore >= 50) status = 'WARNING';
      else status = 'CRITICAL';

      // Générer des recommandations si nécessaire
      const recommendations = [];
      if (daysActive > 180) {
        recommendations.push({
          type: 'CLEANING',
          priority: 'MEDIUM',
          message: 'Nettoyage recommandé après ' + Math.floor(daysActive / 30) + ' mois d\'utilisation',
        });
      }
      if (healthScore < 70) {
        recommendations.push({
          type: 'CHECKUP',
          priority: 'HIGH',
          message: 'Vérification technique recommandée',
        });
      }

      return {
        id: device.id,
        deviceName: device.device_name,
        deviceType: device.device_type,
        healthScore: Math.max(0, Math.min(100, healthScore)),
        status,
        lastMaintenance: daysActive > 90 ? new Date(Date.now() - (daysActive - 30) * 24 * 60 * 60 * 1000) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        predictedFailureDate: healthScore < 70 ? new Date(Date.now() + (100 - healthScore) * 10 * 24 * 60 * 60 * 1000) : null,
        metrics: {
          powerConsumption: {
            value: Math.round(device.power_signature || 0),
            trend: daysActive > 90 ? 'increasing' : 'stable',
            status: daysActive > 90 ? 'WARNING' : 'NORMAL',
          },
        },
        recommendations,
      };
    });

    res.json({ devices: diagnostics });
  } catch (error) {
    console.error('Erreur récupération diagnostics:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/energy/maintenance/alerts
 * Récupérer les alertes de maintenance prédictive
 */
router.get('/maintenance/alerts', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier l'accès au foyer
    const userId = req.user.id;
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Récupérer les diagnostics et filtrer les alertes
    // Dans une vraie implémentation, cela viendrait d'une table dédiée
    res.json({ alerts: [] }); // Pour l'instant, pas d'alertes automatiques
  } catch (error) {
    console.error('Erreur récupération alertes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/energy/devices
 * Récupérer tous les appareils d'un foyer (NILM + DeviceInventory) avec état on/off
 */
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    const userId = req.user.id;

    // Vérifier l'accès au foyer - Requête simplifiée
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Récupérer le compteur IoT du foyer
    const meters = await querySQLObjects(
      `SELECT id FROM meters WHERE home_id = '${homeId}' LIMIT 1`,
      [],
      ['id']
    );

    const devices = [];

    // 1. Récupérer les appareils détectés par NILM
    if (meters.length > 0) {
      const meterId = meters[0].id;
      const nilmDevices = await querySQLObjects(
        `SELECT id, device_name, device_type, power_signature, is_active, detected_at 
         FROM nilm_signatures 
         WHERE meter_id = '${meterId}'`,
        [],
        ['id', 'device_name', 'device_type', 'power_signature', 'is_active', 'detected_at']
      );

      for (const device of nilmDevices) {
        const isActive = device.is_active === 't' || device.is_active === true || device.is_active === 'true';
        devices.push({
          id: device.id,
          name: device.device_name,
          type: device.device_type,
          powerRating: parseFloat(device.power_signature) || 0,
          source: 'NILM',
          isOn: isActive,
          canControl: true,
          detectedAt: device.detected_at,
        });
      }
    }

    // 2. Récupérer les appareils de l'inventaire manuel
    const inventoryDevices = await querySQLObjects(
      `SELECT id, name, type, power_rating, is_restricted, is_on 
       FROM device_inventory 
       WHERE home_id = '${homeId}'`,
      [],
      ['id', 'name', 'type', 'power_rating', 'is_restricted', 'is_on']
    );

    for (const device of inventoryDevices) {
      // Vérifier si un appareil NILM correspond déjà
      const nilmMatch = devices.find(d => 
        d.name?.toLowerCase() === device.name?.toLowerCase() ||
        (device.signature_nilm && d.id === device.signature_nilm)
      );

      if (!nilmMatch) {
        // Convertir les booléens de PostgreSQL ('t'/'f') en boolean JavaScript
        const isRestricted = device.is_restricted === 't' || device.is_restricted === true || device.is_restricted === 'true';
        const isOn = device.is_on === 't' || device.is_on === true || device.is_on === 'true';
        
        devices.push({
          id: device.id,
          name: device.name,
          type: device.type,
          powerRating: parseFloat(device.power_rating) || 0,
          source: 'MANUAL',
          isOn: isOn,
          canControl: !isRestricted,
        });
      }
    }

    res.json({ devices });
  } catch (error) {
    console.error('Erreur récupération appareils:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/energy/devices
 * Ajouter un nouvel appareil manuellement
 */
router.post('/devices', [
  body('homeId').isUUID(),
  body('name').notEmpty().trim(),
  body('type').notEmpty().trim(),
  body('powerRating').optional().isFloat({ min: 0 }),
], authMiddleware, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { homeId, name, type, powerRating } = req.body;
    const userId = req.user.id;

    // Vérifier l'accès au foyer
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Créer l'appareil dans device_inventory
    const deviceId = generateUUID();
    const now = new Date().toISOString();

    await executeSQL(
      `INSERT INTO device_inventory (id, home_id, name, type, power_rating, is_restricted, created_at, updated_at)
       VALUES ('${deviceId}', '${homeId}', '${name.replace(/'/g, "''")}', '${type.replace(/'/g, "''")}', ${powerRating || 0}, false, '${now}', '${now}')`,
      []
    );

    // Retourner l'appareil créé
    const device = {
      id: deviceId,
      name,
      type,
      powerRating: powerRating || 0,
      source: 'MANUAL',
      isOn: false,
      canControl: true,
    };

    console.log(`✅ Nouvel appareil ajouté: ${name} (${type}) - ${powerRating || 0}W pour foyer ${homeId}`);

    res.status(201).json({
      message: 'Appareil ajouté avec succès',
      device,
    });
  } catch (error) {
    console.error('Erreur ajout appareil:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'appareil' });
  }
});

/**
 * POST /api/energy/devices/:deviceId/control
 * Contrôler un appareil (allumer/éteindre)
 */
router.post('/devices/:deviceId/control', [
  body('action').isIn(['on', 'off']),
  body('homeId').isUUID(),
], authMiddleware, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId } = req.params;
    const { action, homeId } = req.body;
    const userId = req.user.id;

    // Vérifier l'accès au foyer
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Vérifier si l'appareil est NILM ou DeviceInventory
    const nilmDevice = await querySQLObjects(
      `SELECT ns.id, ns.device_name, ns.device_type, ns.is_active, m.id as meter_id, m.home_id
       FROM nilm_signatures ns
       JOIN meters m ON ns.meter_id = m.id
       WHERE ns.id = '${deviceId}' AND m.home_id = '${homeId}'`,
      [],
      ['id', 'device_name', 'device_type', 'is_active', 'meter_id', 'home_id']
    );

    if (nilmDevice.length > 0) {
      // Appareil NILM - Mettre à jour l'état et envoyer commande MQTT
      const device = nilmDevice[0];
      const newState = action === 'on';

      // Mettre à jour dans la base
      await executeSQL(
        `UPDATE nilm_signatures SET is_active = ${newState} WHERE id = '${deviceId}'`,
        []
      );

      // TODO: Envoyer commande MQTT au kit IoT
      // Exemple: mqttClient.publish(`guinee/energy/${device.meter_id}/devices/${deviceId}/control`, JSON.stringify({ action, timestamp: new Date() }))
      console.log(`📡 [MQTT Simulé] Commande envoyée: ${action.toUpperCase()} pour appareil ${device.device_name} (${deviceId})`);

      res.json({
        message: `Appareil ${newState ? 'allumé' : 'éteint'} avec succès`,
        device: {
          id: device.id,
          name: device.device_name,
          type: device.device_type,
          isOn: newState,
        },
      });
      return;
    }

    // Vérifier si c'est un DeviceInventory
    const inventoryDevice = await querySQLObjects(
      `SELECT id, name, type, is_restricted 
       FROM device_inventory 
       WHERE id = '${deviceId}' AND home_id = '${homeId}'`,
      [],
      ['id', 'name', 'type', 'is_restricted']
    );

    if (inventoryDevice.length > 0) {
      const device = inventoryDevice[0];
      
      // Convertir is_restricted de 't'/'f' en boolean
      const isRestricted = device.is_restricted === 't' || device.is_restricted === true || device.is_restricted === 'true';
      
      if (isRestricted) {
        return res.status(403).json({ error: 'Cet appareil est restreint et ne peut pas être contrôlé' });
      }

      // Mettre à jour l'état dans la base de données
      const newState = action === 'on';
      await executeSQL(
        `UPDATE device_inventory SET is_on = ${newState}, updated_at = '${new Date().toISOString()}' WHERE id = '${deviceId}'`,
        []
      );

      // Simuler l'envoi de commande MQTT au kit IoT
      console.log(`📡 [MQTT Simulé] Commande envoyée: ${action.toUpperCase()} pour appareil ${device.name} (${deviceId})`);
      console.log(`✅ État de l'appareil ${device.name} mis à jour: ${newState ? 'ALLUMÉ' : 'ÉTEINT'}`);

      res.json({
        message: `Appareil ${newState ? 'allumé' : 'éteint'} avec succès`,
        device: {
          id: device.id,
          name: device.name,
          type: device.type,
          isOn: newState,
        },
      });
      return;
    }

    res.status(404).json({ error: 'Appareil non trouvé' });
  } catch (error) {
    console.error('Erreur contrôle appareil:', error);
    res.status(500).json({ error: 'Erreur lors du contrôle de l\'appareil' });
  }
});

/**
 * GET /api/energy/meters/:meterId/relays
 * Récupérer tous les relais d'un compteur IoT (Smart Panel)
 */
router.get('/meters/:meterId/relays', authMiddleware, async (req, res) => {
  try {
    const { meterId } = req.params;
    const userId = req.user.id;

    // Vérifier l'accès au compteur via le foyer
    const meters = await querySQLObjects(
      `SELECT m.id, m.home_id, h.proprietaire_id
       FROM meters m
       JOIN homes h ON m.home_id = h.id
       WHERE m.id = '${meterId}' 
       AND (h.proprietaire_id = '${userId}' 
            OR h.id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id', 'home_id', 'proprietaire_id']
    );

    if (meters.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce compteur' });
    }

    // Récupérer les relais
    const relays = await querySQLObjects(
      `SELECT id, meter_id, relay_number, circuit_type, label, is_active, is_enabled, 
              current_power, max_power, created_at, updated_at
       FROM meter_relays
       WHERE meter_id = '${meterId}'
       ORDER BY relay_number ASC`,
      [],
      ['id', 'meter_id', 'relay_number', 'circuit_type', 'label', 'is_active', 'is_enabled', 
       'current_power', 'max_power', 'created_at', 'updated_at']
    );

    // Pour chaque relais, compter les appareils connectés
    const relaysWithDevices = await Promise.all(
      relays.map(async (relay) => {
        const devices = await querySQLObjects(
          `SELECT COUNT(*) as count FROM nilm_signatures WHERE relay_id = '${relay.id}' AND is_active = true`,
          [],
          ['count']
        );
        return {
          ...relay,
          deviceCount: parseInt(devices[0]?.count || 0),
          currentPower: parseFloat(relay.current_power) || 0,
          maxPower: relay.max_power ? parseFloat(relay.max_power) : null,
        };
      })
    );

    res.json({ relays: relaysWithDevices });
  } catch (error) {
    console.error('Erreur récupération relais:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des relais' });
  }
});

/**
 * POST /api/energy/meters/:meterId/relays/:relayId/control
 * Contrôler un relais (activer/désactiver)
 */
router.post('/meters/:meterId/relays/:relayId/control', [
  body('action').isIn(['enable', 'disable']),
], authMiddleware, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { meterId, relayId } = req.params;
    const { action } = req.body;
    const userId = req.user.id;

    // Vérifier l'accès
    const meters = await querySQLObjects(
      `SELECT m.id FROM meters m
       JOIN homes h ON m.home_id = h.id
       WHERE m.id = '${meterId}' 
       AND (h.proprietaire_id = '${userId}' 
            OR h.id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}' AND role = 'ADMIN'))`,
      [],
      ['id']
    );

    if (meters.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const newState = action === 'enable';
    const now = new Date().toISOString();

    await executeSQL(
      `UPDATE meter_relays 
       SET is_enabled = ${newState}, updated_at = '${now}'
       WHERE id = '${relayId}' AND meter_id = '${meterId}'`,
      []
    );

    // Envoyer commande MQTT au Kit IoT
    try {
      await mqttService.sendRelayControl(meterId, relayId, action);
    } catch (mqttError) {
      console.error('⚠️ Erreur envoi commande MQTT (non bloquant):', mqttError);
      // Ne pas bloquer l'opération si MQTT échoue
    }

    res.json({
      message: `Relais ${newState ? 'activé' : 'désactivé'} avec succès`,
      relayId,
      action,
    });
  } catch (error) {
    console.error('Erreur contrôle relais:', error);
    res.status(500).json({ error: 'Erreur lors du contrôle du relais' });
  }
});

/**
 * GET /api/energy/meters/:meterId/check-quota
 * Vérifier le quota disponible pour un compteur (appelé par le Kit IoT)
 */
router.get('/meters/:meterId/check-quota', async (req, res) => {
  try {
    const { meterId } = req.params;
    const { requiredKwh } = req.query; // kWh requis pour la consommation actuelle

    // Récupérer le quota actif le plus récent
    const quotas = await querySQLObjects(
      `SELECT id, quota_kwh, consumed_kwh, quota_gnf, expires_at, last_sync
       FROM energy_quotas
       WHERE meter_id = '${meterId}' 
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       ORDER BY created_at DESC
       LIMIT 1`,
      [],
      ['id', 'quota_kwh', 'consumed_kwh', 'quota_gnf', 'expires_at', 'last_sync']
    );

    if (quotas.length === 0) {
      return res.json({
        hasQuota: false,
        availableKwh: 0,
        message: 'Aucun quota disponible',
      });
    }

    const quota = quotas[0];
    const availableKwh = parseFloat(quota.quota_kwh) - parseFloat(quota.consumed_kwh || 0);
    const required = parseFloat(requiredKwh) || 0;

    // Mettre à jour last_sync
    const now = new Date().toISOString();
    await executeSQL(
      `UPDATE energy_quotas SET last_sync = '${now}' WHERE id = '${quota.id}'`,
      []
    );

    res.json({
      hasQuota: true,
      availableKwh: Math.max(0, availableKwh),
      totalQuotaKwh: parseFloat(quota.quota_kwh),
      consumedKwh: parseFloat(quota.consumed_kwh || 0),
      quotaGnf: parseFloat(quota.quota_gnf),
      canConsume: availableKwh >= required,
      expiresAt: quota.expires_at,
      lastSync: now,
    });
  } catch (error) {
    console.error('Erreur vérification quota:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du quota' });
  }
});

/**
 * POST /api/energy/meters/:meterId/consume-quota
 * Enregistrer la consommation d'énergie (appelé par le Kit IoT après consommation)
 */
router.post('/meters/:meterId/consume-quota', [
  body('kwh').isFloat({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { meterId } = req.params;
    const { kwh } = req.body;

    // Récupérer le quota actif
    const quotas = await querySQLObjects(
      `SELECT id, quota_kwh, consumed_kwh FROM energy_quotas
       WHERE meter_id = '${meterId}' 
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       ORDER BY created_at DESC
       LIMIT 1`,
      [],
      ['id', 'quota_kwh', 'consumed_kwh']
    );

    if (quotas.length === 0) {
      return res.status(400).json({ error: 'Aucun quota actif disponible' });
    }

    const quota = quotas[0];
    const currentConsumed = parseFloat(quota.consumed_kwh || 0);
    const newConsumed = currentConsumed + parseFloat(kwh);
    const totalQuota = parseFloat(quota.quota_kwh);

    // Vérifier que la consommation ne dépasse pas le quota
    if (newConsumed > totalQuota) {
      return res.status(400).json({ 
        error: 'Quota insuffisant',
        availableKwh: Math.max(0, totalQuota - currentConsumed),
      });
    }

    // Mettre à jour la consommation
    const now = new Date().toISOString();
    await executeSQL(
      `UPDATE energy_quotas 
       SET consumed_kwh = ${newConsumed}, last_sync = '${now}', updated_at = '${now}'
       WHERE id = '${quota.id}'`,
      []
    );

    // Si le quota est épuisé, désactiver
    if (newConsumed >= totalQuota) {
      await executeSQL(
        `UPDATE energy_quotas SET is_active = false WHERE id = '${quota.id}'`,
        []
      );
    }

    res.json({
      message: 'Consommation enregistrée',
      consumedKwh: newConsumed,
      availableKwh: Math.max(0, totalQuota - newConsumed),
      quotaExhausted: newConsumed >= totalQuota,
    });
  } catch (error) {
    console.error('Erreur enregistrement consommation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la consommation' });
  }
});

export default router;
