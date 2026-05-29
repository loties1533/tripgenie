// =============================================
// TRIPGENIE — server/routes/collaborators.ts
// Collaborateurs de voyage (relation many-to-many trips ↔ users)
// =============================================

import express from 'express';
import { z } from 'zod';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../lib/AppError.js';
import type { Request, Response, NextFunction } from 'express';

const router = express.Router();

const inviteSchema = z.object({
  email: z.string().email('email invalide'),
  role:  z.enum(['viewer', 'editor']).default('viewer')
});

// ---- GET /api/trips/:trip_id/collaborators ----
// Lister les collaborateurs d'un voyage (propriétaire uniquement)
router.get('/:trip_id/collaborators', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase) throw new AppError('Supabase non configuré', 500);

    // Vérifier que le voyage appartient à l'utilisateur
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user!.id)
      .single();

    if (tripError || !trip) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    const { data, error } = await supabase
      .from('trip_collaborators')
      .select('user_id, role, invited_at, users(name, email)')
      .eq('trip_id', req.params.trip_id);

    if (error) throw error;

    res.json({ collaborators: data });

  } catch (err) {
    next(err);
  }
});

// ---- POST /api/trips/:trip_id/collaborators ----
// Inviter un utilisateur par email (propriétaire uniquement)
router.post('/:trip_id/collaborators', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase) throw new AppError('Supabase non configuré', 500);

    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues?.[0]?.message ?? 'Données invalides' });
      return;
    }

    // Vérifier que le voyage appartient à l'utilisateur
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user!.id)
      .single();

    if (tripError || !trip) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    // Trouver l'utilisateur cible par email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', parsed.data.email)
      .single();

    if (userError || !targetUser) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    if (targetUser.id === req.user!.id) {
      res.status(400).json({ error: 'Impossible de s\'inviter soi-même' });
      return;
    }

    // Upsert — si déjà collaborateur, met à jour le rôle
    const { data, error } = await supabase
      .from('trip_collaborators')
      .upsert({
        trip_id:    req.params.trip_id,
        user_id:    targetUser.id,
        role:       parsed.data.role,
        invited_at: new Date().toISOString()
      }, { onConflict: 'trip_id,user_id' })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ collaborator: data, user: { name: targetUser.name, email: targetUser.email } });

  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/trips/:trip_id/collaborators/:user_id ----
// Retirer un collaborateur (propriétaire uniquement)
router.delete('/:trip_id/collaborators/:user_id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase) throw new AppError('Supabase non configuré', 500);

    // Vérifier que le voyage appartient à l'utilisateur
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user!.id)
      .single();

    if (tripError || !trip) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    const { error } = await supabase
      .from('trip_collaborators')
      .delete()
      .eq('trip_id', req.params.trip_id)
      .eq('user_id', req.params.user_id);

    if (error) throw error;

    res.status(200).json({ message: 'Collaborateur retiré' });

  } catch (err) {
    next(err);
  }
});

export default router;
