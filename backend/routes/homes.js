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
 * GET /api/homes
 * Liste les foyers de l'utilisateur (ou tous si agent EDG/admin)
 */
router.get('/', async (req, res) => {
  try {
    let homes;

    if (req.user.role === 'AGENT_EDG' || req.user.role === 'ADMIN_ETAT') {
      // Les agents EDG et admins voient tous les foyers
      homes = await prisma.home.findMany({
        include: {
          proprietaire: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
          meters: {
            select: {
              id: true,
              status: true,
              lastSeen: true,
            },
          },
          financials: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Les citoyens voient uniquement leurs foyers
      homes = await prisma.home.findMany({
        where: { proprietaireId: req.user.id },
        include: {
          meters: {
            select: {
              id: true,
              status: true,
              lastSeen: true,
            },
          },
          financials: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({ homes });
  } catch (error) {
    console.error('Erreur récupération foyers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/homes/:id
 * Récupère un foyer spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const home = await prisma.home.findUnique({
      where: { id },
      include: {
        proprietaire: {
          select: {
            id: true,
            nom: true,
            email: true,
          },
        },
        meters: {
          include: {
            nilmSignatures: {
              where: { isActive: true },
            },
          },
        },
        financials: true,
      },
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
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json({ home });
  } catch (error) {
    console.error('Erreur récupération foyer:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/homes
 * Crée un nouveau foyer
 */
router.post(
  '/',
  [
    body('nom').trim().notEmpty(),
    body('ville').trim().notEmpty(),
    body('type').isIn(['EDG', 'SOLAIRE', 'HYBRIDE']),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { nom, ville, type, latitude, longitude } = req.body;

      // Créer le foyer
      const home = await prisma.home.create({
        data: {
          nom,
          ville,
          type,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          proprietaireId: req.user.id,
        },
        include: {
          proprietaire: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
        },
      });

      // Créer un compte financier par défaut
      await prisma.financial.create({
        data: {
          homeId: home.id,
          balance: 0,
          monthlyBudget: null,
        },
      });

      res.status(201).json({
        message: 'Foyer créé avec succès',
        home,
      });
    } catch (error) {
      console.error('Erreur création foyer:', error);
      res.status(500).json({ error: 'Erreur lors de la création' });
    }
  }
);

/**
 * PUT /api/homes/:id
 * Met à jour un foyer
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, ville, type, latitude, longitude } = req.body;

    // Vérifier que le foyer existe
    const existingHome = await prisma.home.findUnique({
      where: { id },
    });

    if (!existingHome) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    // Vérifier les permissions
    if (
      existingHome.proprietaireId !== req.user.id &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Mettre à jour
    const home = await prisma.home.update({
      where: { id },
      data: {
        ...(nom && { nom }),
        ...(ville && { ville }),
        ...(type && { type }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
      },
    });

    res.json({
      message: 'Foyer mis à jour avec succès',
      home,
    });
  } catch (error) {
    console.error('Erreur mise à jour foyer:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

/**
 * DELETE /api/homes/:id
 * Supprime un foyer
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le foyer existe
    const existingHome = await prisma.home.findUnique({
      where: { id },
    });

    if (!existingHome) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    // Vérifier les permissions
    if (
      existingHome.proprietaireId !== req.user.id &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Supprimer (cascade supprimera les compteurs, données, etc.)
    await prisma.home.delete({
      where: { id },
    });

    res.json({ message: 'Foyer supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression foyer:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
