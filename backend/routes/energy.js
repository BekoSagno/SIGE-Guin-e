import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { detectFraud } from '../services/fraudDetection.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/energy/telemetry
 * Reçoit les données de télémétrie des kits IoT
 * Accessible par les kits IoT (authentification optionnelle pour l'instant)
 */
router.post(
  '/telemetry',
  [
    body('meterId').isUUID(),
    body('voltage').optional().isFloat({ min: 0 }),
    body('current').optional().isFloat({ min: 0 }),
    body('power').optional().isFloat({ min: 0 }),
    body('energySource').isIn(['GRID', 'SOLAR', 'BATTERY']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { meterId, voltage, current, power, energySource } = req.body;

      // Vérifier que le compteur existe
      const meter = await prisma.meter.findUnique({
        where: { id: meterId },
        include: { home: true },
      });

      if (!meter) {
        return res.status(404).json({ error: 'Compteur non trouvé' });
      }

      // Créer l'enregistrement de données énergétiques
      const energyData = await prisma.energyData.create({
        data: {
          meterId,
          voltage,
          current,
          power,
          energySource,
          timestamp: new Date(),
        },
      });

      // Mettre à jour le statut du compteur (en ligne)
      await prisma.meter.update({
        where: { id: meterId },
        data: {
          status: 'ONLINE',
          lastSeen: new Date(),
        },
      });

      // Détection automatique de fraude
      if (power && energySource === 'GRID') {
        const fraudDetected = await detectFraud(meterId, power);
        
        if (fraudDetected) {
          // Créer un incident de fraude suspectée
          await prisma.incident.create({
            data: {
              reporterId: null,
              homeId: meter.homeId,
              description: `Suspicion de fraude détectée: Puissance consommée (${power}W) dépasse l'index du compteur de plus de 15%`,
              latitude: meter.home.latitude,
              longitude: meter.home.longitude,
              status: 'OPEN',
              incidentType: 'FRAUDE_SUSPECTEE',
            },
          });

          // Retourner un avertissement
          return res.status(201).json({
            message: 'Données enregistrées avec succès',
            data: energyData,
            warning: 'Suspicion de fraude détectée',
            fraudDetected: true,
          });
        }
      }

      res.status(201).json({
        message: 'Données enregistrées avec succès',
        data: energyData,
      });
    } catch (error) {
      console.error('Erreur télémétrie:', error);
      res.status(500).json({ error: 'Erreur lors de l\'enregistrement des données' });
    }
  }
);

/**
 * GET /api/energy/consumption
 * Récupère la consommation d'un foyer sur une période
 */
router.get('/consumption', authMiddleware, async (req, res) => {
  try {
    const { homeId, startDate, endDate } = req.query;

    if (!homeId) {
      return res.status(400).json({ error: 'homeId requis' });
    }

    // Vérifier que l'utilisateur a accès à ce foyer
    const home = await prisma.home.findUnique({
      where: { id: homeId },
    });

    if (!home) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    // Vérifier les permissions (propriétaire ou agent EDG/admin)
    if (
      home.proprietaireId !== req.user.id &&
      req.user.role !== 'AGENT_EDG' &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé à ce foyer' });
    }

    // Récupérer les compteurs du foyer
    const meters = await prisma.meter.findMany({
      where: { homeId },
    });

    const meterIds = meters.map((m) => m.id);

    // Construire la requête avec filtres de date
    const where = {
      meterId: { in: meterIds },
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // Récupérer les données énergétiques
    const energyData = await prisma.energyData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limiter à 1000 enregistrements
    });

    // Calculer les statistiques
    const totalPower = energyData.reduce((sum, data) => sum + (data.power || 0), 0);
    const avgPower = energyData.length > 0 ? totalPower / energyData.length : 0;
    const gridConsumption = energyData
      .filter((d) => d.energySource === 'GRID')
      .reduce((sum, data) => sum + (data.power || 0), 0);
    const solarConsumption = energyData
      .filter((d) => d.energySource === 'SOLAR')
      .reduce((sum, data) => sum + (data.power || 0), 0);

    res.json({
      homeId,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      statistics: {
        totalRecords: energyData.length,
        averagePower: avgPower,
        totalGridConsumption: gridConsumption,
        totalSolarConsumption: solarConsumption,
      },
      data: energyData,
    });
  } catch (error) {
    console.error('Erreur récupération consommation:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/energy/history
 * Récupère l'historique des données d'un compteur
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { meterId, limit = 100 } = req.query;

    if (!meterId) {
      return res.status(400).json({ error: 'meterId requis' });
    }

    // Vérifier que le compteur existe et que l'utilisateur y a accès
    const meter = await prisma.meter.findUnique({
      where: { id: meterId },
      include: { home: true },
    });

    if (!meter) {
      return res.status(404).json({ error: 'Compteur non trouvé' });
    }

    // Vérifier les permissions
    if (
      meter.home.proprietaireId !== req.user.id &&
      req.user.role !== 'AGENT_EDG' &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Récupérer l'historique
    const history = await prisma.energyData.findMany({
      where: { meterId },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
    });

    res.json({
      meterId,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
