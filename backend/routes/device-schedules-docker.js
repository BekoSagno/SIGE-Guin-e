import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID } from '../services/sqlService.js';

const router = express.Router();

// Jours de la semaine
const DAYS_OF_WEEK = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
};

/**
 * GET /api/schedules
 * Récupérer tous les programmes d'un foyer
 */
router.get('/', authMiddleware, async (req, res) => {
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

    // Récupérer les programmes
    const schedules = await querySQLObjects(
      `SELECT s.*, u.nom as created_by_name
       FROM device_schedules s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.home_id = '${homeId}'
       ORDER BY s.start_time ASC`,
      [],
      ['id', 'home_id', 'device_id', 'device_source', 'device_name', 'schedule_type',
       'is_active', 'days_of_week', 'start_time', 'end_time', 'action',
       'applies_to_all', 'allowed_members', 'auto_detected', 'confidence_score',
       'usage_pattern', 'created_by', 'created_by_name', 'created_at', 'updated_at']
    );

    const formattedSchedules = schedules.map(s => ({
      id: s.id,
      homeId: s.home_id,
      deviceId: s.device_id,
      deviceSource: s.device_source,
      deviceName: s.device_name,
      scheduleType: s.schedule_type,
      isActive: s.is_active === 't' || s.is_active === true,
      daysOfWeek: s.days_of_week || [1, 2, 3, 4, 5, 6, 7],
      startTime: s.start_time,
      endTime: s.end_time,
      action: s.action,
      appliesToAll: s.applies_to_all === 't' || s.applies_to_all === true,
      allowedMembers: s.allowed_members || [],
      autoDetected: s.auto_detected === 't' || s.auto_detected === true,
      confidenceScore: parseFloat(s.confidence_score) || 0,
      usagePattern: s.usage_pattern,
      createdBy: s.created_by,
      createdByName: s.created_by_name,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    res.json({ schedules: formattedSchedules });
  } catch (error) {
    console.error('Erreur récupération programmes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/schedules
 * Créer un nouveau programme manuel
 */
// Regex pour valider un UUID (format standard)
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

router.post('/', authMiddleware, [
  body('homeId').matches(UUID_REGEX).withMessage('homeId doit être un UUID valide'),
  body('deviceId').matches(UUID_REGEX).withMessage('deviceId doit être un UUID valide'),
  body('deviceName').notEmpty().withMessage('deviceName est requis'),
  body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format heure invalide (HH:MM)'),
  body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format heure invalide (HH:MM)'),
  body('action').isIn(['ON', 'OFF']).withMessage('Action doit être ON ou OFF'),
], async (req, res) => {
  try {
    console.log('📝 Création programme - Body reçu:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Erreurs validation:', errors.array());
      return res.status(400).json({ errors: errors.array(), error: errors.array().map(e => e.msg).join(', ') });
    }

    const { 
      homeId, deviceId, deviceSource, deviceName, 
      daysOfWeek, startTime, endTime, action,
      appliesToAll, allowedMembers 
    } = req.body;
    const userId = req.user.id;

    // Vérifier l'accès (propriétaire ou ADMIN)
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
      if (members.length === 0 || (members[0].role !== 'ADMIN' && members[0].role !== 'MEMBER')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission de créer des programmes' });
      }
    }

    const scheduleId = generateUUID();
    const now = new Date().toISOString();
    const days = daysOfWeek || [1, 2, 3, 4, 5, 6, 7];
    const source = deviceSource || 'MANUAL';

    // Gérer le tableau allowedMembers (vide ou avec des valeurs)
    let allowedMembersSQL = 'NULL';
    if (allowedMembers && allowedMembers.length > 0) {
      allowedMembersSQL = `ARRAY[${allowedMembers.map(m => `'${m}'`).join(',')}]::uuid[]`;
    }

    await executeSQL(
      `INSERT INTO device_schedules 
       (id, home_id, device_id, device_source, device_name, schedule_type, 
        days_of_week, start_time, end_time, action, applies_to_all, 
        allowed_members, created_by, created_at, updated_at)
       VALUES 
       ('${scheduleId}', '${homeId}', '${deviceId}', '${source}', '${deviceName.replace(/'/g, "''")}', 
        'MANUAL', ARRAY[${days.join(',')}]::integer[], '${startTime}', '${endTime}', '${action}', 
        ${appliesToAll !== false}, ${allowedMembersSQL}, 
        '${userId}', '${now}', '${now}')`,
      []
    );

    console.log(`📅 Programme créé: ${deviceName} ${action} de ${startTime} à ${endTime} par ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Programme créé avec succès',
      schedule: {
        id: scheduleId,
        homeId,
        deviceId,
        deviceName,
        daysOfWeek: days,
        startTime,
        endTime,
        action,
      },
    });
  } catch (error) {
    console.error('Erreur création programme:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

/**
 * PUT /api/schedules/:id
 * Modifier un programme
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      daysOfWeek, startTime, endTime, action, 
      isActive, appliesToAll, allowedMembers 
    } = req.body;
    const userId = req.user.id;

    // Vérifier que le programme existe et appartient à un foyer accessible
    const schedules = await querySQLObjects(
      `SELECT s.*, h.proprietaire_id 
       FROM device_schedules s
       JOIN homes h ON s.home_id = h.id
       WHERE s.id = '${id}'`,
      [],
      ['id', 'home_id', 'proprietaire_id', 'created_by']
    );

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Programme non trouvé' });
    }

    const schedule = schedules[0];
    const isOwner = schedule.proprietaire_id === userId;
    const isCreator = schedule.created_by === userId;

    if (!isOwner && !isCreator) {
      const members = await querySQLObjects(
        `SELECT role FROM home_members WHERE home_id = '${schedule.home_id}' AND user_id = '${userId}'`,
        [],
        ['role']
      );
      if (members.length === 0 || members[0].role !== 'ADMIN') {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier ce programme' });
      }
    }

    const now = new Date().toISOString();
    let updates = [`updated_at = '${now}'`];

    if (daysOfWeek) updates.push(`days_of_week = ARRAY[${daysOfWeek.join(',')}]`);
    if (startTime) updates.push(`start_time = '${startTime}'`);
    if (endTime) updates.push(`end_time = '${endTime}'`);
    if (action) updates.push(`action = '${action}'`);
    if (isActive !== undefined) updates.push(`is_active = ${isActive}`);
    if (appliesToAll !== undefined) updates.push(`applies_to_all = ${appliesToAll}`);
    if (allowedMembers) updates.push(`allowed_members = ARRAY[${allowedMembers.map(m => `'${m}'`).join(',')}]`);

    await executeSQL(
      `UPDATE device_schedules SET ${updates.join(', ')} WHERE id = '${id}'`,
      []
    );

    res.json({
      success: true,
      message: 'Programme mis à jour',
    });
  } catch (error) {
    console.error('Erreur modification programme:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

/**
 * DELETE /api/schedules/:id
 * Supprimer un programme
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier les permissions
    const schedules = await querySQLObjects(
      `SELECT s.*, h.proprietaire_id 
       FROM device_schedules s
       JOIN homes h ON s.home_id = h.id
       WHERE s.id = '${id}'`,
      [],
      ['id', 'home_id', 'proprietaire_id', 'created_by']
    );

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Programme non trouvé' });
    }

    const schedule = schedules[0];
    const isOwner = schedule.proprietaire_id === userId;
    const isCreator = schedule.created_by === userId;

    if (!isOwner && !isCreator) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer ce programme' });
    }

    await executeSQL(`DELETE FROM device_schedules WHERE id = '${id}'`, []);

    res.json({
      success: true,
      message: 'Programme supprimé',
    });
  } catch (error) {
    console.error('Erreur suppression programme:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

/**
 * POST /api/schedules/:id/toggle
 * Activer/désactiver un programme
 */
router.post('/:id/toggle', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const schedules = await querySQLObjects(
      `SELECT s.is_active, h.proprietaire_id, s.home_id
       FROM device_schedules s
       JOIN homes h ON s.home_id = h.id
       WHERE s.id = '${id}'`,
      [],
      ['is_active', 'proprietaire_id', 'home_id']
    );

    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Programme non trouvé' });
    }

    const schedule = schedules[0];
    const isOwner = schedule.proprietaire_id === userId;

    if (!isOwner) {
      const members = await querySQLObjects(
        `SELECT role FROM home_members WHERE home_id = '${schedule.home_id}' AND user_id = '${userId}'`,
        [],
        ['role']
      );
      if (members.length === 0 || (members[0].role !== 'ADMIN' && members[0].role !== 'MEMBER')) {
        return res.status(403).json({ error: 'Permission refusée' });
      }
    }

    const currentState = schedule.is_active === 't' || schedule.is_active === true;
    const newState = !currentState;
    const now = new Date().toISOString();

    await executeSQL(
      `UPDATE device_schedules SET is_active = ${newState}, updated_at = '${now}' WHERE id = '${id}'`,
      []
    );

    res.json({
      success: true,
      isActive: newState,
      message: newState ? 'Programme activé' : 'Programme désactivé',
    });
  } catch (error) {
    console.error('Erreur toggle programme:', error);
    res.status(500).json({ error: 'Erreur lors de la modification' });
  }
});

/**
 * GET /api/schedules/ai-suggestions
 * Récupérer les suggestions IA basées sur l'historique d'utilisation
 */
router.get('/ai-suggestions', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.query;
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

    // Récupérer les suggestions existantes
    const suggestions = await querySQLObjects(
      `SELECT * FROM device_ai_suggestions 
       WHERE home_id = '${homeId}' AND status = 'PENDING'
       ORDER BY confidence_score DESC`,
      [],
      ['id', 'device_id', 'device_name', 'suggestion_type', 'title', 'description',
       'suggested_schedule', 'potential_saving_percent', 'confidence_score', 'created_at']
    );

    // Si pas de suggestions, en générer automatiquement
    if (suggestions.length === 0) {
      const generatedSuggestions = await generateAISuggestions(homeId);
      return res.json({ suggestions: generatedSuggestions });
    }

    const formattedSuggestions = suggestions.map(s => ({
      id: s.id,
      deviceId: s.device_id,
      deviceName: s.device_name,
      suggestionType: s.suggestion_type,
      title: s.title,
      description: s.description,
      suggestedSchedule: s.suggested_schedule,
      potentialSavingPercent: parseInt(s.potential_saving_percent) || 0,
      confidenceScore: parseFloat(s.confidence_score) || 0,
      createdAt: s.created_at,
    }));

    res.json({ suggestions: formattedSuggestions });
  } catch (error) {
    console.error('Erreur suggestions IA:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/schedules/ai-suggestions/:id/accept
 * Accepter une suggestion IA et créer le programme
 */
router.post('/ai-suggestions/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const suggestions = await querySQLObjects(
      `SELECT s.*, h.proprietaire_id 
       FROM device_ai_suggestions s
       JOIN homes h ON s.home_id = h.id
       WHERE s.id = '${id}'`,
      [],
      ['id', 'home_id', 'device_id', 'device_name', 'suggested_schedule', 'proprietaire_id']
    );

    if (suggestions.length === 0) {
      return res.status(404).json({ error: 'Suggestion non trouvée' });
    }

    const suggestion = suggestions[0];
    const schedule = suggestion.suggested_schedule;
    const now = new Date().toISOString();

    // Créer le programme basé sur la suggestion
    const scheduleId = generateUUID();
    await executeSQL(
      `INSERT INTO device_schedules 
       (id, home_id, device_id, device_source, device_name, schedule_type, 
        days_of_week, start_time, end_time, action, auto_detected, 
        confidence_score, created_by, created_at, updated_at)
       VALUES 
       ('${scheduleId}', '${suggestion.home_id}', '${suggestion.device_id}', 'NILM', 
        '${suggestion.device_name.replace(/'/g, "''")}', 'AUTO', 
        ARRAY[${(schedule.daysOfWeek || [1,2,3,4,5,6,7]).join(',')}], 
        '${schedule.startTime || '08:00'}', '${schedule.endTime || '22:00'}', 
        '${schedule.action || 'OFF'}', true, ${suggestion.confidence_score || 0.8}, 
        '${userId}', '${now}', '${now}')`,
      []
    );

    // Marquer la suggestion comme acceptée
    await executeSQL(
      `UPDATE device_ai_suggestions SET status = 'ACCEPTED', reviewed_at = '${now}' WHERE id = '${id}'`,
      []
    );

    console.log(`🤖 Suggestion IA acceptée: ${suggestion.device_name} par ${userId}`);

    res.json({
      success: true,
      message: 'Suggestion acceptée et programme créé',
      scheduleId,
    });
  } catch (error) {
    console.error('Erreur acceptation suggestion:', error);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation' });
  }
});

/**
 * POST /api/schedules/ai-suggestions/:id/reject
 * Rejeter une suggestion IA
 */
router.post('/ai-suggestions/:id/reject', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    await executeSQL(
      `UPDATE device_ai_suggestions SET status = 'REJECTED', reviewed_at = '${now}' WHERE id = '${id}'`,
      []
    );

    res.json({
      success: true,
      message: 'Suggestion rejetée',
    });
  } catch (error) {
    console.error('Erreur rejet suggestion:', error);
    res.status(500).json({ error: 'Erreur lors du rejet' });
  }
});

/**
 * POST /api/schedules/log-usage
 * Logger l'utilisation d'un appareil (pour l'apprentissage IA)
 */
router.post('/log-usage', authMiddleware, async (req, res) => {
  try {
    const { homeId, deviceId, deviceSource, action, durationMinutes, wasUseful } = req.body;
    const userId = req.user.id;
    const now = new Date();

    const logId = generateUUID();
    await executeSQL(
      `INSERT INTO device_usage_history 
       (id, home_id, device_id, device_source, action, triggered_by, 
        day_of_week, hour_of_day, duration_minutes, was_useful, created_at)
       VALUES 
       ('${logId}', '${homeId}', '${deviceId}', '${deviceSource}', '${action}', 
        'USER', ${now.getDay() || 7}, ${now.getHours()}, ${durationMinutes || 0}, 
        ${wasUseful !== false}, '${now.toISOString()}')`,
      []
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur log utilisation:', error);
    res.status(500).json({ error: 'Erreur lors du log' });
  }
});

/**
 * Fonction interne: Générer des suggestions IA basées sur les appareils et patterns
 * Note: On retourne les suggestions en mémoire sans les persister en BD pour éviter les problèmes JSON
 */
async function generateAISuggestions(homeId) {
  const suggestions = [];

  try {
    // Récupérer les appareils du foyer
    const meters = await querySQLObjects(
      `SELECT id FROM meters WHERE home_id = '${homeId}'`,
      [],
      ['id']
    );

    let devices = [];
    
    // Appareils NILM
    if (meters.length > 0) {
      const meterId = meters[0].id;
      const nilmDevices = await querySQLObjects(
        `SELECT id, device_name, device_type, power_signature FROM nilm_signatures WHERE meter_id = '${meterId}' AND is_active = true`,
        [],
        ['id', 'device_name', 'device_type', 'power_signature']
      );
      devices = [...devices, ...nilmDevices.map(d => ({ ...d, source: 'NILM' }))];
    }

    // Appareils manuels
    const manualDevices = await querySQLObjects(
      `SELECT id, name as device_name, type as device_type, power_rating as power_signature FROM device_inventory WHERE home_id = '${homeId}'`,
      [],
      ['id', 'device_name', 'device_type', 'power_signature']
    );
    devices = [...devices, ...manualDevices.map(d => ({ ...d, source: 'MANUAL' }))];

    // Générer des suggestions basées sur le type d'appareil (en mémoire seulement)
    for (const device of devices) {
      const type = device.device_type?.toUpperCase();
      const power = parseFloat(device.power_signature) || 100;

      // Suggestion pour climatiseurs
      if (type === 'CLIM') {
        suggestions.push({
          id: generateUUID(),
          deviceId: device.id,
          deviceName: device.device_name,
          suggestionType: 'SCHEDULE_OPTIMIZATION',
          title: 'Programmer le climatiseur',
          description: `Le climatiseur consomme ${power}W. L'IA suggère de le programmer uniquement pendant les heures de présence pour économiser jusqu'à 25% d'énergie.`,
          suggestedSchedule: { daysOfWeek: [1,2,3,4,5,6,7], startTime: '12:00', endTime: '22:00', action: 'ON' },
          potentialSavingPercent: 25,
          confidenceScore: 0.85,
        });
      }

      // Suggestion pour chauffe-eau
      if (type === 'CHAUFFE_EAU') {
        suggestions.push({
          id: generateUUID(),
          deviceId: device.id,
          deviceName: device.device_name,
          suggestionType: 'USAGE_REDUCTION',
          title: 'Optimiser le chauffe-eau',
          description: `Le chauffe-eau (${power}W) peut être programmé pour chauffer uniquement le matin et le soir, réduisant la consommation de 30%.`,
          suggestedSchedule: { daysOfWeek: [1,2,3,4,5,6,7], startTime: '05:00', endTime: '07:00', action: 'ON' },
          potentialSavingPercent: 30,
          confidenceScore: 0.90,
        });
      }

      // Suggestion pour TV la nuit
      if (type === 'TV') {
        suggestions.push({
          id: generateUUID(),
          deviceId: device.id,
          deviceName: device.device_name,
          suggestionType: 'NIGHT_SHUTDOWN',
          title: 'Éteindre la TV la nuit',
          description: `L'IA détecte que la TV reste parfois allumée la nuit. Programmer son extinction automatique après 23h pourrait économiser 10%.`,
          suggestedSchedule: { daysOfWeek: [1,2,3,4,5,6,7], startTime: '23:00', endTime: '06:00', action: 'OFF' },
          potentialSavingPercent: 10,
          confidenceScore: 0.75,
        });
      }

      // Suggestion pour réfrigérateur - Repos thermique
      if (type === 'FRIGO') {
        suggestions.push({
          id: generateUUID(),
          deviceId: device.id,
          deviceName: device.device_name,
          suggestionType: 'THERMAL_REST',
          title: 'Activer le repos thermique',
          description: `Le réfrigérateur (${power}W) peut bénéficier du repos thermique intelligent pour économiser 15-20% sans affecter la conservation des aliments.`,
          suggestedSchedule: { daysOfWeek: [1,2,3,4,5,6,7], startTime: '00:00', endTime: '23:59', action: 'THERMAL_REST' },
          potentialSavingPercent: 18,
          confidenceScore: 0.92,
        });
      }

      // Suggestion pour ventilateur
      if (type === 'VENTILATEUR') {
        suggestions.push({
          id: generateUUID(),
          deviceId: device.id,
          deviceName: device.device_name,
          suggestionType: 'SCHEDULE_OPTIMIZATION',
          title: 'Programmer le ventilateur',
          description: `Le ventilateur peut être programmé pour fonctionner uniquement la nuit, économisant jusqu'à 40% d'énergie.`,
          suggestedSchedule: { daysOfWeek: [1,2,3,4,5,6,7], startTime: '21:00', endTime: '07:00', action: 'ON' },
          potentialSavingPercent: 40,
          confidenceScore: 0.88,
        });
      }

      // Suggestion générale pour appareils énergivores
      if (power > 500 && !['CLIM', 'CHAUFFE_EAU', 'TV', 'FRIGO', 'VENTILATEUR'].includes(type)) {
        suggestions.push({
          id: generateUUID(),
          deviceId: device.id,
          deviceName: device.device_name,
          suggestionType: 'POWER_MANAGEMENT',
          title: `Gérer ${device.device_name}`,
          description: `Cet appareil consomme ${power}W. L'IA suggère de programmer son utilisation pendant les heures creuses.`,
          suggestedSchedule: { daysOfWeek: [1,2,3,4,5,6,7], startTime: '06:00', endTime: '18:00', action: 'ON' },
          potentialSavingPercent: 15,
          confidenceScore: 0.70,
        });
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Erreur génération suggestions:', error);
    return [];
  }
}

export default router;
