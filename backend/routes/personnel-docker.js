import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate, countSQL } from '../services/sqlService.js';
import websocketService from '../services/websocketService.js';

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
 * GET /api/personnel
 * Liste tous les employés EDG (selon les permissions)
 */
router.get('/', async (req, res) => {
  try {
    const hasViewAll = await checkPermission(req.user, 'personnel.view_all');
    
    let query = `
      SELECT u.id, u.nom, u.email, u.telephone, u.role, u.edg_subrole,
             u.zone_assigned, u.status, u.created_at,
             u.last_location_lat, u.last_location_lng, u.last_location_update,
             s.id as supervisor_id, s.nom as supervisor_nom
      FROM users u
      LEFT JOIN users s ON u.supervisor_id = s.id
      WHERE u.role = 'AGENT_EDG'
    `;
    
    const params = [];
    
    // Si pas de permission view_all, voir seulement ses subordonnés ou soi-même
    if (!hasViewAll) {
      if (req.user.edg_subrole === 'SUPERVISEUR_ZONE') {
        query += ' AND (u.supervisor_id = $1 OR u.id = $1)';
        params.push(req.user.id);
      } else {
        query += ' AND u.id = $1';
        params.push(req.user.id);
      }
    }
    
    query += ' ORDER BY u.nom';
    
    const employees = await querySQLObjects(query, params, [
      'id', 'nom', 'email', 'telephone', 'role', 'edg_subrole',
      'zone_assigned', 'status', 'created_at',
      'last_location_lat', 'last_location_lng', 'last_location_update',
      'supervisor_id', 'supervisor_nom'
    ]);
    
    // Compter les tâches actives par employé
    const employeesWithStats = await Promise.all(
      employees.map(async (emp) => {
        const activeTasks = await countSQL(
          `SELECT COUNT(*) FROM assigned_tasks 
           WHERE assigned_to = $1 AND status IN ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS')`,
          [emp.id]
        );
        
        const completedTasks = await countSQL(
          `SELECT COUNT(*) FROM assigned_tasks 
           WHERE assigned_to = $1 AND status = 'COMPLETED' 
           AND completed_at >= NOW() - INTERVAL '30 days'`,
          [emp.id]
        );
        
        return {
          id: emp.id,
          nom: emp.nom,
          email: emp.email,
          telephone: emp.telephone,
          role: emp.role,
          edgSubrole: emp.edg_subrole,
          zoneAssigned: emp.zone_assigned,
          status: emp.status,
          createdAt: emp.created_at,
          supervisor: emp.supervisor_id ? {
            id: emp.supervisor_id,
            nom: emp.supervisor_nom,
          } : null,
          location: emp.last_location_lat ? {
            lat: parseFloat(emp.last_location_lat),
            lng: parseFloat(emp.last_location_lng),
            updatedAt: emp.last_location_update,
          } : null,
          stats: {
            activeTasks: activeTasks,
            completedTasksMonth: completedTasks,
          },
        };
      })
    );
    
    res.json({ employees: employeesWithStats });
  } catch (error) {
    console.error('Erreur récupération personnel:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/personnel/:id
 * Détails d'un employé spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const hasViewAll = await checkPermission(req.user, 'personnel.view_all');
    
    // Vérifier les permissions
    if (!hasViewAll && id !== req.user.id && req.user.edg_subrole !== 'SUPERVISEUR_ZONE') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    
    const employees = await querySQLObjects(
      `SELECT u.id, u.nom, u.email, u.telephone, u.role, u.edg_subrole,
              u.zone_assigned, u.status, u.created_at,
              u.last_location_lat, u.last_location_lng, u.last_location_update,
              s.id as supervisor_id, s.nom as supervisor_nom
       FROM users u
       LEFT JOIN users s ON u.supervisor_id = s.id
       WHERE u.id = $1 AND u.role = 'AGENT_EDG'`,
      [id],
      ['id', 'nom', 'email', 'telephone', 'role', 'edg_subrole',
       'zone_assigned', 'status', 'created_at',
       'last_location_lat', 'last_location_lng', 'last_location_update',
       'supervisor_id', 'supervisor_nom']
    );
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employé non trouvé' });
    }
    
    const emp = employees[0];
    
    // Récupérer les tâches récentes
    const recentTasks = await querySQLObjects(
      `SELECT id, task_number, task_type, status, priority, created_at, completed_at
       FROM assigned_tasks
       WHERE assigned_to = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [id],
      ['id', 'task_number', 'task_type', 'status', 'priority', 'created_at', 'completed_at']
    );
    
    // Récupérer les performances
    const performance = await querySQLObjects(
      `SELECT tasks_completed, tasks_on_time, average_completion_time, rating
       FROM agent_performance
       WHERE user_id = $1
       ORDER BY period_start DESC
       LIMIT 1`,
      [id],
      ['tasks_completed', 'tasks_on_time', 'average_completion_time', 'rating']
    );
    
    res.json({
      employee: {
        id: emp.id,
        nom: emp.nom,
        email: emp.email,
        telephone: emp.telephone,
        role: emp.role,
        edgSubrole: emp.edg_subrole,
        zoneAssigned: emp.zone_assigned,
        status: emp.status,
        createdAt: emp.created_at,
        supervisor: emp.supervisor_id ? {
          id: emp.supervisor_id,
          nom: emp.supervisor_nom,
        } : null,
        location: emp.last_location_lat ? {
          lat: parseFloat(emp.last_location_lat),
          lng: parseFloat(emp.last_location_lng),
          updatedAt: emp.last_location_update,
        } : null,
        recentTasks: recentTasks.map(t => ({
          id: t.id,
          taskNumber: t.task_number,
          type: t.task_type,
          status: t.status,
          priority: t.priority,
          createdAt: t.created_at,
          completedAt: t.completed_at,
        })),
        performance: performance[0] ? {
          tasksCompleted: parseInt(performance[0].tasks_completed) || 0,
          tasksOnTime: parseInt(performance[0].tasks_on_time) || 0,
          avgCompletionTime: parseFloat(performance[0].average_completion_time) || 0,
          rating: parseFloat(performance[0].rating) || 0,
        } : null,
      },
    });
  } catch (error) {
    console.error('Erreur récupération employé:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/personnel
 * Créer un nouvel employé (ADMIN_SYSTEME uniquement)
 */
router.post(
  '/',
  [
    body('nom').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('edgSubrole').isIn(['ADMIN_SYSTEME', 'SUPERVISEUR_ZONE', 'AGENT_TERRAIN']),
    body('zoneAssigned').optional().isString(),
    body('supervisorId').optional().isUUID(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const hasCreate = await checkPermission(req.user, 'personnel.create');
      if (!hasCreate) {
        return res.status(403).json({ error: 'Permission refusée. Seuls les administrateurs système peuvent créer des comptes.' });
      }
      
      const { nom, email, password, edgSubrole, zoneAssigned, supervisorId, telephone } = req.body;
      
      // Vérifier que l'email n'existe pas
      const existing = await querySQLObjects(
        'SELECT id FROM users WHERE email = $1',
        [email],
        ['id']
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      
      // Hasher le mot de passe
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash(password, 10);
      
      // Créer l'utilisateur
      const userId = generateUUID();
      await executeSQL(
        `INSERT INTO users 
         (id, nom, email, password_hash, role, edg_subrole, zone_assigned, supervisor_id, telephone, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          nom,
          email,
          hashedPassword,
          'AGENT_EDG',
          edgSubrole,
          zoneAssigned || null,
          supervisorId || null,
          telephone || null,
          'ACTIVE',
          formatDate(new Date())
        ]
      );
      
      // Log audit
      await logAuditAction(
        req.user.id,
        'CREATE_USER',
        'USER',
        userId,
        `Création du compte ${nom} (${edgSubrole})`,
        { email, edgSubrole, zoneAssigned }
      );
      
      res.status(201).json({
        message: 'Employé créé avec succès',
        employee: {
          id: userId,
          nom,
          email,
          edgSubrole,
          zoneAssigned,
        },
      });
    } catch (error) {
      console.error('Erreur création employé:', error);
      res.status(500).json({ error: 'Erreur lors de la création' });
    }
  }
);

