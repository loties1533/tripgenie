/**
 * @fileoverview Génération du pack voyage complet.
 * L'IA produit les textes courts — la structure finale est assemblée côté serveur
 * pour éviter tout problème de troncature JSON.
 */

import { callAI, parseJSON, sanitizeInput } from './core.js';

const BUDGET_RATIOS = {
  party:   { vols: 0.25, heberg: 0.25, activites: 0.25, resto: 0.12, trans: 0.08 },
  student: { vols: 0.35, heberg: 0.30, activites: 0.10, resto: 0.15, trans: 0.05 },
  luxury:  { vols: 0.20, heberg: 0.45, activites: 0.20, resto: 0.10, trans: 0.03 },
  group:   { vols: 0.30, heberg: 0.35, activites: 0.15, resto: 0.12, trans: 0.05 },
  relax:   { vols: 0.22, heberg: 0.40, activites: 0.15, resto: 0.13, trans: 0.07 },
  surprise:{ vols: 0.28, heberg: 0.32, activites: 0.18, resto: 0.13, trans: 0.06 },
};

/**
 * Génère un pack de voyage complet à partir des données récupérées.
 * @param {Object}   params
 * @param {string}   params.destination
 * @param {Object[]} params.flights      - résultats de smartFlightSearch (Tavily)
 * @param {Object[]} params.events       - résultats de smartEventsSearch (Tavily)
 * @param {string}   params.mode         - mode de voyage (voir MODES dans constants.js)
 * @param {string}   [params.profile]    - profil du groupe (couple, amis, famille…)
 * @param {number}   params.travelers    - nombre de voyageurs
 * @param {number}   params.budget       - budget total en euros
 * @param {string}   [params.departure]  - date de départ YYYY-MM-DD
 * @param {string}   [params.return_date] - date de retour YYYY-MM-DD
 * @param {number}   [params.duration]   - durée en jours (si pas de dates)
 * @returns {Promise<import('../../types.js').Pack>}
 */
