import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate, countSQL } from '../services/sqlService.js';
import websocketService from '../services/websocketService.js';
import { uploadPhoto, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Vérifier les permissions RBAC
 */
async function checkPermission(user, permissionName) {
  const permissions = await querySQLObjects(
    `SELECT rp.granted
     FROM role_permissions rp
     JOIN edg_permissions ep ON rp.permission_id = ep.id
     WHERE rp.role = $1 
     AND (rp.edg_subrole = $2 OR rp.edg_subrole IS NULL)
     AND ep.permission_name = $3
     AND rp.granted = TRUE`,
    [user.role, user.edg_subrole || null, permissionName],
    ['granted']
  );
  
  return permissions.length > 0;
}

/**
 * Enregistrer une action dans les audit logs
 */
async function logAuditAction(userId, actionType, resourceType, resourceId, description, metadata = {}) {
  const auditId = generateUUID();
  await executeSQL(
    `INSERT INTO audit_logs 
     (id, user_id, action_type, resource_type, resource_id, description, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      auditId,
      userId,
      actionType,
      resourceType,
      resourceId,
      description,
      JSON.stringify(metadata),
      formatDate(new Date())
    ]
  ).catch(err => console.error('Erreur audit log:', err));
}

/**
 * GET /api/tasks
 * Liste les tâches (selon les permissions)
 */
router.get('/', async (req, res) => {
  try {
    const hasViewAll = await checkPermission(req.user, 'task.view_all');
    
    let query = `
      SELECT t.id, t.task_number, t.task_type, t.priority, t.status,
             t.location_lat, t.location_lng, t.location_address,
             t.description, t.assigned_at, t.accepted_at, t.started_at, t.completed_at,
             t.estimated_duration, t.actual_duration, t.completion_photo_url, t.completion_report,
             t.created_at, t.updated_at,
             at.nom as assigned_to_nom, at.email as assigned_to_email,
             ab.nom as assigned_by_nom,
             i.id as incident_id, i.description as incident_description,
             a.id as audit_ticket_id, a.ticket_number as audit_ticket_number
      FROM assigned_tasks t
      LEFT JOIN users at ON t.assigned_to = at.id
      LEFT JOIN users ab ON t.assigned_by = ab.id
      LEFT JOIN incidents i ON t.incident_id = i.id
      LEFT JOIN audit_tickets a ON t.audit_ticket_id = a.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Filtres
    const { status, taskType, priority, assignedTo } = req.query;
    
    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (taskType) {
      query += ` AND t.task_type = $${paramIndex++}`;
      params.push(taskType);
    }
    
    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }
    
    // Permissions : si pas view_all, voir seulement ses tâches
    if (!hasViewAll) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(req.user.id);
    } else if (assignedTo) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(assignedTo);
    }
    
    query += ` ORDER BY 
      CASE t.priority 
        WHEN 'URGENT' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
      END,
      t.created_at DESC
      LIMIT 100`;
    
    const tasks = await querySQLObjects(query, params, [
      'id', 'task_number', 'task_type', 'priority', 'status',
      'location_lat', 'location_lng', 'location_address',
      'description', 'assigned_at', 'accepted_at', 'started_at', 'completed_at',
      'estimated_duration', 'actual_duration', 'completion_photo_url', 'completion_report',
      'created_at', 'updated_at',
      'assigned_to_nom', 'assigned_to_email',
      'assigned_by_nom',
      'incident_id', 'incident_description',
      'audit_ticket_id', 'audit_ticket_number'
    ]);
    
    const formatted = tasks.map(t => ({
      id: t.id,
      taskNumber: t.task_number,
      type: t.task_type,
      priority: t.priority,
      status: t.status,
      location: t.location_lat ? {
        lat: parseFloat(t.location_lat),
        lng: parseFloat(t.location_lng),
        address: t.location_address,
      } : null,
      description: t.description,
      assignedTo: t.assigned_to_nom ? {
        nom: t.assigned_to_nom,
        email: t.assigned_to_email,
      } : null,
      assignedBy: t.assigned_by_nom || null,
      assignedAt: t.assigned_at,
      acceptedAt: t.accepted_at,
      startedAt: t.started_at,
      completedAt: t.completed_at,
      estimatedDuration: t.estimated_duration ? parseInt(t.estimated_duration) : null,
      actualDuration: t.actual_duration ? parseInt(t.actual_duration) : null,
      completionPhoto: t.completion_photo_url,
      completionReport: t.completion_report,
      incident: t.incident_id ? {
        id: t.incident_id,
        description: t.incident_description,
      } : null,
      auditTicket: t.audit_ticket_id ? {
        id: t.audit_ticket_id,
        ticketNumber: t.audit_ticket_number,
      } : null,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
    
    res.json({ tasks: formatted });
  } catch (error) {
    console.error('Erreur récupération tâches:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/tasks
 * Créer et assigner une tâche (SUPERVISEUR uniquement)
 */
router.post(
  '/',
  [
    body('taskType').isIn(['INCIDENT', 'AUDIT', 'MAINTENANCE', 'INSPECTION']),
    body('priority').isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('assignedTo').isUUID(),
    body('description').trim().notEmpty(),
    body('locationLat').optional().isFloat(),
    body('locationLng').optional().isFloat(),
    body('locationAddress').optional().isString(),
    body('incidentId').optional().isUUID(),
    body('auditTicketId').optional().isUUID(),
    body('estimatedDuration').optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const hasAssign = await checkPermission(req.user, 'task.assign');
      if (!hasAssign) {
        return res.status(403).json({ error: 'Permission refusée. Seuls les superviseurs peuvent assigner des tâches.' });
      }
      
      const {
        taskType,
        priority,
        assignedTo,
        description,
        locationLat,
        locationLng,
        locationAddress,
        incidentId,
        auditTicketId,
        estimatedDuration,
      } = req.body;
      
      // Vérifier que l'agent assigné existe et est actif
      const agents = await querySQLObjects(
        'SELECT id, nom, status FROM users WHERE id = $1 AND role = $2 AND edg_subrole = $3',
        [assignedTo, 'AGENT_EDG', 'AGENT_TERRAIN'],
        ['id', 'nom', 'status']
      );
      
      if (agents.length === 0) {
        return res.status(404).json({ error: 'Agent non trouvé ou non éligible' });
      }
      
      if (agents[0].status !== 'ACTIVE') {
        return res.status(400).json({ error: 'L\'agent n\'est pas actif' });
      }
      
      // Créer la tâche
      const taskId = generateUUID();
      const taskNumber = `TASK-${Date.now().toString().slice(-8)}`;
      const now = formatDate(new Date());
      
      await executeSQL(
        `INSERT INTO assigned_tasks 
         (id, task_number, task_type, priority, status, assigned_to, assigned_by, assigned_at,
          incident_id, audit_ticket_id, description, location_lat, location_lng, location_address,
          estimated_duration, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          taskId,
          taskNumber,
          taskType,
          priority,
          'ASSIGNED',
          assignedTo,
          req.user.id,
          now,
          incidentId || null,
          auditTicketId || null,
          description,
          locationLat ? parseFloat(locationLat) : null,
          locationLng ? parseFloat(locationLng) : null,
          locationAddress || null,
          estimatedDuration || null,
          now,
          now
        ]
      );
      
      // Si c'est lié à un incident, mettre à jour l'incident
      if (incidentId) {
        await executeSQL(
          `UPDATE incidents 
           SET status = 'DISPATCHED', assigned_to = $1, assigned_at = $2, assigned_by = $3, updated_at = $4
           WHERE id = $5`,
          [assignedTo, now, req.user.id, now, incidentId]
        );
      }
      
      // Créer une notification pour l'agent
      const notificationId = generateUUID();
      await executeSQL(
        `INSERT INTO agent_notifications 
         (id, user_id, task_id, notification_type, title, message, priority, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          notificationId,
          assignedTo,
          taskId,
          'TASK_ASSIGNED',
          'Nouvelle tâche assignée',
          `Vous avez une nouvelle tâche ${taskType} à traiter: ${description}`,
          priority === 'URGENT' ? 'URGENT' : priority === 'HIGH' ? 'WARNING' : 'INFO',
          now
        ]
      );
      
      // Notifier l'agent via WebSocket
      await websocketService.sendToUser(assignedTo, {
        type: 'task_assigned',
        taskId,
        taskNumber,
        taskType,
        priority,
        description,
        location: locationLat ? { lat: parseFloat(locationLat), lng: parseFloat(locationLng) } : null,
        timestamp: new Date().toISOString(),
      });
      
      // Log audit
      await logAuditAction(
        req.user.id,
        'ASSIGN_TASK',
        'TASK',
        taskId,
        `Tâche ${taskNumber} assignée à ${agents[0].nom}`,
        { taskType, priority, assignedTo }
      );
      
      res.status(201).json({
        message: 'Tâche créée et assignée avec succès',
        task: {
          id: taskId,
          taskNumber,
          type: taskType,
          priority,
          status: 'ASSIGNED',
          assignedTo: {
            id: assignedTo,
            nom: agents[0].nom,
          },
        },
      });
    } catch (error) {
      console.error('Erreur création tâche:', error);
      res.status(500).json({ error: 'Erreur lors de la création' });
    }
  }
);

/**
 * PUT /api/tasks/:id/accept
 * Accepter une tâche (AGENT_TERRAIN uniquement)
 */
router.put('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tasks = await querySQLObjects(
      'SELECT id, assigned_to, status FROM assigned_tasks WHERE id = $1',
      [id],
      ['id', 'assigned_to', 'status']
    );
    
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    
    const task = tasks[0];
    
    // Vérifier que c'est bien l'agent assigné
    if (task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Cette tâche ne vous est pas assignée' });
    }
    
    if (task.status !== 'ASSIGNED') {
      return res.status(400).json({ error: `La tâche est déjà ${task.status}` });
    }
    
    await executeSQL(
      `UPDATE assigned_tasks 
       SET status = 'ACCEPTED', accepted_at = $1, updated_at = $2
       WHERE id = $3`,
      [formatDate(new Date()), formatDate(new Date()), id]
    );
    
    // Log audit
    await logAuditAction(
      req.user.id,
      'ACCEPT_TASK',
      'TASK',
      id,
      `Tâche ${id} acceptée`,
      {}
    );
    
    res.json({ message: 'Tâche acceptée' });
  } catch (error) {
    console.error('Erreur acceptation tâche:', error);
    res.status(500).json({ error: 'Erreur lors de l\'acceptation' });
  }
});

