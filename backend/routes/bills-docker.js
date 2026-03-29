import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID } from '../services/sqlService.js';

const router = express.Router();

/**
 * GET /api/bills
 * Récupérer les factures d'un foyer (pour citoyen) ou toutes les factures (pour EDG)
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { homeId, status, limit = 50 } = req.query;

    let bills;

    if (userRole === 'AGENT_EDG' || userRole === 'ADMIN_ETAT') {
      // Agents EDG voient toutes les factures
      let query = `
        SELECT 
          b.id, b.home_id, b.meter_id, b.billing_period_start, b.billing_period_end,
          b.consumption_kwh, b.tariff_per_kwh, b.total_amount, b.due_date,
          b.status, b.paid_at, b.paid_amount, b.created_at, b.updated_at, b.notes,
          h.nom as home_nom, h.ville as home_ville,
          u.nom as created_by_name
        FROM edg_bills b
        JOIN homes h ON b.home_id = h.id
        LEFT JOIN users u ON b.created_by = u.id
        WHERE 1=1
      `;

      if (homeId) {
        query += ` AND b.home_id = '${homeId}'`;
      }
      if (status) {
        query += ` AND b.status = '${status}'`;
      }

      query += ` ORDER BY b.created_at DESC LIMIT ${parseInt(limit)}`;

      bills = await querySQLObjects(query, [], [
        'id', 'home_id', 'meter_id', 'billing_period_start', 'billing_period_end',
        'consumption_kwh', 'tariff_per_kwh', 'total_amount', 'due_date',
        'status', 'paid_at', 'paid_amount', 'created_at', 'updated_at', 'notes',
        'home_nom', 'home_ville', 'created_by_name'
      ]);
    } else {
      // Citoyens voient uniquement leurs factures
      let query = `
        SELECT 
          b.id, b.home_id, b.meter_id, b.billing_period_start, b.billing_period_end,
          b.consumption_kwh, b.tariff_per_kwh, b.total_amount, b.due_date,
          b.status, b.paid_at, b.paid_amount, b.created_at, b.updated_at, b.notes,
          h.nom as home_nom, h.ville as home_ville
        FROM edg_bills b
        JOIN homes h ON b.home_id = h.id
        WHERE (h.proprietaire_id = '${userId}' 
               OR h.id IN (SELECT home_id FROM home_members WHERE user_id = '${userId}'))
      `;

      if (homeId) {
        query += ` AND b.home_id = '${homeId}'`;
      }
      if (status) {
        query += ` AND b.status = '${status}'`;
      }

      query += ` ORDER BY b.created_at DESC LIMIT ${parseInt(limit)}`;

      bills = await querySQLObjects(query, [], [
        'id', 'home_id', 'meter_id', 'billing_period_start', 'billing_period_end',
        'consumption_kwh', 'tariff_per_kwh', 'total_amount', 'due_date',
        'status', 'paid_at', 'paid_amount', 'created_at', 'updated_at', 'notes',
        'home_nom', 'home_ville'
      ]);
    }

    const formattedBills = bills.map(bill => ({
      id: bill.id,
      homeId: bill.home_id,
      homeName: bill.home_nom,
      homeVille: bill.home_ville,
      meterId: bill.meter_id,
      billingPeriod: {
        start: bill.billing_period_start,
        end: bill.billing_period_end,
      },
      consumptionKwh: parseFloat(bill.consumption_kwh) || 0,
      tariffPerKwh: parseFloat(bill.tariff_per_kwh) || 1000,
      totalAmount: parseFloat(bill.total_amount) || 0,
      dueDate: bill.due_date,
      status: bill.status,
      paidAt: bill.paid_at,
      paidAmount: bill.paid_amount ? parseFloat(bill.paid_amount) : null,
      createdAt: bill.created_at,
      updatedAt: bill.updated_at,
      notes: bill.notes,
      createdByName: bill.created_by_name || null,
    }));

    res.json({ bills: formattedBills });
  } catch (error) {
    console.error('Erreur récupération factures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des factures' });
  }
});

/**
 * POST /api/bills
 * Créer une nouvelle facture EDG (réservé aux agents EDG)
 */
