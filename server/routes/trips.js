// =============================================
// TRIPGENIE — server/routes/trips.js
// GET    /api/trips          → mes voyages
// POST   /api/trips          → créer un voyage
// GET    /api/trips/:id      → détail
// PUT    /api/trips/:id      → modifier
// DELETE /api/trips/:id      → supprimer
// =============================================

import express from 'express';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes trips nécessitent auth
router.use(requireAuth);

// ---- GET /api/trips ----
router.get('/', async (req, res) => {
  try {
    const { mode, status, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('trips')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (mode)   query = query.eq('mode', mode);
    if (status) query = query.eq('status', status);

    const { data: trips, error } = await query;
    if (error) throw error;

    res.json({ trips, count: trips.length });

  } catch (err) {
    console.error('GET trips error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des voyages' });
  }
});

// ---- POST /api/trips ----
router.post('/', async (req, res) => {
  try {
    const {
      title, destination, country, origin,
      departure, return_date, travelers,
      budget, mode, pack_data, score
    } = req.body;

    if (!destination || !mode) {
      return res.status(400).json({ error: 'destination et mode sont requis' });
    }

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        user_id: req.user.id,
        title: title || `Voyage à ${destination}`,
        destination, country, origin,
        departure, return_date,
        travelers: travelers || 1,
        budget, mode, pack_data, score,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ trip });

  } catch (err) {
    console.error('POST trip error:', err);
    res.status(500).json({ error: 'Erreur lors de la création du voyage' });
  }
});

// ---- GET /api/trips/:id ----
router.get('/:id', async (req, res) => {
  try {
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*, packs(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !trip) {
      return res.status(404).json({ error: 'Voyage introuvable' });
    }

    res.json({ trip });

  } catch (err) {
    console.error('GET trip error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ---- PUT /api/trips/:id ----
router.put('/:id', async (req, res) => {
  try {
    const allowed = ['title', 'status', 'pack_data', 'score', 'travelers', 'budget'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updated_at = new Date();

    const { data: trip, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error || !trip) {
      return res.status(404).json({ error: 'Voyage introuvable' });
    }

    res.json({ trip });

  } catch (err) {
    console.error('PUT trip error:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ---- DELETE /api/trips/:id ----
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Voyage supprimé' });

  } catch (err) {
    console.error('DELETE trip error:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
