import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate, countSQL } from '../services/sqlService.js';

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('AGENT_EDG', 'ADMIN_ETAT'));

/**
 * GET /api/reconciliation/zones
 * Récupère les données de réconciliation par zone
 * Calcul: Delta = Énergie_Sortie_Poste - Σ(Consommations_Boîtiers)
 */
router.get('/zones', async (req, res) => {
  try {
    // Récupérer toutes les zones
    const zones = await querySQLObjects(
      'SELECT DISTINCT ville FROM homes WHERE ville IS NOT NULL',
      [],
      ['ville']
    );

    const reconciliationData = await Promise.all(
      zones.map(async (zone) => {
        const zoneName = zone.ville;

        // Calculer l'énergie totale facturée (consommations individuelles des boîtiers)
        const energyData = await querySQLObjects(
          `SELECT COALESCE(SUM(ed.consumption), 0) as total_billed
           FROM energy_data ed
           JOIN meters m ON ed.meter_id = m.id
           JOIN homes h ON m.home_id = h.id
           WHERE h.ville = $1
           AND ed.timestamp >= NOW() - INTERVAL '24 hours'`,
          [zoneName],
          ['total_billed']
        );

        const energyBilled = parseFloat(energyData[0]?.total_billed) || 0;

        // Simuler l'énergie injectée par le poste (normalement viendrait d'un capteur SCADA)
        // Pour la simulation: énergie injectée = énergie facturée + pertes (5-20%)
        const lossRate = 0.05 + Math.random() * 0.15; // Entre 5% et 20%
        const energyInjected = energyBilled / (1 - lossRate);
        const delta = energyInjected - energyBilled;
        const deltaPercent = energyInjected > 0 ? (delta / energyInjected) * 100 : 0;

        // Déterminer le statut
        let status = 'NORMAL';
        if (deltaPercent > 15) status = 'CRITICAL';
        else if (deltaPercent > 10) status = 'WARNING';

        // Compter les compteurs affectés
        const meterCount = await countSQL(
          `SELECT COUNT(*) FROM meters m
           JOIN homes h ON m.home_id = h.id
           WHERE h.ville = $1`,
          [zoneName]
        );

        // Calculer la perte financière estimée (200 GNF/kWh)
        const estimatedLoss = Math.round(delta * 200);

        // Générer une position GPS simulée pour la zone suspectée
        let suspectedLocation = null;
        if (status !== 'NORMAL') {
          // Coordonnées de base pour Conakry avec variation
          const baseCoords = {
            'Kaloum': { lat: 9.5092, lng: -13.7122 },
            'Dixinn': { lat: 9.5350, lng: -13.6800 },
            'Ratoma': { lat: 9.5800, lng: -13.6200 },
            'Matoto': { lat: 9.6100, lng: -13.5800 },
            'Matam': { lat: 9.5500, lng: -13.6500 },
          };
          const base = baseCoords[zoneName] || { lat: 9.5370, lng: -13.6785 };
          suspectedLocation = {
            lat: base.lat + (Math.random() - 0.5) * 0.02,
            lng: base.lng + (Math.random() - 0.5) * 0.02,
            address: `Segment ${Math.floor(Math.random() * 100) + 1}, ${zoneName}`,
          };
        }

        return {
          id: `REC-${zoneName?.toUpperCase().replace(/\s+/g, '-')}`,
          zone: zoneName,
          transformer: `TRANS-${zoneName?.toUpperCase().replace(/\s+/g, '-')}-001`,
          energyInjected: Math.round(energyInjected * 100) / 100,
          energyBilled: Math.round(energyBilled * 100) / 100,
          delta: Math.round(delta * 100) / 100,
          deltaPercent: Math.round(deltaPercent * 10) / 10,
          status,
          suspectedLocation,
          affectedMeters: meterCount,
          estimatedLoss,
          lastCheck: new Date().toISOString(),
        };
      })
    );

    res.json({ reconciliation: reconciliationData });
  } catch (error) {
    console.error('Erreur réconciliation zones:', error);
    res.status(500).json({ error: 'Erreur lors du calcul de réconciliation' });
  }
});

/**
 * POST /api/reconciliation/run
 * Lance un calcul de réconciliation complet
 */
