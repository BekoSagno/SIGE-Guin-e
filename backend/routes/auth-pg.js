import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import pg from 'pg';

const router = express.Router();
const { Pool } = pg;

// Pool de connexions PostgreSQL
// Note: Sur Windows avec Docker, utiliser le nom du service si backend est dans Docker
// Sinon, utiliser 127.0.0.1 avec trust dans pg_hba.conf
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sige_guinee',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Désactiver SSL pour le développement local
  ssl: false,
});

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur (version avec pg direct)
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Trouver l'utilisateur
      const result = await pool.query(
        'SELECT id, nom, email, password_hash, role FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const user = result.rows[0];

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Générer le token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Retourner l'utilisateur (sans le hash du mot de passe)
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        message: 'Connexion réussie',
        token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('Erreur connexion:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  }
);

/**
 * GET /api/auth/me
 * Récupérer l'utilisateur connecté (version avec pg direct)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars');

    const result = await pool.query(
      'SELECT id, nom, email, role, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

export default router;
