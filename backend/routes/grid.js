import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Toutes les routes nécessitent une authentification et le rôle AGENT_EDG ou ADMIN_ETAT
router.use(authMiddleware);
router.use(roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'));

/**
 * POST /api/grid/load-shedding
 * Déclenche un délestage intelligent sur une zone
 */
router.post(
  '/load-shedding',
  [
    body('zoneId').trim().notEmpty(),
    body('commandType').isIn(['SHED_HEAVY_LOADS', 'RESTORE']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { zoneId, commandType } = req.body;

      // Trouver tous les foyers de la zone
      const homes = await prisma.home.findMany({
        where: { ville: zoneId },
        include: {
          meters: {
            where: { status: 'ONLINE' },
          },
        },
      });

      // Compter les compteurs affectés
      const metersAffected = homes.reduce(
        (count, home) => count + home.meters.length,
        0
      );

      // Créer l'événement de délestage
      const sheddingEvent = await prisma.loadSheddingEvent.create({
        data: {
          zoneId,
          triggeredBy: req.user.id,
          commandType,
          metersAffected,
        },
      });

      // TODO: Envoyer la commande MQTT aux boîtiers IoT
      // Pour l'instant, on simule juste l'enregistrement

      res.status(201).json({
        message: `Délestage ${commandType} déclenché sur la zone ${zoneId}`,
        event: sheddingEvent,
        metersAffected,
        homesAffected: homes.length,
      });
    } catch (error) {
      console.error('Erreur délestage:', error);
      res.status(500).json({ error: 'Erreur lors du délestage' });
    }
  }
);

/**
 * GET /api/grid/zones
 * Liste toutes les zones avec leurs statistiques
 */
router.get('/zones', async (req, res) => {
  try {
    // Récupérer toutes les villes distinctes
    const homes = await prisma.home.findMany({
      select: { ville: true },
      distinct: ['ville'],
    });

    const zones = await Promise.all(
      homes.map(async (home) => {
        const zoneHomes = await prisma.home.findMany({
          where: { ville: home.ville },
          include: {
            meters: {
              where: { status: 'ONLINE' },
            },
          },
        });

        const totalMeters = zoneHomes.reduce(
          (count, h) => count + h.meters.length,
          0
        );

        return {
          zoneId: home.ville,
          homesCount: zoneHomes.length,
          onlineMeters: totalMeters,
        };
      })
    );

    res.json({ zones });
  } catch (error) {
    console.error('Erreur récupération zones:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/grid/transformers
 * Liste les transformateurs avec leur charge
 */
router.get('/transformers', async (req, res) => {
  try {
    // Pour l'instant, on simule les données des transformateurs
    // Dans un vrai système, cela viendrait d'une table dédiée
    const zones = await prisma.home.findMany({
      select: { ville: true },
      distinct: ['ville'],
    });

    const transformers = await Promise.all(
      zones.map(async (zone) => {
        // Calculer la charge totale de la zone
        const homes = await prisma.home.findMany({
          where: { ville: zone.ville },
          include: {
            meters: {
              include: {
                energyData: {
                  where: {
                    timestamp: {
                      gte: new Date(Date.now() - 60 * 60 * 1000), // Dernière heure
                    },
                  },
                  orderBy: { timestamp: 'desc' },
                  take: 1,
                },
              },
            },
          },
        });

        let totalLoad = 0;
        homes.forEach((home) => {
          home.meters.forEach((meter) => {
            if (meter.energyData.length > 0) {
              totalLoad += meter.energyData[0].power || 0;
            }
          });
        });

        // Simuler une capacité de transformateur (en kVA)
        const capacity = 630; // 630 kVA par défaut
        const loadPercentage = (totalLoad / (capacity * 1000)) * 100;

        return {
          zoneId: zone.ville,
          transformerId: `TRANS-${zone.ville}`,
          capacity: capacity,
          currentLoad: totalLoad,
          loadPercentage: Math.min(loadPercentage, 100),
          status: loadPercentage > 85 ? 'CRITICAL' : loadPercentage > 70 ? 'WARNING' : 'NORMAL',
        };
      })
    );

    res.json({ transformers });
  } catch (error) {
    console.error('Erreur récupération transformateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
