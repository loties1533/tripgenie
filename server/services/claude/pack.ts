/**
 * @fileoverview Génération du pack voyage complet.
 */

import { callAI, parseJSON, sanitizeInput } from './core.js';
import { MODES, BUDGET_RATIOS, DEFAULT_VALUES } from '../../lib/constants.js';
import type { Pack, TravelMode } from '../../lib/types.js';
import type { FlightSearchResult, EventSearchResult, HotelSearchResult } from '../smartSearch.js';
import type { WeatherData } from '../weather.js';

interface AssemblePackParams {
  destination: string;
  flights?: FlightSearchResult[];
  events?: EventSearchResult[];
  hotels?: HotelSearchResult[];
  mode: TravelMode;
  profile?: string;
  travelers: number;
  budget: number;
  departure?: string;
  return_date?: string;
  duration?: number;
  realWeather?: WeatherData | null;
  realPhoto?: string | null;
}

interface AITextResult {
  country?: string;
  tagline?: string;
  overview?: string;
  weather?: { temp?: string; cond?: string; tip?: string };
  hotels?: Array<{ name?: string; loc?: string; hl?: string; stars?: number; price_per_night?: number }>;
  itinerary?: Array<{ day: number; title?: string; am?: string; pm?: string; plan_b?: string }>;
  activities?: Array<{ name?: string; desc?: string; type?: string; plan_b?: string }>;
  tip1?: string;
  tip2?: string;
  phrase?: string;
  phrase_tr?: string;
}

