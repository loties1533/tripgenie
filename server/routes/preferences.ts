// =============================================
// TRIPGENIE — server/routes/preferences.ts
// Préférences utilisateur (relation 1-1 avec users)
// =============================================

import express from 'express';
import { z } from 'zod';
import { withUser } from '../db/pg.js';
import { requireAuth } from '../middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

const router = express.Router();

const prefsSchema = z.object({
  default_mode:    z.enum(['party', 'student', 'luxury', 'group', 'relax', 'surprise']).optional(),
  preferred_prefs: z.array(z.string().max(50)).max(10).optional(),
  home_city:       z.string().max(100).optional(),
  currency:        z.string().length(3).optional()
});

// ---- GET /api/preferences ----
// Récupérer les préférences de l'utilisateur connecté
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    // RLS maison : la policy prefs_own_data (user_id = app.current_user_id) filtre déjà,
    // et on garde le WHERE applicatif user_id = $1 (défense en profondeur).
    const { rows } = await withUser(userId, (c) =>
      c.query('SELECT * FROM user_preferences WHERE user_id = $1', [userId])
    );

    // Aucune ligne → préférences pas encore créées
    res.json({ preferences: rows[0] ?? null });

  } catch (err) {
    next(err);
  }
});

// ---- PUT /api/preferences ----
// Créer ou mettre à jour les préférences (upsert)
router.put('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = prefsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues?.[0]?.message ?? 'Données invalides' });
      return;
    }
    const userId = req.user!.id;

    // Upsert paramétré : on n'écrit QUE les colonnes fournies (allowlist), jamais
    // une clé venue du client interpolée dans le SQL. user_id est la PK → ON CONFLICT.
    const ALLOWED = ['default_mode', 'preferred_prefs', 'home_city', 'currency'] as const;
    const cols: string[]         = ['user_id'];
    const placeholders: string[] = ['$1'];
    const params: unknown[]      = [userId];

    for (const key of ALLOWED) {
      if (!(key in parsed.data)) continue;
      params.push((parsed.data as Record<string, unknown>)[key]);
      cols.push(key);
      placeholders.push(`$${params.length}`);
    }
    cols.push('updated_at');
    placeholders.push('NOW()');

    const updates = cols
      .filter((c) => c !== 'user_id')
      .map((c) => (c === 'updated_at' ? 'updated_at = NOW()' : `${c} = EXCLUDED.${c}`));

    const sql = `INSERT INTO user_preferences (${cols.join(', ')})
                 VALUES (${placeholders.join(', ')})
                 ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}
                 RETURNING *`;

    const { rows } = await withUser(userId, (c) => c.query(sql, params));

    res.json({ preferences: rows[0] });

  } catch (err) {
    next(err);
  }
});

export default router;
