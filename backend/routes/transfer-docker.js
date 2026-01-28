import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID } from '../services/sqlService.js';

const router = express.Router();

/**
 * POST /api/transfer
 * Effectuer un transfert d'énergie/crédit entre deux foyers
 */
router.post('/', authMiddleware, [
  body('fromHomeId').isUUID(),
  body('toHomeId').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('unit').isIn(['GNF', 'Wh']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fromHomeId, toHomeId, amount, unit } = req.body;
    const userId = req.user.id;

    // Vérifier que les deux foyers sont différents
    if (fromHomeId === toHomeId) {
      return res.status(400).json({ error: 'Le foyer source et destination doivent être différents' });
    }

    // Vérifier l'accès au foyer source (propriétaire ou admin)
    const sourceHomes = await querySQLObjects(
      `SELECT h.id, h.nom, f.balance 
       FROM homes h
       LEFT JOIN financials f ON f.home_id = h.id
       WHERE h.id = '${fromHomeId}' 
       AND (h.proprietaire_id = '${userId}' 
            OR h.id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}' AND role = 'ADMIN'))`,
      [],
      ['id', 'nom', 'balance']
    );

    if (sourceHomes.length === 0) {
      return res.status(403).json({ error: 'Vous n\'avez pas accès au foyer source ou n\'êtes pas administrateur' });
    }

    const sourceHome = sourceHomes[0];
    const currentBalance = parseFloat(sourceHome.balance) || 0;

    // Vérifier le solde suffisant pour les transferts en GNF
    if (unit === 'GNF' && currentBalance < amount) {
      return res.status(400).json({ 
        error: 'Solde insuffisant', 
        currentBalance,
        requestedAmount: amount 
      });
    }

    // Vérifier que le foyer destination existe
    const destHomes = await querySQLObjects(
      `SELECT id, nom FROM homes WHERE id = '${toHomeId}'`,
      [],
      ['id', 'nom']
    );

    if (destHomes.length === 0) {
      return res.status(404).json({ error: 'Foyer destination non trouvé' });
    }

    const destHome = destHomes[0];

    // Créer la transaction
    const transactionId = generateUUID();
    const now = new Date().toISOString();

    await executeSQL(
      `INSERT INTO energy_transactions (id, from_home_id, to_home_id, amount, unit, status, initiated_by, created_at, updated_at)
       VALUES ('${transactionId}', '${fromHomeId}', '${toHomeId}', ${amount}, '${unit}', 'COMPLETED', '${userId}', '${now}', '${now}')`,
      []
    );

    // Mettre à jour les soldes si c'est un transfert en GNF
    if (unit === 'GNF') {
      // Débiter le foyer source
      await executeSQL(
        `UPDATE financials SET balance = balance - ${amount}, updated_at = '${now}' WHERE home_id = '${fromHomeId}'`,
        []
      );

      // Créditer le foyer destination (créer l'entrée si elle n'existe pas)
      const destFinancials = await querySQLObjects(
        `SELECT id FROM financials WHERE home_id = '${toHomeId}'`,
        [],
        ['id']
      );

      if (destFinancials.length === 0) {
        const financialId = generateUUID();
        await executeSQL(
          `INSERT INTO financials (id, home_id, balance, created_at, updated_at) 
           VALUES ('${financialId}', '${toHomeId}', ${amount}, '${now}', '${now}')`,
          []
        );
      } else {
        await executeSQL(
          `UPDATE financials SET balance = balance + ${amount}, updated_at = '${now}' WHERE home_id = '${toHomeId}'`,
          []
        );
      }
    }

    console.log(`💸 Transfert effectué: ${amount} ${unit} de ${sourceHome.nom} vers ${destHome.nom} par utilisateur ${userId}`);

    res.status(201).json({
      message: 'Transfert effectué avec succès',
      transaction: {
        id: transactionId,
        fromHome: { id: fromHomeId, nom: sourceHome.nom },
        toHome: { id: toHomeId, nom: destHome.nom },
        amount,
        unit,
        status: 'COMPLETED',
        createdAt: now,
      },
    });
  } catch (error) {
    console.error('Erreur transfert:', error);
    res.status(500).json({ error: 'Erreur lors du transfert' });
  }
});

/**
 * GET /api/transfer/history
 * Récupérer l'historique des transferts de l'utilisateur
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    // Récupérer les foyers de l'utilisateur
    const userHomes = await querySQLObjects(
      `SELECT id FROM homes WHERE proprietaire_id = '${userId}'
       UNION
       SELECT home_id as id FROM home_members WHERE user_id = '${userId}'`,
      [],
      ['id']
    );

    if (userHomes.length === 0) {
      return res.json({ transactions: [] });
    }

    const homeIds = userHomes.map(h => `'${h.id}'`).join(',');

    // Récupérer les transactions
    const transactions = await querySQLObjects(
      `SELECT 
        t.id, t.from_home_id, t.to_home_id, t.amount, t.unit, 
        COALESCE(t.status, 'COMPLETED') as status, t.created_at,
        fh.nom as from_home_nom, th.nom as to_home_nom,
        u.nom as initiated_by_name
       FROM energy_transactions t
       JOIN homes fh ON t.from_home_id = fh.id
       JOIN homes th ON t.to_home_id = th.id
       LEFT JOIN users u ON t.initiated_by = u.id
       WHERE t.from_home_id IN (${homeIds}) OR t.to_home_id IN (${homeIds})
       ORDER BY t.created_at DESC
       LIMIT ${parseInt(limit)}`,
      [],
      ['id', 'from_home_id', 'to_home_id', 'amount', 'unit', 'status', 'created_at', 'from_home_nom', 'to_home_nom', 'initiated_by_name']
    );

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      fromHome: { id: t.from_home_id, nom: t.from_home_nom },
      toHome: { id: t.to_home_id, nom: t.to_home_nom },
      amount: parseFloat(t.amount),
      unit: t.unit,
      status: t.status,
      initiatedBy: t.initiated_by_name,
      createdAt: t.created_at,
    }));

    res.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * GET /api/transfer/balance/:homeId
 * Récupérer le solde d'un foyer
 */
router.get('/balance/:homeId', authMiddleware, async (req, res) => {
  try {
    const { homeId } = req.params;
    const userId = req.user.id;

    // Vérifier l'accès au foyer
    const homes = await querySQLObjects(
      `SELECT h.id, h.nom, f.balance 
       FROM homes h
       LEFT JOIN financials f ON f.home_id = h.id
       WHERE h.id = '${homeId}' 
       AND (h.proprietaire_id = '${userId}' 
            OR h.id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))`,
      [],
      ['id', 'nom', 'balance']
    );

    if (homes.length === 0) {
      return res.status(403).json({ error: 'Accès non autorisé à ce foyer' });
    }

    const home = homes[0];

    res.json({
      homeId,
      homeName: home.nom,
      balance: parseFloat(home.balance) || 0,
      currency: 'GNF',
    });
  } catch (error) {
    console.error('Erreur récupération solde:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
