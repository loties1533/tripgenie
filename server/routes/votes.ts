// =============================================
// TRIPGENIE — server/routes/votes.ts
// Gestion du consensus (Voter pour/contre un item)
// =============================================

import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import pool from '../db/pool.js';
import type { Request, Response, NextFunction } from 'express';

const voteSchema = z.object({
  trip_id:    z.string().uuid('trip_id invalide'),
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
// Permet de voter pour un élément du pack (public via lien partagé)
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = voteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues?.[0]?.message ?? 'Données invalides' });
      return;
    }
    const { trip_id, item_id, voter_name, vote_type } = parsed.data;

    if (!pool) {
      res.status(500).json({ error: 'Base de données non configurée' });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO trip_votes (trip_id, item_id, voter_name, vote_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [trip_id, item_id, voter_name || 'Anonyme', vote_type]
    );

    res.status(201).json({ message: 'Vote enregistré !', vote: rows[0] });

  } catch (err) {
    console.error('Vote error:', err);
    next(err);
  }
});

// ---- GET /api/votes/:trip_id ----
router.get('/:trip_id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!pool) {
      res.status(500).json({ error: 'Base de données non configurée' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT * FROM trip_votes WHERE trip_id = $1 ORDER BY created_at DESC',
      [req.params.trip_id]
    );

    res.json({ votes: rows });

  } catch (err) {
    console.error('Fetch votes error:', err);
    next(err);
  }
});

export default router;
