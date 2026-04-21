// =============================================
// TRIPGENIE — server/routes/packs.js
// GET  /api/packs/:trip_id     → packs d'un voyage
// POST /api/packs/:trip_id/select/:pack_id → choisir un pack
// =============================================

import express from 'express';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/:trip_id', async (req, res) => {
  try {
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

router.post('/:trip_id/select/:pack_id', async (req, res) => {
  try {
    // Désélectionne tous les packs du trip
    await supabase.from('packs')
      .update({ selected: false })
      .eq('trip_id', req.params.trip_id);

    // Sélectionne le pack choisi
    const { data: pack, error } = await supabase.from('packs')
      .update({ selected: true })
      .eq('id', req.params.pack_id)
      .select().single();

    if (error) throw error;

    // Met à jour le statut du trip
    await supabase.from('trips')
      .update({ status: 'confirmed', pack_data: pack, updated_at: new Date() })
      .eq('id', req.params.trip_id)
      .eq('user_id', req.user.id);

    res.json({ pack, message: 'Pack sélectionné !' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la sélection' });
  }
});

export default router;
