// =============================================
// TRIPGENIE — server/routes/votes.ts
// Gestion du consensus (Voter pour/contre un item)
// =============================================

import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pg.js';
import type { Request, Response, NextFunction } from 'express';

const voteSchema = z.object({
  pack_id:    z.string().uuid('pack_id invalide'),
  item_id:    z.string().min(1, 'item_id requis'),
  vote_type:  z.boolean(),
  voter_name: z.string().max(50).optional()
});

const router = express.Router();

// Max 10 votes par minute par IP
const voteLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Trop de votes, réessaie dans une minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(voteLimiter);

// ---- POST /api/votes ----
// Permet de voter pour un élément du pack (public via lien)
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues?.[0]?.message ?? 'Données invalides' });
      return;
    }
    const { pack_id, item_id, voter_name, vote_type } = parsed.data;

    // trip_votes est PUBLIC (policies RLS votes_insert_all/votes_select_all = true) :
    // les amis votent via le lien de partage, sans compte. Pas de contexte
    // utilisateur → query() simple (le RLS autorise l'insert).
    const { rows } = await query(
      `INSERT INTO trip_votes (pack_id, item_id, voter_name, vote_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [pack_id, item_id, voter_name || 'Anonyme', vote_type]
    );

    res.status(201).json({ message: 'Vote enregistré !', vote: rows[0] });

  } catch (err) {
    console.error('Vote error:', err);
    next(err);
  }
});

// ---- GET /api/votes/:pack_id ----
// Récupérer tous les votes pour un pack donné
router.get('/:pack_id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rows } = await query(
      `SELECT * FROM trip_votes WHERE pack_id = $1 ORDER BY created_at`,
      [req.params.pack_id]
    );

    res.json({ votes: rows });

  } catch (err) {
    console.error('Fetch votes error:', err);
    next(err);
  }
});

export default router;
