import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate } from '../services/sqlService.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * POST /api/meters/pair
 * Appaire un kit IoT à un foyer via QR Code
 * Le QR Code contient : meterId|pairingKey
 */
router.post(
  '/pair',
  [
    body('meterId').isUUID(),
    body('homeId').isUUID(),
    body('pairingKey').trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { meterId, homeId, pairingKey } = req.body;

      // Vérifier que le foyer existe et que l'utilisateur en est propriétaire ou ADMIN
      const homes = await querySQLObjects(
        'SELECT id, proprietaire_id FROM homes WHERE id = $1',
        [homeId],
        ['id', 'proprietaire_id']
      );

      if (homes.length === 0) {
        return res.status(404).json({ error: 'Foyer non trouvé' });
      }

      const home = homes[0];
      const isOwner = home.proprietaire_id === req.user.id;

      // Vérifier si l'utilisateur est ADMIN dans le foyer
      let isAdmin = false;
      if (isOwner) {
        isAdmin = true;
      } else {
        const memberships = await querySQLObjects(
          'SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2',
          [homeId, req.user.id],
          ['role']
        );
        isAdmin = memberships.length > 0 && memberships[0].role === 'ADMIN';
      }

      if (!isAdmin) {
        return res.status(403).json({ error: 'Seul un ADMIN peut appairer des kits IoT' });
      }

      // Vérifier que le compteur existe
      const meters = await querySQLObjects(
        'SELECT id, home_id, firmware_version, status FROM meters WHERE id = $1',
        [meterId],
        ['id', 'home_id', 'firmware_version', 'status']
      );

      if (meters.length === 0) {
        return res.status(404).json({ error: 'Kit IoT non trouvé' });
      }

      const meter = meters[0];

      // Vérifier que le kit n'est pas déjà appairé à un autre foyer
      if (meter.home_id && meter.home_id !== homeId) {
        return res.status(400).json({ 
          error: 'Ce kit IoT est déjà appairé à un autre foyer',
          currentHomeId: meter.home_id
        });
      }

      // Simuler la validation de la clé d'appairage
      // Dans un vrai système, la clé serait stockée dans le kit et vérifiée
      // Pour l'instant, on accepte n'importe quelle clé non vide
      if (!pairingKey || pairingKey.length < 8) {
        return res.status(400).json({ error: 'Clé d\'appairage invalide' });
      }

      // Si le kit est déjà appairé au même foyer, retourner succès
      if (meter.home_id === homeId) {
        return res.json({
          message: 'Kit déjà appairé à ce foyer',
          meter: {
            id: meter.id,
            homeId: meter.home_id,
            firmwareVersion: meter.firmware_version,
            status: meter.status,
          },
        });
      }

      // Appairer le kit au foyer
      await executeSQL(
        `UPDATE meters 
         SET home_id = $1, status = 'ONLINE', last_seen = $2, updated_at = $3 
         WHERE id = $4`,
        [homeId, formatDate(new Date()), formatDate(new Date()), meterId]
      );

      // Récupérer le kit mis à jour
      const updatedMeters = await querySQLObjects(
        'SELECT id, home_id, firmware_version, status, last_seen FROM meters WHERE id = $1',
        [meterId],
        ['id', 'home_id', 'firmware_version', 'status', 'last_seen']
      );

      res.status(200).json({
        message: 'Kit IoT appairé avec succès',
        meter: {
          id: updatedMeters[0].id,
          homeId: updatedMeters[0].home_id,
          firmwareVersion: updatedMeters[0].firmware_version,
          status: updatedMeters[0].status,
          lastSeen: updatedMeters[0].last_seen,
        },
      });
    } catch (error) {
      console.error('Erreur appairage kit:', error);
      res.status(500).json({ error: 'Erreur lors de l\'appairage' });
    }
  }
);

/**
 * GET /api/meters/:meterId
 * Récupère les informations d'un kit IoT
 */
router.get('/:meterId', async (req, res) => {
  try {
    const { meterId } = req.params;

    const meters = await querySQLObjects(
      `SELECT m.id, m.home_id, m.firmware_version, m.status, m.last_seen, m.created_at,
              h.id as home_id_full, h.nom as home_nom, h.ville as home_ville
       FROM meters m
       LEFT JOIN homes h ON m.home_id = h.id
       WHERE m.id = $1`,
      [meterId],
      ['id', 'home_id', 'firmware_version', 'status', 'last_seen', 'created_at',
       'home_id_full', 'home_nom', 'home_ville']
    );

    if (meters.length === 0) {
      return res.status(404).json({ error: 'Kit IoT non trouvé' });
    }

    const meter = meters[0];

    // Vérifier les permissions si le kit est appairé
    if (meter.home_id) {
      const isOwner = meter.home_id_full && meter.home_id_full === req.user.id;
      const isAgentOrAdmin = req.user.role === 'AGENT_EDG' || req.user.role === 'ADMIN_ETAT';
      
      let isMember = false;
      if (!isOwner && !isAgentOrAdmin) {
        const memberships = await querySQLObjects(
          'SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2',
          [meter.home_id, req.user.id],
          ['role']
        );
        isMember = memberships.length > 0;
      }

      if (!isOwner && !isMember && !isAgentOrAdmin) {
        return res.status(403).json({ error: 'Accès refusé' });
      }
    }

    res.json({
      meter: {
        id: meter.id,
        homeId: meter.home_id,
        firmwareVersion: meter.firmware_version,
        status: meter.status,
        lastSeen: meter.last_seen,
        createdAt: meter.created_at,
        home: meter.home_id_full ? {
          id: meter.home_id_full,
          nom: meter.home_nom,
          ville: meter.home_ville,
        } : null,
      },
    });
  } catch (error) {
    console.error('Erreur récupération kit:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
