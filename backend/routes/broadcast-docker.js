import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate, countSQL } from '../services/sqlService.js';
import websocketService from '../services/websocketService.js';

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'));

/**
 * GET /api/broadcast/zones
 * Récupère la structure hiérarchique des zones pour le ciblage
 */
router.get('/zones', async (req, res) => {
  try {
    // Récupérer toutes les villes/communes distinctes avec comptage des usagers
    const zones = await querySQLObjects(
      `SELECT 
        h.ville as zone_name,
        COUNT(DISTINCT h.id) as homes_count,
        COUNT(DISTINCT u.id) as users_count
       FROM homes h
       LEFT JOIN users u ON h.proprietaire_id = u.id
       GROUP BY h.ville
       ORDER BY h.ville`,
      [],
      ['zone_name', 'homes_count', 'users_count']
    );

    // Structurer les données hiérarchiquement
    const structuredZones = zones.map(zone => ({
      id: zone.zone_name?.toUpperCase().replace(/\s+/g, '-') || 'UNKNOWN',
      name: zone.zone_name || 'Non défini',
      type: 'commune',
      subscribers: parseInt(zone.users_count) || 0,
      homesCount: parseInt(zone.homes_count) || 0,
    }));

    // Ajouter une entrée "Tous" pour l'ensemble
    const totalSubscribers = structuredZones.reduce((sum, z) => sum + z.subscribers, 0);
    const allZones = {
      id: 'CONAKRY',
      name: 'Conakry',
      type: 'ville',
      subscribers: totalSubscribers,
      communes: structuredZones,
    };

    res.json({ zones: [allZones] });
  } catch (error) {
    console.error('Erreur récupération zones broadcast:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des zones' });
  }
});

/**
 * GET /api/broadcast/clients
 * Recherche de clients individuels pour envoi ciblé
 */
