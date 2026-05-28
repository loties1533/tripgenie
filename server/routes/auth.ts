// =============================================
// TRIPGENIE — server/routes/auth.ts
// Inscription, Connexion et Déconnexion avec JWT
// =============================================

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import supabase from '../db/supabase.js';

// Schemas de validation
const registerSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (6 min)'),
  name:     z.string().min(2, 'Nom trop court').optional()
});

const loginSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
});

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours
};

// ---- POST /api/auth/signup ----
router.post('/signup', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { email, password, name } = parsed.data;

    if (!supabase) {
      res.status(500).json({ error: 'Base de données non configurée.' });
      return;
    }

    // 1. Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(409).json({ error: 'Cet email est déjà utilisé' });
      return;
    }

    // 2. Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. Insérer l'utilisateur
    const { data: user, error } = await supabase
      .from('users')
      .insert({ email, password: password_hash, name })
      .select('id, email, name, created_at')
      .single();

    if (error || !user) throw error;

    // 4. Générer le JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // 5. Envoyer le cookie
    res.cookie('tg_token', token, COOKIE_OPTIONS);
    
    res.status(201).json({ user, token });

  } catch (err) {
    console.error('Register Error:', err);
    next(err);
  }
});

// ---- POST /api/auth/login ----
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { email, password } = parsed.data;

    if (!supabase) {
      res.status(500).json({ error: 'Base de données non configurée.' });
      return;
    }

    // 1. Chercher l'utilisateur avec son hash
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, password, created_at')
      .eq('email', email)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      return;
    }

    // 2. Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      return;
    }

    // 3. Générer le token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // 4. Set Cookie & Response
    res.cookie('tg_token', token, COOKIE_OPTIONS);

    // On enlève le hash de la réponse
    const { password: _pw, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });

  } catch (err) {
    console.error('Login Error:', err);
    next(err);
  }
});

// ---- POST /api/auth/logout ----
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('tg_token', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({ message: 'Déconnecté avec succès' });
});

// ---- GET /api/auth/me ----
router.get('/me', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.tg_token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    
    if (!supabase) {
      res.status(500).json({ error: 'Base de données non configurée.' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, created_at')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'Utilisateur introuvable' });
      return;
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
});

export default router;
