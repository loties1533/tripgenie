// =============================================
// TRIPGENIE — server/routes/ai.js
// =============================================

import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { aiGenerateLimiter, aiChatLimiter } from '../middleware/limiter.js';
import { analyzeRequest, suggestDestinations, assemblePack, chatModify, chatIntake } from '../services/claude/index.js';
import { scorepack } from '../services/scoring.js';
import { smartFlightSearch, smartEventsSearch, smartHotelSearch } from '../services/smartSearch.js';
import { getRealWeather } from '../services/weather.js';
import { getDestinationPhoto } from '../services/photo.js';
import supabase from '../db/supabase.js';
import { MODES, DEFAULT_VALUES } from '../lib/constants.js';
import { AppError } from '../lib/AppError.js';

const router = express.Router();


// ---- POST /api/ai/analyze ----
router.post('/analyze', aiChatLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { input } = req.body;
    if (!input?.trim()) return res.status(400).json({ error: 'input requis' });
    if (input.length > 1000) return res.status(400).json({ error: 'Message trop long (max 1000 car.)' });

    const analysis = await analyzeRequest(input);
    res.json({ analysis });

  } catch (err) {
    console.error('AI analyze error:', err.message);
    next(err);
  }
});

// ---- POST /api/ai/destinations ----
router.post('/destinations', aiGenerateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { mode, budget, travelers, duration, origin, preferences, departure } = req.body;
    if (!mode) return res.status(400).json({ error: 'mode requis' });

    const result = await suggestDestinations({ mode, budget, travelers, duration, origin, preferences, departure });
    res.json(result);

  } catch (err) {
    console.error('AI destinations error:', err.message);
    next(err);
  }
});

// ---- POST /api/ai/onboarding ----
router.post('/onboarding', aiChatLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { currentData, userMessage } = req.body;
    if (!userMessage) return res.status(400).json({ error: 'userMessage requis' });
    if (userMessage.length > 1000) return res.status(400).json({ error: 'Message trop long' });

    const result = await chatIntake({ currentData, userMessage });
    console.log('🧠 chatIntake extracted:', JSON.stringify(result.extractedData));
    res.json(result);

  } catch (err) {
    console.error('AI onboarding error:', err.message);
    next(err);
  }
});

// ---- POST /api/ai/generate ----
router.post('/generate', aiGenerateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const {
      destination,
      origin      = DEFAULT_VALUES.ORIGIN,
      departure,
      return_date,
      travelers   = DEFAULT_VALUES.TRAVELERS,
      budget,
      mode        = MODES.PARTY,
      preferences = []
    } = req.body;

    if (!destination?.trim()) return next(new AppError('destination requise', 400));
    if (!departure)           return next(new AppError('date de départ requise', 400));
    if (!budget || budget <= 0) return next(new AppError('budget invalide', 400));

    // ---- RECHERCHE WEB (Tavily + IA) avec Timeout de sécurité ----
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);

    console.log(`✈️ Orchestration de l'escapade pour ${destination}...`);
    
    let results = [];
    try {
      results = await withTimeout(Promise.allSettled([
        smartFlightSearch({ origin, destination, departure, return_date }),
        smartEventsSearch({ location: destination, dateFrom: departure, dateTo: return_date || departure, mode }),
        smartHotelSearch({ location: destination, mode }),
        getRealWeather(destination),
        getDestinationPhoto(destination)
      ]), 15000); // 15 secondes max pour le web
    } catch (err) {
      console.warn('⚠️ Web search timeout or error, falling back to pure AI generation.');
      results = [
        { status: 'rejected' }, { status: 'rejected' }, 
        { status: 'rejected' }, { status: 'rejected' }, { status: 'rejected' }
      ];
    }

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
          duration_min: parseInt(aiFlight.duration) * 60 || 180,
          stops: aiFlight.stops === 'Direct' ? 0 : 1
        },
        return: {
          from: destination, to: origin, airline: aiFlight.airline,
          departure_time: '18:00', arrival_time: '20:00',
          duration_min: 120, stops: 0
        }
      }];
    }

    const events      = results[1].status === 'fulfilled' ? results[1].value : [];
    const realHotels  = results[2].status === 'fulfilled' ? results[2].value : [];
    const realWeather = results[3].status === 'fulfilled' ? results[3].value : null;
    const realPhoto   = results[4].status === 'fulfilled' ? results[4].value : null;
    if (results[1].status === 'rejected') console.warn('Events API fallback:', results[1].reason);

    const pack = await assemblePack({
      destination,
      flights,
      events,
      hotels: realHotels,
      mode,
      travelers,
      budget,
      departure,
      return_date,
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
    next(err);
  }
});

// ---- POST /api/ai/chat ----
router.post('/chat', aiChatLimiter, optionalAuth, async (req, res, next) => {
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
    next(err);
  }
});

export default router;