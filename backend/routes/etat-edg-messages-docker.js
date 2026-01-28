import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, countSQL, formatDate } from '../services/sqlService.js';
import websocketService from '../services/websocketService.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/etat-edg-messages
 * Récupérer les messages ÉTAT-EDG
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Récupérer les conversations de l'utilisateur
    const conversations = await querySQLObjects(
      `SELECT c.id, c.title, c.initiator_id, c.initiator_role, c.participant_role, 
              c.last_message_at, c.status, c.created_at,
              u.nom as initiator_name
       FROM etat_edg_conversations c
       LEFT JOIN users u ON c.initiator_id = u.id
       WHERE (c.initiator_id = $1 OR c.participant_role = $2)
       ORDER BY c.last_message_at DESC`,
      [userId, userRole],
      ['id', 'title', 'initiator_id', 'initiator_role', 'participant_role', 
       'last_message_at', 'status', 'created_at', 'initiator_name']
    );

    // Pour chaque conversation, récupérer les messages
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messages = await querySQLObjects(
          `SELECT m.id, m.sender_id, m.sender_role, m.subject, m.content, 
                  m.message_type, m.priority, m.read, m.read_at, m.created_at,
                  u.nom as sender_name
           FROM etat_edg_messages m
           LEFT JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = $1
           ORDER BY m.created_at ASC`,
          [conv.id],
          ['id', 'sender_id', 'sender_role', 'subject', 'content', 
           'message_type', 'priority', 'read', 'read_at', 'created_at', 'sender_name']
        );

        return {
          id: conv.id,
          title: conv.title,
          initiator: {
            id: conv.initiator_id,
            name: conv.initiator_name,
            role: conv.initiator_role,
          },
          participantRole: conv.participant_role,
          status: conv.status,
          lastMessageAt: conv.last_message_at,
          createdAt: conv.created_at,
          messages: messages.map(m => ({
            id: m.id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role,
            subject: m.subject,
            content: m.content,
            type: m.message_type,
            priority: m.priority,
            read: m.read === true,
            readAt: m.read_at,
            createdAt: m.created_at,
          })),
        };
      })
    );

    res.json({ conversations: conversationsWithMessages });
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/etat-edg-messages
 * Envoyer un message ÉTAT-EDG
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { conversationId, recipientRole, recipientUserId, subject, content, messageType = 'MESSAGE', priority = 'NORMAL' } = req.body;

    let convId = conversationId;

    // Créer une nouvelle conversation si nécessaire
    if (!convId) {
      const newConv = await querySQLObjects(
        `INSERT INTO etat_edg_conversations 
         (title, initiator_id, initiator_role, participant_role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [subject, userId, userRole, recipientRole],
        ['id']
      );
      convId = newConv[0].id;
    }

    // Créer le message
    const message = await querySQLObjects(
      `INSERT INTO etat_edg_messages 
       (conversation_id, sender_id, sender_role, recipient_role, recipient_user_id, 
        subject, content, message_type, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [convId, userId, userRole, recipientRole, recipientUserId || null, 
       subject, content, messageType, priority],
      ['id', 'created_at']
    );

    // Mettre à jour la conversation
    await querySQLObjects(
      `UPDATE etat_edg_conversations 
       SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [convId],
      []
    );

    // Envoyer notification via WebSocket
    if (recipientUserId) {
      websocketService.sendToUser(recipientUserId, {
        type: 'message',
        message: {
          id: message[0].id,
          conversationId: convId,
          senderId: userId,
          senderRole: userRole,
          subject,
          content,
          type: messageType,
          priority,
          createdAt: message[0].created_at,
        },
      });
    } else {
      // Broadcast à tous les utilisateurs du rôle
      websocketService.broadcast({
        type: 'message',
        message: {
          id: message[0].id,
          conversationId: convId,
          senderId: userId,
          senderRole: userRole,
          subject,
          content,
          type: messageType,
          priority,
          createdAt: message[0].created_at,
        },
        targetRole: recipientRole,
      });
    }

    res.json({ 
      success: true, 
      messageId: message[0].id, 
      conversationId: convId 
    });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi' });
  }
});

/**
 * PUT /api/etat-edg-messages/:id/read
 * Marquer un message comme lu
 */
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    await querySQLObjects(
      `UPDATE etat_edg_messages 
       SET read = TRUE, read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND (recipient_user_id = $2 OR recipient_user_id IS NULL)`,
      [messageId, userId],
      []
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur marquage message:', error);
    res.status(500).json({ error: 'Erreur lors du marquage' });
  }
});

export default router;
