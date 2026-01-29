import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate } from '../services/sqlService.js';
import { uploadPhoto, handleUploadError } from '../middleware/uploadMiddleware.js';
import websocketService from '../services/websocketService.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/incidents
 * Liste les incidents
 */
router.get('/', async (req, res) => {
  try {
    let incidents;

    if (req.user.role === 'AGENT_EDG' || req.user.role === 'ADMIN_ETAT') {
      // Les agents EDG et admins voient tous les incidents
      incidents = await querySQLObjects(
        `SELECT i.id, i.reporter_id, i.home_id, i.description, i.photo_url, i.latitude, i.longitude,
                i.status, i.incident_type, i.created_at, i.updated_at, i.closed_at,
                u.id as reporter_id_full, u.nom as reporter_nom, u.email as reporter_email,
                h.id as home_id_full, h.nom as home_nom, h.ville as home_ville
         FROM incidents i
         LEFT JOIN users u ON i.reporter_id = u.id
         LEFT JOIN homes h ON i.home_id = h.id
         ORDER BY i.created_at DESC`,
        [],
        ['id', 'reporter_id', 'home_id', 'description', 'photo_url', 'latitude', 'longitude',
         'status', 'incident_type', 'created_at', 'updated_at', 'closed_at',
         'reporter_id_full', 'reporter_nom', 'reporter_email',
         'home_id_full', 'home_nom', 'home_ville']
      );
    } else {
      // Les citoyens voient uniquement leurs incidents
      incidents = await querySQLObjects(
        `SELECT i.id, i.reporter_id, i.home_id, i.description, i.photo_url, i.latitude, i.longitude,
                i.status, i.incident_type, i.created_at, i.updated_at, i.closed_at,
                h.id as home_id_full, h.nom as home_nom, h.ville as home_ville
         FROM incidents i
         LEFT JOIN homes h ON i.home_id = h.id
         WHERE i.reporter_id = $1
         ORDER BY i.created_at DESC`,
        [req.user.id],
        ['id', 'reporter_id', 'home_id', 'description', 'photo_url', 'latitude', 'longitude',
         'status', 'incident_type', 'created_at', 'updated_at', 'closed_at',
         'home_id_full', 'home_nom', 'home_ville']
      );
    }

    const formatted = incidents.map(i => ({
      id: i.id,
      reporterId: i.reporter_id,
      homeId: i.home_id,
      description: i.description,
      photoUrl: i.photo_url,
      latitude: i.latitude ? parseFloat(i.latitude) : null,
      longitude: i.longitude ? parseFloat(i.longitude) : null,
      status: i.status,
      incidentType: i.incident_type,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      closedAt: i.closed_at,
      reporter: i.reporter_id_full ? {
        id: i.reporter_id_full,
        nom: i.reporter_nom,
        email: i.reporter_email,
      } : null,
      home: i.home_id_full ? {
        id: i.home_id_full,
        nom: i.home_nom,
        ville: i.home_ville,
      } : null,
    }));

    res.json({ incidents: formatted });
  } catch (error) {
    console.error('Erreur récupération incidents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/incidents/:id
 * Récupère un incident spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const incidents = await querySQLObjects(
      `SELECT i.id, i.reporter_id, i.home_id, i.description, i.photo_url, i.latitude, i.longitude,
              i.status, i.incident_type, i.created_at, i.updated_at, i.closed_at,
              u.id as reporter_id_full, u.nom as reporter_nom, u.email as reporter_email,
              h.id as home_id_full, h.nom as home_nom, h.ville as home_ville, h.proprietaire_id
       FROM incidents i
       LEFT JOIN users u ON i.reporter_id = u.id
       LEFT JOIN homes h ON i.home_id = h.id
       WHERE i.id = $1`,
      [id],
      ['id', 'reporter_id', 'home_id', 'description', 'photo_url', 'latitude', 'longitude',
       'status', 'incident_type', 'created_at', 'updated_at', 'closed_at',
       'reporter_id_full', 'reporter_nom', 'reporter_email',
       'home_id_full', 'home_nom', 'home_ville', 'proprietaire_id']
    );

    if (incidents.length === 0) {
      return res.status(404).json({ error: 'Incident non trouvé' });
    }

    const i = incidents[0];

    // Vérifier les permissions
    if (
      i.reporter_id !== req.user.id &&
      req.user.role !== 'AGENT_EDG' &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const incident = {
      id: i.id,
      reporterId: i.reporter_id,
      homeId: i.home_id,
      description: i.description,
      photoUrl: i.photo_url,
      latitude: i.latitude ? parseFloat(i.latitude) : null,
      longitude: i.longitude ? parseFloat(i.longitude) : null,
      status: i.status,
      incidentType: i.incident_type,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      closedAt: i.closed_at,
      reporter: i.reporter_id_full ? {
        id: i.reporter_id_full,
        nom: i.reporter_nom,
        email: i.reporter_email,
      } : null,
      home: i.home_id_full ? {
        id: i.home_id_full,
        nom: i.home_nom,
        ville: i.home_ville,
      } : null,
    };

    res.json({ incident });
  } catch (error) {
    console.error('Erreur récupération incident:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/incidents
 * Crée un nouvel incident
 */
router.post(
  '/',
  [
    body('description').trim().notEmpty(),
    body('homeId').optional().isUUID(),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
    body('incidentType').optional().isIn(['FRAUDE_SUSPECTEE', 'PANNE', 'COUPURE', 'AUTRE']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { description, homeId, latitude, longitude, incidentType, photoUrl } = req.body;

      // Vérifier que le foyer existe si fourni
      if (homeId) {
        const homes = await querySQLObjects(
          'SELECT id, proprietaire_id FROM homes WHERE id = $1',
          [homeId],
          ['id', 'proprietaire_id']
        );

        if (homes.length === 0) {
          return res.status(404).json({ error: 'Foyer non trouvé' });
        }

        const home = homes[0];
        // Vérifier les permissions
        if (
          home.proprietaire_id !== req.user.id &&
          req.user.role !== 'AGENT_EDG' &&
          req.user.role !== 'ADMIN_ETAT'
        ) {
          return res.status(403).json({ error: 'Accès refusé à ce foyer' });
        }
      }

      // Créer l'incident
      const incidentId = generateUUID();
      await executeSQL(
        `INSERT INTO incidents (id, reporter_id, home_id, description, photo_url, latitude, longitude,
                               status, incident_type, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          incidentId,
          req.user.id,
          homeId || null,
          description,
          photoUrl || null,
          latitude ? parseFloat(latitude) : null,
          longitude ? parseFloat(longitude) : null,
          'OPEN',
          incidentType || 'AUTRE',
          formatDate(new Date()),
          formatDate(new Date())
        ]
      );

      // Récupérer l'incident créé
      const incidents = await querySQLObjects(
        `SELECT i.id, i.reporter_id, i.home_id, i.description, i.photo_url, i.latitude, i.longitude,
                i.status, i.incident_type, i.created_at, i.updated_at,
                u.id as reporter_id_full, u.nom as reporter_nom, u.email as reporter_email,
                h.id as home_id_full, h.nom as home_nom, h.ville as home_ville
         FROM incidents i
         LEFT JOIN users u ON i.reporter_id = u.id
         LEFT JOIN homes h ON i.home_id = h.id
         WHERE i.id = $1`,
        [incidentId],
        ['id', 'reporter_id', 'home_id', 'description', 'photo_url', 'latitude', 'longitude',
         'status', 'incident_type', 'created_at', 'updated_at',
         'reporter_id_full', 'reporter_nom', 'reporter_email',
         'home_id_full', 'home_nom', 'home_ville']
      );

      const i = incidents[0];
      const incident = {
        id: i.id,
        reporterId: i.reporter_id,
        homeId: i.home_id,
        description: i.description,
        photoUrl: i.photo_url,
        latitude: i.latitude ? parseFloat(i.latitude) : null,
        longitude: i.longitude ? parseFloat(i.longitude) : null,
        status: i.status,
        incidentType: i.incident_type,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        reporter: {
          id: i.reporter_id_full,
          nom: i.reporter_nom,
          email: i.reporter_email,
        },
        home: i.home_id_full ? {
          id: i.home_id_full,
          nom: i.home_nom,
          ville: i.home_ville,
        } : null,
      };

      // Créer une notification pour l'EDG si l'incident vient d'un citoyen
      if (req.user.role === 'CITOYEN') {
        try {
          const notificationId = generateUUID();
          const priority = incidentType === 'FRAUDE_SUSPECTEE' ? 'HIGH' : 
                          incidentType === 'PANNE' || incidentType === 'COUPURE' ? 'NORMAL' : 'LOW';
          
          await executeSQL(
            `INSERT INTO state_notifications 
             (id, recipient_role, recipient_user_id, notification_type, title, message, data, priority, created_at)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)`,
            [
              notificationId,
              'AGENT_EDG',
              'INCIDENT_REPORTED',
              `Nouvel incident signalé${incidentType ? ` (${incidentType})` : ''}`,
              `${i.reporter_nom} a signalé : ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}${i.home_ville ? ` - Zone: ${i.home_ville}` : ''}`,
              JSON.stringify({
                incidentId: incident.id,
                reporterId: incident.reporterId,
                reporterNom: i.reporter_nom,
                reporterEmail: i.reporter_email,
                incidentType: incident.incidentType,
                description: incident.description,
                homeId: incident.homeId,
                homeVille: i.home_ville,
                latitude: incident.latitude,
                longitude: incident.longitude,
                createdAt: incident.createdAt,
              }),
              priority,
              incident.createdAt,
            ]
          );

          // Envoyer notification via WebSocket à tous les agents EDG connectés
          websocketService.broadcast({
            type: 'notification',
            notification: {
              id: notificationId,
              type: 'INCIDENT_REPORTED',
              title: `Nouvel incident signalé${incidentType ? ` (${incidentType})` : ''}`,
              message: `${i.reporter_nom} : ${description.substring(0, 80)}...`,
              data: {
                incidentId: incident.id,
                incidentType: incident.incidentType,
                reporterNom: i.reporter_nom,
                homeVille: i.home_ville,
              },
              priority,
            },
            targetRole: 'AGENT_EDG',
          });

          console.log(`📢 Notification EDG créée pour incident: ${incident.id} (${incidentType || 'AUTRE'})`);
        } catch (notifError) {
          console.error('⚠️ Erreur création notification EDG pour incident:', notifError);
          // Ne pas bloquer la création de l'incident si la notification échoue
        }
      }

      res.status(201).json({
        message: 'Incident créé avec succès',
        incident,
      });
    } catch (error) {
      console.error('Erreur création incident:', error);
      res.status(500).json({ error: 'Erreur lors de la création' });
    }
  }
);

/**
 * PUT /api/incidents/:id
 * Met à jour un incident (changement de statut)
 */
router.put(
  '/:id',
  [
    body('status').optional().isIn(['OPEN', 'DISPATCHED', 'CLOSED']),
  ],
  roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'), // Seuls les agents peuvent modifier
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      const incidents = await querySQLObjects(
        'SELECT id, status, closed_at FROM incidents WHERE id = $1',
        [id],
        ['id', 'status', 'closed_at']
      );

      if (incidents.length === 0) {
        return res.status(404).json({ error: 'Incident non trouvé' });
      }

      const existing = incidents[0];

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (status === 'CLOSED' && !existing.closed_at) {
        updates.push(`closed_at = ${formatDate(new Date())}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      updates.push(`updated_at = ${formatDate(new Date())}`);
      params.push(id);

      await executeSQL(
        `UPDATE incidents SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      // Récupérer l'incident mis à jour
      const updated = await querySQLObjects(
        `SELECT i.id, i.reporter_id, i.home_id, i.description, i.photo_url, i.latitude, i.longitude,
                i.status, i.incident_type, i.created_at, i.updated_at, i.closed_at,
                u.id as reporter_id_full, u.nom as reporter_nom, u.email as reporter_email,
                h.id as home_id_full, h.nom as home_nom, h.ville as home_ville
         FROM incidents i
         LEFT JOIN users u ON i.reporter_id = u.id
         LEFT JOIN homes h ON i.home_id = h.id
         WHERE i.id = $1`,
        [id],
        ['id', 'reporter_id', 'home_id', 'description', 'photo_url', 'latitude', 'longitude',
         'status', 'incident_type', 'created_at', 'updated_at', 'closed_at',
         'reporter_id_full', 'reporter_nom', 'reporter_email',
         'home_id_full', 'home_nom', 'home_ville']
      );

      const i = updated[0];
      const incident = {
        id: i.id,
        reporterId: i.reporter_id,
        homeId: i.home_id,
        description: i.description,
        photoUrl: i.photo_url,
        latitude: i.latitude ? parseFloat(i.latitude) : null,
        longitude: i.longitude ? parseFloat(i.longitude) : null,
        status: i.status,
        incidentType: i.incident_type,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        closedAt: i.closed_at,
        reporter: {
          id: i.reporter_id_full,
          nom: i.reporter_nom,
          email: i.reporter_email,
        },
        home: i.home_id_full ? {
          id: i.home_id_full,
          nom: i.home_nom,
          ville: i.home_ville,
        } : null,
      };

      res.json({
        message: 'Incident mis à jour avec succès',
        incident,
      });
    } catch (error) {
      console.error('Erreur mise à jour incident:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }
);

/**
 * POST /api/incidents/upload-photo
 * Upload d'une photo pour un incident
 */
router.post(
  '/upload-photo',
  uploadPhoto,
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucune photo fournie' });
      }

      // Construire l'URL de la photo (accessible via /uploads/filename)
      const photoUrl = `/uploads/${req.file.filename}`;

      res.status(200).json({
        message: 'Photo uploadée avec succès',
        photoUrl: photoUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (error) {
      console.error('Erreur upload photo:', error);
      res.status(500).json({ error: 'Erreur lors de l\'upload de la photo' });
    }
  }
);

export default router;
