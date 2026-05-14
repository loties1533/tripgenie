/**
 * @fileoverview Génération du pack voyage complet.
 * L'IA produit les textes courts — la structure finale est assemblée côté serveur
 * pour éviter tout problème de troncature JSON.
 */

import { callAI, parseJSON, sanitizeInput } from './core.js';
import { MODES, BUDGET_RATIOS, DEFAULT_VALUES } from '../../lib/constants.js';

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
 * @returns {Promise<import('../../lib/types.js').Pack>}
 */
export async function assemblePack({ destination, flights, events, hotels: realHotels, mode, profile, travelers, budget, departure, return_date, duration, realWeather, realPhoto }) {
  const dest = sanitizeInput(destination);

  let nights = DEFAULT_VALUES.NIGHTS;
  if (departure && return_date) {
    nights = Math.max(Math.round((new Date(return_date) - new Date(departure)) / 86400000), 1);
  } else if (duration) {
    nights = parseInt(duration);
  } else {
    nights = Math.min(Math.max(Math.round(budget / 500), 2), 14);
  }

  const budgetPerPers = Math.round(budget / travelers);

  const budgetTone = budgetPerPers >= 2000
    ? 'Budget premium : penthouses, villas privées, tables Michelin, accès VIP.'
    : budgetPerPers >= 1000
    ? 'Budget confortable : hôtels 4★ soignés, restaurants gastronomiques, expériences exclusives ciblées.'
    : budgetPerPers >= 500
    ? 'Budget moyen : bon rapport qualité/prix, quelques coups de cœur premium bien choisis.'
    : 'Petit budget : adresses locales authentiques, astuces insider, évite les pièges à touristes.';

  const modePersona = mode === MODES.LUXURY
    ? 'Ton ADN est l\'excellence absolue. Chaque proposition doit être digne d\'un guide Condé Nast.'
    : mode === MODES.PARTY
    ? 'Tu es l\'expert nightlife. Chaque journée monte en puissance vers une soirée mémorable.'
    : mode === MODES.RELAX
    ? 'Tu es un maître du slow travel. Rythme doux, expériences intimes, pas de rush.'
    : mode === MODES.GROUP
    ? 'Tu orchestre des expériences fédératrices, accessibles à tous les membres du groupe.'
    : mode === MODES.STUDENT
    ? 'Tu connais tous les bons plans : max de saveurs pour min de budget, sans sacrifier l\'authenticité.'
    : 'Tu combines intelligemment les envies du groupe avec la richesse locale.';

  const textRaw = await callAI(
    `Tu es le concierge privé de TripGenie. Destination : ${dest}.
    VOYAGEURS : ${travelers} personne(s). PROFIL : ${profile || mode}. VIBE : ${mode}. BUDGET : ${budgetPerPers}€/pers. DURÉE : ${nights} nuits.

    ${modePersona}
    ${budgetTone}

    PRINCIPES DE GÉNÉRATION :
    - ANTICIPATION : Pour chaque journée, ajoute un "plan_b" (alternative si météo ou imprévu)
    - HÉBERGEMENTS : Adapte au budget — villa privée/penthouse si premium, boutique-hôtel charme si moyen
    - ACTIVITÉS : Pense "expérience", pas "tourisme de masse". Vrais noms de lieux à ${dest}.
    - GASTRONOMIE : Suggère des adresses qui correspondent au budget (pas de Michelin sur petit budget)
    - TON : Expert, chaleureux, inspirant — comme un ami qui connait parfaitement la destination

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
        {"name": "Vrai nom lieu", "desc": "Max 60 chars", "type": "bar|club|restaurant|activité|plage|spa", "plan_b": "Alternative"},
        {"name": "...", "desc": "...", "type": "...", "plan_b": "..."},
        {"name": "...", "desc": "...", "type": "...", "plan_b": "..."},
        {"name": "...", "desc": "...", "type": "...", "plan_b": "..."},
        {"name": "...", "desc": "...", "type": "...", "plan_b": "..."},
        {"name": "...", "desc": "...", "type": "...", "plan_b": "..."}
      ],
      "tip1": "Conseil pratique local", "tip2": "Adresse food incontournable", "phrase": "Mot argot local", "phrase_tr": "Traduction"
    }`,
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
          type:             'outbound',
          booking_url:      flights[0].booking_url || null,
          links:            flights[0].links || null
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
          type:             'return',
          booking_url:      flights[0].booking_url || null,
          links:            flights[0].links || null
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
        description: e.description || '',
        booking_url: e.booking_url || null,
        links:       e.links || null
      }))
    : [{ name:`Soirée à ${dest}`, category:'Nightlife', date:'Pendant votre séjour', venue:'Centre ville', description:'Animation locale garantie' }];

  // Répartition budgétaire selon le mode
  const ratio    = BUDGET_RATIOS[mode] || BUDGET_RATIOS[MODES.PARTY];
  const vols     = Math.round(budget * ratio.vols);
  const maxPpn   = mode === MODES.LUXURY ? 800 : 250;
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
      subtitle: mode === MODES.PARTY ? 'Vibe & Nightlife' : mode === MODES.LUXURY ? 'Prestige & Exclusivité' : 'Exploration',
      plan_b:   d.plan_b || null,
      items: [
        { time: mode === MODES.PARTY ? '14:00' : '10:00', type: 'activity', title: d.am || 'Exploration', description: 'Découverte locale', price: 'gratuit', duration: '3h' },
        { time: mode === MODES.PARTY ? '22:00' : '20:00', type: mode === MODES.PARTY ? 'event' : 'food', title: d.pm || 'Soirée', description: 'Moment mémorable', price: '40€', duration: '4h' }
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
        plan_b:      a.plan_b || null,
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
