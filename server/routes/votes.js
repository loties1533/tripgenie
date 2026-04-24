// =============================================
// TRIPGENIE — server/routes/votes.js
// Gestion du consensus (Voter pour/contre un item)
// =============================================

import express from 'express';
import supabase from '../db/supabase.js';

const router = express.Router();

// ---- POST /api/votes ----
// Permet de voter pour un élément du pack (public via lien)
router.post('/', async (req, res) => {
  try {
    const { trip_id, item_id, voter_name, vote_type } = req.body;

    if (!trip_id || !item_id || vote_type === undefined) {
      return res.status(400).json({ error: 'Données de vote incomplètes' });
    }

    const { data, error } = await supabase
      .from('trip_votes')
      .insert({
        trip_id,
        item_id,
        voter_name: voter_name || 'Anonyme',
        vote_type
      })
      .select()
      .single();

    if (error) {
      console.error('❌ SUPABASE VOTE ERROR:', JSON.stringify(error, null, 2));
      throw error;
    }

    res.status(201).json({ message: 'Vote enregistré !', vote: data });

  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du vote' });
  }
});

// ---- GET /api/votes/:trip_id ----
// Récupérer tous les votes pour un voyage donné
router.get('/:trip_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trip_votes')
      .select('*')
      .eq('trip_id', req.params.trip_id);

    if (error) throw error;

    res.json({ votes: data });

  } catch (err) {
    console.error('Fetch votes error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des votes' });
  }
});

export default router;