router.post('/run', async (req, res) => {
  try {
    // Enregistrer l'exécution du calcul
    const runId = generateUUID();
    const now = formatDate(new Date());

    await executeSQL(
      `INSERT INTO reconciliation_runs (id, triggered_by, started_at, status)
       VALUES ($1, $2, $3, 'RUNNING')`,
      [runId, req.user.id, now]
    );

    // Récupérer toutes les zones
    const zones = await querySQLObjects(
      'SELECT DISTINCT ville FROM homes WHERE ville IS NOT NULL',
      [],
      ['ville']
    );

    let anomaliesFound = 0;
    let totalDelta = 0;

    for (const zone of zones) {
      const zoneName = zone.ville;

      // Calculer les données
      const energyData = await querySQLObjects(
        `SELECT COALESCE(SUM(ed.consumption), 0) as total_billed
         FROM energy_data ed
         JOIN meters m ON ed.meter_id = m.id
         JOIN homes h ON m.home_id = h.id
         WHERE h.ville = $1
         AND ed.timestamp >= NOW() - INTERVAL '24 hours'`,
        [zoneName],
        ['total_billed']
      );

      const energyBilled = parseFloat(energyData[0]?.total_billed) || 0;
      const lossRate = 0.05 + Math.random() * 0.15;
      const energyInjected = energyBilled / (1 - lossRate);
      const delta = energyInjected - energyBilled;
      const deltaPercent = energyInjected > 0 ? (delta / energyInjected) * 100 : 0;

      totalDelta += delta;

      // Enregistrer le résultat
      const resultId = generateUUID();
      await executeSQL(
        `INSERT INTO reconciliation_results 
         (id, run_id, zone_name, energy_injected, energy_billed, delta, delta_percent, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          resultId,
          runId,
          zoneName,
          energyInjected,
          energyBilled,
          delta,
          deltaPercent,
          deltaPercent > 15 ? 'CRITICAL' : deltaPercent > 10 ? 'WARNING' : 'NORMAL',
          now
        ]
      );

      if (deltaPercent > 10) anomaliesFound++;
    }

    // Mettre à jour le run
    await executeSQL(
      `UPDATE reconciliation_runs 
       SET completed_at = $1, status = 'COMPLETED', 
           zones_analyzed = $2, anomalies_found = $3, total_delta = $4
       WHERE id = $5`,
      [formatDate(new Date()), zones.length, anomaliesFound, totalDelta, runId]
    );

    res.json({
      message: 'Réconciliation terminée',
      run: {
        id: runId,
        zonesAnalyzed: zones.length,
        anomaliesFound,
        totalDelta: Math.round(totalDelta * 100) / 100,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Erreur exécution réconciliation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'exécution' });
  }
});

/**
 * POST /api/reconciliation/ticket
 * Crée un ticket d'audit pour une zone suspecte
 */
router.post(
  '/ticket',
  [
    body('zone').trim().notEmpty().withMessage('Zone requise'),
    body('location').optional().isObject(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { zone, location, estimatedLoss, deltaPercent } = req.body;

      const ticketId = generateUUID();
      const ticketNumber = `AUD-${Date.now().toString().slice(-6)}`;
      const now = formatDate(new Date());

      await executeSQL(
        `INSERT INTO audit_tickets 
         (id, ticket_number, zone_name, location_lat, location_lng, location_address,
          estimated_loss, delta_percent, status, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          ticketId,
          ticketNumber,
          zone,
          location?.lat || null,
          location?.lng || null,
          location?.address || null,
          estimatedLoss || 0,
          deltaPercent || 0,
          'OPEN',
          req.user.id,
          now
        ]
      );

      res.status(201).json({
        message: 'Ticket d\'audit créé avec succès',
        ticket: {
          id: ticketId,
          ticketNumber,
          zone,
          location,
          estimatedLoss,
          deltaPercent,
          status: 'OPEN',
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Erreur création ticket:', error);
      res.status(500).json({ error: 'Erreur lors de la création du ticket' });
    }
  }
);

/**
 * GET /api/reconciliation/tickets
 * Liste des tickets d'audit
 */
router.get('/tickets', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let query = `
      SELECT t.id, t.ticket_number, t.zone_name, t.location_lat, t.location_lng,
             t.location_address, t.estimated_loss, t.delta_percent, t.status,
             t.resolution_notes, t.created_at, t.resolved_at,
             u.nom as created_by_name
      FROM audit_tickets t
      LEFT JOIN users u ON t.created_by = u.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE t.status = $1';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const tickets = await querySQLObjects(
      query,
      params,
      ['id', 'ticket_number', 'zone_name', 'location_lat', 'location_lng',
       'location_address', 'estimated_loss', 'delta_percent', 'status',
       'resolution_notes', 'created_at', 'resolved_at', 'created_by_name']
    );

    const formatted = tickets.map(t => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      zone: t.zone_name,
      location: t.location_lat ? {
        lat: parseFloat(t.location_lat),
        lng: parseFloat(t.location_lng),
        address: t.location_address,
      } : null,
      estimatedLoss: parseInt(t.estimated_loss) || 0,
      deltaPercent: parseFloat(t.delta_percent) || 0,
      status: t.status,
      resolutionNotes: t.resolution_notes,
      createdAt: t.created_at,
      resolvedAt: t.resolved_at,
      createdBy: t.created_by_name,
    }));

    res.json({ tickets: formatted });
  } catch (error) {
    console.error('Erreur récupération tickets:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * PUT /api/reconciliation/tickets/:id
 * Met à jour un ticket d'audit
 */
router.put(
  '/tickets/:id',
  [
    body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']),
    body('resolutionNotes').optional().isString(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;

      const tickets = await querySQLObjects(
        'SELECT id, status FROM audit_tickets WHERE id = $1',
        [id],
        ['id', 'status']
      );

      if (tickets.length === 0) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
      }

      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (resolutionNotes) {
        updates.push(`resolution_notes = $${paramIndex++}`);
        params.push(resolutionNotes);
      }

      if (status === 'RESOLVED') {
        updates.push(`resolved_at = $${paramIndex++}`);
        params.push(formatDate(new Date()));
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      params.push(id);
      await executeSQL(
        `UPDATE audit_tickets SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );

      res.json({ message: 'Ticket mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur mise à jour ticket:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }
);

export default router;
