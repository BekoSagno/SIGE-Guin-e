import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID } from '../services/sqlService.js';

const router = express.Router();

// Constantes de priorité
const PRIORITY_LEVELS = {
  VITAL: 'VITAL',      // Niveau 1 - Maintenu en priorité
  COMFORT: 'COMFORT',  // Niveau 2 - Réduit après 22h
  LUXURY: 'LUXURY',    // Niveau 3 - Coupé ou limité
};

// Coût moyen par kWh en GNF
const COST_PER_KWH = 850;

/**
 * GET /api/economy-mode/settings
 * Récupérer les paramètres du mode économie pour un foyer
 */
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;
    const userId = req.user.id;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier l'accès au foyer
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    // Récupérer les paramètres
    let settings = await querySQLObjects(
      `SELECT * FROM economy_mode_settings WHERE home_id = '${homeId}'`,
      [],
      ['id', 'home_id', 'is_active', 'trigger_type', 'budget_threshold', 
       'priority_vital', 'priority_comfort', 'priority_luxury',
       'thermal_rest_enabled', 'thermal_rest_duration_minutes',
       'source_optimization_enabled', 'solar_priority', 'edg_min_battery_percent',
       'night_mode_enabled', 'night_mode_start', 'night_mode_end',
       'created_at', 'updated_at']
    );

    // Créer les paramètres par défaut si inexistants
    if (settings.length === 0) {
      const settingsId = generateUUID();
      const now = new Date().toISOString();
      
      await executeSQL(
        `INSERT INTO economy_mode_settings (id, home_id, created_at, updated_at) 
         VALUES ('${settingsId}', '${homeId}', '${now}', '${now}')`,
        []
      );

      settings = await querySQLObjects(
        `SELECT * FROM economy_mode_settings WHERE home_id = '${homeId}'`,
        [],
        ['id', 'home_id', 'is_active', 'trigger_type', 'budget_threshold', 
         'priority_vital', 'priority_comfort', 'priority_luxury',
         'thermal_rest_enabled', 'thermal_rest_duration_minutes',
         'source_optimization_enabled', 'solar_priority', 'edg_min_battery_percent',
         'night_mode_enabled', 'night_mode_start', 'night_mode_end',
         'created_at', 'updated_at']
      );
    }

    const setting = settings[0];

    // Formater la réponse
    res.json({
      id: setting.id,
      homeId: setting.home_id,
      isActive: setting.is_active === 't' || setting.is_active === true,
      triggerType: setting.trigger_type || 'MANUAL',
      budgetThreshold: parseFloat(setting.budget_threshold) || 10000,
      priorities: {
        vital: setting.priority_vital || ['AMPOULE', 'ROUTEUR', 'VENTILATEUR'],
        comfort: setting.priority_comfort || ['TV', 'TELEPHONE', 'RADIO'],
        luxury: setting.priority_luxury || ['CLIM', 'CHAUFFE_EAU', 'FER_A_REPASSER'],
      },
      thermalRest: {
        enabled: setting.thermal_rest_enabled === 't' || setting.thermal_rest_enabled === true,
        durationMinutes: parseInt(setting.thermal_rest_duration_minutes) || 15,
      },
      sourceOptimization: {
        enabled: setting.source_optimization_enabled === 't' || setting.source_optimization_enabled === true,
        solarPriority: setting.solar_priority === 't' || setting.solar_priority === true,
        edgMinBatteryPercent: parseInt(setting.edg_min_battery_percent) || 20,
      },
      nightMode: {
        enabled: setting.night_mode_enabled === 't' || setting.night_mode_enabled === true,
        start: setting.night_mode_start || '22:00',
        end: setting.night_mode_end || '06:00',
      },
      updatedAt: setting.updated_at,
    });
  } catch (error) {
    console.error('Erreur récupération paramètres mode économie:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/economy-mode/toggle
 * Activer/désactiver le mode économie
 */
router.post('/toggle', authMiddleware, async (req, res) => {
  try {
    const { homeId, enabled, triggerType } = req.body;
    const userId = req.user.id;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier l'accès (propriétaire ou ADMIN uniquement)
    const homes = await querySQLObjects(
      `SELECT h.id, h.proprietaire_id FROM homes h WHERE h.id = '${homeId}'`,
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
        return res.status(403).json({ error: 'Seul un administrateur peut modifier le mode économie' });
      }
    }

    const now = new Date().toISOString();
    const trigger = triggerType || 'MANUAL';

    // Mettre à jour ou créer les paramètres
    const existing = await querySQLObjects(
      `SELECT id FROM economy_mode_settings WHERE home_id = '${homeId}'`,
      [],
      ['id']
    );

    if (existing.length === 0) {
      const settingsId = generateUUID();
      await executeSQL(
        `INSERT INTO economy_mode_settings (id, home_id, is_active, trigger_type, created_at, updated_at) 
         VALUES ('${settingsId}', '${homeId}', ${enabled}, '${trigger}', '${now}', '${now}')`,
        []
      );
    } else {
      await executeSQL(
        `UPDATE economy_mode_settings SET is_active = ${enabled}, trigger_type = '${trigger}', updated_at = '${now}' WHERE home_id = '${homeId}'`,
        []
      );
    }

    // Logger l'événement
    const logId = generateUUID();
    await executeSQL(
      `INSERT INTO economy_mode_logs (id, home_id, event_type, action, created_at) 
       VALUES ('${logId}', '${homeId}', 'MODE_TOGGLE', '${enabled ? 'ACTIVATED' : 'DEACTIVATED'}', '${now}')`,
      []
    );

    // Si activé, appliquer les règles
    if (enabled) {
      await applyEconomyRules(homeId, userId);
    }

    console.log(`🔋 Mode Économie ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'} pour foyer ${homeId}`);

    res.json({
      success: true,
      isActive: enabled,
      message: enabled ? 'Mode économie activé' : 'Mode économie désactivé',
    });
  } catch (error) {
    console.error('Erreur toggle mode économie:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

/**
 * PUT /api/economy-mode/settings
 * Mettre à jour les paramètres du mode économie
 */
router.put('/settings', authMiddleware, [
  body('homeId').isUUID(),
  body('budgetThreshold').optional().isFloat({ min: 0 }),
  body('thermalRestDuration').optional().isInt({ min: 5, max: 60 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      homeId, 
      budgetThreshold, 
      triggerType,
      priorities,
      thermalRest,
      sourceOptimization,
      nightMode 
    } = req.body;
    const userId = req.user.id;

    // Vérifier l'accès
    const homes = await querySQLObjects(
      `SELECT h.id, h.proprietaire_id FROM homes h WHERE h.id = '${homeId}'`,
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
        return res.status(403).json({ error: 'Seul un administrateur peut modifier les paramètres' });
      }
    }

    const now = new Date().toISOString();
    
    // Construire la requête de mise à jour dynamiquement
    let updates = [`updated_at = '${now}'`];
    
    if (budgetThreshold !== undefined) {
      updates.push(`budget_threshold = ${budgetThreshold}`);
    }
    if (triggerType) {
      updates.push(`trigger_type = '${triggerType}'`);
    }
    if (priorities?.vital) {
      updates.push(`priority_vital = ARRAY[${priorities.vital.map(v => `'${v}'`).join(',')}]`);
    }
    if (priorities?.comfort) {
      updates.push(`priority_comfort = ARRAY[${priorities.comfort.map(v => `'${v}'`).join(',')}]`);
    }
    if (priorities?.luxury) {
      updates.push(`priority_luxury = ARRAY[${priorities.luxury.map(v => `'${v}'`).join(',')}]`);
    }
    if (thermalRest?.enabled !== undefined) {
      updates.push(`thermal_rest_enabled = ${thermalRest.enabled}`);
    }
    if (thermalRest?.durationMinutes) {
      updates.push(`thermal_rest_duration_minutes = ${thermalRest.durationMinutes}`);
    }
    if (sourceOptimization?.enabled !== undefined) {
      updates.push(`source_optimization_enabled = ${sourceOptimization.enabled}`);
    }
    if (sourceOptimization?.solarPriority !== undefined) {
      updates.push(`solar_priority = ${sourceOptimization.solarPriority}`);
    }
    if (sourceOptimization?.edgMinBatteryPercent !== undefined) {
      updates.push(`edg_min_battery_percent = ${sourceOptimization.edgMinBatteryPercent}`);
    }
    if (nightMode?.enabled !== undefined) {
      updates.push(`night_mode_enabled = ${nightMode.enabled}`);
    }
    if (nightMode?.start) {
      updates.push(`night_mode_start = '${nightMode.start}'`);
    }
    if (nightMode?.end) {
      updates.push(`night_mode_end = '${nightMode.end}'`);
    }

    await executeSQL(
      `UPDATE economy_mode_settings SET ${updates.join(', ')} WHERE home_id = '${homeId}'`,
      []
    );

    res.json({
      success: true,
      message: 'Paramètres mis à jour',
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * POST /api/economy-mode/device-priority
 * Définir la priorité d'un appareil
 */
router.post('/device-priority', authMiddleware, [
  body('deviceId').isUUID(),
  body('homeId').isUUID(),
  body('priorityLevel').isIn(['VITAL', 'COMFORT', 'LUXURY']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { deviceId, homeId, priorityLevel, source } = req.body;
    const userId = req.user.id;
    const now = new Date().toISOString();

    // Vérifier l'accès
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Mettre à jour selon la source (NILM ou MANUAL)
    if (source === 'NILM') {
      await executeSQL(
        `UPDATE nilm_signatures SET priority_level = '${priorityLevel}' WHERE id = '${deviceId}'`,
        []
      );
    } else {
      await executeSQL(
        `UPDATE device_inventory SET priority_level = '${priorityLevel}', updated_at = '${now}' WHERE id = '${deviceId}'`,
        []
      );
    }

    res.json({
      success: true,
      message: `Priorité de l'appareil définie sur ${priorityLevel}`,
    });
  } catch (error) {
    console.error('Erreur définition priorité:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

/**
 * GET /api/economy-mode/stats
 * Récupérer les statistiques d'économie
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { homeId, period } = req.query;
    const userId = req.user.id;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier l'accès
    const homes = await querySQLObjects(
      `SELECT id FROM homes WHERE id = '${homeId}' AND (proprietaire_id = '${userId}' OR id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Calculer la période
    let startDate;
    const now = new Date();
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Récupérer les logs
    const logs = await querySQLObjects(
      `SELECT event_type, action, energy_saved_wh, cost_saved_gnf, created_at 
       FROM economy_mode_logs 
       WHERE home_id = '${homeId}' AND created_at >= '${startDate.toISOString()}'
       ORDER BY created_at DESC`,
      [],
      ['event_type', 'action', 'energy_saved_wh', 'cost_saved_gnf', 'created_at']
    );

    // Calculer les totaux
    const totalEnergySaved = logs.reduce((sum, l) => sum + (parseFloat(l.energy_saved_wh) || 0), 0);
    const totalCostSaved = logs.reduce((sum, l) => sum + (parseFloat(l.cost_saved_gnf) || 0), 0);
    
    // Compter les actions
    const thermalRestCycles = logs.filter(l => l.event_type === 'THERMAL_REST').length;
    const luxuryBlocked = logs.filter(l => l.event_type === 'LUXURY_BLOCKED').length;
    const sourceOptimizations = logs.filter(l => l.event_type === 'SOURCE_SWITCH').length;

    // Récupérer le solde actuel
    const financials = await querySQLObjects(
      `SELECT balance FROM financials WHERE home_id = '${homeId}'`,
      [],
      ['balance']
    );
    const currentBalance = financials.length > 0 ? parseFloat(financials[0].balance) : 0;

    // Estimer les jours gagnés
    const avgDailyConsumption = totalEnergySaved > 0 ? (totalEnergySaved / 7) * COST_PER_KWH / 1000 : 500;
    const daysGained = totalCostSaved > 0 ? Math.floor(totalCostSaved / avgDailyConsumption) : 0;

    res.json({
      period: period || 'week',
      totalEnergySavedWh: totalEnergySaved,
      totalEnergySavedKWh: totalEnergySaved / 1000,
      totalCostSavedGNF: totalCostSaved,
      daysGained,
      currentBalance,
      actions: {
        thermalRestCycles,
        luxuryBlocked,
        sourceOptimizations,
        total: logs.length,
      },
      breakdown: {
        thermalRest: {
          energySaved: totalEnergySaved * 0.4,
          costSaved: totalCostSaved * 0.4,
          percentage: 40,
        },
        priorityArbitrage: {
          energySaved: totalEnergySaved * 0.35,
          costSaved: totalCostSaved * 0.35,
          percentage: 35,
        },
        sourceOptimization: {
          energySaved: totalEnergySaved * 0.25,
          costSaved: totalCostSaved * 0.25,
          percentage: 25,
        },
      },
      recentLogs: logs.slice(0, 10).map(l => ({
        eventType: l.event_type,
        action: l.action,
        energySaved: parseFloat(l.energy_saved_wh) || 0,
        costSaved: parseFloat(l.cost_saved_gnf) || 0,
        createdAt: l.created_at,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/economy-mode/recommendations
 * Obtenir des recommandations IA pour économiser
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;
    const userId = req.user.id;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier l'accès
    const homes = await querySQLObjects(
      `SELECT h.id, h.type_energie, f.balance 
       FROM homes h 
       LEFT JOIN financials f ON f.home_id = h.id
       WHERE h.id = '${homeId}' AND (h.proprietaire_id = '${userId}' OR h.id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id', 'type_energie', 'balance']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const home = homes[0];
    const balance = parseFloat(home.balance) || 0;
    const isHybrid = home.type_energie === 'HYBRIDE';

    // Récupérer les appareils
    const meters = await querySQLObjects(
      `SELECT id FROM meters WHERE home_id = '${homeId}'`,
      [],
      ['id']
    );

    let devices = [];
    if (meters.length > 0) {
      const meterId = meters[0].id;
      const nilmDevices = await querySQLObjects(
        `SELECT device_name, device_type, power_signature, is_active FROM nilm_signatures WHERE meter_id = '${meterId}'`,
        [],
        ['device_name', 'device_type', 'power_signature', 'is_active']
      );
      devices = nilmDevices;
    }

    const manualDevices = await querySQLObjects(
      `SELECT name, type, power_rating, is_on FROM device_inventory WHERE home_id = '${homeId}'`,
      [],
      ['name', 'type', 'power_rating', 'is_on']
    );

    // Générer les recommandations
    const recommendations = [];

    // Recommandation budget
    if (balance < 20000) {
      recommendations.push({
        type: 'BUDGET_ALERT',
        priority: 'HIGH',
        title: 'Budget critique',
        description: `Votre solde est de ${balance.toLocaleString()} GNF. Activez le mode économie pour préserver votre crédit.`,
        estimatedSaving: '15-25%',
        action: 'ACTIVATE_ECONOMY_MODE',
      });
    }

    // Recommandation climatiseur
    const hasClim = devices.some(d => d.device_type === 'CLIM' && (d.is_active === 't' || d.is_active === true));
    if (hasClim) {
      recommendations.push({
        type: 'THERMAL_REST',
        priority: 'MEDIUM',
        title: 'Optimiser le climatiseur',
        description: 'Activez le repos thermique pour votre climatiseur. Il maintiendra la fraîcheur tout en réduisant la consommation de 15-20%.',
        estimatedSaving: '15-20%',
        action: 'ENABLE_THERMAL_REST',
        deviceType: 'CLIM',
      });
    }

    // Recommandation réfrigérateur
    const hasFrigo = devices.some(d => d.device_type === 'FRIGO');
    if (hasFrigo) {
      recommendations.push({
        type: 'THERMAL_REST',
        priority: 'LOW',
        title: 'Optimiser le réfrigérateur',
        description: 'Le repos thermique intelligent peut réduire la consommation de votre réfrigérateur de 15% sans affecter la chaîne du froid.',
        estimatedSaving: '15%',
        action: 'ENABLE_THERMAL_REST',
        deviceType: 'FRIGO',
      });
    }

    // Recommandation source hybride
    if (isHybrid) {
      recommendations.push({
        type: 'SOURCE_OPTIMIZATION',
        priority: 'MEDIUM',
        title: 'Optimiser les sources',
        description: 'Votre installation hybride peut prioriser le solaire pour réduire jusqu\'à 40% de votre facture EDG.',
        estimatedSaving: '30-40%',
        action: 'ENABLE_SOURCE_OPTIMIZATION',
      });
    }

    // Recommandation mode nuit
    const hour = new Date().getHours();
    if (hour >= 20 || hour < 6) {
      recommendations.push({
        type: 'NIGHT_MODE',
        priority: 'LOW',
        title: 'Mode nuit disponible',
        description: 'Activez le mode nuit pour limiter automatiquement les appareils de confort après 22h.',
        estimatedSaving: '10%',
        action: 'ENABLE_NIGHT_MODE',
      });
    }

    res.json({
      homeId,
      balance,
      isHybrid,
      deviceCount: devices.length + manualDevices.length,
      recommendations: recommendations.sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
    });
  } catch (error) {
    console.error('Erreur recommandations:', error);
    res.status(500).json({ error: 'Erreur lors de la génération' });
  }
});

/**
 * Fonction interne : Appliquer les règles du mode économie
 */
async function applyEconomyRules(homeId, userId) {
  try {
    // Récupérer les paramètres
    const settings = await querySQLObjects(
      `SELECT * FROM economy_mode_settings WHERE home_id = '${homeId}'`,
      [],
      ['priority_vital', 'priority_comfort', 'priority_luxury', 
       'thermal_rest_enabled', 'night_mode_enabled', 'night_mode_start', 'night_mode_end']
    );

    if (settings.length === 0) return;

    const setting = settings[0];
    const now = new Date();
    const hour = now.getHours();

    // Vérifier le mode nuit
    const nightModeEnabled = setting.night_mode_enabled === 't' || setting.night_mode_enabled === true;
    const nightStart = parseInt(setting.night_mode_start?.split(':')[0]) || 22;
    const nightEnd = parseInt(setting.night_mode_end?.split(':')[0]) || 6;
    const isNightTime = hour >= nightStart || hour < nightEnd;

    // Si mode nuit actif, limiter les appareils de confort
    if (nightModeEnabled && isNightTime) {
      console.log(`🌙 Mode nuit actif pour foyer ${homeId} - Limitation des appareils de confort`);
      
      // Logger l'événement
      const logId = generateUUID();
      await executeSQL(
        `INSERT INTO economy_mode_logs (id, home_id, event_type, action, details, created_at) 
         VALUES ('${logId}', '${homeId}', 'NIGHT_MODE', 'ACTIVATED', '{"hour": ${hour}}', '${now.toISOString()}')`,
        []
      );
    }

    console.log(`⚡ Règles du mode économie appliquées pour foyer ${homeId}`);
  } catch (error) {
    console.error('Erreur application règles économie:', error);
  }
}

export default router;
