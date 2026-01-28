import jwt from 'jsonwebtoken';
import { querySQLObjects } from '../services/sqlService.js';

/**
 * Middleware d'authentification JWT
 * Vérifie la présence et la validité du token JWT
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant ou invalide' });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier et décoder le token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars'
    );

    // Récupérer l'utilisateur depuis la base de données via docker exec
    const users = await querySQLObjects(
      'SELECT id, nom, email, role FROM users WHERE id = $1',
      [decoded.userId],
      ['id', 'nom', 'email', 'role']
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Ajouter l'utilisateur à la requête
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    console.error('Erreur authMiddleware:', error);
    return res.status(500).json({ error: 'Erreur d\'authentification' });
  }
};
