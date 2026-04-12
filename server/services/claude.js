// =============================================
// TRIPGENIE — server/services/claude.js
// =============================================

import 'dotenv/config';

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const AI_TIMEOUT_MS  = 45_000;

console.log(`🤖 AI Provider: ${ANTHROPIC_KEY ? 'Claude' : OPENROUTER_KEY ? 'OpenRouter' : '⚠️ AUCUN'}`);

const SYSTEM_PROMPT = `Tu es TripGenie, expert voyage. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.`;

// =============================================
// HELPERS
// =============================================

function fetchWithTimeout(url, options, timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

function sanitizeInput(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.slice(0, 300).replace(/[`\\]/g, ' ').trim();
}

function parseJSON(raw) {
  let str = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  const start = str.indexOf('{');
  const end   = str.lastIndexOf('}');
  if (start !== -1 && end !== -1) str = str.slice(start, end + 1);

  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return JSON.parse(str.replace(/,(\s*[}\]])/g, '$1'));
    } catch {
      console.error('parseJSON failed:', raw.slice(0, 200));
      throw new Error(`JSON malformé: ${e.message}`);
    }
  }
}

// =============================================
// PROVIDERS
// =============================================

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Claude error: ${JSON.stringify(data.error)}`);
  return data.content[0].text;
}

const FREE_MODELS = [
  'google/gemma-3-27b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
];

async function callOpenRouter(systemPrompt, userPrompt) {
  for (const model of FREE_MODELS) {
    try {
      const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer':  'http://localhost:3001',
          'X-Title':       'TripGenie'
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt }
          ]
        })
      });
      const data = await res.json();
      if (!res.ok || data.error?.code === 429) {
        console.warn(`Model ${model} unavailable, trying next...`);
        continue;
      }
      console.log(`✅ Using model: ${model}`);
      return data.choices[0].message.content;
    } catch (err) {
      console.warn(`Model ${model} failed: ${err.message}`);
      continue;
    }
  }
  throw new Error('Tous les modèles gratuits sont indisponibles. Réessaie dans 1 minute.');
}

// =============================================
// EXPORTS
// =============================================

export async function analyzeRequest(userInput) {
  const raw = await callAI(
    `Analyse cette demande: "${sanitizeInput(userInput)}"
JSON: {"destination":"ville ou null","origin":"Paris","mode":"party|student|luxury|group|relax|surprise","travelers":2,"duration_days":3,"budget_total":null,"preferences":[],"confidence":0.9}`
  );
  return parseJSON(raw);
}

export async function suggestDestinations({ mode, budget, travelers, duration, origin, preferences }) {
  const raw = await callAI(
    `Suggère 3 destinations. mode=${mode} budget=${budget}€ voyageurs=${travelers} durée=${duration}j départ=${sanitizeInput(origin)}
JSON: {"destinations":[{"city":"Ville","country":"Pays","iata":"XXX","why":"raison","vibe":"mot","estimated_flight_price":200}]}`
  );
  return parseJSON(raw);
}

async function callAI(userPrompt, systemPrompt = SYSTEM_PROMPT) {
  if (ANTHROPIC_KEY)  return callClaude(systemPrompt, userPrompt);
  if (OPENROUTER_KEY) return callOpenRouter(systemPrompt, userPrompt);
  throw new Error('Aucune clé API configurée');
}

