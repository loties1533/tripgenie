// =============================================
// TRIPGENIE — server/routes/preferences.ts
// Préférences utilisateur (relation 1-1 avec users)
// =============================================

import express from 'express';
import { z } from 'zod';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../lib/AppError.js';
import type { Request, Response, NextFunction } from 'express';

const router = express.Router();

const prefsSchema = z.object({
  default_mode:    z.enum(['party', 'student', 'luxury', 'group', 'relax', 'surprise']).optional(),
  preferred_prefs: z.array(z.string().max(50)).max(10).optional(),
  home_city:       z.string().max(100).optional(),
  currency:        z.string().length(3).optional()
});

// ---- GET /api/preferences ----
// Récupérer les préférences de l'utilisateur connecté
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase) throw new AppError('Supabase non configuré', 500);

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // PGRST116 = aucune ligne trouvée → préférences non encore créées
    res.json({ preferences: data ?? null });

  } catch (err) {
    next(err);
  }
});

// ---- PUT /api/preferences ----
// Créer ou mettre à jour les préférences (upsert)
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase) throw new AppError('Supabase non configuré', 500);

    const parsed = prefsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues?.[0]?.message ?? 'Données invalides' });
      return;
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: req.user!.id,
        ...parsed.data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({ preferences: data });

  } catch (err) {
    next(err);
  }
});

export default router;
