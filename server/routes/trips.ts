// =============================================
// TRIPGENIE — server/routes/trips.ts
// =============================================

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { MODES_LIST, TRIP_STATUS_LIST } from '../lib/constants.js';
import type { TravelMode } from '../lib/types.js';

const createTripSchema = z.object({
  destination:  z.string().min(1, 'destination requise').max(100),
  mode:         z.enum(MODES_LIST as [TravelMode, ...TravelMode[]], { error: 'mode invalide' }),
  title:        z.string().max(200).optional(),
  country:      z.string().max(100).optional(),
  origin:       z.string().max(100).optional(),
  departure:    z.string().optional(),
  return_date:  z.string().optional(),
  travelers:    z.number().int().min(1).max(50).optional(),
  budget:       z.union([z.string(), z.number()]).optional(),
  pack_data:    z.any().optional(),
  score:        z.number().optional()
});

const updateTripSchema = z.object({
  title:     z.string().max(200).optional(),
  status:    z.enum(TRIP_STATUS_LIST as [string, ...string[]]).optional(),
  pack_data: z.any().optional(),
  score:     z.number().optional(),
  travelers: z.number().int().min(1).max(50).optional(),
  budget:    z.union([z.string(), z.number()]).optional()
});

const router = express.Router();

// ---- GET /api/trips/share/:id (Public) ----
router.get('/share/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase) {
      res.status(500).json({ error: 'Supabase non configuré' });
      return;
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .select('id, title, destination, pack_data, score, mode, departure, return_date, travelers')
      .eq('id', req.params.id)
      .single();

    if (error || !trip) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    res.json({ trip });
  } catch (err) {
    console.error('Public share error:', err);
    next(err);
  }
});

router.use(requireAuth);

// ---- GET /api/trips ----
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { mode, status } = req.query;

    // Cap à 50 max, défaut 20, minimum 1
    const limit  = Math.min(Math.max(parseInt((req.query.limit as string) || '20'), 1), 50);
    const offset = Math.max(parseInt((req.query.offset as string) || '0'), 0);

    // Filtre systématique par user_id : chaque utilisateur ne voit que ses voyages.
    // C'est la seule barrière d'isolation des données (RLS Supabase non activé).
    let query = supabase
      .from('trips')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (mode && typeof mode === 'string')     query = query.eq('mode', mode);
    if (status && typeof status === 'string') query = query.eq('status', status);

    const { data: trips, error } = await query;
    if (error) throw error;

    res.json({ trips, count: trips.length, limit, offset });

  } catch (err) {
    console.error('GET trips error:', err);
    next(err);
  }
});

// ---- POST /api/trips ----
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { title, destination, country, origin, departure, return_date, travelers, budget, mode, pack_data, score } = parsed.data;

    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        user_id:    req.user.id,
        title:      title || `Voyage à ${destination}`,
        destination, country, origin,
        departure, return_date,
        travelers:  travelers || 1,
        budget:     String(budget),
        mode, pack_data, score,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ trip });

  } catch (err) {
    console.error('POST trip error:', err);
    next(err);
  }
});

// ---- GET /api/trips/:id ----
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .select('*, packs(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !trip) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    res.json({ trip });

  } catch (err) {
    console.error('GET trip error:', err);
    next(err);
  }
});

// ---- PUT /api/trips/:id ----
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = updateTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const updates = { ...parsed.data, updated_at: new Date().toISOString() };

    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !trip) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    res.json({ trip });

  } catch (err) {
    console.error('PUT trip error:', err);
    next(err);
  }
});

// ---- DELETE /api/trips/:id ----
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Voyage supprimé' });

  } catch (err) {
    console.error('DELETE trip error:', err);
    next(err);
  }
});

export default router;