// ---- assemblePack : l'IA génère SEULEMENT les textes courts ----
// La structure JSON complète est construite côté serveur
// → jamais de problème de troncature
export async function assemblePack({ destination, flights, events, mode, travelers, budget, departure, return_date }) {
  const dest   = sanitizeInput(destination);
  const nights = departure && return_date
    ? Math.max(Math.round((new Date(return_date) - new Date(departure)) / 86400000), 1)
    : Math.max(Math.round(budget / 250), 2);
  // Appel IA — uniquement les textes créatifs, format plat et court
  const textRaw = await callAI(
    `Voyage à ${dest}. Mode:${mode} ${travelers} pers. ${budget}€ ${nights} nuits.
Génère UNIQUEMENT ce JSON avec des valeurs courtes (max 15 mots par champ):
{"tagline":"accroche poétique","overview":"2 phrases sur le voyage","weather_temp":"22°C","weather_cond":"Ensoleillé","weather_tip":"conseil météo","hotel1_name":"nom hôtel","hotel1_loc":"quartier ville","hotel1_hl":"point fort","hotel2_name":"nom hôtel budget","hotel2_loc":"quartier","hotel2_hl":"point fort","activity1":"nom activité","activity1_desc":"description courte","activity2":"nom activité","activity2_desc":"description courte","activity3":"nom activité","activity3_desc":"description courte","day1_title":"titre jour 1","day1_am":"activité matin","day1_pm":"activité soir","day2_title":"titre jour 2","day2_am":"activité matin","day2_pm":"activité soir","tip1_title":"titre conseil","tip1":"conseil pratique","tip2_title":"titre conseil","tip2":"conseil pratique","phrase":"mot local","phrase_tr":"traduction"}`
  );

  const t = parseJSON(textRaw);

  // Vols — données réelles si Amadeus a répondu, sinon estimées
  const volPriceEst = Math.round(budget * 0.15);
  const flightData = flights?.length
    ? [
        {
          from:             flights[0].outbound?.from || 'CDG',
          from_city:        'Paris',
          to:               flights[0].outbound?.to || 'XXX',
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
          to:               flights[0].return?.to || 'CDG',
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

  // Budget
  const vols      = Math.round(budget * 0.28);
  const heberg    = Math.round(budget * 0.32);
  const activites = Math.round(budget * 0.15);
  const resto     = Math.round(budget * 0.15);
  const trans     = Math.round(budget * 0.06);
  const divers    = budget - vols - heberg - activites - resto - trans;

  // Structure finale construite côté serveur
  return {
    destination: dest,
    country:     t.country || 'France',
    tagline:     t.tagline  || `${dest}, votre prochaine aventure`,
    overview:    t.overview || `Découvrez ${dest} sous son meilleur jour.`,
    weather: {
      avg_temp:   t.weather_temp || '20°C',
      conditions: t.weather_cond || 'Ensoleillé',
      tip:        t.weather_tip  || 'Prévoyez des couches'
    },
    summary: { total_budget:`${budget}€`, nights, activities_count:3 },
    flights: flightData,
    hotels: [
      { name:t.hotel1_name||`Hôtel Central ${dest}`, location:t.hotel1_loc||`Centre, ${dest}`, stars:mode==='luxury'?5:4, price_per_night:`${Math.round(heberg/nights)}€`, highlights:t.hotel1_hl||'Bien situé, confortable', emoji:'🏨' },
      { name:t.hotel2_name||`Hôtel Charme ${dest}`,  location:t.hotel2_loc||`Quartier animé`, stars:3, price_per_night:`${Math.round(heberg/nights*0.65)}€`, highlights:t.hotel2_hl||'Bon rapport qualité-prix', emoji:'🏩' }
    ],
    itinerary: [
      { day:1, title:t.day1_title||'Arrivée & découverte', subtitle:'Premier contact',
        items:[
          { time:'14:00', type:'activity', title:t.day1_am||'Exploration du centre', description:`Découvrez ${dest}`, price:'gratuit', duration:'2h' },
          { time:'19:30', type:'food',     title:t.day1_pm||'Dîner local',           description:'Cuisine régionale',  price:'25€',    duration:'1h30' }
        ]},
      { day:2, title:t.day2_title||'Exploration & expériences', subtitle:'Incontournables',
        items:[
          { time:'10:00', type:'activity', title:t.day2_am||'Visite principale',  description:`Le must-see de ${dest}`, price:'15€', duration:'2h' },
          { time:'20:00', type:'event',    title:t.day2_pm||'Soirée mémorable',   description:'Ambiance garantie',       price:'20€', duration:'3h' }
        ]}
    ],
    activities: [
      { name:t.activity1||'Visite culturelle',   category:'Culture',     emoji:'🏛', description:t.activity1_desc||'Incontournable', duration:'2h', price:'15€', best_time:'Matin' },
      { name:t.activity2||'Expérience culinaire',category:'Gastronomie', emoji:'🍽', description:t.activity2_desc||'Saveurs locales', duration:'3h', price:'40€', best_time:'Midi'  },
      { name:t.activity3||'Vie nocturne',        category:'Nightlife',   emoji:'🎉', description:t.activity3_desc||'Clubs & bars',    duration:'4h', price:'30€', best_time:'Soir'  }
    ],
    events: eventData,
    budget_breakdown: {
      vols:`${vols}€`, hebergement:`${heberg}€`, activites:`${activites}€`,
      restauration:`${resto}€`, transports:`${trans}€`, divers:`${divers}€`, total:`${budget}€`
    },
    tips: [
      { title:t.tip1_title||'Conseil pratique', content:t.tip1||'Réservez à l\'avance' },
      { title:t.tip2_title||'Sur place',        content:t.tip2||'Explorez les quartiers locaux' }
    ],
    local_phrases: [
      { phrase:t.phrase||'Santé !', translation:t.phrase_tr||'Cheers !' }
    ]
  };
}

export async function chatModify({ currentPack, userMessage, mode }) {
  const raw = await callAI(
    `Voyage à ${sanitizeInput(currentPack?.destination??'inconnue')} (mode:${mode}). Message: "${sanitizeInput(userMessage)}"
JSON: {"response":"réponse amicale en français","needs_full_regen":false,"modifications":null}`
  );
  return parseJSON(raw);
}

export { callAI as callClaude };