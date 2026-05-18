// =============================================
// TRIPGENIE — server/middleware/auth.ts
// Vérification du token JWT sur les routes protégées
// =============================================

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from '../lib/types.js';

// Augmentation de l'interface Express Request pour inclure req.user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  // 1. Cookie httpOnly (priorité — inaccessible au JS, immunisé XSS)
  if (req.cookies?.tg_token) return req.cookies.tg_token as string;
  // 2. Header Authorization (fallback pour compatibilité)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Token manquant ou invalide' });
    return;
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    next();
  } catch (err) {
    if ((err as Error).name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Session expirée, reconnecte-toi' });
      return;
    }
    res.status(401).json({ error: 'Token invalide' });
  }
}

// Middleware optionnel (ne bloque pas si pas de token)
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    } catch (_) {
      // Silently ignore invalid token
    }
  }
  next();
}
