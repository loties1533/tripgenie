// =============================================
// TRIPGENIE — server/routes/auth.js
// POST /api/auth/signup
// POST /api/auth/login
// GET  /api/auth/me
// =============================================

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

const signupSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(8, 'Mot de passe trop court (8 caractères min)'),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Format email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
});

const updateMeSchema = z.object({
  name: z.string().optional(),
  avatar_url: z.string().url('Format URL invalide').optional().or(z.literal(''))
});

// ---- Helpers ----
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

// ---- POST /api/auth/signup ----
router.post('/signup', async (req, res) => {
  try {
    const validatedData = signupSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error.errors[0].message });
    }
    const { email, password, name } = validatedData.data;

    // Vérifie si l'email existe déjà
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }

    // Hash le password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crée l'utilisateur
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || email.split('@')[0]
      })
      .select()
      .single();

    if (error) throw error;

    // Crée les préférences par défaut
    await supabase.from('user_preferences').insert({ user_id: user.id });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user: sanitizeUser(user)
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

// ---- POST /api/auth/login ----
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error.errors[0].message });
    }
    const { email, password } = validatedData.data;

    // Cherche l'utilisateur
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifie le password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Connexion réussie',
      token,
      user: sanitizeUser(user)
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// ---- GET /api/auth/me ----
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, user_preferences(*)')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json({ user: sanitizeUser(user) });

  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---- PUT /api/auth/me ----
router.put('/me', requireAuth, async (req, res) => {
  try {
    const validatedData = updateMeSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({ error: validatedData.error.errors[0].message });
    }
    const { name, avatar_url } = validatedData.data;

    const { data: user, error } = await supabase
      .from('users')
      .update({ name, avatar_url, updated_at: new Date() })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ user: sanitizeUser(user) });

  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

export default router;
