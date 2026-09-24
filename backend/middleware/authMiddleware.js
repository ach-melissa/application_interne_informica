const jwt = require('jsonwebtoken');

// Vérifie que le token est valide
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

// comme verifyToken mais ne bloque jamais — utile pour une route accessible
// aux admins connectés ET au public.
const verifyTokenOptional = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    req.user = null;
  }
  next();
};

// Vérifie que le rôle du user fait partie des rôles autorisés.
// super_admin passe toujours, même s'il n'est pas explicitement listé.
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    if (req.user.role === 'super_admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: 'Accès refusé' });
  };
};

module.exports = { verifyToken, requireRole, verifyTokenOptional };