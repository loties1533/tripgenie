// =============================================
// TRIPGENIE — server/routes/ai.js
// =============================================

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { analyzeRequest, suggestDestinations, assemblePack, chatModify } from '../services/claude.js';
import { searchFlights, cityToIata } from '../services/amadeus.js';
import { searchEvents } from '../services/predicthq.js';
import { scorepack } from '../services/scoring.js';
import supabase from '../db/supabase.js';

const router = express.Router();

// Cache IATA en mémoire (évite appels Amadeus redondants)
// Ex: "Paris" → "CDG", "Tokyo" → "TYO"
const iataCache = new Map();

async function getIata(city) {
  if (!city) return null;
  const key = city.toLowerCase().trim();
  if (iataCache.has(key)) return iataCache.get(key);
  const code = await cityToIata(city);
  if (code) iataCache.set(key, code);
  return code;
}

// ---- POST /api/ai/analyze ----
router.post('/analyze', optionalAuth, async (req, res) => {
  try {
    const { input } = req.body;
    if (!input?.trim()) return res.status(400).json({ error: 'input requis' });

    const analysis = await analyzeRequest(input);
    res.json({ analysis });

  } catch (err) {
    console.error('AI analyze error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'analyse de votre demande' });
  }
});

// ---- POST /api/ai/destinations ----
router.post('/destinations', optionalAuth, async (req, res) => {
  try {
    const { mode, budget, travelers, duration, origin, preferences } = req.body;
    if (!mode) return res.status(400).json({ error: 'mode requis' });

    const result = await suggestDestinations({ mode, budget, travelers, duration, origin, preferences });
    res.json(result);

  } catch (err) {
    console.error('AI destinations error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suggestion de destinations' });
  }
});

// ---- POST /api/ai/generate ----
router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const {
      destination,
      origin      = 'Paris',
      departure,
      return_date,
      travelers   = 2,
      budget,
      mode        = 'party',
      preferences = []
    } = req.body;

    if (!destination?.trim()) return res.status(400).json({ error: 'destination requise' });
    if (!departure)           return res.status(400).json({ error: 'date de départ requise' });
    if (!budget || budget <= 0) return res.status(400).json({ error: 'budget invalide' });

    // Résolution IATA en parallèle (avec cache)
    const [originIata, destIata] = await Promise.all([
      getIata(origin),
      getIata(destination)
    ]);

    // Feedback si codes IATA non trouvés
    const iataWarnings = [];
    if (!originIata)  iataWarnings.push(`Ville de départ "${origin}" non reconnue, vols réels indisponibles`);
    if (!destIata)    iataWarnings.push(`Destination "${destination}" non reconnue, vols réels indisponibles`);

    // Recherches en parallèle — chacune fail gracieusement
    const [flights, events] = await Promise.all([
      originIata && destIata
        ? searchFlights({ origin: originIata, destination: destIata, departureDate: departure, returnDate: return_date, adults: travelers })
        : Promise.resolve([]),
      searchEvents({ location: destination, dateFrom: departure, dateTo: return_date || departure, mode })
    ]);

    // Assemblage du pack avec les VRAIES données injectées
    const pack = await assemblePack({
      destination,
      flights,
      events,
      mode,
      travelers,
      budget
    });

    // ---- Scoring réel via scoring.js ----
    const bestFlight = flights[0] ?? null;
    const scoreResult = scorepack(
      {
        vol:        bestFlight ? { price: bestFlight.price, duration_min: bestFlight.outbound?.duration_min, stops: bestFlight.outbound?.stops } : { price: budget * 0.3, duration_min: 120, stops: 0 },
        hotel:      pack.hotels?.[0] ? { stars: pack.hotels[0].stars, price_per_night: parseInt(pack.hotels[0].price_per_night) || 100, rating: 7.5 } : { stars: 3, price_per_night: 100, rating: 7 },
        events,
        activities: pack.activities ?? [],
        totalPrice: budget
      },
      mode,
      travelers,
      destination
    );

    const scoredPack = {
      ...pack,
      flights_data: flights,
      events_data:  events,
      score: scoreResult,
      warnings: iataWarnings.length ? iataWarnings : undefined
    };

    // Sauvegarde si user connecté
    let tripId = null;
    if (req.user && supabase) {
      const { data: trip } = await supabase
        .from('trips')
        .insert({
          user_id:    req.user.id,
          title:      `Voyage à ${destination}`,
          destination,
          origin,
          departure,
          return_date,
          travelers,
          budget:     String(budget),
          mode,
          pack_data:  scoredPack,
          score:      scoreResult.total,
          status:     'draft'
        })
        .select('id')
        .single();

      tripId = trip?.id;
    }

    res.json({
      pack:          scoredPack,
      trip_id:       tripId,
      flights_found: flights.length,
      events_found:  events.length,
      score:         scoreResult.total,
      warnings:      iataWarnings.length ? iataWarnings : undefined
    });

  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la génération du pack. Réessayez.' });
  }
});

// ---- POST /api/ai/chat ----
router.post('/chat', optionalAuth, async (req, res) => {
  try {
    const { message, current_pack, mode, trip_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message requis' });

    const result = await chatModify({
      currentPack: current_pack,
      userMessage: message,
      mode
    });

    // MAJ DB si user connecté et trip existant
    if (req.user && trip_id && result.modifications) {
      await supabase
        .from('trips')
        .update({ pack_data: { ...current_pack, ...result.modifications }, updated_at: new Date() })
        .eq('id', trip_id)
        .eq('user_id', req.user.id);
    }

    res.json(result);

  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la conversation' });
  }
});

export default router;