import express from 'express';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { querySQLObjects, executeSQL, generateUUID, formatDate } from '../services/sqlService.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/family/members/:homeId
 */
router.get('/members/:homeId', async (req, res) => {
  try {
    const { homeId } = req.params;

    const homes = await querySQLObjects(
      'SELECT id, proprietaire_id FROM homes WHERE id = $1',
      [homeId],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];
    const isOwner = home.proprietaire_id === req.user.id;

    const memberships = await querySQLObjects(
      'SELECT user_id, role FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, req.user.id],
      ['user_id', 'role']
    );

    if (!isOwner && memberships.length === 0) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const allMembers = await querySQLObjects(
      `SELECT hm.user_id, hm.role, u.nom, u.email
       FROM home_members hm
       JOIN users u ON hm.user_id = u.id
       WHERE hm.home_id = $1`,
      [homeId],
      ['user_id', 'role', 'nom', 'email']
    );

    const owner = await querySQLObjects(
      'SELECT id, nom, email FROM users WHERE id = $1',
      [home.proprietaire_id],
      ['id', 'nom', 'email']
    );

    const members = [
      { id: owner[0].id, nom: owner[0].nom, email: owner[0].email, role: 'ADMIN', isOwner: true },
      ...allMembers.map(m => ({ id: m.user_id, nom: m.nom, email: m.email, role: m.role, isOwner: false }))
    ];

    res.json({ members });
  } catch (error) {
    console.error('Erreur récupération membres:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

/**
 * POST /api/family/invite
 */
router.post('/invite', [
  body('homeId').isUUID(),
  body('email').isEmail(),
  body('role').isIn(['ADMIN', 'MEMBER', 'CHILD']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { homeId, email, role } = req.body;

    const homes = await querySQLObjects(
      'SELECT id, proprietaire_id FROM homes WHERE id = $1',
      [homeId],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];
    const isOwner = home.proprietaire_id === req.user.id;

    const memberships = await querySQLObjects(
      'SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, req.user.id],
      ['role']
    );

    if (!isOwner && (memberships.length === 0 || memberships[0].role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Seul un ADMIN peut inviter des membres' });
    }

    // Normaliser l'email pour la recherche (minuscules)
    const normalizedEmail = email.toLowerCase().trim();
    
    const users = await querySQLObjects(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [normalizedEmail],
      ['id']
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        error: `Aucun compte trouvé pour l'email "${email}". L'utilisateur doit d'abord s'inscrire sur la plateforme avant d'être invité.` 
      });
    }

    const userId = users[0].id;

    const existing = await querySQLObjects(
      'SELECT id FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, userId],
      ['id']
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Cet utilisateur est déjà membre' });
    }

    await executeSQL(
      `INSERT INTO home_members (id, home_id, user_id, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [generateUUID(), homeId, userId, role, formatDate(new Date()), formatDate(new Date())]
    );

    const user = await querySQLObjects(
      'SELECT id, nom, email FROM users WHERE id = $1',
      [userId],
      ['id', 'nom', 'email']
    );

    res.status(201).json({
      message: 'Membre ajouté avec succès',
      member: { id: user[0].id, nom: user[0].nom, email: user[0].email, role },
    });
  } catch (error) {
    console.error('Erreur invitation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'invitation' });
  }
});

/**
 * DELETE /api/family/members/:homeId/:userId
 */
router.delete('/members/:homeId/:userId', async (req, res) => {
  try {
    const { homeId, userId } = req.params;

    const homes = await querySQLObjects(
      'SELECT id, proprietaire_id FROM homes WHERE id = $1',
      [homeId],
      ['id', 'proprietaire_id']
    );

    if (homes.length === 0) {
      return res.status(404).json({ error: 'Foyer non trouvé' });
    }

    const home = homes[0];
    if (userId === home.proprietaire_id) {
      return res.status(400).json({ error: 'Impossible de retirer le propriétaire' });
    }

    const isOwner = home.proprietaire_id === req.user.id;
    const memberships = await querySQLObjects(
      'SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, req.user.id],
      ['role']
    );

    if (!isOwner && (memberships.length === 0 || memberships[0].role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Seul un ADMIN peut retirer des membres' });
    }

    await executeSQL(
      'DELETE FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, userId]
    );

    res.json({ message: 'Membre retiré avec succès' });
  } catch (error) {
    console.error('Erreur retrait membre:', error);
    res.status(500).json({ error: 'Erreur lors du retrait' });
  }
});

export default router;
