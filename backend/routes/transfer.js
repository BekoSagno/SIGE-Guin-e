import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const prisma = new PrismaClient();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * POST /api/transfer/energy
 * Transfère du crédit ou de l'énergie entre deux foyers
 */
router.post(
  '/energy',
  [
    body('fromHomeId').isUUID(),
    body('toHomeId').isUUID(),
    body('amount').isFloat({ min: 0.01 }),
    body('unit').isIn(['GNF', 'Wh']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fromHomeId, toHomeId, amount, unit } = req.body;

      // Vérifier que les deux foyers existent
      const fromHome = await prisma.home.findUnique({
        where: { id: fromHomeId },
        include: { financials: true },
      });

      const toHome = await prisma.home.findUnique({
        where: { id: toHomeId },
        include: { financials: true },
      });

      if (!fromHome || !toHome) {
        return res.status(404).json({ error: 'Un ou plusieurs foyers non trouvés' });
      }

      // Vérifier que l'utilisateur est propriétaire des deux foyers
      if (fromHome.proprietaireId !== req.user.id) {
        return res.status(403).json({ error: 'Vous n\'êtes pas propriétaire du foyer source' });
      }

      if (toHome.proprietaireId !== req.user.id) {
        return res.status(403).json({ error: 'Vous n\'êtes pas propriétaire du foyer destination' });
      }

      // Vérifier que le foyer source a suffisamment de crédit
      const fromFinancial = fromHome.financials;
      if (!fromFinancial) {
        return res.status(400).json({ error: 'Foyer source sans compte financier' });
      }

      if (unit === 'GNF' && fromFinancial.balance < amount) {
        return res.status(400).json({ error: 'Solde insuffisant' });
      }

      // Effectuer le transfert dans une transaction
      const result = await prisma.$transaction(async (tx) => {
        // Créer la transaction
        const transaction = await tx.energyTransaction.create({
          data: {
            fromHomeId,
            toHomeId,
            amount,
            unit,
            initiatedBy: req.user.id,
          },
        });

        // Mettre à jour les soldes si c'est un transfert GNF
        if (unit === 'GNF') {
          await tx.financial.update({
            where: { homeId: fromHomeId },
            data: {
              balance: {
                decrement: amount,
              },
            },
          });

          // Créer ou mettre à jour le compte financier du foyer destination
          const toFinancial = await tx.financial.upsert({
            where: { homeId: toHomeId },
            create: {
              homeId: toHomeId,
              balance: amount,
            },
            update: {
              balance: {
                increment: amount,
              },
            },
          });
        }

        return transaction;
      });

      res.status(201).json({
        message: 'Transfert effectué avec succès',
        transaction: result,
      });
    } catch (error) {
      console.error('Erreur transfert:', error);
      res.status(500).json({ error: 'Erreur lors du transfert' });
    }
  }
);

/**
 * GET /api/transfer/history
 * Récupère l'historique des transferts de l'utilisateur
 */
router.get('/history', async (req, res) => {
  try {
    const transactions = await prisma.energyTransaction.findMany({
      where: { initiatedBy: req.user.id },
      include: {
        fromHome: {
          select: {
            id: true,
            nom: true,
          },
        },
        toHome: {
          select: {
            id: true,
            nom: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
