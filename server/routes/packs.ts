// =============================================
// TRIPGENIE — server/routes/packs.ts
// GET  /api/packs/:trip_id     → packs d'un voyage
// POST /api/packs/:trip_id/select/:pack_id → choisir un pack
// =============================================

import express from 'express';
import type { Request, Response } from 'express';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/:trip_id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    // Vérifie d'abord que le trip appartient à l'user
    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user.id)
      .single();

    if (!trip) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    const { data: packs, error } = await supabase
      .from('packs')
      .select('*')
      .eq('trip_id', req.params.trip_id)
      .order('rank');

    if (error) throw error;
    res.json({ packs });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:trip_id/select/:pack_id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    // Vérifie d'abord la propriété
    const { data: trip } = await supabase
      .from('trips')
      .select('id')
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user.id)
      .single();

    if (!trip) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    // Désélectionne tous les packs du trip
    await supabase.from('packs')
      .update({ selected: false })
      .eq('trip_id', req.params.trip_id);

    // Sélectionne le pack choisi
    const { data: pack, error } = await supabase.from('packs')
      .update({ selected: true })
      .eq('id', req.params.pack_id)
      .eq('trip_id', req.params.trip_id) // Sécurité supp.
      .select().single();

    if (error) throw error;

    // Met à jour le statut du trip
    await supabase.from('trips')
      .update({ status: 'confirmed', pack_data: pack, updated_at: new Date().toISOString() })
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user.id);

    res.json({ pack, message: 'Pack sélectionné !' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la sélection' });
  }
});

export default router;
