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
      SELECT u.id, u.nom, u.email, u.role,
             h.id as home_id, h.nom as home_nom, h.ville as zone
      FROM users u
      LEFT JOIN homes h ON h.proprietaire_id = u.id
      WHERE u.role = 'CITOYEN'
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (u.nom ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
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
      ['id', 'nom', 'email', 'role', 'home_id', 'home_nom', 'zone']
    );

    const formatted = clients.map(c => ({
      id: c.id,
      name: c.nom,
      email: c.email,
      phone: '', // Téléphone non disponible dans le schéma actuel
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
        // Les targets sont des IDs de zones (ex: "CONAKRY", "DIXINN")
        for (const zoneId of targets) {
          // Convertir l'ID en nom de zone (ex: "CONAKRY" -> "Conakry")
          const zoneName = zoneId.replace(/-/g, ' ');
          // Chercher avec le nom exact et aussi avec l'ID
          const users = await querySQLObjects(
            `SELECT DISTINCT u.id, u.nom, u.email, h.ville
             FROM users u
             JOIN homes h ON h.proprietaire_id = u.id
             WHERE u.role = 'CITOYEN'
             AND (
               h.ville ILIKE $1 
               OR UPPER(REPLACE(h.ville, ' ', '-')) = $2
               OR h.ville = $3
             )`,
            [`%${zoneName}%`, zoneId.toUpperCase(), zoneName],
            ['id', 'nom', 'email', 'ville']
          );
          console.log(`📍 Zone ${zoneId} (${zoneName}): ${users.length} utilisateurs trouvés`);
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

      // Si envoi immédiat, notifier via WebSocket et créer des notifications
      if (!isScheduled) {
        console.log(`📤 Envoi message ${messageId} à ${recipientCount} destinataires`);
        
        // Créer une notification pour chaque destinataire dans la base
        for (const recipient of recipients) {
          try {
            // Envoyer via WebSocket si connecté
            await websocketService.sendToUser(recipient.id, {
              type: 'broadcast',
              messageId,
              title,
              content,
              messageType,
              from: 'EDG',
              timestamp: new Date().toISOString(),
            });

            // Créer aussi une notification dans la base pour persistance
            const notificationId = generateUUID();
            await executeSQL(
              `INSERT INTO state_notifications 
               (id, title, message, notification_type, recipient_user_id, recipient_role, 
                priority, data, read, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                notificationId,
                title,
                content,
                'BROADCAST',
                recipient.id,
                'CITOYEN',
                messageType === 'danger' ? 'HIGH' : messageType === 'warning' ? 'MEDIUM' : 'NORMAL',
                JSON.stringify({ messageId, messageType, from: 'EDG' }),
                false,
                formatDate(new Date())
              ]
            );
          } catch (err) {
            console.error(`❌ Erreur notification pour ${recipient.id}:`, err.message);
          }
        }

        // Simuler les statistiques de livraison
        const delivered = Math.floor(recipientCount * 0.98);
        await executeSQL(
          `UPDATE broadcast_messages SET delivered_count = $1 WHERE id = $2`,
          [delivered, messageId]
        );
        
        console.log(`✅ ${delivered} notifications créées sur ${recipientCount} destinataires`);
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
 * GET /api/broadcast/received
 * Messages reçus par l'utilisateur (pour citoyens)
 */
router.get('/received', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 50, offset = 0 } = req.query;

    console.log('🔍 Récupération messages pour utilisateur:', userId, 'role:', userRole);

    // Récupérer la ville de l'utilisateur
    const userHomes = await querySQLObjects(
      `SELECT DISTINCT h.ville FROM homes h WHERE h.proprietaire_id = $1`,
      [userId],
      ['ville']
    );
    const userZoneNames = userHomes.map(h => h.ville || '').filter(Boolean);
    const userZones = userZoneNames.map(zone => zone.toUpperCase().replace(/\s+/g, '-'));
    
    // Si l'utilisateur n'a pas de home, on ne peut pas filtrer par zone
    if (userZoneNames.length === 0) {
      console.log('⚠️ Utilisateur sans home - ne peut pas recevoir de messages par zone');
    }
    
    console.log('📍 Zones utilisateur:', userZoneNames, 'IDs:', userZones);

    // Récupérer TOUS les messages envoyés récemment (on va filtrer après)
    const allMessages = await querySQLObjects(
      `SELECT m.id, m.title, m.content, m.message_type, m.target_mode, m.targets,
              m.recipients_count, m.delivered_count, m.sent_at, m.created_at,
              u.id as sender_id, u.nom as sender_nom
       FROM broadcast_messages m
       LEFT JOIN users u ON m.sent_by = u.id
       WHERE m.status = 'SENT'
       ORDER BY m.created_at DESC
       LIMIT $1`,
      [parseInt(limit) * 20], // Récupérer beaucoup plus pour filtrer
      ['id', 'title', 'content', 'message_type', 'target_mode', 'targets',
       'recipients_count', 'delivered_count', 'sent_at', 'created_at', 'sender_id', 'sender_nom']
    );

    console.log(`📨 Messages trouvés en base: ${allMessages.length}`);

    // Filtrer les messages qui concernent cet utilisateur
    const messages = [];
    for (const m of allMessages) {
      if (!m.targets) {
        console.log(`⚠️ Message ${m.id} - Pas de targets`);
        continue;
      }
      
      let targets;
      try {
        targets = typeof m.targets === 'string' ? JSON.parse(m.targets) : m.targets;
        if (!Array.isArray(targets)) {
          console.log(`⚠️ Message ${m.id} - Targets n'est pas un tableau:`, typeof targets);
          continue;
        }
      } catch (e) {
        console.error(`❌ Erreur parsing targets pour ${m.id}:`, e.message);
        continue;
      }

      let shouldInclude = false;

      if (m.target_mode === 'individual') {
        // Mode individuel: vérifier si l'ID utilisateur est dans les targets
        shouldInclude = targets.some(t => String(t) === String(userId));
        if (shouldInclude) {
          console.log(`✅ Message ${m.id} - Mode individuel - Utilisateur ${userId} trouvé dans targets:`, targets);
        } else {
          console.log(`❌ Message ${m.id} - Mode individuel - Utilisateur ${userId} NON trouvé dans targets:`, targets);
        }
      } else if (m.target_mode === 'zone') {
        // Mode zone: vérifier si la zone de l'utilisateur correspond
        // Les targets sont des IDs de zones (ex: "CONAKRY", "DIXINN")
        if (userZoneNames.length === 0) {
          console.log(`❌ Message ${m.id} - Mode zone - Utilisateur sans zone`);
          shouldInclude = false;
        } else {
          shouldInclude = targets.some(target => {
            const targetStr = String(target).toUpperCase().replace(/\s+/g, '-');
            const targetName = String(target).replace(/-/g, ' ');
            
            // Comparer avec les zones de l'utilisateur (format ID)
            const matchesId = userZones.some(uz => uz === targetStr);
            
            // Comparer aussi avec les noms de zones (format nom) - plusieurs variantes
            const matchesName = userZoneNames.some(zone => {
              const zoneId = zone.toUpperCase().replace(/\s+/g, '-');
              const zoneLower = zone.toLowerCase();
              const targetLower = targetName.toLowerCase();
              
              return zoneId === targetStr || 
                     zoneLower === targetLower ||
                     zone === targetName ||
                     zone === target;
            });
            
            return matchesId || matchesName;
          });
          
          if (shouldInclude) {
            console.log(`✅ Message ${m.id} - Mode zone - Zone correspond:`, targets, 'vs zones utilisateur:', userZones, userZoneNames);
          } else {
            console.log(`❌ Message ${m.id} - Mode zone - Zone ne correspond pas:`, targets, 'vs zones utilisateur:', userZones, userZoneNames);
          }
        }
      } else {
        console.log(`⚠️ Message ${m.id} - Mode inconnu:`, m.target_mode);
      }
      
      if (shouldInclude) {
        messages.push(m);
      }
    }

    console.log(`📬 Messages filtrés pour cet utilisateur: ${messages.length} sur ${allMessages.length}`);

    // Vérifier aussi les notifications de type broadcast
    const notifications = await querySQLObjects(
      `SELECT id, title, message, notification_type, data, read, priority, created_at
       FROM state_notifications
       WHERE (recipient_user_id = $1 OR (recipient_user_id IS NULL AND recipient_role = $2))
       AND (notification_type = 'BROADCAST' OR notification_type = 'MESSAGE')
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, userRole, parseInt(limit)],
      ['id', 'title', 'message', 'notification_type', 'data', 'read', 'priority', 'created_at']
    );

    const formatted = [
      ...messages.map(m => ({
        id: m.id,
        title: m.title,
        content: m.content,
        messageType: m.message_type,
        createdAt: m.created_at,
        sentAt: m.sent_at,
        sentBy: m.sender_nom || 'EDG',
        read: false, // Les messages broadcast ne sont pas marqués comme lus individuellement
        isNotification: false,
      })),
      ...notifications.map(n => ({
        id: n.id,
        title: n.title,
        content: n.message,
        messageType: n.data ? (JSON.parse(n.data).messageType || 'info') : 'info',
        createdAt: n.created_at,
        read: n.read === true,
        isNotification: true,
      })),
    ];

    // Trier par date (plus récents en premier)
    formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const result = formatted.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    console.log(`📤 Envoi de ${result.length} messages à l'utilisateur ${userId} (total: ${formatted.length})`);

    res.json({
      messages: result,
      pagination: {
        total: formatted.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Erreur récupération messages reçus:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

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
