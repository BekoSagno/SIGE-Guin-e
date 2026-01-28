import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, countSQL, formatDate } from '../services/sqlService.js';
import websocketService from '../services/websocketService.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Récupérer les notifications de l'utilisateur
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 50, unread_only = false } = req.query;

    let query = `
      SELECT id, notification_type, title, message, data, read, priority, created_at, read_at, expires_at
      FROM state_notifications
      WHERE (recipient_user_id = $1 OR (recipient_user_id IS NULL AND recipient_role = $2))
    `;
    const params = [userId, userRole];

    if (unread_only === 'true') {
      query += ' AND read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT $3';
    params.push(parseInt(limit));

    const notifications = await querySQLObjects(query, params, [
      'id', 'notification_type', 'title', 'message', 'data', 'read', 'priority', 
      'created_at', 'read_at', 'expires_at'
    ]);

    // Compter les non lues
    const unreadCount = await countSQL(
      `SELECT COUNT(*) FROM state_notifications 
       WHERE (recipient_user_id = $1 OR (recipient_user_id IS NULL AND recipient_role = $2))
       AND read = FALSE 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [userId, userRole]
    );

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.notification_type,
        title: n.title,
        message: n.message,
        data: n.data ? JSON.parse(n.data) : null,
        read: n.read === true,
        priority: n.priority,
        createdAt: n.created_at,
        readAt: n.read_at,
        expiresAt: n.expires_at,
      })),
      unreadCount: parseInt(unreadCount),
    });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Marquer une notification comme lue
 */
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    await querySQLObjects(
      `UPDATE state_notifications 
       SET read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (recipient_user_id = $2 OR recipient_user_id IS NULL)`,
      [notificationId, userId],
      []
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur marquage notification:', error);
    res.status(500).json({ error: 'Erreur lors du marquage' });
  }
});

/**
 * POST /api/notifications
 * Créer une notification (pour ÉTAT ou EDG)
 */
router.post('/', roleMiddleware(['ADMIN_ETAT', 'ADMIN_SYSTEME']), async (req, res) => {
  try {
    const { recipientRole, recipientUserId, type, title, message, data, priority = 'NORMAL', expiresAt } = req.body;

    const notificationId = await querySQLObjects(
      `INSERT INTO state_notifications 
       (recipient_role, recipient_user_id, notification_type, title, message, data, priority, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        recipientRole,
        recipientUserId || null,
        type,
        title,
        message,
        data ? JSON.stringify(data) : null,
        priority,
        expiresAt ? formatDate(new Date(expiresAt)) : null,
      ],
      ['id']
    );

    // Envoyer via WebSocket si l'utilisateur est connecté
    if (recipientUserId) {
      websocketService.sendToUser(recipientUserId, {
        type: 'notification',
        notification: {
          id: notificationId[0].id,
          type,
          title,
          message,
          data,
          priority,
        },
      });
    } else {
      // Broadcast à tous les utilisateurs du rôle
      websocketService.broadcast({
        type: 'notification',
        notification: {
          id: notificationId[0].id,
          type,
          title,
          message,
          data,
          priority,
        },
        targetRole: recipientRole,
      });
    }

    res.json({ success: true, id: notificationId[0].id });
  } catch (error) {
    console.error('Erreur création notification:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
});

export default router;
