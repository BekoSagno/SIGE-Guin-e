/**
 * Middleware de vérification des rôles
 * Vérifie que l'utilisateur a le rôle requis pour accéder à la route
 * @param {...string} allowedRoles - Rôles autorisés
 */
export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès refusé. Rôle insuffisant.',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};
