// =============================================
// TRIPGENIE — server/routes/collaborators.ts
// Collaborateurs de voyage (relation many-to-many trips ↔ users)
// =============================================

import express from 'express';
import { z } from 'zod';
import { query, withUser } from '../db/pg.js';
import { requireAuth } from '../middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

const router = express.Router();

const inviteSchema = z.object({
  email: z.string().email('email invalide'),
  role:  z.enum(['viewer', 'editor']).default('viewer')
});

// ---- GET /api/trips/:trip_id/collaborators ----
// Lister les collaborateurs d'un voyage (propriétaire uniquement)
router.get('/:trip_id/collaborators', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const tripId = req.params.trip_id;

    // 1. Propriété du voyage (404 si pas à l'utilisateur)
    const { rows: owned } = await withUser(userId, (c) =>
      c.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId])
    );
    if (owned.length === 0) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    // 2. La table users est RLS-restreinte au seul appelant → un JOIN classique
    //    masquerait les autres collaborateurs. On lit donc via une fonction
    //    SECURITY DEFINER qui RE-VÉRIFIE la propriété (p_owner_id = userId du JWT).
    const { rows } = await query<{ user_id: string; role: string; invited_at: string; name: string; email: string }>(
      'SELECT * FROM trip_collaborators_for_owner($1, $2)',
      [tripId, userId]
    );

    const collaborators = rows.map((r) => ({
      user_id:    r.user_id,
      role:       r.role,
      invited_at: r.invited_at,
      users:      { name: r.name, email: r.email },
    }));

    res.json({ collaborators });

  } catch (err) {
    next(err);
  }
});

// ---- POST /api/trips/:trip_id/collaborators ----
// Inviter un utilisateur par email (propriétaire uniquement)
router.post('/:trip_id/collaborators', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues?.[0]?.message ?? 'Données invalides' });
      return;
    }
    const userId = req.user!.id;
    const tripId = req.params.trip_id;

    // 1. Propriété du voyage
    const { rows: owned } = await withUser(userId, (c) =>
      c.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId])
    );
    if (owned.length === 0) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    // 2. Trouver la cible par email — recherche cross-user → fonction SECURITY
    //    DEFINER (la table users est RLS-restreinte). On ne lit PAS le hash.
    const { rows: targets } = await query<{ id: string; name: string; email: string }>(
      'SELECT id, name, email FROM auth_user_by_email($1)',
      [parsed.data.email]
    );
    const targetUser = targets[0];
    if (!targetUser) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    if (targetUser.id === userId) {
      res.status(400).json({ error: 'Impossible de s\'inviter soi-même' });
      return;
    }

    // 3. Upsert collaborateur (la policy collab_own_data exige un voyage possédé)
    const { rows } = await withUser(userId, (c) =>
      c.query(
        `INSERT INTO trip_collaborators (trip_id, user_id, role, invited_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (trip_id, user_id) DO UPDATE SET role = EXCLUDED.role, invited_at = NOW()
         RETURNING *`,
        [tripId, targetUser.id, parsed.data.role]
      )
    );

    res.status(201).json({ collaborator: rows[0], user: { name: targetUser.name, email: targetUser.email } });

  } catch (err) {
    next(err);
  }
});

// ---- DELETE /api/trips/:trip_id/collaborators/:user_id ----
// Retirer un collaborateur (propriétaire uniquement)
router.delete('/:trip_id/collaborators/:user_id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const tripId = req.params.trip_id;

    // Propriété + suppression dans la même transaction (false = voyage non possédé)
    const removed = await withUser(userId, async (c) => {
      const owned = await c.query('SELECT id FROM trips WHERE id = $1 AND user_id = $2', [tripId, userId]);
      if (owned.rows.length === 0) return false;
      await c.query('DELETE FROM trip_collaborators WHERE trip_id = $1 AND user_id = $2', [tripId, req.params.user_id]);
      return true;
    });

    if (!removed) {
      res.status(404).json({ error: 'Voyage introuvable' });
      return;
    }

    res.status(200).json({ message: 'Collaborateur retiré' });

  } catch (err) {
    next(err);
  }
});

export default router;