router.get('/clients', async (req, res) => {
  try {
    const { search, zone, limit = 50 } = req.query;

    let query = `
      SELECT u.id, u.nom, u.email, u.telephone, u.role,
             h.id as home_id, h.nom as home_nom, h.ville as zone
      FROM users u
      LEFT JOIN homes h ON h.proprietaire_id = u.id
      WHERE u.role = 'CITOYEN'
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (u.nom ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.telephone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (zone) {
      query += ` AND h.ville = $${paramIndex}`;
      params.push(zone);
      paramIndex++;
    }

    query += ` ORDER BY u.nom LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const clients = await querySQLObjects(
      query,
      params,
      ['id', 'nom', 'email', 'telephone', 'role', 'home_id', 'home_nom', 'zone']
    );

    const formatted = clients.map(c => ({
      id: c.id,
      name: c.nom,
      email: c.email,
      phone: c.telephone,
      zone: c.zone || 'Non assigné',
      homeId: c.home_id,
      homeName: c.home_nom,
    }));

    res.json({ clients: formatted });
  } catch (error) {
    console.error('Erreur recherche clients:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

/**
 * POST /api/broadcast/send
 * Envoie un message aux destinataires sélectionnés
 */
router.post(
  '/send',
  [
    body('title').trim().notEmpty().withMessage('Titre requis'),
    body('content').trim().notEmpty().withMessage('Contenu requis'),
    body('messageType').isIn(['info', 'warning', 'danger', 'success']).withMessage('Type invalide'),
    body('targetMode').isIn(['zone', 'individual']).withMessage('Mode de ciblage invalide'),
    body('targets').isArray().withMessage('Cibles requises'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, messageType, targetMode, targets, scheduledAt } = req.body;

      // Calculer le nombre de destinataires
      let recipients = [];
      let recipientCount = 0;

      if (targetMode === 'zone') {
        // Récupérer tous les utilisateurs des zones sélectionnées
        for (const zoneId of targets) {
          const zoneName = zoneId.replace(/-/g, ' ');
          const users = await querySQLObjects(
            `SELECT DISTINCT u.id, u.nom, u.email, u.telephone
             FROM users u
             JOIN homes h ON h.proprietaire_id = u.id
             WHERE h.ville ILIKE $1 AND u.role = 'CITOYEN'`,
            [`%${zoneName}%`],
            ['id', 'nom', 'email', 'telephone']
          );
          recipients.push(...users);
        }
        // Dédupliquer
        const uniqueIds = new Set();
        recipients = recipients.filter(r => {
          if (uniqueIds.has(r.id)) return false;
          uniqueIds.add(r.id);
          return true;
        });
        recipientCount = recipients.length;
      } else {
        // Mode individuel - targets contient directement les IDs utilisateurs
        recipientCount = targets.length;
        recipients = targets.map(id => ({ id }));
      }

      if (recipientCount === 0) {
        return res.status(400).json({ error: 'Aucun destinataire trouvé' });
      }

      // Créer l'entrée de message dans la base
      const messageId = generateUUID();
      const now = formatDate(new Date());
      const isScheduled = scheduledAt ? true : false;

      await executeSQL(
        `INSERT INTO broadcast_messages 
         (id, title, content, message_type, target_mode, targets, recipients_count, 
          sent_by, sent_at, scheduled_at, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          messageId,
          title,
          content,
          messageType,
          targetMode,
          JSON.stringify(targets),
          recipientCount,
          req.user.id,
          isScheduled ? null : now,
          scheduledAt ? formatDate(new Date(scheduledAt)) : null,
          isScheduled ? 'SCHEDULED' : 'SENT',
          now
        ]
      );

      // Si envoi immédiat, notifier via WebSocket
      if (!isScheduled) {
        // Envoyer la notification à chaque destinataire connecté
        for (const recipient of recipients) {
          await websocketService.sendToUser(recipient.id, {
            type: 'broadcast',
            messageId,
            title,
            content,
            messageType,
            from: 'EDG',
            timestamp: new Date().toISOString(),
          });
        }

        // Simuler les statistiques de livraison
        const delivered = Math.floor(recipientCount * 0.98);
        await executeSQL(
          `UPDATE broadcast_messages SET delivered_count = $1 WHERE id = $2`,
          [delivered, messageId]
        );
      }

      res.status(201).json({
        message: isScheduled ? 'Message programmé avec succès' : 'Message envoyé avec succès',
        broadcast: {
          id: messageId,
          title,
          content,
          messageType,
          targetMode,
          recipientsCount: recipientCount,
          status: isScheduled ? 'SCHEDULED' : 'SENT',
          sentAt: isScheduled ? null : new Date(),
          scheduledAt: scheduledAt || null,
        },
      });
    } catch (error) {
      console.error('Erreur envoi broadcast:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
  }
);

/**
 * GET /api/broadcast/history
 * Historique des messages envoyés
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const messages = await querySQLObjects(
      `SELECT m.id, m.title, m.content, m.message_type, m.target_mode, m.targets,
              m.recipients_count, m.delivered_count, m.read_count, m.sent_at,
              m.scheduled_at, m.status, m.created_at,
              u.id as sender_id, u.nom as sender_nom
       FROM broadcast_messages m
       LEFT JOIN users u ON m.sent_by = u.id
       ORDER BY m.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)],
      ['id', 'title', 'content', 'message_type', 'target_mode', 'targets',
       'recipients_count', 'delivered_count', 'read_count', 'sent_at',
       'scheduled_at', 'status', 'created_at', 'sender_id', 'sender_nom']
    );

    const formatted = messages.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content,
      type: m.message_type,
      targetMode: m.target_mode,
      targets: m.targets ? JSON.parse(m.targets) : [],
      recipients: parseInt(m.recipients_count) || 0,
      delivered: parseInt(m.delivered_count) || 0,
      read: parseInt(m.read_count) || 0,
      sentAt: m.sent_at,
      scheduledAt: m.scheduled_at,
      status: m.status,
      createdAt: m.created_at,
      sentBy: m.sender_nom || 'Système',
    }));

    // Compter le total
    const totalCount = await countSQL('SELECT COUNT(*) FROM broadcast_messages', []);

    res.json({
      messages: formatted,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/broadcast/templates
 * Récupère les modèles de messages
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = await querySQLObjects(
      `SELECT id, name, icon, title, template_content, message_type, created_at
       FROM broadcast_templates
       ORDER BY name`,
      [],
      ['id', 'name', 'icon', 'title', 'template_content', 'message_type', 'created_at']
    );

    // Si pas de templates en base, retourner les templates par défaut
    if (templates.length === 0) {
      const defaultTemplates = [
        { id: 'maintenance', icon: '🔧', title: 'Maintenance planifiée', template: 'Chers abonnés, une maintenance est prévue le {date} de {heureDebut} à {heureFin}.', type: 'info' },
        { id: 'coupure', icon: '⚡', title: 'Coupure programmée', template: 'Information importante : Une coupure de courant est programmée le {date}.', type: 'warning' },
        { id: 'retablissement', icon: '✅', title: 'Rétablissement', template: 'Bonne nouvelle ! L\'alimentation électrique a été rétablie.', type: 'success' },
        { id: 'incident', icon: '🚨', title: 'Incident en cours', template: 'Un incident technique affecte actuellement votre zone.', type: 'danger' },
        { id: 'facture', icon: '📄', title: 'Rappel facture', template: 'Rappel : Votre facture d\'électricité est disponible.', type: 'info' },
        { id: 'economie', icon: '💡', title: 'Conseil économie', template: 'Conseil énergie : Réduisez votre consommation aux heures de pointe.', type: 'info' },
        { id: 'custom', icon: '✏️', title: 'Message personnalisé', template: '', type: 'info' },
      ];
      return res.json({ templates: defaultTemplates });
    }

    const formatted = templates.map(t => ({
      id: t.id,
      icon: t.icon,
      title: t.title,
      template: t.template_content,
      type: t.message_type,
    }));

    res.json({ templates: formatted });
  } catch (error) {
    console.error('Erreur récupération templates:', error);
    // Retourner les templates par défaut en cas d'erreur
    const defaultTemplates = [
      { id: 'maintenance', icon: '🔧', title: 'Maintenance planifiée', template: 'Chers abonnés, une maintenance est prévue le {date}.', type: 'info' },
      { id: 'coupure', icon: '⚡', title: 'Coupure programmée', template: 'Une coupure de courant est programmée.', type: 'warning' },
      { id: 'retablissement', icon: '✅', title: 'Rétablissement', template: 'L\'alimentation a été rétablie.', type: 'success' },
      { id: 'incident', icon: '🚨', title: 'Incident en cours', template: 'Un incident affecte votre zone.', type: 'danger' },
      { id: 'custom', icon: '✏️', title: 'Message personnalisé', template: '', type: 'info' },
    ];
    res.json({ templates: defaultTemplates });
  }
});

/**
 * DELETE /api/broadcast/:id
 * Annule un message programmé (non encore envoyé)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const messages = await querySQLObjects(
      'SELECT id, status FROM broadcast_messages WHERE id = $1',
      [id],
      ['id', 'status']
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message non trouvé' });
    }

    if (messages[0].status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Seuls les messages programmés peuvent être annulés' });
    }

    await executeSQL(
      `UPDATE broadcast_messages SET status = 'CANCELLED' WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Message annulé avec succès' });
  } catch (error) {
    console.error('Erreur annulation message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation' });
  }
});

export default router;
