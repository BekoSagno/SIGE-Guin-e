import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Toutes les routes nécessitent une authentification
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
      incidents = await prisma.incident.findMany({
        include: {
          reporter: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
          home: {
            select: {
              id: true,
              nom: true,
              ville: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Les citoyens voient uniquement leurs incidents
      incidents = await prisma.incident.findMany({
        where: { reporterId: req.user.id },
        include: {
          home: {
            select: {
              id: true,
              nom: true,
              ville: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({ incidents });
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

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            nom: true,
            email: true,
          },
        },
        home: true,
      },
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident non trouvé' });
    }

    // Vérifier les permissions
    if (
      incident.reporterId !== req.user.id &&
      req.user.role !== 'AGENT_EDG' &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

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
        const home = await prisma.home.findUnique({
          where: { id: homeId },
        });

        if (!home) {
          return res.status(404).json({ error: 'Foyer non trouvé' });
        }

        // Vérifier les permissions
        if (
          home.proprietaireId !== req.user.id &&
          req.user.role !== 'AGENT_EDG' &&
          req.user.role !== 'ADMIN_ETAT'
        ) {
          return res.status(403).json({ error: 'Accès refusé à ce foyer' });
        }
      }

      // Créer l'incident
      const incident = await prisma.incident.create({
        data: {
          description,
          reporterId: req.user.id,
          homeId: homeId || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          incidentType: incidentType || 'AUTRE',
          photoUrl: photoUrl || null,
          status: 'OPEN',
        },
        include: {
          reporter: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
          home: {
            select: {
              id: true,
              nom: true,
              ville: true,
            },
          },
        },
      });

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

      const incident = await prisma.incident.findUnique({
        where: { id },
      });

      if (!incident) {
        return res.status(404).json({ error: 'Incident non trouvé' });
      }

      const updateData = {};
      if (status) updateData.status = status;
      if (status === 'CLOSED' && !incident.closedAt) {
        updateData.closedAt = new Date();
      }

      const updatedIncident = await prisma.incident.update({
        where: { id },
        data: updateData,
        include: {
          reporter: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
          home: {
            select: {
              id: true,
              nom: true,
              ville: true,
            },
          },
        },
      });

      res.json({
        message: 'Incident mis à jour avec succès',
        incident: updatedIncident,
      });
    } catch (error) {
      console.error('Erreur mise à jour incident:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }
);

export default router;
