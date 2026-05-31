// =============================================
// TRIPGENIE — server/routes/trips.ts
// =============================================

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, withUser } from '../db/pg.js';
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
type SharedTrip = {
  id: string;
  title: string | null;
  destination: string;
  country: string | null;
  pack_data: unknown;
  score: number | null;
  mode: string;
  departure: string | null;
  return_date: string | null;
  travelers: number | null;
  budget: string | null;
  packs: Array<{ id: string; rank: number; selected: boolean }>;
};

router.get('/share/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Lecture PUBLIQUE (aucun utilisateur connecté) : trips/packs sont RLS fail-closed,
    // une lecture directe via le rôle applicatif ne renverrait donc rien. On passe par
    // une fonction SECURITY DEFINER au périmètre minimal — elle n'expose AUCUNE donnée
    // utilisateur (ni email ni hash), juste le voyage et l'id de ses packs.
    const { rows } = await query<{ trip: SharedTrip | null }>(
      'SELECT public_shared_trip($1) AS trip',
      [req.params.id]
    );
    const trip = rows[0]?.trip ?? null;

    if (!trip) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    // Le pack sélectionné (ou rang 1) sert de cible pour les votes consensus
    const packs = trip.packs ?? [];
    const targetPack = packs.find((p) => p.selected) ?? [...packs].sort((a, b) => a.rank - b.rank)[0] ?? null;
    const { packs: _packs, ...tripData } = trip;

    res.json({ trip: { ...tripData, pack_id: targetPack?.id ?? null } });
  } catch (err) {
    console.error('Public share error:', err);
    next(err);
  }
});

router.use(requireAuth);

// ---- GET /api/trips ----
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const userId = req.user.id;

    const { mode, status } = req.query;

    // Cap à 50 max, défaut 20, minimum 1
    const limit  = Math.min(Math.max(parseInt((req.query.limit as string) || '20'), 1), 50);
    const offset = Math.max(parseInt((req.query.offset as string) || '0'), 0);

    // Défense en profondeur : filtre applicatif user_id = $1 (1re barrière)
    // ET RLS PostgreSQL via withUser() (2e barrière). On ne s'appuie pas que sur le RLS.
    const conditions = ['user_id = $1'];
    const params: unknown[] = [userId];

    if (mode && typeof mode === 'string')     { params.push(mode);   conditions.push(`mode = $${params.length}`); }
    if (status && typeof status === 'string') { params.push(status); conditions.push(`status = $${params.length}`); }

    params.push(limit);  const limitIdx  = params.length;
    params.push(offset); const offsetIdx = params.length;

    const sql = `SELECT * FROM trips
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY created_at DESC
                 LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    const { rows: trips } = await withUser(userId, (c) => c.query(sql, params));

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

    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const userId = req.user.id;

    const { rows } = await withUser(userId, (c) => c.query(
      `INSERT INTO trips
         (user_id, title, destination, country, origin, departure, return_date, travelers, budget, mode, pack_data, score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
       RETURNING *`,
      [
        userId,
        title || `Voyage à ${destination}`,
        destination,
        country     ?? null,
        origin      ?? null,
        departure   ?? null,
        return_date ?? null,
        travelers || 1,
        budget != null ? String(budget) : null,
        mode,
        pack_data ?? null,
        score     ?? null
      ]
    ));

    res.status(201).json({ trip: rows[0] });

  } catch (err) {
    console.error('POST trip error:', err);
    next(err);
  }
});

// ---- GET /api/trips/:id ----
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const userId = req.user.id;

    // LEFT JOIN + json_agg reconstruit l'agrégat `trip + packs` en une requête.
    // FILTER (WHERE p.id IS NOT NULL) → [] si le voyage n'a aucun pack (et non [null]).
    const { rows } = await withUser(userId, (c) => c.query(
      `SELECT t.*,
              COALESCE(json_agg(p ORDER BY p.rank) FILTER (WHERE p.id IS NOT NULL), '[]'::json) AS packs
       FROM trips t
       LEFT JOIN packs p ON p.trip_id = t.id
       WHERE t.id = $1 AND t.user_id = $2
       GROUP BY t.id`,
      [req.params.id, userId]
    ));

    if (rows.length === 0) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    res.json({ trip: rows[0] });

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
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const userId = req.user.id;

    // SET dynamique avec allowlist de colonnes : on n'interpole jamais une clé venue du
    // client dans le SQL, uniquement des noms de colonnes validés ici → pas d'injection.
    const ALLOWED = ['title', 'status', 'pack_data', 'score', 'travelers', 'budget'] as const;
    const setParts: string[] = [];
    const params: unknown[] = [];

    for (const key of ALLOWED) {
      if (!(key in parsed.data)) continue;
      let value: unknown = (parsed.data as Record<string, unknown>)[key];
      if (key === 'budget' && value != null) value = String(value);
      params.push(value ?? null);
      setParts.push(`${key} = $${params.length}`);
    }

    setParts.push('updated_at = NOW()');

    params.push(req.params.id); const idIdx   = params.length;
    params.push(userId);        const userIdx = params.length;

    const sql = `UPDATE trips SET ${setParts.join(', ')}
                 WHERE id = $${idIdx} AND user_id = $${userIdx}
                 RETURNING *`;

    const { rows } = await withUser(userId, (c) => c.query(sql, params));

    if (rows.length === 0) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    res.json({ trip: rows[0] });

  } catch (err) {
    console.error('PUT trip error:', err);
    next(err);
  }
});

// ---- DELETE /api/trips/:id ----
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const userId = req.user.id;

    await withUser(userId, (c) => c.query(
      'DELETE FROM trips WHERE id = $1 AND user_id = $2',
      [req.params.id, userId]
    ));

    res.json({ message: 'Voyage supprimé' });

  } catch (err) {
    console.error('DELETE trip error:', err);
    next(err);
  }
});

export default router;
