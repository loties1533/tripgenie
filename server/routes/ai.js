// =============================================
// TRIPGENIE — server/routes/ai.js
// POST /api/ai/analyze     → analyser requête NL
// POST /api/ai/destinations → suggérer destinations
// POST /api/ai/generate    → générer pack complet
// POST /api/ai/chat        → modifier via chat
// =============================================

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { analyzeRequest, suggestDestinations, assemblePack, chatModify } from '../services/claude.js';
import { searchFlights, cityToIata } from '../services/amadeus.js';
import { searchEvents } from '../services/predicthq.js';
import { rankPacks } from '../services/scoring.js';
import supabase from '../db/supabase.js';

const router = express.Router();

// ---- POST /api/ai/analyze ----
// Analyse une requête en langage naturel
router.post('/analyze', optionalAuth, async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: 'input requis' });

    const analysis = await analyzeRequest(input);
    res.json({ analysis });

  } catch (err) {
    console.error('AI analyze error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'analyse' });
  }
});

// ---- POST /api/ai/destinations ----
// Suggère des destinations si non précisée
router.post('/destinations', optionalAuth, async (req, res) => {
  try {
    const { mode, budget, travelers, duration, origin, preferences } = req.body;

    const result = await suggestDestinations({ mode, budget, travelers, duration, origin, preferences });
    res.json(result);

  } catch (err) {
    console.error('AI destinations error:', err);
    res.status(500).json({ error: 'Erreur lors de la suggestion de destinations' });
  }
});

// ---- POST /api/ai/generate ----
// Génère un pack complet avec vraies données APIs
router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const {
      destination, origin = 'Paris',
      departure, return_date,
      travelers = 2, budget,
      mode = 'party', preferences = []
    } = req.body;

    if (!destination || !departure) {
      return res.status(400).json({ error: 'destination et departure requis' });
    }

    // Lancer toutes les recherches en parallèle
    const [originIata, destIata] = await Promise.all([
      cityToIata(origin),
      cityToIata(destination)
    ]);

    const [flights, events] = await Promise.all([
      originIata && destIata
        ? searchFlights({
            origin:        originIata,
            destination:   destIata,
            departureDate: departure,
            returnDate:    return_date,
            adults:        travelers
          })
        : Promise.resolve([]),
      searchEvents({
        location: destination,
        dateFrom: departure,
        dateTo:   return_date || departure,
        mode
      })
    ]);

    // Assembler le pack via Claude avec les vraies données
    const pack = await assemblePack({
      destination,
      flights,
      hotels:     [],   // TODO: brancher Booking.com
      events,
      activities: [],   // TODO: brancher Google Places
      mode,
      travelers,
      budget
    });

    // Scorer le pack
    const scoredPack = {
      ...pack,
      flights_data: flights,
      events_data:  events,
      score: {
        total: 0.85,    // Score calculé par scoring.js
        mode
      }
    };

    // Sauvegarder si user connecté
    let tripId = null;
    if (req.user) {
      const { data: trip } = await supabase
        .from('trips')
        .insert({
          user_id:     req.user.id,
          title:       `Voyage à ${destination}`,
          destination,
          origin,
          departure,
          return_date,
          travelers,
          budget:      String(budget),
          mode,
          pack_data:   scoredPack,
          score:       scoredPack.score.total,
          status:      'draft'
        })
        .select('id')
        .single();

      tripId = trip?.id;
    }

    res.json({
      pack: scoredPack,
      trip_id: tripId,
      flights_found: flights.length,
      events_found:  events.length
    });

  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ error: 'Erreur lors de la génération du pack' });
  }
});

// ---- POST /api/ai/chat ----
// Modifier un itinéraire via conversation
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, current_pack, mode, trip_id } = req.body;
    if (!message) return res.status(400).json({ error: 'message requis' });

    const result = await chatModify({
      currentPack:  current_pack,
      userMessage:  message,
      mode
    });

    // Si l'user est connecté et qu'il y a un trip_id, MAJ en DB
    if (req.user && trip_id && result.modifications) {
      await supabase
        .from('trips')
        .update({ pack_data: { ...current_pack, ...result.modifications }, updated_at: new Date() })
        .eq('id', trip_id)
        .eq('user_id', req.user.id);
    }

    res.json(result);

  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Erreur lors de la conversation' });
  }
});

export default router;
