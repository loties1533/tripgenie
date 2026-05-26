// =============================================
// TRIPGENIE — server/routes/packs.ts
// GET  /api/packs/:trip_id     → packs d'un voyage
// POST /api/packs/:trip_id/select/:pack_id → choisir un pack
// =============================================

import express from 'express';
import type { Request, Response } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/:trip_id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!pool || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    // Vérifie d'abord que le trip appartient à l'user
    const { rows: tripRows } = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.trip_id, req.user.id]
    );

    if (tripRows.length === 0) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    const { rows: packs } = await pool.query(
      'SELECT * FROM packs WHERE trip_id = $1 ORDER BY rank',
      [req.params.trip_id]
    );

    res.json({ packs });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:trip_id/select/:pack_id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!pool || !req.user) {
      res.status(500).json({ error: 'Configuration manquante' });
      return;
    }

    // Vérifie d'abord la propriété
    const { rows: tripRows } = await pool.query(
      'SELECT id FROM trips WHERE id = $1 AND user_id = $2 LIMIT 1',
      [req.params.trip_id, req.user.id]
    );

    if (tripRows.length === 0) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    // Désélectionne tous les packs du trip
    await pool.query(
      'UPDATE packs SET selected = false WHERE trip_id = $1',
      [req.params.trip_id]
    );

    // Sélectionne le pack choisi
    const { rows } = await pool.query(
      `UPDATE packs SET selected = true
       WHERE id = $1 AND trip_id = $2
       RETURNING *`,
      [req.params.pack_id, req.params.trip_id]
    );

    const pack = rows[0];
    if (!pack) {
      res.status(404).json({ error: 'Pack introuvable' });
      return;
    }

    // Met à jour le statut du trip
    await pool.query(
      `UPDATE trips SET status = 'confirmed', pack_data = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [JSON.stringify(pack), req.params.trip_id, req.user.id]
    );

    res.json({ pack, message: 'Pack sélectionné !' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la sélection' });
  }
});

export default router;
