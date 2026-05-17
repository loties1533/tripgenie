// =============================================
// TRIPGENIE — server/middleware/auth.js
// Vérification du token JWT sur les routes protégées
// =============================================

import jwt from 'jsonwebtoken';

function extractToken(req) {
  // 1. Cookie httpOnly (priorité — inaccessible au JS, immunisé XSS)
  if (req.cookies?.tg_token) return req.cookies.tg_token;
  // 2. Header Authorization (fallback pour compatibilité)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Token manquant ou invalide' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée, reconnecte-toi' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Middleware optionnel (ne bloque pas si pas de token)
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch (_) {}
  }
  next();
}
