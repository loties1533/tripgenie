// =============================================
// TRIPGENIE — server/routes/trips.ts
// =============================================

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool.js';
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
    if (!pool) {
      res.status(500).json({ error: 'Base de données non configurée' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT id, title, destination, pack_data, score, mode, departure, return_date, travelers
       FROM trips WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );

    const trip = rows[0];
    if (!trip) {
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
    if (!pool || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { mode, status } = req.query;
    const limit  = Math.min(Math.max(parseInt((req.query.limit as string) || '20'), 1), 50);
    const offset = Math.max(parseInt((req.query.offset as string) || '0'), 0);

    // Construction de la requête avec filtres optionnels
    const params: unknown[] = [req.user.id];
    let whereClause = 'WHERE user_id = $1';

    if (mode && typeof mode === 'string') {
      params.push(mode);
      whereClause += ` AND mode = $${params.length}`;
    }
    if (status && typeof status === 'string') {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    params.push(limit, offset);

    const { rows: trips } = await pool.query(
      `SELECT * FROM trips ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

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

    if (!pool || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO trips
         (user_id, title, destination, country, origin, departure, return_date, travelers, budget, mode, pack_data, score, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft')
       RETURNING *`,
      [
        req.user.id,
        title || `Voyage à ${destination}`,
        destination,
        country || null,
        origin || null,
        departure || null,
        return_date || null,
        travelers || 1,
        String(budget || ''),
        mode,
        pack_data ? JSON.stringify(pack_data) : null,
        score || null
      ]
    );

    res.status(201).json({ trip: rows[0] });

  } catch (err) {
    console.error('POST trip error:', err);
    next(err);
  }
});

// ---- GET /api/trips/:id ----
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!pool || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT * FROM trips WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.id, req.user.id]
    );

    const trip = rows[0];
    if (!trip) {
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

    if (!pool || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    const fields = parsed.data;
    const keys = Object.keys(fields) as (keyof typeof fields)[];
    if (keys.length === 0) {
      res.status(400).json({ error: 'Aucun champ à modifier' });
      return;
    }

    // Construire le SET dynamiquement
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`);
    setClauses.push(`updated_at = NOW()`);
    const values: unknown[] = keys.map(k => k === 'pack_data' ? JSON.stringify(fields[k]) : fields[k]);
    values.push(req.params.id, req.user.id);

    const { rows } = await pool.query(
      `UPDATE trips SET ${setClauses.join(', ')}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}
       RETURNING *`,
      values
    );

    const trip = rows[0];
    if (!trip) {
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
    if (!pool || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    await pool.query(
      'DELETE FROM trips WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Voyage supprimé' });

  } catch (err) {
    console.error('DELETE trip error:', err);
    next(err);
  }
});

export default router;
