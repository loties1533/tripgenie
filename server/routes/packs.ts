// =============================================
// TRIPGENIE — server/routes/packs.ts
// GET  /api/packs/:trip_id     → packs d'un voyage
// POST /api/packs/:trip_id/select/:pack_id → choisir un pack
// =============================================

import express from 'express';
import type { Request, Response } from 'express';
import { withUser } from '../db/pg.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/:trip_id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const userId = req.user.id;

    // Vérif propriété + lecture des packs dans la MÊME transaction (même contexte RLS).
    // null = voyage non possédé (la policy packs_own_data filtre déjà, on double avec le WHERE).
    const packs = await withUser(userId, async (c) => {
      const owned = await c.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [req.params.trip_id, userId]);
      if (owned.rows.length === 0) return null;
      const { rows } = await c.query('SELECT * FROM packs WHERE trip_id = $1 ORDER BY rank', [req.params.trip_id]);
      return rows;
    });

    if (packs === null) {
      res.status(403).json({ error: 'Accès non autorisé' });
      return;
    }

    res.json({ packs });
  } catch (err) {
    console.error('GET packs error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:trip_id/select/:pack_id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }
    const userId = req.user.id;

    // Tout dans UNE transaction atomique : propriété → existence pack → bascule
    // selected → MAJ du trip. Si une étape échoue, ROLLBACK (pas d'état incohérent).
    const outcome = await withUser(userId, async (c): Promise<
      { status: 403 } | { status: 404 } | { status: 200; pack: unknown }
    > => {
      const owned = await c.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [req.params.trip_id, userId]);
      if (owned.rows.length === 0) return { status: 403 };

      const exists = await c.query('SELECT id FROM packs WHERE id = $1 AND trip_id = $2', [req.params.pack_id, req.params.trip_id]);
      if (exists.rows.length === 0) return { status: 404 };

      // Désélectionne tous les packs du trip, puis sélectionne le choisi
      await c.query('UPDATE packs SET selected = false WHERE trip_id = $1', [req.params.trip_id]);
      const { rows } = await c.query(
        'UPDATE packs SET selected = true WHERE id = $1 AND trip_id = $2 RETURNING *',
        [req.params.pack_id, req.params.trip_id]
      );
      const pack = rows[0];

      // Met à jour le statut du voyage + snapshot du pack sélectionné
      await c.query(
        `UPDATE trips SET status = 'confirmed', pack_data = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3`,
        [pack, req.params.trip_id, userId]
      );

      return { status: 200, pack };
    });

    if (outcome.status === 403) { res.status(403).json({ error: 'Accès non autorisé' }); return; }
    if (outcome.status === 404) { res.status(404).json({ error: 'Pack introuvable' });   return; }

    res.json({ pack: outcome.pack, message: 'Pack sélectionné !' });
  } catch (err) {
    console.error('SELECT pack error:', err);
    res.status(500).json({ error: 'Erreur lors de la sélection' });
  }
});

export default router;