/**
 * PUT /api/tasks/:id/start
 * Démarrer une tâche (AGENT_TERRAIN uniquement)
 */
router.put('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tasks = await querySQLObjects(
      'SELECT id, assigned_to, status FROM assigned_tasks WHERE id = $1',
      [id],
      ['id', 'assigned_to', 'status']
    );
    
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    
    const task = tasks[0];
    
    if (task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    if (!['ACCEPTED', 'ASSIGNED'].includes(task.status)) {
      return res.status(400).json({ error: `La tâche doit être ACCEPTED ou ASSIGNED, actuellement: ${task.status}` });
    }
    
    await executeSQL(
      `UPDATE assigned_tasks 
       SET status = 'IN_PROGRESS', started_at = $1, updated_at = $2
       WHERE id = $3`,
      [formatDate(new Date()), formatDate(new Date()), id]
    );
    
    // Log audit
    await logAuditAction(
      req.user.id,
      'START_TASK',
      'TASK',
      id,
      `Tâche ${id} démarrée`,
      {}
    );
    
    res.json({ message: 'Tâche démarrée' });
  } catch (error) {
    console.error('Erreur démarrage tâche:', error);
    res.status(500).json({ error: 'Erreur lors du démarrage' });
  }
});

/**
 * PUT /api/tasks/:id/complete
 * Compléter une tâche (AGENT_TERRAIN uniquement)
 */