/**
 * PUT /api/personnel/:id
 * Mettre à jour un employé
 */
router.put(
  '/:id',
  [
    body('nom').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('edgSubrole').optional().isIn(['ADMIN_SYSTEME', 'SUPERVISEUR_ZONE', 'AGENT_TERRAIN']),
    body('zoneAssigned').optional().isString(),
    body('supervisorId').optional().isUUID(),
    body('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'INACTIVE']),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const hasUpdate = await checkPermission(req.user, 'personnel.update');
      
      if (!hasUpdate && id !== req.user.id) {
        return res.status(403).json({ error: 'Permission refusée' });
      }
      
      const { nom, email, edgSubrole, zoneAssigned, supervisorId, status, telephone } = req.body;
      
      const updates = [];
      const params = [];
      let paramIndex = 1;
      
      if (nom) {
        updates.push(`nom = $${paramIndex++}`);
        params.push(nom);
      }
      if (email) {
        updates.push(`email = $${paramIndex++}`);
        params.push(email);
      }
      if (edgSubrole && hasUpdate) {
        updates.push(`edg_subrole = $${paramIndex++}`);
        params.push(edgSubrole);
      }
      if (zoneAssigned !== undefined) {
        updates.push(`zone_assigned = $${paramIndex++}`);
        params.push(zoneAssigned || null);
      }
      if (supervisorId !== undefined && hasUpdate) {
        updates.push(`supervisor_id = $${paramIndex++}`);
        params.push(supervisorId || null);
      }
      if (status && hasUpdate) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (telephone) {
        updates.push(`telephone = $${paramIndex++}`);
        params.push(telephone);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }
      
      params.push(id);
      await executeSQL(
        `UPDATE users SET ${updates.join(', ')}, updated_at = ${formatDate(new Date())} WHERE id = $${paramIndex}`,
        params
      );
      
      // Log audit
      await logAuditAction(
        req.user.id,
        'UPDATE_USER',
        'USER',
        id,
        `Mise à jour du compte ${id}`,
        { updates: Object.keys(req.body) }
      );
      
      res.json({ message: 'Employé mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur mise à jour employé:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }
);

/**
 * POST /api/personnel/:id/location
 * Mettre à jour la géolocalisation d'un agent (pour suivi temps réel)
 */
router.post(
  '/:id/location',
  [
    body('lat').isFloat(),
    body('lng').isFloat(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;
      
      // Un agent ne peut mettre à jour que sa propre localisation
      if (id !== req.user.id && req.user.edg_subrole !== 'ADMIN_SYSTEME') {
        return res.status(403).json({ error: 'Permission refusée' });
      }
      
      await executeSQL(
        `UPDATE users 
         SET last_location_lat = $1, last_location_lng = $2, last_location_update = $3
         WHERE id = $4`,
        [parseFloat(lat), parseFloat(lng), formatDate(new Date()), id]
      );
      
      // Notifier les superviseurs via WebSocket
      if (req.user.edg_subrole === 'AGENT_TERRAIN') {
        await websocketService.broadcast({
          type: 'agent_location_update',
          agentId: id,
          agentName: req.user.nom,
          location: { lat: parseFloat(lat), lng: parseFloat(lng) },
          timestamp: new Date().toISOString(),
        });
      }
      
      res.json({ message: 'Localisation mise à jour' });
    } catch (error) {
      console.error('Erreur mise à jour localisation:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }
);

/**
 * GET /api/personnel/available-agents
 * Liste les agents disponibles pour assignation (SUPERVISEUR uniquement)
 */
router.get('/available-agents', async (req, res) => {
  try {
    const hasAssign = await checkPermission(req.user, 'task.assign');
    if (!hasAssign) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    const { zone, taskType } = req.query;
    
    let query = `
      SELECT u.id, u.nom, u.email, u.telephone, u.zone_assigned,
             u.last_location_lat, u.last_location_lng, u.last_location_update,
             COUNT(at.id) as active_tasks_count
      FROM users u
      LEFT JOIN assigned_tasks at ON u.id = at.assigned_to 
        AND at.status IN ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS')
      WHERE u.role = 'AGENT_EDG' 
      AND u.edg_subrole = 'AGENT_TERRAIN'
      AND u.status = 'ACTIVE'
    `;
    
    const params = [];
    
    if (zone) {
      query += ' AND u.zone_assigned = $1';
      params.push(zone);
    }
    
    query += ' GROUP BY u.id ORDER BY active_tasks_count ASC, u.nom';
    
    const agents = await querySQLObjects(query, params, [
      'id', 'nom', 'email', 'telephone', 'zone_assigned',
      'last_location_lat', 'last_location_lng', 'last_location_update',
      'active_tasks_count'
    ]);
    
    const formatted = agents.map(agent => ({
      id: agent.id,
      nom: agent.nom,
      email: agent.email,
      telephone: agent.telephone,
      zoneAssigned: agent.zone_assigned,
      activeTasks: parseInt(agent.active_tasks_count) || 0,
      location: agent.last_location_lat ? {
        lat: parseFloat(agent.last_location_lat),
        lng: parseFloat(agent.last_location_lng),
        updatedAt: agent.last_location_update,
      } : null,
      available: parseInt(agent.active_tasks_count) < 3, // Disponible si moins de 3 tâches actives
    }));
    
    res.json({ agents: formatted });
  } catch (error) {
    console.error('Erreur récupération agents disponibles:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/personnel/pending
 * Liste les comptes en attente de validation (ADMIN_SYSTEME uniquement)
 */
router.get('/pending', async (req, res) => {
  try {
    const hasViewAll = await checkPermission(req.user, 'personnel.view_all');
    if (!hasViewAll || req.user.edg_subrole !== 'ADMIN_SYSTEME') {
      return res.status(403).json({ error: 'Permission refusée. Accès réservé aux administrateurs système.' });
    }
    
    const pendingUsers = await querySQLObjects(
      `SELECT u.id, u.nom, u.email, u.telephone, u.role, u.status, u.created_at
       FROM users u
       WHERE u.role = 'AGENT_EDG' AND u.status = 'PENDING'
       ORDER BY u.created_at DESC`,
      [],
      ['id', 'nom', 'email', 'telephone', 'role', 'status', 'created_at']
    );
    
    const formatted = pendingUsers.map(u => ({
      id: u.id,
      nom: u.nom,
      email: u.email,
      telephone: u.telephone,
      role: u.role,
      status: u.status,
      createdAt: u.created_at,
    }));
    
    res.json({ pendingUsers: formatted });
  } catch (error) {
    console.error('Erreur récupération comptes en attente:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * PUT /api/personnel/:id/validate
 * Valide un compte en attente et assigne un sous-rôle (ADMIN_SYSTEME uniquement)
 */
router.put(
  '/:id/validate',
  [
    body('edgSubrole').isIn(['ADMIN_SYSTEME', 'SUPERVISEUR_ZONE', 'AGENT_TERRAIN']),
    body('zoneAssigned').optional().isString(),
    body('supervisorId').optional().isUUID(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const hasCreate = await checkPermission(req.user, 'personnel.create');
      
      if (!hasCreate || req.user.edg_subrole !== 'ADMIN_SYSTEME') {
        return res.status(403).json({ error: 'Permission refusée. Seuls les administrateurs système peuvent valider des comptes.' });
      }
      
      const { edgSubrole, zoneAssigned, supervisorId } = req.body;
      
      // Vérifier que le compte existe et est en attente
      const users = await querySQLObjects(
        'SELECT id, nom, email, status FROM users WHERE id = $1 AND role = $2',
        [id, 'AGENT_EDG'],
        ['id', 'nom', 'email', 'status']
      );
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'Compte non trouvé' });
      }
      
      const user = users[0];
      
      if (user.status !== 'PENDING') {
        return res.status(400).json({ error: `Ce compte n'est pas en attente (statut actuel: ${user.status})` });
      }
      
      // Activer le compte et assigner le sous-rôle
      await executeSQL(
        `UPDATE users 
         SET status = 'ACTIVE', edg_subrole = $1, zone_assigned = $2, supervisor_id = $3, updated_at = $4
         WHERE id = $5`,
        [
          edgSubrole,
          zoneAssigned || null,
          supervisorId || null,
          formatDate(new Date()),
          id
        ]
      );
      
      // Log audit
      await logAuditAction(
        req.user.id,
        'VALIDATE_USER',
        'USER',
        id,
        `Compte ${user.nom} validé et assigné au rôle ${edgSubrole}`,
        { edgSubrole, zoneAssigned, supervisorId }
      );
      
      // TODO: Envoyer un email de notification à l'utilisateur
      console.log(`\n✅ COMPTE VALIDÉ:`);
      console.log(`   Utilisateur: ${user.nom} (${user.email})`);
      console.log(`   Sous-rôle assigné: ${edgSubrole}`);
      console.log(`   Zone: ${zoneAssigned || 'Toutes zones'}`);
      console.log(`   → L'utilisateur peut maintenant se connecter\n`);
      
      res.json({
        message: 'Compte validé avec succès',
        user: {
          id,
          nom: user.nom,
          email: user.email,
          edgSubrole,
          zoneAssigned,
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      console.error('Erreur validation compte:', error);
      res.status(500).json({ error: 'Erreur lors de la validation' });
    }
  }
);

/**
 * GET /api/personnel/new-users
 * Liste les nouveaux utilisateurs citoyens inscrits (pour EDG)
 */
router.get('/new-users', roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'), async (req, res) => {
  try {
    const { limit = 50, days = 7 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const newUsers = await querySQLObjects(
      `SELECT u.id, u.nom, u.email, u.telephone, u.sige_id, u.role, u.status, 
              u.created_at, u.updated_at,
              COUNT(DISTINCT h.id) as homes_count
       FROM users u
       LEFT JOIN homes h ON h.proprietaire_id = u.id
       WHERE u.role = 'CITOYEN'
       AND u.created_at >= $1
       GROUP BY u.id, u.nom, u.email, u.telephone, u.sige_id, u.role, u.status, u.created_at, u.updated_at
       ORDER BY u.created_at DESC
       LIMIT $2`,
      [daysAgo.toISOString(), parseInt(limit)],
      ['id', 'nom', 'email', 'telephone', 'sige_id', 'role', 'status', 'created_at', 'updated_at', 'homes_count']
    );

    const formatted = newUsers.map(user => ({
      id: user.id,
      nom: user.nom,
      email: user.email,
      telephone: user.telephone,
      sigeId: user.sige_id,
      role: user.role,
      status: user.status,
      homesCount: parseInt(user.homes_count) || 0,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isNew: new Date(user.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000), // < 24h
    }));

    res.json({
      users: formatted,
      total: formatted.length,
      period: `${days} jours`,
    });
  } catch (error) {
    console.error('Erreur récupération nouveaux utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/personnel/audit-logs
 * Récupère les logs d'audit (ADMIN_SYSTEME uniquement)
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const hasViewAll = await checkPermission(req.user, 'personnel.view_all');
    if (!hasViewAll || req.user.edg_subrole !== 'ADMIN_SYSTEME') {
      return res.status(403).json({ error: 'Permission refusée. Accès réservé aux administrateurs système.' });
    }
    
    const { limit = 100, offset = 0, actionType, userId } = req.query;
    
    let query = `
      SELECT al.id, al.user_id, al.action_type, al.resource_type, al.resource_id,
             al.description, al.metadata, al.ip_address, al.created_at,
             u.nom as user_nom, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (actionType) {
      query += ` AND al.action_type = $${paramIndex++}`;
      params.push(actionType);
    }
    
    if (userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const logs = await querySQLObjects(query, params, [
      'id', 'user_id', 'action_type', 'resource_type', 'resource_id',
      'description', 'metadata', 'ip_address', 'created_at',
      'user_nom', 'user_email'
    ]);
    
    const formatted = logs.map(log => ({
      id: log.id,
      userId: log.user_id,
      user: log.user_nom ? {
        nom: log.user_nom,
        email: log.user_email,
      } : null,
      actionType: log.action_type,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      description: log.description,
      metadata: log.metadata ? JSON.parse(log.metadata) : {},
      ipAddress: log.ip_address,
      createdAt: log.created_at,
    }));
    
    const totalCount = await countSQL('SELECT COUNT(*) FROM audit_logs', []);
    
    res.json({
      logs: formatted,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Erreur récupération audit logs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