router.post('/', authMiddleware, roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'), [
  body('homeId').isUUID(),
  body('billingPeriodStart').isISO8601(),
  body('billingPeriodEnd').isISO8601(),
  body('consumptionKwh').isFloat({ min: 0 }),
  body('tariffPerKwh').optional().isFloat({ min: 0 }),
  body('dueDate').isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      homeId,
      meterId,
      billingPeriodStart,
      billingPeriodEnd,
      consumptionKwh,
      tariffPerKwh = 1000,
      dueDate,
      notes,
    } = req.body;

    const userId = req.user.id;
    const totalAmount = consumptionKwh * tariffPerKwh;
    const billId = generateUUID();
    const now = new Date().toISOString();

    // Vérifier que le foyer existe
    const homes = await querySQLObjects(
      `SELECT id, nom FROM homes WHERE id = '${homeId}'`,
      [],
      ['id', 'nom']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    // Créer la facture
    await executeSQL(
      `INSERT INTO edg_bills (
        id, home_id, meter_id, billing_period_start, billing_period_end,
        consumption_kwh, tariff_per_kwh, total_amount, due_date,
        status, created_by, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        billId, homeId, meterId || null, 
        billingPeriodStart.includes('T') ? billingPeriodStart.split('T')[0] : billingPeriodStart,
        billingPeriodEnd.includes('T') ? billingPeriodEnd.split('T')[0] : billingPeriodEnd,
        consumptionKwh, tariffPerKwh, totalAmount,
        dueDate.includes('T') ? dueDate.split('T')[0] : dueDate,
        'PENDING', userId, notes || null, now, now
      ]
    );

    console.log(`📄 Facture créée: ${billId} pour le foyer ${homes[0].nom} - ${totalAmount} GNF`);

    res.status(201).json({
      message: 'Facture créée avec succès',
      bill: {
        id: billId,
        homeId,
        homeName: homes[0].nom,
        totalAmount,
        dueDate,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('Erreur création facture:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la facture' });
  }
});

/**
 * POST /api/bills/:billId/pay
 * Payer une facture
 */
router.post('/:billId/pay', authMiddleware, [
  body('paymentMethod').isIn(['WALLET', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH']),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentReference').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { billId } = req.params;
    const { paymentMethod, amount, paymentReference, notes } = req.body;
    const userId = req.user.id;

    // Récupérer la facture
    const bills = await querySQLObjects(
      `SELECT 
        b.id, b.home_id, b.total_amount, b.status, b.paid_amount,
        h.nom as home_nom, h.proprietaire_id
      FROM edg_bills b
      JOIN homes h ON b.home_id = h.id
      WHERE b.id = '${billId}'`,
      [],
      ['id', 'home_id', 'total_amount', 'status', 'paid_amount', 'home_nom', 'proprietaire_id']
    );

    if (bills.length === 0) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const bill = bills[0];

    // Vérifier l'accès au foyer
    if (bill.proprietaire_id !== userId && 
        !(await querySQLObjects(
          `SELECT id FROM home_members WHERE home_id = '${bill.home_id}' AND user_id = '${userId}'`,
          [],
          ['id']
        )).length) {
      return res.status(403).json({ error: 'Accès non autorisé à cette facture' });
    }

    // Vérifier que la facture n'est pas déjà payée
    if (bill.status === 'PAID') {
      return res.status(400).json({ error: 'Cette facture est déjà payée' });
    }

    // Vérifier le montant
    const totalAmount = parseFloat(bill.total_amount);
    const remainingAmount = totalAmount - (parseFloat(bill.paid_amount) || 0);

    if (amount > remainingAmount) {
      return res.status(400).json({ 
        error: 'Le montant payé ne peut pas dépasser le montant restant',
        totalAmount,
        remainingAmount,
      });
    }

    const paymentId = generateUUID();
    const now = new Date().toISOString();
    let transactionId = null;

    // Si paiement via wallet, débiter le solde
    if (paymentMethod === 'WALLET') {
      // Vérifier le solde
      const financials = await querySQLObjects(
        `SELECT balance FROM financials WHERE home_id = '${bill.home_id}'`,
        [],
        ['balance']
      );

      const balance = financials.length > 0 ? parseFloat(financials[0].balance) : 0;

      if (balance < amount) {
        return res.status(400).json({ 
          error: 'Solde insuffisant',
          balance,
          required: amount,
        });
      }

      // Débiter le solde
      await executeSQL(
        `UPDATE financials SET balance = balance - $1, updated_at = $2 WHERE home_id = $3`,
        [amount, now, bill.home_id]
      );

      // Créer une transaction pour le paiement
      transactionId = generateUUID();
      await executeSQL(
        `INSERT INTO energy_transactions (
          id, from_home_id, to_home_id, amount, unit, status, initiated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          transactionId, bill.home_id, null, amount, 'GNF', 'COMPLETED', userId, now, now
        ]
      );
    }

    // Créer le paiement
    await executeSQL(
      `INSERT INTO edg_payments (
        id, bill_id, home_id, amount, payment_method, payment_reference,
        status, paid_by, transaction_id, notes, created_at, updated_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        paymentId, billId, bill.home_id, amount, paymentMethod, paymentReference || null,
        'COMPLETED', userId, transactionId, notes || null, now, now, now
      ]
    );

    // Mettre à jour la facture
    const newPaidAmount = (parseFloat(bill.paid_amount) || 0) + amount;
    const newStatus = newPaidAmount >= totalAmount ? 'PAID' : bill.status;

    await executeSQL(
      `UPDATE edg_bills 
       SET paid_amount = $1, status = $2, paid_at = $3, updated_at = $4
       WHERE id = $5`,
      [newPaidAmount, newStatus, newStatus === 'PAID' ? now : null, now, billId]
    );

    console.log(`💳 Paiement effectué: ${amount} GNF pour la facture ${billId} (méthode: ${paymentMethod})`);

    res.status(201).json({
      message: 'Paiement effectué avec succès',
      payment: {
        id: paymentId,
        billId,
        amount,
        paymentMethod,
        status: 'COMPLETED',
        billStatus: newStatus,
      },
    });
  } catch (error) {
    console.error('Erreur paiement facture:', error);
    res.status(500).json({ error: 'Erreur lors du paiement' });
  }
});

/**
 * GET /api/bills/reports
 * Récupérer les rapports de paiement (réservé aux agents EDG)
 */
router.get('/reports', authMiddleware, roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'), async (req, res) => {
  try {
    const { startDate, endDate, homeId, status } = req.query;

    let query = `
      SELECT 
        COUNT(DISTINCT b.id) as total_bills,
        COUNT(DISTINCT CASE WHEN b.status = 'PAID' THEN b.id END) as paid_bills,
        COUNT(DISTINCT CASE WHEN b.status = 'PENDING' THEN b.id END) as pending_bills,
        COUNT(DISTINCT CASE WHEN b.status = 'OVERDUE' THEN b.id END) as overdue_bills,
        COALESCE(SUM(b.total_amount), 0) as total_amount,
        COALESCE(SUM(b.paid_amount), 0) as total_paid,
        COALESCE(SUM(b.total_amount - COALESCE(b.paid_amount, 0)), 0) as total_outstanding,
        COUNT(DISTINCT p.id) as total_payments,
        COALESCE(SUM(CASE WHEN p.payment_method = 'WALLET' THEN p.amount ELSE 0 END), 0) as wallet_payments,
        COALESCE(SUM(CASE WHEN p.payment_method = 'MOBILE_MONEY' THEN p.amount ELSE 0 END), 0) as mobile_money_payments,
        COALESCE(SUM(CASE WHEN p.payment_method = 'BANK_TRANSFER' THEN p.amount ELSE 0 END), 0) as bank_transfer_payments,
        COALESCE(SUM(CASE WHEN p.payment_method = 'CASH' THEN p.amount ELSE 0 END), 0) as cash_payments
      FROM edg_bills b
      LEFT JOIN edg_payments p ON p.bill_id = b.id AND p.status = 'COMPLETED'
      WHERE 1=1
    `;

    if (startDate) {
      query += ` AND b.billing_period_start >= '${startDate}'`;
    }
    if (endDate) {
      query += ` AND b.billing_period_end <= '${endDate}'`;
    }
    if (homeId) {
      query += ` AND b.home_id = '${homeId}'`;
    }
    if (status) {
      query += ` AND b.status = '${status}'`;
    }

    const report = await querySQLObjects(query, [], [
      'total_bills', 'paid_bills', 'pending_bills', 'overdue_bills',
      'total_amount', 'total_paid', 'total_outstanding',
      'total_payments', 'wallet_payments', 'mobile_money_payments',
      'bank_transfer_payments', 'cash_payments'
    ]);

    const data = report[0];

    res.json({
      report: {
        totalBills: parseInt(data.total_bills) || 0,
        paidBills: parseInt(data.paid_bills) || 0,
        pendingBills: parseInt(data.pending_bills) || 0,
        overdueBills: parseInt(data.overdue_bills) || 0,
        totalAmount: parseFloat(data.total_amount) || 0,
        totalPaid: parseFloat(data.total_paid) || 0,
        totalOutstanding: parseFloat(data.total_outstanding) || 0,
        totalPayments: parseInt(data.total_payments) || 0,
        paymentsByMethod: {
          wallet: parseFloat(data.wallet_payments) || 0,
          mobileMoney: parseFloat(data.mobile_money_payments) || 0,
          bankTransfer: parseFloat(data.bank_transfer_payments) || 0,
          cash: parseFloat(data.cash_payments) || 0,
        },
        paymentRate: data.total_amount > 0 
          ? ((parseFloat(data.total_paid) || 0) / parseFloat(data.total_amount)) * 100 
          : 0,
      },
    });
  } catch (error) {
    console.error('Erreur récupération rapports:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
  }
});

export default router;
