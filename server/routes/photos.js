// =============================================
// TRIPGENIE — server/routes/photos.js
// Proxy Unsplash côté serveur — la clé ne sort jamais côté client
// =============================================

import express from 'express';
import { getDestinationPhoto } from '../services/photo.js';

const router = express.Router();

// ---- GET /api/photos/:city ----
router.get('/:city', async (req, res, next) => {
  try {
    const { city } = req.params;
    if (!city?.trim()) return res.status(400).json({ error: 'city requis' });

    const url = await getDestinationPhoto(city.trim());
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

export default router;
