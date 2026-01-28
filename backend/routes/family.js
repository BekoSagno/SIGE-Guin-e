import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/family/members/:homeId
 * Liste les membres d'un foyer
 */
router.get('/members/:homeId', async (req, res) => {
  try {
    const { homeId } = req.params;

    // Vérifier que l'utilisateur a accès à ce foyer
    const home = await prisma.home.findUnique({
      where: { id: homeId },
    });

    if (!home) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    // Vérifier les permissions
    const isOwner = home.proprietaireId === req.user.id;
    const membership = await prisma.homeMember.findUnique({
      where: {
        homeId_userId: {
          homeId,
          userId: req.user.id,
        },
      },
    });

    if (!isOwner && !membership) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Récupérer tous les membres
    const members = await prisma.homeMember.findMany({
      where: { homeId },
      include: {
        user: {
          select: {
            id: true,
            nom: true,
            email: true,
          },
        },
      },
    });

    // Ajouter le propriétaire comme ADMIN
    const owner = await prisma.user.findUnique({
      where: { id: home.proprietaireId },
      select: {
        id: true,
        nom: true,
        email: true,
      },
    });

    const allMembers = [
      {
        id: owner.id,
        nom: owner.nom,
        email: owner.email,
        role: 'ADMIN',
        isOwner: true,
      },
      ...members.map((m) => ({
        id: m.user.id,
        nom: m.user.nom,
        email: m.user.email,
        role: m.role,
        isOwner: false,
      })),
    ];

    res.json({ members: allMembers });
  } catch (error) {
    console.error('Erreur récupération membres:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/family/invite
 * Invite un membre à rejoindre un foyer
 */
router.post(
  '/invite',
  [
    body('homeId').isUUID(),
    body('email').isEmail(),
    body('role').isIn(['ADMIN', 'MEMBER', 'CHILD']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { homeId, email, role } = req.body;

      // Vérifier que le foyer existe
      const home = await prisma.home.findUnique({
        where: { id: homeId },
      });

      if (!home) {
        return res.status(404).json({ error: 'Foyer non trouvé' });
      }

      // Vérifier que l'utilisateur est propriétaire ou ADMIN
      const isOwner = home.proprietaireId === req.user.id;
      const membership = await prisma.homeMember.findUnique({
        where: {
          homeId_userId: {
            homeId,
            userId: req.user.id,
          },
        },
      });

      if (!isOwner && membership?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Seul un ADMIN peut inviter des membres' });
      }

      // Trouver l'utilisateur à inviter
      const userToInvite = await prisma.user.findUnique({
        where: { email },
      });

      if (!userToInvite) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Vérifier qu'il n'est pas déjà membre
      const existingMember = await prisma.homeMember.findUnique({
        where: {
          homeId_userId: {
            homeId,
            userId: userToInvite.id,
          },
        },
      });

      if (existingMember) {
        return res.status(400).json({ error: 'Cet utilisateur est déjà membre' });
      }

      // Créer l'invitation (membre)
      const member = await prisma.homeMember.create({
        data: {
          homeId,
          userId: userToInvite.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              nom: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({
        message: 'Membre ajouté avec succès',
        member,
      });
    } catch (error) {
      console.error('Erreur invitation:', error);
      res.status(500).json({ error: 'Erreur lors de l\'invitation' });
    }
  }
);

/**
 * DELETE /api/family/members/:homeId/:userId
 * Retire un membre d'un foyer
 */
router.delete('/members/:homeId/:userId', async (req, res) => {
  try {
    const { homeId, userId } = req.params;

    // Vérifier que le foyer existe
    const home = await prisma.home.findUnique({
      where: { id: homeId },
    });

    if (!home) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    // Vérifier que l'utilisateur est propriétaire ou ADMIN
    const isOwner = home.proprietaireId === req.user.id;
    const membership = await prisma.homeMember.findUnique({
      where: {
        homeId_userId: {
          homeId,
          userId: req.user.id,
        },
      },
    });

    if (!isOwner && membership?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Seul un ADMIN peut retirer des membres' });
    }

    // Ne pas permettre de retirer le propriétaire
    if (userId === home.proprietaireId) {
      return res.status(400).json({ error: 'Impossible de retirer le propriétaire' });
    }

    // Supprimer le membre
    await prisma.homeMember.delete({
      where: {
        homeId_userId: {
          homeId,
          userId,
        },
      },
    });

    res.json({ message: 'Membre retiré avec succès' });
  } catch (error) {
    console.error('Erreur retrait membre:', error);
    res.status(500).json({ error: 'Erreur lors du retrait' });
  }
});

export default router;
