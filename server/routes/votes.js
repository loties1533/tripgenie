// =============================================
// TRIPGENIE — server/routes/votes.js
// Gestion du consensus (Voter pour/contre un item)
// =============================================

import express from 'express';
import { z } from 'zod';
import supabase from '../db/supabase.js';

const voteSchema = z.object({
  trip_id:    z.string().uuid('trip_id invalide'),
  item_id:    z.string().min(1, 'item_id requis'),
  vote_type:  z.boolean(),
  voter_name: z.string().max(50).optional()
});

const router = express.Router();

// ---- POST /api/votes ----
// Permet de voter pour un élément du pack (public via lien)
router.post('/', async (req, res, next) => {
  try {
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const { trip_id, item_id, voter_name, vote_type } = parsed.data;

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
    next(err);
  }
});

// ---- GET /api/votes/:trip_id ----
// Récupérer tous les votes pour un voyage donné
router.get('/:trip_id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('trip_votes')
      .select('*')
      .eq('trip_id', req.params.trip_id);

    if (error) throw error;

    res.json({ votes: data });

  } catch (err) {
    console.error('Fetch votes error:', err);
    next(err);
  }
});

export default router;