export async function assemblePack({ destination, flights, events, hotels: realHotels, mode, profile, travelers, budget, departure, return_date, duration, realWeather, realPhoto }) {
  const dest = sanitizeInput(destination);

  let nights = 4;
  if (departure && return_date) {
    nights = Math.max(Math.round((new Date(return_date) - new Date(departure)) / 86400000), 1);
  } else if (duration) {
    nights = parseInt(duration);
  } else {
    nights = Math.min(Math.max(Math.round(budget / 500), 2), 14);
  }

  const budgetPerPers = Math.round(budget / travelers);

  const budgetTone = budgetPerPers >= 1500
    ? 'Budget confortable : privilégie des adresses soignées sans nécessairement être luxueuses.'
    : budgetPerPers >= 600
    ? 'Budget moyen : bon rapport qualité/prix, quelques expériences premium ciblées.'
    : 'Petit budget : adresses accessibles, astuces locales, évite les pièges à touristes.';

  const textRaw = await callAI(
    `Tu es le concierge privé de TripGenie. Destination : ${dest}.
    VOYAGEURS : ${travelers} personne(s). PROFIL : ${profile || mode}. VIBE : ${mode}. BUDGET : ${budgetPerPers}€/pers. DURÉE : ${nights} nuits.

    CONTEXTE À COMBINER intelligemment :
    - Qui : ${travelers} personne(s), profil "${profile || mode}"
    - Vibe dominante : "${mode}" — mais adapte selon le contexte réel (ex: amis qui veulent du calme, couple qui veut faire la fête, etc.)
    - ${budgetTone}

    PRINCIPES (pas des règles rigides) :
    - Vibe fête/soirée → inclure au moins 1-2 soirées/bars dans l'itinéraire si cohérent
    - Vibe détente/couple → rythme plus lent, expériences intimes, pas de rush
    - Vibe famille → activités accessibles à tous, évite la vie nocturne tardive
    - Vibe luxe → élève le niveau partout sans en faire trop
    - Le budget dicte le niveau des adresses, pas le mode seul

    Génère ce JSON (itinerary doit contenir EXACTEMENT ${nights} jours, max 7) :
    {
      "country": "Pays",
      "tagline": "Accroche",
      "overview": "Description",
      "weather": {"temp": "22°C", "cond": "Soleil", "tip": "Style"},
      "hotels": [
        {"name": "Hôtel VIP", "loc": "Quartier", "hl": "Point fort"},
        {"name": "Alternative Hype", "loc": "Quartier", "hl": "Point fort"}
      ],
      "itinerary": [
        { "day": 1, "title": "Titre", "am": "Activité matin", "pm": "Activité soir" }
      ],
      "activities": [
        {"name": "Vrai nom du lieu", "desc": "Max 60 chars", "type": "bar|club|restaurant|activité|plage|spa"},
        {"name": "...", "desc": "...", "type": "..."},
        {"name": "...", "desc": "...", "type": "..."},
        {"name": "...", "desc": "...", "type": "..."},
        {"name": "...", "desc": "...", "type": "..."},
        {"name": "...", "desc": "...", "type": "..."}
      ],
      "tip1": "Conseil court", "tip2": "Adresse food", "phrase": "Argot", "phrase_tr": "Trad"
    }
    Activités : VRAIS noms de lieux à ${dest}. Vibe fête → clubs/bars/rooftops. Descriptions MAX 60 caractères.`,
    undefined,
    'pack'
  );

  let t;
  try {
    t = parseJSON(textRaw);
  } catch (err) {
    console.warn('Fallback IA activé suite à un problème (ex: Quotas ou JSON malformé).', err.message);
    t = {
      country:   'Destination',
      tagline:   `Découvrez les secrets de ${dest}`,
      overview:  `Un voyage sur-mesure à ${dest}. Profitez de l'authenticité et de la richesse locale.`,
      weather:   { temp: '22°C', cond: 'Ensoleillé', tip: 'Tenue légère recommandée' },
      hotels:    [
        { name: `Grand Hôtel ${dest}`,    loc: 'Centre-ville', hl: 'Vue panoramique' },
        { name: `Boutique Hôtel ${dest}`, loc: 'Vieille ville', hl: 'Charme local' }
      ],
      itinerary: Array.from({ length: Math.min(nights, 3) }).map((_, i) => ({
        day:   i + 1,
        title: i === 0 ? 'Arrivée & Découverte' : i === 1 ? 'Exploration locale' : 'Détente & Gastronomie',
        am:    i === 0 ? 'Installation et première balade' : 'Visite des incontournables',
        pm:    i === 0 ? 'Dîner dans le quartier' : 'Soirée en ville'
      })),
      activities: [
        { name: `Découverte de ${dest}`, desc: 'Exploration des quartiers emblématiques.' },
        { name: 'Gastronomie locale',    desc: 'Les meilleures adresses culinaires.' },
        { name: 'Expérience culturelle', desc: 'Musées, architecture et vie locale.' }
      ],
      tip1: "Réservez vos activités à l'avance.",
      tip2: 'Goûtez aux spécialités locales.',
      phrase: 'Bonjour !', phrase_tr: 'Hello!'
    };
  }

  // Vols — données réelles si SmartSearch a répondu, sinon estimées
  const volPriceEst = Math.round(budget * 0.15);
  const flightData  = flights?.length
    ? [
        {
          from:             flights[0].outbound?.from || 'CDG',
          from_city:        'Paris',
          to:               flights[0].outbound?.to   || 'XXX',
          to_city:          dest,
          departure_time:   (flights[0].outbound?.departure_time || '').slice(11, 16) || '10:30',
          arrival_time:     (flights[0].outbound?.arrival_time   || '').slice(11, 16) || '12:00',
          duration:         `${Math.floor((flights[0].outbound?.duration_min || 90) / 60)}h${String((flights[0].outbound?.duration_min || 90) % 60).padStart(2,'0')}`,
          stops:            flights[0].outbound?.stops === 0 ? 'Direct' : `${flights[0].outbound?.stops} escale(s)`,
          airline:          flights[0].outbound?.airline || 'Air France',
          price_per_person: `${Math.round((flights[0].price || 0) / (travelers || 1))}€`,
          type:             'outbound'
        },
        flights[0].return ? {
          from:             flights[0].return?.from || 'XXX',
          from_city:        dest,
          to:               flights[0].return?.to   || 'CDG',
          to_city:          'Paris',
          departure_time:   (flights[0].return?.departure_time || '').slice(11, 16) || '18:00',
          arrival_time:     (flights[0].return?.arrival_time   || '').slice(11, 16) || '20:00',
          duration:         `${Math.floor((flights[0].return?.duration_min || 90) / 60)}h${String((flights[0].return?.duration_min || 90) % 60).padStart(2,'0')}`,
          stops:            flights[0].return?.stops === 0 ? 'Direct' : `${flights[0].return?.stops} escale(s)`,
          airline:          flights[0].return?.airline || 'Air France',
          price_per_person: `${Math.round((flights[0].price || 0) / (travelers || 1))}€`,
          type:             'return'
        } : null
      ].filter(Boolean)
    : [
        { from:'CDG', from_city:'Paris', to:'XXX', to_city:dest, departure_time:'10:30', arrival_time:'12:00', duration:'1h30', stops:'Direct', airline:'Air France', price_per_person:`${volPriceEst}€`, type:'outbound' },
        { from:'XXX', from_city:dest,   to:'CDG', to_city:'Paris', departure_time:'18:00', arrival_time:'19:30', duration:'1h30', stops:'Direct', airline:'Air France', price_per_person:`${volPriceEst}€`, type:'return'   }
      ];

  // Événements — réels ou génériques
  const eventData = events?.length
    ? events.slice(0, 3).map(e => ({
        name:        e.title,
        category:    e.category,
        date:        (e.start || '').slice(0, 10) || 'Pendant votre séjour',
        venue:       e.venue || 'Centre ville',
        description: e.description || ''
      }))
    : [{ name:`Soirée à ${dest}`, category:'Nightlife', date:'Pendant votre séjour', venue:'Centre ville', description:'Animation locale garantie' }];

  // Répartition budgétaire selon le mode
  const ratio    = BUDGET_RATIOS[mode] || BUDGET_RATIOS.party;
  const vols     = Math.round(budget * ratio.vols);
  const maxPpn   = mode === 'luxury' ? 800 : 250;
  let   heberg   = Math.round(budget * ratio.heberg);
  const ppn      = heberg / nights / travelers;
  if (ppn > maxPpn) heberg = maxPpn * nights * travelers;
  const activites = Math.round(budget * ratio.activites);
  const resto     = Math.round(budget * ratio.resto);
  const trans     = Math.round(budget * ratio.trans);
  const divers    = budget - vols - heberg - activites - resto - trans;

  return {
    destination: dest,
    country:     t.country  || 'Destination',
    tagline:     t.tagline  || `${dest}, votre prochaine aventure`,
    overview:    t.overview || `Découvrez ${dest} sous son meilleur jour.`,
    weather: realWeather
      ? { avg_temp: realWeather.temp, conditions: realWeather.cond, humidity: realWeather.humidity, wind: realWeather.wind, tip: t.weather?.tip || 'Prévoyez des couches' }
      : { avg_temp: t.weather?.temp || '20°C', conditions: t.weather?.cond || 'Ensoleillé', tip: t.weather?.tip || 'Prévoyez des couches' },
    photo: realPhoto || null,
    summary: { total_budget:`${budget}€`, nights, activities_count:(t.activities || []).length },
    flights: flightData,
    hotels: (realHotels?.length ? realHotels : t.hotels || []).map((h, i) => ({
      name:           h.name || `Hôtel ${i+1}`,
      location:       h.loc  || h.location || 'Centre',
      stars:          h.stars || (i === 0 && mode === 'luxury' ? 5 : 4),
      price_per_night: h.price_per_night ? `${h.price_per_night}€` : `${Math.round(heberg/nights/(i+1))}€`,
      highlights:     h.hl || h.highlights || 'Excellent choix',
      emoji:          i === 0 ? '🏨' : '🏩',
      links:          h.links || null,
      booking_url:    h.booking_url || null
    })),
    itinerary: (t.itinerary || []).map(d => ({
      day:      d.day,
      title:    d.title || 'Journée découverte',
      subtitle: mode === 'party' ? 'Vibe & Nightlife' : 'Exploration',
      items: [
        { time: mode === 'party' ? '14:00' : '10:00', type: 'activity', title: d.am || 'Exploration', description: 'Découverte locale', price: 'gratuit', duration: '3h' },
        { time: mode === 'party' ? '22:00' : '20:00', type: mode === 'party' ? 'event' : 'food', title: d.pm || 'Soirée', description: 'Moment mémorable', price: '40€', duration: '4h' }
      ]
    })),
    activities: (t.activities || []).map((a) => {
      const type = a.type || 'activité';
      const isNight = ['club','bar','nightlife','soirée'].some(k => type.toLowerCase().includes(k));
      const isFood  = ['restaurant','food','gastronomie'].some(k => type.toLowerCase().includes(k));
      const emoji   = isNight ? '🎉' : isFood ? '🍽' : type === 'plage' ? '🏖' : type === 'spa' ? '💆' : '🏛';
      return {
        name:        a.name || 'Activité',
        category:    isNight ? 'Nightlife' : isFood ? 'Gastronomie' : 'Culture',
        emoji,
        description: a.desc || 'Incontournable',
        duration:    '2-3h',
        price:       'Variable',
        best_time:   isNight ? 'Soir' : 'Journée'
      };
    }),
    events: eventData.map(e => ({
      ...e,
      links: e.links || null,
      booking_url: e.booking_url || null
    })),
    budget_breakdown: {
      vols:`${vols}€`, hebergement:`${heberg}€`, activites:`${activites}€`,
      restauration:`${resto}€`, transports:`${trans}€`, divers:`${divers}€`, total:`${budget}€`
    },
    tips: [
      { title: 'Conseil pratique', content: t.tip1 || "Réservez à l'avance" },
      { title: 'Sur place',        content: t.tip2 || 'Explorez les quartiers locaux' }
    ],
    local_phrases: [
      { phrase: t.phrase || 'Santé !', translation: t.phrase_tr || 'Cheers !' }
    ]
  };
}