export async function assemblePack({
  destination, flights, events, hotels: realHotels, mode, profile, travelers, budget,
  departure, return_date, duration, realWeather, realPhoto,
}: AssemblePackParams): Promise<Pack> {
  const dest = sanitizeInput(destination);

  let nights: number = DEFAULT_VALUES.NIGHTS;
  if (departure && return_date) {
    nights = Math.max(Math.round((new Date(return_date).getTime() - new Date(departure).getTime()) / 86400000), 1);
  } else if (duration) {
    nights = parseInt(String(duration));
  } else {
    nights = Math.min(Math.max(Math.round(budget / 500), 2), 14);
  }

  const budgetPerPers = Math.round(budget / travelers);

  const budgetTone = budgetPerPers >= 2000
    ? 'Budget premium : penthouses, villas privées, tables Michelin, accès VIP.'
    : budgetPerPers >= 1000
    ? 'Budget confortable : hôtels 4★ soignés, restaurants gastronomiques.'
    : budgetPerPers >= 500
    ? 'Budget moyen : bon rapport qualité/prix, quelques coups de cœur premium.'
    : 'Petit budget : adresses locales authentiques, astuces insider.';

  const modePersona = mode === MODES.LUXURY
    ? "Ton ADN est l'excellence absolue. Chaque proposition doit être digne d'un guide Condé Nast."
    : mode === MODES.PARTY
    ? 'Tu es l\'expert nightlife. Chaque journée monte en puissance vers une soirée mémorable.'
    : mode === MODES.RELAX
    ? 'Tu es un maître du slow travel. Rythme doux, expériences intimes, pas de rush.'
    : mode === MODES.GROUP
    ? 'Tu orchestres des expériences fédératrices, accessibles à tous les membres du groupe.'
    : mode === MODES.STUDENT
    ? 'Tu connais tous les bons plans : max de saveurs pour min de budget.'
    : 'Tu combines intelligemment les envies du groupe avec la richesse locale.';

  const textRaw = await callAI(
    `Tu es le concierge privé de TripGenie. Destination : ${dest}.
    VOYAGEURS : ${travelers} personne(s). PROFIL : ${profile ?? mode}. VIBE : ${mode}. BUDGET : ${budgetPerPers}€/pers. DURÉE : ${nights} nuits.

    ${modePersona}
    ${budgetTone}

    Génère ce JSON (itinerary doit contenir EXACTEMENT ${nights} jours, max 7) :
    {
      "country": "Pays",
      "tagline": "Accroche percutante 5-7 mots",
      "overview": "Description immersive 2-3 phrases",
      "weather": {"temp": "22°C", "cond": "Soleil", "tip": "Conseil vestimentaire"},
      "hotels": [
        {"name": "Vrai nom hôtel", "loc": "Quartier précis", "hl": "Point fort unique"},
        {"name": "Alternative", "loc": "Quartier", "hl": "Point fort"}
      ],
      "itinerary": [
        {"day": 1, "title": "Titre évocateur", "am": "Activité matin concrète", "pm": "Activité soir concrète", "plan_b": "Alternative si imprévu"}
      ],
      "activities": [
        {"name": "Vrai nom lieu", "desc": "Max 60 chars", "type": "bar|club|restaurant|activité|plage|spa", "plan_b": "Alternative"}
      ],
      "tip1": "Conseil pratique local", "tip2": "Adresse food incontournable", "phrase": "Mot argot local", "phrase_tr": "Traduction"
    }`,
    undefined,
    'pack'
  );

  let t: AITextResult;
  try {
    t = parseJSON(textRaw) as AITextResult;
  } catch (err) {
    console.warn('Fallback IA activé suite à un problème.', (err as Error).message);
    t = {
      country:   'Destination',
      tagline:   `Découvrez les secrets de ${dest}`,
      overview:  `Un voyage sur-mesure à ${dest}.`,
      weather:   { temp: '22°C', cond: 'Ensoleillé', tip: 'Tenue légère recommandée' },
      hotels:    [
        { name: `Grand Hôtel ${dest}`,    loc: 'Centre-ville', hl: 'Vue panoramique' },
        { name: `Boutique Hôtel ${dest}`, loc: 'Vieille ville', hl: 'Charme local' },
      ],
      itinerary: Array.from({ length: Math.min(nights, 3) }).map((_, i) => ({
        day:   i + 1,
        title: i === 0 ? 'Arrivée & Découverte' : i === 1 ? 'Exploration locale' : 'Détente & Gastronomie',
        am:    i === 0 ? 'Installation et première balade' : 'Visite des incontournables',
        pm:    i === 0 ? 'Dîner dans le quartier' : 'Soirée en ville',
      })),
      activities: [
        { name: `Découverte de ${dest}`, desc: 'Exploration des quartiers emblématiques.' },
        { name: 'Gastronomie locale',    desc: 'Les meilleures adresses culinaires.' },
        { name: 'Expérience culturelle', desc: 'Musées, architecture et vie locale.' },
      ],
      tip1: "Réservez vos activités à l'avance.",
      tip2: 'Goûtez aux spécialités locales.',
      phrase: 'Bonjour !', phrase_tr: 'Hello!',
    };
  }

  // Vols
  const volPriceEst = Math.round(budget * 0.15);
  const flightData = flights?.length
    ? [
        {
          from:             flights[0].outbound_time ? 'CDG' : 'CDG',
          from_city:        'Paris',
          to:               'XXX',
          to_city:          dest,
          departure_time:   flights[0].outbound_time || '10:30',
          arrival_time:     flights[0].arrival_time  || '12:00',
          duration:         flights[0].duration      || '2h00',
          stops:            flights[0].stops         || 'Direct',
          airline:          flights[0].airline       || 'Air France',
          price_per_person: `${Math.round(flights[0].price / (travelers || 1))}€`,
          type:             'outbound' as const,
          links:            flights[0].links || null,
        },
        {
          from:             'XXX',
          from_city:        dest,
          to:               'CDG',
          to_city:          'Paris',
          departure_time:   '18:00',
          arrival_time:     '20:00',
          duration:         flights[0].duration || '2h00',
          stops:            'Direct',
          airline:          flights[0].airline  || 'Air France',
          price_per_person: `${Math.round(flights[0].price / (travelers || 1))}€`,
          type:             'return' as const,
          links:            flights[0].links || null,
        },
      ]
    : [
        { from: 'CDG', from_city: 'Paris', to: 'XXX', to_city: dest, departure_time: '10:30', arrival_time: '12:00', duration: '1h30', stops: 'Direct', airline: 'Air France', price_per_person: `${volPriceEst}€`, type: 'outbound' as const },
        { from: 'XXX', from_city: dest,   to: 'CDG', to_city: 'Paris', departure_time: '18:00', arrival_time: '19:30', duration: '1h30', stops: 'Direct', airline: 'Air France', price_per_person: `${volPriceEst}€`, type: 'return' as const },
      ];

  // Événements
  const eventData = events?.length
    ? events.slice(0, 3).map(e => ({
        title:       e.title,
        category:    e.category,
        start:       e.start || 'Pendant votre séjour',
        venue:       e.venue || 'Centre ville',
        description: e.description || '',
        booking_url: e.booking_url ?? null,
        links:       e.links ?? undefined,
      }))
    : [{ title: `Soirée à ${dest}`, category: 'Nightlife', start: 'Pendant votre séjour', venue: 'Centre ville', description: 'Animation locale garantie' }];

  // Répartition budgétaire
  const ratio     = BUDGET_RATIOS[mode] ?? BUDGET_RATIOS.party;
  const vols      = Math.round(budget * ratio.vols);
  const maxPpn    = mode === MODES.LUXURY ? 800 : 250;
  let   heberg    = Math.round(budget * ratio.heberg);
  const ppn       = heberg / nights / travelers;
  if (ppn > maxPpn) heberg = maxPpn * nights * travelers;
  const activites = Math.round(budget * ratio.activites);
  const resto     = Math.round(budget * ratio.resto);
  const trans     = Math.round(budget * ratio.trans);
  const divers    = budget - vols - heberg - activites - resto - trans;

  return {
    destination: dest,
    country:     t.country  ?? 'Destination',
    tagline:     t.tagline  ?? `${dest}, votre prochaine aventure`,
    overview:    t.overview ?? `Découvrez ${dest} sous son meilleur jour.`,
    photo_url:   realPhoto ?? undefined,
    weather: realWeather
      ? { avg_temp: realWeather.temp, conditions: realWeather.cond, tip: t.weather?.tip ?? 'Prévoyez des couches' }
      : { avg_temp: t.weather?.temp ?? '20°C', conditions: t.weather?.cond ?? 'Ensoleillé', tip: t.weather?.tip ?? 'Prévoyez des couches' },
    summary: { total_budget: `${budget}€`, nights, activities_count: (t.activities ?? []).length },
    flights: flightData,
    hotels: (realHotels?.length ? realHotels : t.hotels ?? []).map((h, i) => ({
      name:           h.name ?? `Hôtel ${i + 1}`,
      location:       (h as { loc?: string }).loc ?? (h as { location?: string }).location ?? 'Centre',
      stars:          h.stars ?? (i === 0 && mode === 'luxury' ? 5 : 4),
      price_per_night: (h as { price_per_night?: number }).price_per_night
        ? `${(h as { price_per_night: number }).price_per_night}€`
        : `${Math.round(heberg / nights / (i + 1))}€`,
      highlights:     (h as { hl?: string; highlights?: string }).hl ?? (h as { highlights?: string }).highlights ?? 'Excellent choix',
      emoji:          i === 0 ? '🏨' : '🏩',
    })),
    itinerary: (t.itinerary ?? []).map(d => ({
      day:      d.day,
      title:    d.title ?? 'Journée découverte',
      subtitle: mode === MODES.PARTY ? 'Vibe & Nightlife' : mode === MODES.LUXURY ? 'Prestige & Exclusivité' : 'Exploration',
      items: [
        { time: mode === MODES.PARTY ? '14:00' : '10:00', type: 'activity' as const, title: d.am ?? 'Exploration', description: 'Découverte locale', price: 'gratuit', duration: '3h' },
        { time: mode === MODES.PARTY ? '22:00' : '20:00', type: mode === MODES.PARTY ? 'event' as const : 'food' as const, title: d.pm ?? 'Soirée', description: 'Moment mémorable', price: '40€', duration: '4h' },
      ],
    })),
    activities: (t.activities ?? []).map(a => {
      const type    = a.type ?? 'activité';
      const isNight = ['club', 'bar', 'nightlife', 'soirée'].some(k => type.toLowerCase().includes(k));
      const isFood  = ['restaurant', 'food', 'gastronomie'].some(k => type.toLowerCase().includes(k));
      const emoji   = isNight ? '🎉' : isFood ? '🍽' : type === 'plage' ? '🏖' : type === 'spa' ? '💆' : '🏛';
      return {
        name:        a.name     ?? 'Activité',
        category:    isNight   ? 'Nightlife' : isFood ? 'Gastronomie' : 'Culture',
        emoji,
        description: a.desc    ?? 'Incontournable',
        duration:    '2-3h',
        price:       'Variable',
        best_time:   isNight   ? 'Soir' : 'Journée',
      };
    }),
    events: eventData,
    budget_breakdown: {
      vols:         `${vols}€`,
      hebergement:  `${heberg}€`,
      activites:    `${activites}€`,
      restauration: `${resto}€`,
      transports:   `${trans}€`,
      divers:       `${divers}€`,
      total:        `${budget}€`,
    },
    tips: [
      { title: 'Conseil pratique', content: t.tip1 ?? "Réservez à l'avance" },
      { title: 'Sur place',        content: t.tip2 ?? 'Explorez les quartiers locaux' },
    ],
    local_phrases: [
      { phrase: t.phrase ?? 'Santé !', translation: t.phrase_tr ?? 'Cheers !' },
    ],
  };
}
