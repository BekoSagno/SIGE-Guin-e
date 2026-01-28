import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate, countSQL } from '../services/sqlService.js';

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'));

// Données de base pour les transformateurs (simulées, normalement viendrait de capteurs SCADA)
const TRANSFORMER_BASE_DATA = {
  'Kaloum': { lat: 9.5092, lng: -13.7122, capacity: 630, installationDate: '2020-02-28' },
  'Dixinn': { lat: 9.5350, lng: -13.6800, capacity: 800, installationDate: '2015-03-20' },
  'Ratoma': { lat: 9.5800, lng: -13.6200, capacity: 1000, installationDate: '2018-07-15' },
  'Matoto': { lat: 9.6100, lng: -13.5800, capacity: 750, installationDate: '2016-11-10' },
  'Matam': { lat: 9.5500, lng: -13.6500, capacity: 500, installationDate: '2019-05-05' },
};

/**
 * GET /api/transformers
 * Liste tous les transformateurs avec leur état de santé
 */
router.get('/', async (req, res) => {
  try {
    // Récupérer les zones distinctes
    const zones = await querySQLObjects(
      'SELECT DISTINCT ville FROM homes WHERE ville IS NOT NULL',
      [],
      ['ville']
    );

    const transformers = await Promise.all(
      zones.map(async (zone) => {
        const zoneName = zone.ville;
        const baseData = TRANSFORMER_BASE_DATA[zoneName] || {
          lat: 9.5370 + (Math.random() - 0.5) * 0.1,
          lng: -13.6785 + (Math.random() - 0.5) * 0.1,
          capacity: 630,
          installationDate: '2018-01-01',
        };

        // Calculer la charge actuelle
        const oneHourAgo = formatDate(new Date(Date.now() - 60 * 60 * 1000));
        const loadData = await querySQLObjects(
          `SELECT COALESCE(SUM(ed.power), 0) as total_power
           FROM energy_data ed
           JOIN meters m ON ed.meter_id = m.id
           JOIN homes h ON m.home_id = h.id
           WHERE h.ville = $1 AND ed.timestamp >= $2`,
          [zoneName, oneHourAgo],
          ['total_power']
        );

        const currentLoad = parseFloat(loadData[0]?.total_power) || 0;
        const loadPercentage = (currentLoad / (baseData.capacity * 1000)) * 100;

        // Simuler les métriques de santé
        const temperature = 35 + Math.random() * 40; // 35-75°C
        const oilLevel = 75 + Math.random() * 25; // 75-100%
        const vibration = 0.5 + Math.random() * 2.5; // 0.5-3 mm/s

        // Calculer le score de santé
        let healthScore = 100;
        if (temperature > 65) healthScore -= 20;
        else if (temperature > 50) healthScore -= 10;
        if (oilLevel < 80) healthScore -= 15;
        if (vibration > 2) healthScore -= 15;
        else if (vibration > 1.5) healthScore -= 5;

        // Calculer l'âge du transformateur
        const installDate = new Date(baseData.installationDate);
        const age = Math.floor((Date.now() - installDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age > 10) healthScore -= 20;
        else if (age > 7) healthScore -= 10;

        healthScore = Math.max(0, Math.min(100, healthScore));

        // Déterminer le statut et le risque
        let status = 'NORMAL';
        let riskLevel = 'LOW';
        let predictedFailure = null;

        if (loadPercentage > 85 || healthScore < 50) {
          status = 'CRITICAL';
          riskLevel = 'HIGH';
          // Prédire une panne dans les 3-6 mois si critique
          const failureDate = new Date();
          failureDate.setMonth(failureDate.getMonth() + Math.floor(3 + Math.random() * 3));
          predictedFailure = failureDate.toISOString().split('T')[0];
        } else if (loadPercentage > 70 || healthScore < 70) {
          status = 'WARNING';
          riskLevel = 'MEDIUM';
        }

        // Compter les compteurs connectés
        const meterCount = await countSQL(
          `SELECT COUNT(*) FROM meters m
           JOIN homes h ON m.home_id = h.id
           WHERE h.ville = $1`,
          [zoneName]
        );

        const onlineMeterCount = await countSQL(
          `SELECT COUNT(*) FROM meters m
           JOIN homes h ON m.home_id = h.id
           WHERE h.ville = $1 AND m.status = 'ONLINE'`,
          [zoneName]
        );

        // Récupérer la dernière maintenance
        const maintenanceData = await querySQLObjects(
          `SELECT performed_at FROM transformer_maintenance
           WHERE zone_name = $1
           ORDER BY performed_at DESC
           LIMIT 1`,
          [zoneName],
          ['performed_at']
        );

        const lastMaintenance = maintenanceData[0]?.performed_at || baseData.installationDate;

        return {
          id: `TRANS-${zoneName?.toUpperCase().replace(/\s+/g, '-')}-001`,
          name: `Poste Source ${zoneName}`,
          zone: zoneName,
          lat: baseData.lat,
          lng: baseData.lng,
          capacity: baseData.capacity,
          currentLoad: Math.round(currentLoad / 1000), // en kW
          loadPercentage: Math.min(Math.round(loadPercentage * 10) / 10, 100),
          status,
          healthScore: Math.round(healthScore),
          riskLevel,
          predictedFailure,
          connectedMeters: meterCount,
          onlineMeters: onlineMeterCount,
          efficiency: Math.max(85, 100 - (100 - healthScore) * 0.5),
          installationDate: baseData.installationDate,
          age,
          lastMaintenance,
          metrics: {
            temperature: {
              current: Math.round(temperature * 10) / 10,
              avg: Math.round((temperature - 5) * 10) / 10,
              max: Math.round((temperature + 10) * 10) / 10,
              trend: temperature > 55 ? 'UP' : 'STABLE',
            },
            oilLevel: {
              current: Math.round(oilLevel),
              min: 80,
              status: oilLevel < 80 ? 'LOW' : 'OK',
            },
            vibration: {
              current: Math.round(vibration * 10) / 10,
              normal: 1.5,
              status: vibration > 2 ? 'HIGH' : vibration > 1.5 ? 'SLIGHTLY_HIGH' : 'OK',
            },
          },
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
 * GET /api/transformers/:id
 * Détails d'un transformateur spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Extraire le nom de zone de l'ID
    const zoneName = id.replace('TRANS-', '').replace(/-001$/, '').replace(/-/g, ' ');

    // Vérifier que la zone existe
    const zoneCheck = await querySQLObjects(
      'SELECT DISTINCT ville FROM homes WHERE ville ILIKE $1',
      [`%${zoneName}%`],
      ['ville']
    );

    if (zoneCheck.length === 0) {
      return res.status(404).json({ error: 'Transformateur non trouvé' });
    }

    // Récupérer l'historique des maintenances
    const maintenanceHistory = await querySQLObjects(
      `SELECT id, maintenance_type, description, cost, performed_at, performed_by
       FROM transformer_maintenance
       WHERE zone_name ILIKE $1
       ORDER BY performed_at DESC
       LIMIT 10`,
      [`%${zoneName}%`],
      ['id', 'maintenance_type', 'description', 'cost', 'performed_at', 'performed_by']
    );

    // Récupérer les anomalies détectées
    const anomalies = await querySQLObjects(
      `SELECT id, anomaly_type, severity, description, detected_at
       FROM transformer_anomalies
       WHERE zone_name ILIKE $1 AND resolved = false
       ORDER BY detected_at DESC`,
      [`%${zoneName}%`],
      ['id', 'anomaly_type', 'severity', 'description', 'detected_at']
    );

    res.json({
      transformerId: id,
      zone: zoneCheck[0].ville,
      maintenanceHistory: maintenanceHistory.map(m => ({
        id: m.id,
        type: m.maintenance_type,
        description: m.description,
        cost: parseInt(m.cost) || 0,
        performedAt: m.performed_at,
      })),
      anomalies: anomalies.map(a => ({
        id: a.id,
        type: a.anomaly_type,
        severity: a.severity,
        description: a.description,
        detectedAt: a.detected_at,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération détails transformateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/transformers/:id/maintenance
 * Planifie ou enregistre une maintenance
 */
router.post(
  '/:id/maintenance',
  [
    body('maintenanceType').isIn(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION']),
    body('description').trim().notEmpty(),
    body('scheduledAt').optional().isISO8601(),
    body('cost').optional().isNumeric(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { maintenanceType, description, scheduledAt, cost } = req.body;

      // Extraire le nom de zone
      const zoneName = id.replace('TRANS-', '').replace(/-001$/, '').replace(/-/g, ' ');

      const maintenanceId = generateUUID();
      const now = formatDate(new Date());

      await executeSQL(
        `INSERT INTO transformer_maintenance 
         (id, zone_name, maintenance_type, description, cost, scheduled_at, performed_at, performed_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          maintenanceId,
          zoneName,
          maintenanceType,
          description,
          cost || 0,
          scheduledAt ? formatDate(new Date(scheduledAt)) : null,
          scheduledAt ? null : now, // Si pas programmé, c'est fait maintenant
          req.user.id,
          now
        ]
      );

      res.status(201).json({
        message: scheduledAt ? 'Maintenance planifiée avec succès' : 'Maintenance enregistrée avec succès',
        maintenance: {
          id: maintenanceId,
          zone: zoneName,
          type: maintenanceType,
          description,
          cost: cost || 0,
          scheduledAt: scheduledAt || null,
          performedAt: scheduledAt ? null : new Date(),
        },
      });
    } catch (error) {
      console.error('Erreur création maintenance:', error);
      res.status(500).json({ error: 'Erreur lors de la création' });
    }
  }
);

/**
 * GET /api/transformers/stats/summary
 * Statistiques globales des transformateurs
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const zones = await querySQLObjects(
      'SELECT DISTINCT ville FROM homes WHERE ville IS NOT NULL',
      [],
      ['ville']
    );

    let criticalCount = 0;
    let warningCount = 0;
    let normalCount = 0;
    let totalHealthScore = 0;

    for (const zone of zones) {
      // Simuler le score de santé
      const healthScore = 50 + Math.random() * 50;
      totalHealthScore += healthScore;

      if (healthScore < 50) criticalCount++;
      else if (healthScore < 70) warningCount++;
      else normalCount++;
    }

    const avgHealthScore = zones.length > 0 ? totalHealthScore / zones.length : 0;

    // Calculer les coûts
    const maintenanceCosts = await querySQLObjects(
      `SELECT COALESCE(SUM(cost), 0) as total_cost FROM transformer_maintenance
       WHERE performed_at >= NOW() - INTERVAL '1 year'`,
      [],
      ['total_cost']
    );

    res.json({
      summary: {
        totalTransformers: zones.length,
        critical: criticalCount,
        warning: warningCount,
        healthy: normalCount,
        avgHealthScore: Math.round(avgHealthScore),
        yearlyMaintenanceCost: parseInt(maintenanceCosts[0]?.total_cost) || 0,
        estimatedPreventiveCost: zones.length * 10000000, // 10M GNF par transformateur
        estimatedReplacementCost: zones.length * 500000000, // 500M GNF par transformateur
      },
    });
  } catch (error) {
    console.error('Erreur statistiques transformateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
