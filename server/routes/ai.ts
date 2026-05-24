// =============================================
// TRIPGENIE — server/routes/ai.ts
// Routes du pipeline IA : génération de packs, chat de modification,
// onboarding conversationnel et suggestions de destinations.
// =============================================

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
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
import type { TravelMode } from '../lib/types.js';
import type { FlightSearchResult, EventSearchResult, HotelSearchResult } from '../services/smartSearch.js';
import type { WeatherData } from '../services/weather.js';

const router = express.Router();


// ---- POST /api/ai/analyze ----
router.post('/analyze', aiChatLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { input } = req.body;
    if (!input?.trim()) {
      res.status(400).json({ error: 'input requis' });
      return;
    }
    if (input.length > 1000) {
      res.status(400).json({ error: 'Message trop long (max 1000 car.)' });
      return;
    }

    const analysis = await analyzeRequest(input);
    res.json({ analysis });

  } catch (err) {
    console.error('AI analyze error:', (err as Error).message);
    next(err);
  }
});

// ---- POST /api/ai/destinations ----
router.post('/destinations', aiGenerateLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { mode, budget, travelers, duration, origin, preferences, departure } = req.body;
    if (!mode) {
      res.status(400).json({ error: 'mode requis' });
      return;
    }

    const result = await suggestDestinations({ mode, budget, travelers, duration, origin, preferences, departure });
    res.json(result);

  } catch (err) {
    console.error('AI destinations error:', (err as Error).message);
    next(err);
  }
});

// ---- POST /api/ai/onboarding ----
router.post('/onboarding', aiChatLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentData, userMessage } = req.body;
    if (!userMessage) {
      res.status(400).json({ error: 'userMessage requis' });
      return;
    }
    if (userMessage.length > 1000) {
      res.status(400).json({ error: 'Message trop long' });
      return;
    }

    const result = await chatIntake({ currentData, userMessage });
    res.json(result);

  } catch (err) {
    console.error('AI onboarding error:', (err as Error).message);
    next(err);
  }
});

/**
 * POST /api/ai/generate — Point d'entrée du pipeline de génération.
 *
 * Pipeline orchestré en 4 étapes séquentielles :
 *
 * 1. Validation des inputs (Zod-like, manuel)
 *
 * 2. Recherche web PARALLÈLE via Promise.allSettled :
 *    - smartFlightSearch  → Tavily : vols réels
 *    - smartEventsSearch  → Tavily : événements locaux
 *    - smartHotelSearch   → Tavily : hôtels
 *    - getRealWeather     → OpenWeatherMap
 *    - getDestinationPhoto → Unsplash (proxy)
 *
 *    Promise.allSettled est utilisé à la place de Promise.all pour que
 *    l'échec d'un service externe (ex: météo en panne) ne bloque pas
 *    toute la génération. Le pack est créé avec les données disponibles.
 *
 * 3. assemblePack() → LLM (Gemini / OpenRouter / Claude en fallback)
 *    génère le pack JSON structuré avec les données réelles injectées.
 *
 * 4. scorepack() → Algorithme déterministe (zéro IA) qui note le pack
 *    de 0 à 1 selon des poids définis par mode de voyage.
 *
 * @requires optionalAuth — le pack est sauvegardé si l'utilisateur est connecté
 * @requires aiGenerateLimiter — 10 générations/heure/IP (coût LLM)
 */
router.post('/generate', aiGenerateLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      destination,
      origin      = DEFAULT_VALUES.ORIGIN,
      departure,
      return_date,
      travelers   = DEFAULT_VALUES.TRAVELERS,
      budget,
      mode        = MODES.PARTY,
    } = req.body;

    if (!destination?.trim()) return next(new AppError('destination requise', 400));
    if (!departure)           return next(new AppError('date de départ requise', 400));
    if (!budget || budget <= 0) return next(new AppError('budget invalide', 400));

    // ---- RECHERCHE WEB (Tavily + IA) avec Timeout de sécurité ----
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);

    let results: [
      PromiseSettledResult<FlightSearchResult | null>,
      PromiseSettledResult<EventSearchResult[]>,
      PromiseSettledResult<HotelSearchResult[]>,
      PromiseSettledResult<WeatherData | null>,
      PromiseSettledResult<string | null>
    ] = [] as unknown as [
      PromiseSettledResult<FlightSearchResult | null>,
      PromiseSettledResult<EventSearchResult[]>,
      PromiseSettledResult<HotelSearchResult[]>,
      PromiseSettledResult<WeatherData | null>,
      PromiseSettledResult<string | null>
    ];
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
        { status: 'rejected', reason: 'timeout' }, { status: 'rejected', reason: 'timeout' }, 
        { status: 'rejected', reason: 'timeout' }, { status: 'rejected', reason: 'timeout' }, { status: 'rejected', reason: 'timeout' }
      ];
    }

    const aiFlight = results[0].status === 'fulfilled' ? results[0].value : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let flights: any[] = [];

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
      flights: aiFlight ? [aiFlight] : [],
      events,
      hotels: realHotels,
      mode: mode as TravelMode,
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
          ? { stars: hotelData.stars || 4, price_per_night: parseInt(hotelData.price_per_night?.replace('€','') || '150'), rating: 8.5 } 
          : { stars: 4, price_per_night: 150, rating: 8 },
        events,
        activities: pack.activities ?? [],
        totalPrice: budget
      },
      mode as TravelMode,
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
    console.error('AI generate error:', (err as Error).message);
    next(err);
  }
});

/**
 * POST /api/ai/chat — Modification conversationnelle post-génération.
 *
 * C'est la seule partie vraiment "agentique" de TripGenie :
 * le LLM reçoit le pack actuel + le message utilisateur et décide
 * librement quels éléments modifier, sans étapes prédéfinies.
 *
 * Contrairement à /generate (pipeline fixe), ici le modèle
 * choisit lui-même ce qu'il modifie dans le pack.
 *
 * Si l'utilisateur est connecté et qu'un trip_id est fourni,
 * les modifications sont persistées en base de données.
 *
 * @requires aiChatLimiter — 30 messages/15min/IP
 */
router.post('/chat', aiChatLimiter, optionalAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message, current_pack, mode, trip_id } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: 'message requis' });
      return;
    }
    if (message.length > 1000) {
      res.status(400).json({ error: 'Message trop long' });
      return;
    }

    const result = await chatModify({
      currentPack: current_pack,
      userMessage: message,
      mode: mode as TravelMode
    });

    // MAJ DB si user connecté et trip existant
    if (req.user && trip_id && result.modifications && supabase) {
      await supabase
        .from('trips')
        .update({ pack_data: { ...current_pack, ...result.modifications }, updated_at: new Date().toISOString() })
        .eq('id', trip_id)
        .eq('user_id', req.user.id);
    }

    res.json(result);

  } catch (err) {
    console.error('AI chat error:', (err as Error).message);
    next(err);
  }
});

export default router;
