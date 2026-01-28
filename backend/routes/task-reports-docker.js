import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate, countSQL } from '../services/sqlService.js';

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
 * Générer un numéro de rapport unique
 */
async function generateReportNumber(reportType) {
  const prefixMap = {
    'DAILY': 'RPT-DAILY',
    'WEEKLY': 'RPT-WEEK',
    'MONTHLY': 'RPT-MONTH',
    'CUSTOM': 'RPT-CUSTOM',
    'TASK_COMPLETION': 'RPT-TASK',
  };
  
  const prefix = prefixMap[reportType] || 'RPT';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // Compter les rapports du jour
  const count = await countSQL(
    `SELECT COUNT(*) FROM task_reports 
     WHERE report_number LIKE $1 || '%' AND DATE(generated_at) = CURRENT_DATE`,
    [`${prefix}-${datePart}-`]
  );
  
  const seqNum = (count + 1).toString().padStart(4, '0');
  return `${prefix}-${datePart}-${seqNum}`;
}

/**
 * Récupérer les données des tâches selon les filtres
 */
async function getTasksData(filters) {
  const {
    periodStart,
    periodEnd,
    taskType,
    statusFilter,
    priorityFilter,
    assignedToFilter,
    zoneFilter,
  } = filters;
  
  let query = `
    SELECT t.id, t.task_number, t.task_type, t.priority, t.status,
           t.assigned_at, t.accepted_at, t.started_at, t.completed_at,
           t.estimated_duration, t.actual_duration,
           t.completion_report, t.completion_photo_url,
           t.description, t.location_address,
           at.nom as assigned_to_nom, at.email as assigned_to_email, at.zone_assigned,
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
  
  if (periodStart) {
    query += ` AND DATE(t.created_at) >= $${paramIndex++}`;
    params.push(periodStart);
  }
  
  if (periodEnd) {
    query += ` AND DATE(t.created_at) <= $${paramIndex++}`;
    params.push(periodEnd);
  }
  
  if (taskType && taskType !== 'ALL') {
    query += ` AND t.task_type = $${paramIndex++}`;
    params.push(taskType);
  }
  
  if (statusFilter && statusFilter !== 'ALL') {
    query += ` AND t.status = $${paramIndex++}`;
    params.push(statusFilter);
  }
  
  if (priorityFilter && priorityFilter !== 'ALL') {
    query += ` AND t.priority = $${paramIndex++}`;
    params.push(priorityFilter);
  }
  
  if (assignedToFilter) {
    query += ` AND t.assigned_to = $${paramIndex++}`;
    params.push(assignedToFilter);
  }
  
  if (zoneFilter) {
    query += ` AND at.zone_assigned = $${paramIndex++}`;
    params.push(zoneFilter);
  }
  
  query += ` ORDER BY t.created_at DESC`;
  
  const tasks = await querySQLObjects(query, params, [
    'id', 'task_number', 'task_type', 'priority', 'status',
    'assigned_at', 'accepted_at', 'started_at', 'completed_at',
    'estimated_duration', 'actual_duration',
    'completion_report', 'completion_photo_url',
    'description', 'location_address',
    'assigned_to_nom', 'assigned_to_email', 'zone_assigned',
    'assigned_by_nom',
    'incident_id', 'incident_description',
    'audit_ticket_id', 'audit_ticket_number'
  ]);
  
  return tasks.map(t => ({
    id: t.id,
    taskNumber: t.task_number,
    type: t.task_type,
    priority: t.priority,
    status: t.status,
    assignedAt: t.assigned_at,
    acceptedAt: t.accepted_at,
    startedAt: t.started_at,
    completedAt: t.completed_at,
    estimatedDuration: t.estimated_duration ? parseInt(t.estimated_duration) : null,
    actualDuration: t.actual_duration ? parseInt(t.actual_duration) : null,
    completionReport: t.completion_report,
    completionPhoto: t.completion_photo_url,
    description: t.description,
    locationAddress: t.location_address,
    assignedTo: t.assigned_to_nom ? {
      nom: t.assigned_to_nom,
      email: t.assigned_to_email,
      zone: t.zone_assigned,
    } : null,
    assignedBy: t.assigned_by_nom || null,
    incident: t.incident_id ? {
      id: t.incident_id,
      description: t.incident_description,
    } : null,
    auditTicket: t.audit_ticket_id ? {
      id: t.audit_ticket_id,
      ticketNumber: t.audit_ticket_number,
    } : null,
  }));
}

/**
 * Calculer les statistiques des tâches
 */
async function calculateTaskStats(tasks) {
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    pending: tasks.filter(t => ['ASSIGNED', 'ACCEPTED'].includes(t.status)).length,
    incidents: tasks.filter(t => t.type === 'INCIDENT').length,
    audits: tasks.filter(t => t.type === 'AUDIT').length,
    maintenance: tasks.filter(t => t.type === 'MAINTENANCE').length,
    inspections: tasks.filter(t => t.type === 'INSPECTION').length,
  };
  
  // Temps moyen de complétion
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' && t.actualDuration);
  if (completedTasks.length > 0) {
    const totalDuration = completedTasks.reduce((sum, t) => sum + t.actualDuration, 0);
    stats.avgCompletionTime = Math.round(totalDuration / completedTasks.length);
  } else {
    stats.avgCompletionTime = null;
  }
  
  // Répartition par priorité
  stats.byPriority = {
    urgent: tasks.filter(t => t.priority === 'URGENT').length,
    high: tasks.filter(t => t.priority === 'HIGH').length,
    medium: tasks.filter(t => t.priority === 'MEDIUM').length,
    low: tasks.filter(t => t.priority === 'LOW').length,
  };
  
  // Répartition par agent
  const agentMap = {};
  tasks.forEach(t => {
    if (t.assignedTo) {
      const agentName = t.assignedTo.nom;
      if (!agentMap[agentName]) {
        agentMap[agentName] = { total: 0, completed: 0 };
      }
      agentMap[agentName].total++;
      if (t.status === 'COMPLETED') {
        agentMap[agentName].completed++;
      }
    }
  });
  stats.byAgent = Object.entries(agentMap).map(([name, data]) => ({
    agent: name,
    total: data.total,
    completed: data.completed,
    completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
  }));
  
  return stats;
}

/**
 * POST /api/task-reports/generate
 * Générer un nouveau rapport
 */
router.post(
  '/generate',
  [
    body('reportType').isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM', 'TASK_COMPLETION']),
    body('periodStart').optional().isISO8601().toDate(),
    body('periodEnd').optional().isISO8601().toDate(),
    body('taskType').optional().isIn(['INCIDENT', 'AUDIT', 'MAINTENANCE', 'INSPECTION', 'ALL']),
    body('statusFilter').optional().isIn(['COMPLETED', 'IN_PROGRESS', 'ALL']),
    body('priorityFilter').optional().isIn(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'ALL']),
    body('assignedToFilter').optional().isUUID(),
    body('zoneFilter').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const hasPermission = await checkPermission(req.user, 'task.view_all');
      if (!hasPermission) {
        return res.status(403).json({ error: 'Permission refusée. Seuls les superviseurs peuvent générer des rapports.' });
      }
      
      const {
        reportType,
        periodStart,
        periodEnd,
        taskType = 'ALL',
        statusFilter = 'ALL',
        priorityFilter = 'ALL',
        assignedToFilter,
        zoneFilter,
      } = req.body;
      
      // Calculer les dates selon le type de rapport
      let startDate, endDate;
      const now = new Date();
      
      switch (reportType) {
        case 'DAILY':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'WEEKLY':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          endDate = new Date(now);
          break;
        case 'MONTHLY':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now);
          break;
        case 'CUSTOM':
          startDate = periodStart ? new Date(periodStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = periodEnd ? new Date(periodEnd) : new Date(now);
          break;
        case 'TASK_COMPLETION':
          startDate = periodStart ? new Date(periodStart) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          endDate = periodEnd ? new Date(periodEnd) : new Date(now);
          break;
      }
      
      // Récupérer les tâches
      const tasks = await getTasksData({
        periodStart: startDate.toISOString().split('T')[0],
        periodEnd: endDate.toISOString().split('T')[0],
        taskType,
        statusFilter,
        priorityFilter,
        assignedToFilter,
        zoneFilter,
      });
      
      // Calculer les statistiques
      const stats = await calculateTaskStats(tasks);
      
      // Générer le numéro de rapport
      const reportNumber = await generateReportNumber(reportType);
      
      // Créer le rapport
      const reportId = generateUUID();
      const reportData = {
        tasks,
        stats,
        filters: {
          reportType,
          periodStart: startDate.toISOString().split('T')[0],
          periodEnd: endDate.toISOString().split('T')[0],
          taskType,
          statusFilter,
          priorityFilter,
          assignedToFilter,
          zoneFilter,
        },
        generatedAt: new Date().toISOString(),
        generatedBy: {
          id: req.user.id,
          nom: req.user.nom,
          email: req.user.email,
        },
      };
      
      await executeSQL(
        `INSERT INTO task_reports 
         (id, report_number, report_type, period_start, period_end,
          task_type, status_filter, priority_filter, assigned_to_filter, zone_filter,
          generated_by, report_data, total_tasks, completed_tasks, in_progress_tasks,
          pending_tasks, avg_completion_time, total_incidents, total_audits,
          total_maintenance, total_inspections, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
        [
          reportId,
          reportNumber,
          reportType,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          taskType === 'ALL' ? null : taskType,
          statusFilter === 'ALL' ? null : statusFilter,
          priorityFilter === 'ALL' ? null : priorityFilter,
          assignedToFilter || null,
          zoneFilter || null,
          req.user.id,
          JSON.stringify(reportData),
          stats.total,
          stats.completed,
          stats.inProgress,
          stats.pending,
          stats.avgCompletionTime,
          stats.incidents,
          stats.audits,
          stats.maintenance,
          stats.inspections,
          formatDate(new Date()),
          formatDate(new Date()),
        ]
      );
      
      res.status(201).json({
        message: 'Rapport généré avec succès',
        report: {
          id: reportId,
          reportNumber,
          reportType,
          periodStart: startDate.toISOString().split('T')[0],
          periodEnd: endDate.toISOString().split('T')[0],
          stats,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
    }
  }
);

/**
 * GET /api/task-reports
 * Liste tous les rapports générés
 */
router.get('/', async (req, res) => {
  try {
    const hasPermission = await checkPermission(req.user, 'task.view_all');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    const { reportType, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT r.id, r.report_number, r.report_type, r.period_start, r.period_end,
             r.total_tasks, r.completed_tasks, r.in_progress_tasks, r.pending_tasks,
             r.avg_completion_time, r.generated_at, r.created_at,
             u.nom as generated_by_nom, u.email as generated_by_email
      FROM task_reports r
      LEFT JOIN users u ON r.generated_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (reportType) {
      query += ` AND r.report_type = $${paramIndex++}`;
      params.push(reportType);
    }
    
    query += ` ORDER BY r.generated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const reports = await querySQLObjects(query, params, [
      'id', 'report_number', 'report_type', 'period_start', 'period_end',
      'total_tasks', 'completed_tasks', 'in_progress_tasks', 'pending_tasks',
      'avg_completion_time', 'generated_at', 'created_at',
      'generated_by_nom', 'generated_by_email'
    ]);
    
    res.json({ reports });
  } catch (error) {
    console.error('Erreur récupération rapports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/task-reports/:id
 * Récupérer un rapport détaillé
 */
router.get('/:id', async (req, res) => {
  try {
    const hasPermission = await checkPermission(req.user, 'task.view_all');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    const { id } = req.params;
    
    const reports = await querySQLObjects(
      `SELECT r.*, u.nom as generated_by_nom, u.email as generated_by_email
       FROM task_reports r
       LEFT JOIN users u ON r.generated_by = u.id
       WHERE r.id = $1`,
      [id],
      ['id', 'report_number', 'report_type', 'period_start', 'period_end',
       'task_type', 'status_filter', 'priority_filter', 'assigned_to_filter', 'zone_filter',
       'generated_by', 'generated_at', 'report_data', 'total_tasks', 'completed_tasks',
       'in_progress_tasks', 'pending_tasks', 'avg_completion_time', 'total_incidents',
       'total_audits', 'total_maintenance', 'total_inspections', 'exported_at',
       'export_format', 'export_file_path', 'created_at', 'updated_at',
       'generated_by_nom', 'generated_by_email']
    );
    
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Rapport non trouvé' });
    }
    
    const report = reports[0];
    const reportData = typeof report.report_data === 'string' 
      ? JSON.parse(report.report_data) 
      : report.report_data;
    
    res.json({
      id: report.id,
      reportNumber: report.report_number,
      reportType: report.report_type,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      filters: {
        taskType: report.task_type,
        statusFilter: report.status_filter,
        priorityFilter: report.priority_filter,
        assignedToFilter: report.assigned_to_filter,
        zoneFilter: report.zone_filter,
      },
      stats: {
        total: report.total_tasks,
        completed: report.completed_tasks,
        inProgress: report.in_progress_tasks,
        pending: report.pending_tasks,
        avgCompletionTime: report.avg_completion_time,
        incidents: report.total_incidents,
        audits: report.total_audits,
        maintenance: report.total_maintenance,
        inspections: report.total_inspections,
      },
      data: reportData,
      generatedBy: {
        nom: report.generated_by_nom,
        email: report.generated_by_email,
      },
      generatedAt: report.generated_at,
      exportedAt: report.exported_at,
      exportFormat: report.export_format,
      exportFilePath: report.export_file_path,
      createdAt: report.created_at,
    });
  } catch (error) {
    console.error('Erreur récupération rapport:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/task-reports/stats
 * Statistiques globales des rapports
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const hasPermission = await checkPermission(req.user, 'task.view_all');
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    const stats = await querySQLObjects(
      `SELECT 
         COUNT(*) as total_reports,
         COUNT(DISTINCT generated_by) as total_generators,
         MAX(generated_at) as last_generated,
         SUM(total_tasks) as total_tasks_reported,
         AVG(avg_completion_time) as avg_completion_time_all
       FROM task_reports`,
      [],
      ['total_reports', 'total_generators', 'last_generated', 'total_tasks_reported', 'avg_completion_time_all']
    );
    
    const byType = await querySQLObjects(
      `SELECT report_type, COUNT(*) as count
       FROM task_reports
       GROUP BY report_type
       ORDER BY count DESC`,
      [],
      ['report_type', 'count']
    );
    
    res.json({
      overview: stats[0] || {},
      byType: byType.map(r => ({ type: r.report_type, count: parseInt(r.count) })),
    });
  } catch (error) {
    console.error('Erreur statistiques rapports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