router.put(
  '/:id/complete',
  [
    body('completionReport').trim().notEmpty(),
    body('completionPhotoUrl').optional().isString(),
  ],
  uploadPhoto,
  handleUploadError,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { completionReport, completionPhotoUrl } = req.body;
      
      // Utiliser la photo uploadée si disponible
      const photoUrl = req.file ? `/uploads/${req.file.filename}` : completionPhotoUrl;
      
      const tasks = await querySQLObjects(
        'SELECT id, assigned_to, status, started_at FROM assigned_tasks WHERE id = $1',
        [id],
        ['id', 'assigned_to', 'status', 'started_at']
      );
      
      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }
      
      const task = tasks[0];
      
      if (task.assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Permission refusée' });
      }
      
      if (task.status !== 'IN_PROGRESS') {
        return res.status(400).json({ error: 'La tâche doit être en cours (IN_PROGRESS)' });
      }
      
      // Calculer la durée réelle
      const startedAt = new Date(task.started_at);
      const now = new Date();
      const actualDuration = Math.round((now - startedAt) / 60000); // en minutes
      
      await executeSQL(
        `UPDATE assigned_tasks 
         SET status = 'COMPLETED', completed_at = $1, 
             completion_report = $2, completion_photo_url = $3,
             actual_duration = $4, updated_at = $5
         WHERE id = $6`,
        [
          formatDate(now),
          completionReport,
          photoUrl || null,
          actualDuration,
          formatDate(now),
          id
        ]
      );
      
      // Si c'est lié à un incident, mettre à jour l'incident
      const taskDetails = await querySQLObjects(
        'SELECT incident_id FROM assigned_tasks WHERE id = $1',
        [id],
        ['incident_id']
      );
      
      if (taskDetails[0]?.incident_id) {
        await executeSQL(
          `UPDATE incidents 
           SET status = 'CLOSED', closed_at = $1, updated_at = $2
           WHERE id = $3`,
          [formatDate(now), formatDate(now), taskDetails[0].incident_id]
        );
      }
      
      // Log audit
      await logAuditAction(
        req.user.id,
        'COMPLETE_TASK',
        'TASK',
        id,
        `Tâche ${id} complétée`,
        { actualDuration, hasPhoto: !!photoUrl }
      );
      
      res.json({ message: 'Tâche complétée avec succès', actualDuration });
    } catch (error) {
      console.error('Erreur complétion tâche:', error);
      res.status(500).json({ error: 'Erreur lors de la complétion' });
    }
  }
);

