// =============================================
// TRIPGENIE — server/routes/ai.js
// =============================================

import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { aiGenerateLimiter, aiChatLimiter } from '../middleware/limiter.js';
import { analyzeRequest, suggestDestinations, assemblePack, chatModify, chatIntake } from '../services/claude.js';
import { smartFlightSearch, smartEventsSearch, smartHotelSearch } from '../services/smartSearch.js';
import { scorepack } from '../services/scoring.js';
import { getRealWeather } from '../services/weather.js';
import { getDestinationPhoto } from '../services/photo.js';
import supabase from '../db/supabase.js';

const router = express.Router();


// ---- POST /api/ai/analyze ----
router.post('/analyze', aiChatLimiter, optionalAuth, async (req, res) => {
  try {
    const { input } = req.body;
    if (!input?.trim()) return res.status(400).json({ error: 'input requis' });
    if (input.length > 1000) return res.status(400).json({ error: 'Message trop long (max 1000 car.)' });

    const analysis = await analyzeRequest(input);
    res.json({ analysis });

  } catch (err) {
    console.error('AI analyze error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'analyse de votre demande' });
  }
});

// ---- POST /api/ai/destinations ----
router.post('/destinations', aiGenerateLimiter, optionalAuth, async (req, res) => {
  try {
    const { mode, budget, travelers, duration, origin, preferences, departure } = req.body;
    if (!mode) return res.status(400).json({ error: 'mode requis' });

    const result = await suggestDestinations({ mode, budget, travelers, duration, origin, preferences, departure });
    res.json(result);

  } catch (err) {
    console.error('AI destinations error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suggestion de destinations' });
  }
});

// ---- POST /api/ai/onboarding ----
router.post('/onboarding', aiChatLimiter, optionalAuth, async (req, res) => {
  try {
    const { currentData, userMessage } = req.body;
    if (!userMessage) return res.status(400).json({ error: 'userMessage requis' });
    if (userMessage.length > 1000) return res.status(400).json({ error: 'Message trop long' });

    const result = await chatIntake({ currentData, userMessage });
    res.json(result);

  } catch (err) {
    console.error('AI onboarding error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la conversation d\'onboarding' });
  }
});

// ---- POST /api/ai/generate ----
router.post('/generate', aiGenerateLimiter, optionalAuth, async (req, res) => {
  try {
    const {
      destination,
      origin      = 'Paris',
      departure,
      return_date,
      duration,
      travelers   = 2,
      budget,
      mode        = 'party',
      preferences = []
    } = req.body;

    if (!destination?.trim()) return res.status(400).json({ error: 'destination requise' });
    if (!departure)           return res.status(400).json({ error: 'date de départ requise' });
    if (!budget || budget <= 0) return res.status(400).json({ error: 'budget invalide' });

    // ---- RECHERCHE WEB (Tavily + IA) ----
    // On utilise SmartSearch (Tavily) pour plus de réalisme et de fiabilité
    console.log(`✈️ Recherche de vols via SmartSearch (Web) pour ${destination}...`);
    
    const results = await Promise.allSettled([
      smartFlightSearch({ origin, destination, departure, return_date }),
      smartEventsSearch({ location: destination, dateFrom: departure, dateTo: return_date || departure, mode }),
      smartHotelSearch({ location: destination, mode }),
      getRealWeather(destination),
      getDestinationPhoto(destination)
    ]);

    let aiFlight = results[0].status === 'fulfilled' ? results[0].value : null;
    let flights = [];

    if (aiFlight) {
      flights = [{
        id: 'AI-SEARCH',
        price: aiFlight.price * travelers,
        price_per_person: aiFlight.price,
        outbound: { 
          from: origin, to: destination, airline: aiFlight.airline, 
          departure_time: aiFlight.outbound_time, arrival_time: aiFlight.arrival_time, 
          duration_min: parseInt(aiFlight.duration) * 60 || 180, // Conversion simplifiée
          stops: aiFlight.stops === "Direct" ? 0 : 1 
        },
        return: { 
          from: destination, to: origin, airline: aiFlight.airline, 
          departure_time: '18:00', arrival_time: '20:00', 
          duration_min: 120, stops: 0 
        }
      }];
    }

    const events = results[1].status === 'fulfilled' ? results[1].value : [];
    if (results[1].status === 'rejected') console.warn('Events API fallback:', results[1].reason);

    const hotelsFromWeb = results[2].status === 'fulfilled' ? results[2].value : [];
    const realWeather = results[3].status === 'fulfilled' ? results[3].value : null;
    const realPhoto = results[4].status === 'fulfilled' ? results[4].value : null;

    // Assemblage du pack avec les VRAIES données injectées
    const pack = await assemblePack({
      destination,
      flights,
      events,
      hotels: hotelsFromWeb,
      mode,
      travelers,
      budget,
      departure,
      return_date,
      duration,
      realWeather,
      realPhoto
  });

    // ---- Scoring réel via scoring.js ----
    const bestFlight = flights[0] ?? null;
    const hotelData = pack.hotels?.[0] || null;
    
    const scoreResult = scorepack(
      {
        vol: bestFlight 
          ? { price: bestFlight.price, duration_min: bestFlight.outbound?.duration_min, stops: bestFlight.outbound?.stops } 
          : { price: budget * 0.25, duration_min: 180, stops: 0 }, // Simulation intelligente pour le score
        hotel: hotelData 
          ? { stars: hotelData.stars || 4, price_per_night: parseInt(hotelData.price_per_night) || 150, rating: 8.5 } 
          : { stars: 4, price_per_night: 150, rating: 8 },
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
      score: scoreResult
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
      score:         scoreResult.total
    });

  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la génération du pack. Réessayez.' });
  }
});

// ---- POST /api/ai/chat ----
router.post('/chat', aiChatLimiter, optionalAuth, async (req, res) => {
  try {
    const { message, current_pack, mode, trip_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message requis' });
    if (message.length > 1000) return res.status(400).json({ error: 'Message trop long' });

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