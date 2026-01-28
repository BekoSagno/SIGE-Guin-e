import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { querySQLObjects, executeSQL, insertSQL, generateUUID, formatDate } from '../services/sqlService.js';

const router = express.Router();

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
      homes = await querySQLObjects(
        `SELECT h.id, h.nom, h.ville, h.type, h.latitude, h.longitude, h.proprietaire_id,
                u.id as owner_id, u.nom as owner_nom, u.email as owner_email, u.sige_id as owner_sige_id, 
                u.telephone as owner_telephone, u.client_type as owner_client_type, u.role as owner_role,
                h.created_at, h.updated_at
         FROM homes h
         LEFT JOIN users u ON h.proprietaire_id = u.id
         ORDER BY h.created_at DESC`,
        [],
        ['id', 'nom', 'ville', 'type', 'latitude', 'longitude', 'proprietaire_id',
         'owner_id', 'owner_nom', 'owner_email', 'owner_sige_id', 'owner_telephone', 
         'owner_client_type', 'owner_role', 'created_at', 'updated_at']
      );

      // Enrichir avec les compteurs et finances
      for (const home of homes) {
        const meters = await querySQLObjects(
          'SELECT id, status, last_seen FROM meters WHERE home_id = $1',
          [home.id],
          ['id', 'status', 'last_seen']
        );
        home.meters = meters;

        const financials = await querySQLObjects(
          'SELECT id, balance, monthly_budget, last_topup FROM financials WHERE home_id = $1',
          [home.id],
          ['id', 'balance', 'monthly_budget', 'last_topup']
        );
        home.financials = financials[0] || null;
        home.proprietaire = {
          id: home.owner_id,
          nom: home.owner_nom,
          email: home.owner_email,
          sigeId: home.owner_sige_id || null,
          sige_id: home.owner_sige_id || null,
          telephone: home.owner_telephone || null,
          clientType: home.owner_client_type || null,
          client_type: home.owner_client_type || null,
          role: home.owner_role || null,
        };
      }
      
      // Normaliser en camelCase pour les agents/admin
      homes = homes.map(home => ({
        id: home.id,
        nom: home.nom,
        ville: home.ville,
        type: home.type,
        latitude: home.latitude,
        longitude: home.longitude,
        proprietaireId: home.proprietaire_id,
        createdAt: home.created_at,
        updatedAt: home.updated_at,
        meters: home.meters || [],
        financials: home.financials || null,
        proprietaire: home.proprietaire || null,
      }));
    } else {
      // Les citoyens voient leurs foyers (propriétaire) + foyers où ils sont membres
      console.log('Recherche foyers pour utilisateur:', req.user.id, req.user.email);
      const ownedHomes = await querySQLObjects(
        `SELECT id, nom, ville, type, latitude, longitude, proprietaire_id, created_at, updated_at
         FROM homes WHERE proprietaire_id = $1`,
        [req.user.id],
        ['id', 'nom', 'ville', 'type', 'latitude', 'longitude', 'proprietaire_id', 'created_at', 'updated_at']
      );
      console.log('Foyers possedés trouvés:', ownedHomes.length);

      const memberHomes = await querySQLObjects(
        `SELECT h.id, h.nom, h.ville, h.type, h.latitude, h.longitude, h.proprietaire_id, h.created_at, h.updated_at
         FROM homes h
         JOIN home_members hm ON h.id = hm.home_id
         WHERE hm.user_id = $1`,
        [req.user.id],
        ['id', 'nom', 'ville', 'type', 'latitude', 'longitude', 'proprietaire_id', 'created_at', 'updated_at']
      );
      console.log('Foyers en tant que membre trouvés:', memberHomes.length);

      // Combiner et dédupliquer
      const allHomesIds = new Set([...ownedHomes.map(h => h.id), ...memberHomes.map(h => h.id)]);
      homes = [...ownedHomes, ...memberHomes.filter(h => !ownedHomes.find(oh => oh.id === h.id))];
      console.log('Total foyers après combinaison:', homes.length);

      // Enrichir avec les compteurs et finances
      for (const home of homes) {
        const meters = await querySQLObjects(
          'SELECT id, status, last_seen FROM meters WHERE home_id = $1',
          [home.id],
          ['id', 'status', 'last_seen']
        );
        home.meters = meters;

        const financials = await querySQLObjects(
          'SELECT id, balance, monthly_budget, last_topup FROM financials WHERE home_id = $1',
          [home.id],
          ['id', 'balance', 'monthly_budget', 'last_topup']
        );
        home.financials = financials[0] || null;
      }
      
      // Normaliser en camelCase pour les citoyens
      homes = homes.map(home => ({
        id: home.id,
        nom: home.nom,
        ville: home.ville,
        type: home.type,
        latitude: home.latitude,
        longitude: home.longitude,
        proprietaireId: home.proprietaire_id,
        createdAt: home.created_at,
        updatedAt: home.updated_at,
        meters: home.meters || [],
        financials: home.financials || null,
        proprietaire: home.proprietaire || null,
      }));
      console.log('Foyers normalisés:', homes.length);
    }

    console.log('Envoi de', homes.length, 'foyers au client');
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

    const homes = await querySQLObjects(
      `SELECT h.id, h.nom, h.ville, h.type, h.latitude, h.longitude, h.proprietaire_id,
              u.id as owner_id, u.nom as owner_nom, u.email as owner_email,
              h.created_at, h.updated_at
       FROM homes h
       LEFT JOIN users u ON h.proprietaire_id = u.id
       WHERE h.id = $1`,
      [id],
      ['id', 'nom', 'ville', 'type', 'latitude', 'longitude', 'proprietaire_id',
       'owner_id', 'owner_nom', 'owner_email', 'created_at', 'updated_at']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];

    // Vérifier les permissions (propriétaire, membre, ou agent/admin)
    const isOwner = home.proprietaire_id === req.user.id;
    const isAgentOrAdmin = req.user.role === 'AGENT_EDG' || req.user.role === 'ADMIN_ETAT';
    
    let isMember = false;
    if (!isOwner && !isAgentOrAdmin) {
      const memberships = await querySQLObjects(
        'SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2',
        [id, req.user.id],
        ['role']
      );
      isMember = memberships.length > 0;
    }

    if (!isOwner && !isMember && !isAgentOrAdmin) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Enrichir avec les compteurs, NILM signatures et finances
    const meters = await querySQLObjects(
      'SELECT id, status, last_seen, firmware_version FROM meters WHERE home_id = $1',
      [id],
      ['id', 'status', 'last_seen', 'firmware_version']
    );

    for (const meter of meters) {
      const signatures = await querySQLObjects(
        'SELECT id, device_name, device_type, power_signature, is_active, detected_at FROM nilm_signatures WHERE meter_id = $1 AND is_active = true',
        [meter.id],
        ['id', 'device_name', 'device_type', 'power_signature', 'is_active', 'detected_at']
      );
      meter.nilmSignatures = signatures;
    }

    const financials = await querySQLObjects(
      'SELECT id, balance, monthly_budget, last_topup FROM financials WHERE home_id = $1',
      [id],
      ['id', 'balance', 'monthly_budget', 'last_topup']
    );

    // Normaliser les données en camelCase pour le frontend
    const normalizedHome = {
      id: home.id,
      nom: home.nom,
      ville: home.ville,
      type: home.type,
      latitude: home.latitude ? parseFloat(home.latitude) : null,
      longitude: home.longitude ? parseFloat(home.longitude) : null,
      proprietaireId: home.proprietaire_id,
      createdAt: home.created_at,
      updatedAt: home.updated_at,
      meters: meters.map(meter => ({
        id: meter.id,
        status: meter.status,
        lastSeen: meter.last_seen,
        firmwareVersion: meter.firmware_version,
        nilmSignatures: (meter.nilmSignatures || []).map(sig => ({
          id: sig.id,
          deviceName: sig.device_name,
          deviceType: sig.device_type,
          powerSignature: sig.power_signature ? parseFloat(sig.power_signature) : null,
          isActive: sig.is_active,
          detectedAt: sig.detected_at,
        })),
      })),
      financials: financials[0] ? {
        id: financials[0].id,
        balance: financials[0].balance ? parseFloat(financials[0].balance) : 0,
        monthlyBudget: financials[0].monthly_budget ? parseFloat(financials[0].monthly_budget) : null,
        lastTopup: financials[0].last_topup,
      } : null,
      proprietaire: {
        id: home.owner_id,
        nom: home.owner_nom,
        email: home.owner_email,
      },
    };

    res.json({ home: normalizedHome });
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
      const homeId = generateUUID();
      const now = new Date();

      // Créer le foyer
      await executeSQL(
        `INSERT INTO homes (id, proprietaire_id, nom, ville, type, latitude, longitude, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [homeId, req.user.id, nom, ville, type, latitude || null, longitude || null, formatDate(now), formatDate(now)]
      );

      // Créer un compte financier par défaut
      const financialId = generateUUID();
      await executeSQL(
        `INSERT INTO financials (id, home_id, balance, monthly_budget, created_at, updated_at)
         VALUES ($1, $2, 0, NULL, $3, $4)`,
        [financialId, homeId, formatDate(now), formatDate(now)]
      );

      // Récupérer le foyer créé
      const homes = await querySQLObjects(
        `SELECT h.id, h.nom, h.ville, h.type, h.latitude, h.longitude, h.proprietaire_id,
                u.id as owner_id, u.nom as owner_nom, u.email as owner_email,
                h.created_at, h.updated_at
         FROM homes h
         LEFT JOIN users u ON h.proprietaire_id = u.id
         WHERE h.id = $1`,
        [homeId],
        ['id', 'nom', 'ville', 'type', 'latitude', 'longitude', 'proprietaire_id',
         'owner_id', 'owner_nom', 'owner_email', 'created_at', 'updated_at']
      );

      const home = homes[0];
      home.proprietaire = {
        id: home.owner_id,
        nom: home.owner_nom,
        email: home.owner_email,
      };

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
    const homes = await querySQLObjects(
      'SELECT id, proprietaire_id FROM homes WHERE id = $1',
      [id],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const existingHome = homes[0];

    // Vérifier les permissions
    if (
      existingHome.proprietaire_id !== req.user.id &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Construire la requête UPDATE dynamiquement
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (nom !== undefined) {
      updates.push(`nom = $${paramIndex++}`);
      params.push(nom);
    }
    if (ville !== undefined) {
      updates.push(`ville = $${paramIndex++}`);
      params.push(ville);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramIndex++}`);
      params.push(latitude || null);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramIndex++}`);
      params.push(longitude || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    updates.push(`updated_at = ${formatDate(new Date())}`);
    params.push(id);

    await executeSQL(
      `UPDATE homes SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    // Récupérer le foyer mis à jour
    const updatedHomes = await querySQLObjects(
      `SELECT h.id, h.nom, h.ville, h.type, h.latitude, h.longitude, h.proprietaire_id,
              u.id as owner_id, u.nom as owner_nom, u.email as owner_email,
              h.created_at, h.updated_at
       FROM homes h
       LEFT JOIN users u ON h.proprietaire_id = u.id
       WHERE h.id = $1`,
      [id],
      ['id', 'nom', 'ville', 'type', 'latitude', 'longitude', 'proprietaire_id',
       'owner_id', 'owner_nom', 'owner_email', 'created_at', 'updated_at']
    );

    const home = updatedHomes[0];
    home.proprietaire = {
      id: home.owner_id,
      nom: home.owner_nom,
      email: home.owner_email,
    };

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
    const homes = await querySQLObjects(
      'SELECT id, proprietaire_id FROM homes WHERE id = $1',
      [id],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const existingHome = homes[0];

    // Vérifier les permissions
    if (
      existingHome.proprietaire_id !== req.user.id &&
      req.user.role !== 'ADMIN_ETAT'
    ) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Supprimer (cascade supprimera les compteurs, données, etc.)
    await executeSQL('DELETE FROM homes WHERE id = $1', [id]);

    res.json({ message: 'Foyer supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression foyer:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