/**
 * GET /api/tasks/my-tasks
 * Mes tâches (pour les agents de terrain)
 */
router.get('/my-tasks', async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT t.id, t.task_number, t.task_type, t.priority, t.status,
             t.location_lat, t.location_lng, t.location_address,
             t.description, t.assigned_at, t.accepted_at, t.started_at, t.completed_at,
             t.estimated_duration, t.actual_duration,
             t.created_at, t.updated_at,
             i.id as incident_id, i.description as incident_description
      FROM assigned_tasks t
      LEFT JOIN incidents i ON t.incident_id = i.id
      WHERE t.assigned_to = $1
    `;
    
    const params = [req.user.id];
    
    if (status) {
      query += ' AND t.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const tasks = await querySQLObjects(query, params, [
      'id', 'task_number', 'task_type', 'priority', 'status',
      'location_lat', 'location_lng', 'location_address',
      'description', 'assigned_at', 'accepted_at', 'started_at', 'completed_at',
      'estimated_duration', 'actual_duration',
      'created_at', 'updated_at',
      'incident_id', 'incident_description'
    ]);
    
    const formatted = tasks.map(t => ({
      id: t.id,
      taskNumber: t.task_number,
      type: t.task_type,
      priority: t.priority,
      status: t.status,
      location: t.location_lat ? {
        lat: parseFloat(t.location_lat),
        lng: parseFloat(t.location_lng),
        address: t.location_address,
      } : null,
      description: t.description,
      assignedAt: t.assigned_at,
      acceptedAt: t.accepted_at,
      startedAt: t.started_at,
      completedAt: t.completed_at,
      estimatedDuration: t.estimated_duration ? parseInt(t.estimated_duration) : null,
      actualDuration: t.actual_duration ? parseInt(t.actual_duration) : null,
      incident: t.incident_id ? {
        id: t.incident_id,
        description: t.incident_description,
      } : null,
      createdAt: t.created_at,
    }));
    
    res.json({ tasks: formatted });
  } catch (error) {
    console.error('Erreur récupération mes tâches:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/tasks/stats
 * Statistiques des tâches (SUPERVISEUR/ADMIN uniquement)
 */
router.get('/stats', async (req, res) => {
  try {
    const hasViewAll = await checkPermission(req.user, 'task.view_all');
    if (!hasViewAll) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    const stats = {
      total: await countSQL('SELECT COUNT(*) FROM assigned_tasks', []),
      pending: await countSQL('SELECT COUNT(*) FROM assigned_tasks WHERE status = $1', ['PENDING']),
      assigned: await countSQL('SELECT COUNT(*) FROM assigned_tasks WHERE status = $1', ['ASSIGNED']),
      inProgress: await countSQL('SELECT COUNT(*) FROM assigned_tasks WHERE status = $1', ['IN_PROGRESS']),
      completed: await countSQL('SELECT COUNT(*) FROM assigned_tasks WHERE status = $1', ['COMPLETED']),
      urgent: await countSQL('SELECT COUNT(*) FROM assigned_tasks WHERE priority = $1', ['URGENT']),
    };
    
    // Tâches complétées dans les 30 derniers jours
    const completed30Days = await countSQL(
      `SELECT COUNT(*) FROM assigned_tasks 
       WHERE status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days'`,
      []
    );
    
    // Temps moyen de complétion
    const avgCompletion = await querySQLObjects(
      `SELECT AVG(actual_duration) as avg_duration 
       FROM assigned_tasks 
       WHERE status = 'COMPLETED' AND actual_duration IS NOT NULL
       AND completed_at >= NOW() - INTERVAL '30 days'`,
      [],
      ['avg_duration']
    );
    
    res.json({
      stats: {
        ...stats,
        completed30Days,
        avgCompletionTime: avgCompletion[0]?.avg_duration ? Math.round(parseFloat(avgCompletion[0].avg_duration)) : null,
      },
    });
  } catch (error) {
    console.error('Erreur statistiques tâches:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
