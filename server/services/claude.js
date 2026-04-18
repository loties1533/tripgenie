// =============================================
// TRIPGENIE — server/services/claude.js
// =============================================

import 'dotenv/config';
import { searchWeb } from './tools/webSearch.js';
import * as Mocks from './mocks.js';

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY?.trim() || null;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY?.trim() || null;
const AI_TIMEOUT_MS  = 45_000;

console.log(`🤖 AI Provider: ${ANTHROPIC_KEY ? 'Claude' : process.env.GEMINI_API_KEY ? 'Gemini' : OPENROUTER_KEY ? 'OpenRouter' : '⚠️ AUCUN'}`);

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
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'openai/gpt-oss-20b:free',
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
      if (err.message.includes('429')) {
        console.warn(`Model ${model} quota exceeded, trying next...`);
      } else {
        console.warn(`Model ${model} failed: ${err.message}`);
      }
      continue;
    }
  }
  throw new Error('QUOTA_EXCEEDED: Tous les modèles gratuits sont épuisés. Attends 1 minute avant de réessayer.');
}

async function callGemini(systemPrompt, userPrompt) {
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7, responseMimeType: "application/json" }
      })
    }
  );
  const data = await res.json();
  if (res.status === 429) {
    throw new Error('QUOTA_EXCEEDED: Limite gratuite Gemini atteinte. Attends 1 minute.');
  }
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data.error)}`);
  return data.candidates[0].content.parts[0].text;
}

// =============================================
// EXPORTS
// =============================================

export async function analyzeRequest(userInput) {
  const raw = await callAI(
    `Analyse cette demande: "${sanitizeInput(userInput)}"
JSON: {"destination":"ville ou null","origin":"Paris","mode":"party|student|luxury|group|relax|surprise","travelers":2,"duration_days":3,"budget_total":null,"preferences":[],"confidence":0.9}`,
    undefined,
    'onboarding'
  );
  return parseJSON(raw);
}

// =============================================
// SUGGEST PACKS — 3 packs sur-mesure
// Coup de cœur + Alternative + Pépite
// =============================================

export async function suggestPacks({ profile, intention, interests, budget, travelers, duration, origin, zone, lodging, mode, dates, departure, return_date, moods }) {

  const profileStr  = profile   || 'voyageur';
  const intentStr   = intention || 'voyage';
  const budgetStr   = budget    ? `${budget}€/pers` : 'budget flexible';
  const originStr   = origin    || 'France';
  const zoneStr     = zone === 'europe' ? 'en Europe uniquement' : 'dans le monde entier';
  const durationStr = duration  ? `${duration} jours` : (dates || 'quelques jours');
  const travelersN  = travelers || (profile === 'couple' ? 2 : profile === 'solo' ? 1 : 4);
  const interestStr = (interests || []).join(', ') || intentStr;
  const lodgingStr  = lodging   || 'peu importe';

  // Tavily web search
  let webContext = '';
  try {
    const query = intention === 'festival'
      ? `meilleurs festivals ${interestStr} ${durationStr} ${zoneStr} 2026`
      : intention === 'roadtrip'
      ? `road trip ${interestStr} ${durationStr} ${zoneStr} itinéraire`
      : `destinations voyage ${profileStr} ${interestStr} ${budgetStr} ${durationStr} ${zoneStr} pépites`;
    webContext = await searchWeb(query);
  } catch (e) {
    console.warn('[suggestPacks] Tavily unavailable:', e.message);
  }

  // PredictHQ si festival
  let eventsContext = '';
  if (intention === 'festival' || (interests || []).some(i => ['festival','concert','musique','techno','rock','électro','dj'].includes(i?.toLowerCase()))) {
    try {
      const { searchEvents } = await import('./predicthq.js');
      const events = await searchEvents({
        location: zone === 'europe' ? 'Europe' : 'World',
        dateFrom: departure || new Date().toISOString().slice(0,10),
        dateTo:   return_date || new Date(Date.now() + (duration || 7) * 86400000).toISOString().slice(0,10),
        mode: 'party'
      });
      if (events.length > 0) {
        eventsContext = `\nÉVÉNEMENTS RÉELS TROUVÉS :\n${events.slice(0,5).map(e => `- "${e.title}" le ${e.start?.slice(0,10)||'TBD'} à ${e.venue||'lieu TBD'}`).join('\n')}\n`;
      }
    } catch (e) {
      console.warn('[suggestPacks] PredictHQ unavailable:', e.message);
    }
  }

  const prompt = `${webContext}${eventsContext}

Tu es TripGenie, expert voyage premium. Génère exactement 3 packs voyage sur-mesure.

PROFIL :
- Qui : ${profileStr} (${travelersN} personnes)
- Envie : ${intentStr} — ${interestStr}
- Durée : ${durationStr}
- Budget : ${budgetStr} par personne
- Départ : ${originStr}
- Zone : ${zoneStr}
- Logement : ${lodgingStr}
- Ambiance : ${mode || 'libre'}

RÈGLES :
1. Les 3 packs correspondent au MÊME profil, angles différents
2. Combos libres : amis + fête + luxe = Ibiza 5★ ou Monaco — c'est cohérent
3. Pack 3 "Pépite" = destination moins évidente mais qui coche TOUTES les cases
4. Si festival : inclure nom, date, prix billet estimé
5. Ton adapté : décontracté amis, romantique couple, aventurier solo, pratique famille

FORMAT JSON STRICT :
{
  "packs": [
    {
      "id": "coup_de_coeur",
      "label": "Coup de cœur",
      "emoji": "❤️",
      "destination": "Ville",
      "country": "Pays",
      "tagline": "Accroche max 8 mots",
      "why": "Pourquoi parfait pour CE profil (2 phrases)",
      "highlight": "L'expérience signature unique",
      "estimated_flight": "~XXX€/pers depuis ${originStr}",
      "estimated_hotel": "~XXX€/nuit",
      "total_estimate": "~XXX€/pers tout compris",
      "match_score": 95,
      "vibe_tags": ["tag1", "tag2", "tag3"],
      "event_name": null,
      "event_date": null,
      "event_ticket": null,
      "type": "${intentStr}"
    },
    {
      "id": "alternative",
      "label": "L'Alternative",
      "emoji": "⚡",
      "destination": "Ville différente",
      "country": "Pays",
      "tagline": "...",
      "why": "...",
      "highlight": "...",
      "estimated_flight": "~XXX€/pers",
      "estimated_hotel": "~XXX€/nuit",
      "total_estimate": "~XXX€/pers",
      "match_score": 88,
      "vibe_tags": ["tag1", "tag2"],
      "event_name": null,
      "event_date": null,
      "event_ticket": null,
      "type": "${intentStr}"
    },
    {
      "id": "pepite",
      "label": "La Pépite",
      "emoji": "💎",
      "destination": "Ville moins connue",
      "country": "Pays",
      "tagline": "...",
      "why": "Moins connue mais coche toutes les cases",
      "highlight": "Ce que personne ne fait et qui est incroyable",
      "estimated_flight": "~XXX€/pers",
      "estimated_hotel": "~XXX€/nuit",
      "total_estimate": "~XXX€/pers",
      "match_score": 82,
      "vibe_tags": ["pépite", "tag2"],
      "event_name": null,
      "event_date": null,
      "event_ticket": null,
      "type": "${intentStr}"
    }
  ]
}`;

  try {
    const raw = await callAI(prompt, undefined, 'destinations');
    const result = parseJSON(raw);
    if (!Array.isArray(result.packs) || result.packs.length === 0) throw new Error('Format invalide');
    return { packs: result.packs, type: intentStr };
  } catch (err) {
    console.error('[suggestPacks] Error:', err.message);
    return {
      packs: [
        { id: 'coup_de_coeur', label: 'Coup de cœur', emoji: '❤️', destination: 'Barcelone', country: 'Espagne', tagline: 'Fête, plage et architecture', why: 'Parfaite pour une ambiance festive avec luxe accessible.', highlight: 'Clubs de plage et gastronomie étoilée', estimated_flight: '~120€/pers', estimated_hotel: '~150€/nuit', total_estimate: `~${budget||800}€/pers`, match_score: 90, vibe_tags: ['fête','plage','gastronomie'], event_name: null, event_date: null, event_ticket: null, type: intentStr },
        { id: 'alternative', label: "L'Alternative", emoji: '⚡', destination: 'Ibiza', country: 'Espagne', tagline: 'La capitale mondiale de la fête', why: 'Pour pousser l\'expérience au maximum.', highlight: 'Les clubs les plus célèbres du monde', estimated_flight: '~140€/pers', estimated_hotel: '~180€/nuit', total_estimate: `~${Math.round((budget||800)*1.2)}€/pers`, match_score: 85, vibe_tags: ['clubs','luxe','plage'], event_name: null, event_date: null, event_ticket: null, type: intentStr },
        { id: 'pepite', label: 'La Pépite', emoji: '💎', destination: 'Tivat', country: 'Monténégro', tagline: 'Le Monaco des Balkans', why: 'Luxe et fête sans les foules d\'Ibiza.', highlight: 'Porto Montenegro — le plus beau port de la Méditerranée', estimated_flight: '~160€/pers', estimated_hotel: '~120€/nuit', total_estimate: `~${Math.round((budget||800)*0.9)}€/pers`, match_score: 80, vibe_tags: ['pépite','luxe','authentique'], event_name: null, event_date: null, event_ticket: null, type: intentStr }
      ],
      type: intentStr
    };
  }
}

export async function suggestDestinations(params) {
  return suggestPacks(params);
}




async function callAI(userPrompt, systemPrompt = SYSTEM_PROMPT, context = 'onboarding') {
  let errors = [];
  
  // 1. Priorité Gemini (Gratuit & Rapide)
  if (process.env.GEMINI_API_KEY) {
    try { 
      return await callGemini(systemPrompt, userPrompt); 
    } catch (e) { 
      console.warn('Gemini failed:', e.message); 
      errors.push(`Gemini: ${e.message}`); 
    }
  }

  // 2. OpenRouter (Large choix de modèles gratuits)
  if (OPENROUTER_KEY) {
    try { 
      return await callOpenRouter(systemPrompt, userPrompt); 
    } catch (e) { 
      console.warn('OpenRouter failed:', e.message); 
      errors.push(`OpenRouter: ${e.message}`); 
    }
  }

  // 3. Claude (Dernier recours car payant/limité)
  if (ANTHROPIC_KEY) {
    try { 
      return await callClaude(systemPrompt, userPrompt); 
    } catch (e) { 
      console.warn('Claude failed:', e.message); 
      errors.push(`Claude: ${e.message}`); 
    }
  }

  // 4. MODE SURVIE (Fallback ultime) - On ne lève plus d'erreur 500
  console.error(`🚨 TOUS LES SERVICES IA ÉPUISÉS. Activation du Mode Survie (${context}).`);
  
  if (context === 'onboarding') return JSON.stringify(Mocks.MOCK_ONBOARDING);
  if (context === 'destinations') return JSON.stringify(Mocks.MOCK_DESTINATIONS);
  if (context === 'pack') return JSON.stringify(Mocks.MOCK_PACK);

  return JSON.stringify({ response: "Service temporairement limité. Réessayez dans 1 minute.", isMock: true });
}

// ---- assemblePack : l'IA génère SEULEMENT les textes courts ----
// La structure JSON complète est construite côté serveur
// → jamais de problème de troncature
export async function assemblePack({ destination, flights, events, realHotels = [], realRestaurants = [], mode, profile, travelers, budget, departure, return_date }) {
  const dest   = sanitizeInput(destination);
  const nights = departure && return_date
    ? Math.max(Math.round((new Date(return_date) - new Date(departure)) / 86400000), 1)
    : Math.max(Math.round(budget / 250), 2);
    
  // Adaptation du ton selon le profil
  const tone = profile === 'couple' ? 'romantique et intime' : profile === 'friends' ? 'dynamique et festif' : 'immersif et local';

  // Contexte hôtels réels à injecter dans le prompt si disponible
  const realHotelContext = realHotels.length >= 2
    ? `HÔTELS RÉELS DISPONIBLES (utilise OBLIGATOIREMENT ces noms exacts) :
    - Hôtel 1 : "${realHotels[0].name}" (${realHotels[0].stars}★, ${realHotels[0].neighborhood || realHotels[0].city}, noté ${realHotels[0].rating}/10)
    - Hôtel 2 : "${realHotels[1].name}" (${realHotels[1].stars}★, ${realHotels[1].neighborhood || realHotels[1].city}, noté ${realHotels[1].rating}/10)`
    : realHotels.length === 1
    ? `HÔTEL RÉEL DISPONIBLE : "${realHotels[0].name}" (${realHotels[0].stars}★, noté ${realHotels[0].rating}/10). Invente un second hôtel crédible.`
    : `Aucun hôtel réel disponible. Invente des noms réalistes et crédibles pour ${dest}.`;

  // Contexte restaurants réels
  const realRestoContext = realRestaurants.length > 0
    ? `RESTAURANTS RÉELS : ${realRestaurants.slice(0, 2).map(r => `"${r.name}"`).join(', ')}`
    : '';

  // Appel IA — uniquement les textes créatifs, format plat et court
  const textRaw = await callAI(
    `Tu es un expert voyage local pour ${dest}. Crée un itinéraire de type "${tone}" pour un profil "${profile}". Mode:${mode} ${travelers} pers. ${budget}€ ${nights} nuits.
    ${realHotelContext}
    ${realRestoContext}
    IMPORTANT pour le mode "party": Ne propose pas de clubs généralistes. Cherche des pépites underground, des bars secrets, des clubs de techno de renommée locale ou des festivals spécifiques. La description doit être électrique et donner envie au profil "${profile}".
    Génère UNIQUEMENT ce JSON avec des descriptions évocatrices adaptées au profil "${profile}" :
    {"country":"Pays","tagline":"accroche adaptée au profil","overview":"Paragraphe immersif captivant","weather_temp":"22°C","weather_cond":"Ensoleillé","weather_tip":"conseil vestimentaire","hotel1_name":"NOM EXACT de l'hôtel réel ci-dessus","hotel1_loc":"Quartier","hotel1_hl":"Pourquoi ce profil va adorer","hotel2_name":"NOM EXACT du second hôtel réel","hotel2_loc":"Quartier","hotel2_hl":"Point fort","activity1":"Activité 1","activity1_desc":"Description","activity2":"Activité 2","activity2_desc":"Description","activity3":"Activité 3","activity3_desc":"Description","day1_title":"Jour 1","day1_am":"Matin","day1_pm":"Soirée","day2_title":"Jour 2","day2_am":"Matin","day2_pm":"Soirée","tip1_title":"Conseil","tip1":"Détail","tip2_title":"Miam","tip2":"Spécialité","phrase":"Argot","phrase_tr":"Traduction"}`,
    undefined,
    'pack'
  );

  let t;
  try {
    t = parseJSON(textRaw);
  } catch (err) {
    console.warn('Fallback IA activé suite à un problème (ex: Quotas ou JSON malformé).', err.message);
    t = Mocks.MOCK_PACK; // Utilisation du Mock ultra-complet pour Ibiza
    
    // On remplace juste le nom de la ville si c'était différent
    if (!t.destination) t.destination = dest;
  }

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
   // Répartition intelligente selon le mode
const BUDGET_RATIOS = {
  party:   { vols: 0.25, heberg: 0.25, activites: 0.25, resto: 0.12, trans: 0.08 },
  student: { vols: 0.35, heberg: 0.30, activites: 0.10, resto: 0.15, trans: 0.05 },
  luxury:  { vols: 0.20, heberg: 0.45, activites: 0.20, resto: 0.10, trans: 0.03 },
  group:   { vols: 0.30, heberg: 0.35, activites: 0.15, resto: 0.12, trans: 0.05 },
  relax:   { vols: 0.22, heberg: 0.40, activites: 0.15, resto: 0.13, trans: 0.07 },
  surprise:{ vols: 0.28, heberg: 0.32, activites: 0.18, resto: 0.13, trans: 0.06 },
};

const ratio  = BUDGET_RATIOS[mode] || BUDGET_RATIOS.party;
const vols      = Math.round(budget * ratio.vols);

// Réalisme Hôtels : Plafonnement si le prix par nuit devient indécent pour la destination
// On estime un prix max par nuit raisonnable par personne (ex: 200€ en moyenne)
const maxPpn = mode === 'luxury' ? 800 : 250;
let heberg = Math.round(budget * ratio.heberg);
const ppn = heberg / nights / travelers;

if (ppn > maxPpn) {
  heberg = maxPpn * nights * travelers;
}

const activites = Math.round(budget * ratio.activites);
const resto     = Math.round(budget * ratio.resto);
const trans     = Math.round(budget * ratio.trans);
const divers    = budget - vols - heberg - activites - resto - trans;

  // Construction des hôtels à partir des données IA + données réelles
  const ppnFormatted = `${Math.round(heberg / Math.max(nights, 1))}€`;
  const hotels = [
    {
      name:            t.hotel1_name || (realHotels[0]?.name) || `Hôtel Central ${dest}`,
      location:        t.hotel1_loc  || (realHotels[0]?.neighborhood) || dest,
      stars:           realHotels[0]?.stars || (mode === 'luxury' ? 5 : mode === 'student' ? 2 : 4),
      price_per_night: realHotels[0]?.price_per_night ? `${realHotels[0].price_per_night}€` : ppnFormatted,
      highlights:      t.hotel1_hl  || 'Idéalement situé au cœur de la ville',
      emoji:           mode === 'luxury' ? '🏛' : '🏨',
    },
    {
      name:            t.hotel2_name || (realHotels[1]?.name) || `Boutique Hôtel ${dest}`,
      location:        t.hotel2_loc  || (realHotels[1]?.neighborhood) || dest,
      stars:           realHotels[1]?.stars || (mode === 'luxury' ? 4 : 3),
      price_per_night: realHotels[1]?.price_per_night ? `${realHotels[1].price_per_night}€` : `${Math.round(heberg / Math.max(nights, 1) * 0.7)}€`,
      highlights:      t.hotel2_hl  || 'Charme et authenticité locale',
      emoji:           '🏩',
    },
  ];

  // Structure finale construite côté serveur
  return {
    destination: dest,
    country:     t.country || 'Destination',
    tagline:     t.tagline  || `${dest}, votre prochaine aventure`,
    overview:    t.overview || `Découvrez ${dest} sous son meilleur jour.`,
    weather: {
      avg_temp:   t.weather_temp || '20°C',
      conditions: t.weather_cond || 'Ensoleillé',
      tip:        t.weather_tip  || 'Prévoyez des couches'
    },
    summary: { total_budget:`${budget}€`, nights, activities_count:3 },
    flights: flightData,
    hotels,
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

export async function chatIntake({ currentData, userMessage }) {

  const msg = sanitizeInput(userMessage).toLowerCase();

  // ---- Cas spéciaux (pas besoin d'appel IA) ----
  if (msg.includes('montre-moi') || msg.includes('génère') || msg.includes('go') || msg.includes('lance')) {
    const profile = currentData?.profile || Mocks.MOCK_ONBOARDING.extractedData.profile;
    return {
      response: "C'est parti ! Je prépare votre sélection sur-mesure ✨",
      isReady: true,
      extractedData: { ...Mocks.MOCK_ONBOARDING.extractedData, ...currentData, profile },
      isMock: false
    };
  }

  if (msg.includes('attendre') || msg.includes('plus tard')) {
    return {
      response: "Pas de souci ! Reviens quand tu veux, je serai là 👋",
      isReady: false,
      chips: ["Réessayer"],
      isMock: true
    };
  }

  // ---- Données déjà collectées ----
  const d = currentData || {};
  const already = {
    hasProfile:   !!(d.profile || d.travelers),
    hasDates:     !!(d.departure || d.dates || d.duration),
    hasBudget:    !!(d.budget),
    hasOrigin:    !!(d.origin),
    hasIntention: !!(d.intention),
    hasDiscovery: !!(d.discoveryMode),
  };

  // isReady si on a les 5 infos clés
  const readyCount = Object.values(already).filter(Boolean).length;

  const systemPrompt = `Tu es TripGenie, assistant voyage conversationnel. Tu aides TOUS types de voyageurs :
- Groupe d'amis qui cherche un festival
- Couple qui veut un week-end surprise
- Solo qui fait un road trip
- Famille qui cherche la mer
- Quelqu'un qui a juste une envie vague

DONNÉES DÉJÀ COLLECTÉES : ${JSON.stringify(d)}
INFOS MANQUANTES : ${JSON.stringify(Object.entries(already).filter(([,v]) => !v).map(([k]) => k))}

RÈGLES ABSOLUES :
1. Le message utilisateur est PRIORITAIRE sur les données déjà collectées
2. Pose UNE SEULE question à la fois, courte et naturelle
3. Si l'user donne plusieurs infos d'un coup (ex: "4 amis festival techno juin 500€ Bordeaux"), extrais TOUT sans reposer les questions déjà répondues
4. DÉTECTE L'INTENTION automatiquement :
   - Mots clés festival/concert/musique → intention: "festival"
   - Mots clés road trip/van/étapes → intention: "roadtrip"  
   - Mots clés week-end/escapade/surprise → intention: "weekend_surprise"
   - Mots clés voyage/vacances/séjour → intention: "voyage"
   - Mots clés anniversaire/fête/célébration → intention: "celebration"
5. NE PROPOSE JAMAIS de ville/destination tant que isReady est false
6. Quand tu as : profile + intention + dates + budget + origin → mets isReady: true
7. Si l'user a déjà donné 4+ infos dans son premier message → isReady peut être true directement
8. Adapte ton ton : décontracté pour amis/solo, romantique pour couple, pratique pour famille

ORDRE DE PRIORITÉ des questions manquantes :
1. Qui voyage + intention (si pas encore connu)
2. Dates ou durée
3. Budget (par personne si groupe)
4. Ville de départ

FORMAT RÉPONSE JSON UNIQUEMENT :
{
  "response": "ta réponse courte et adaptée au profil détecté",
  "chips": ["2-4 suggestions cliquables max, vides [] si pas pertinent"],
  "extractedData": {
    "profile": "solo|couple|amis|famille|null",
    "travelers": null,
    "intention": "festival|roadtrip|weekend_surprise|voyage|celebration|null",
    "dates": "null ou description",
    "departure": "YYYY-MM-DD ou null",
    "return_date": "YYYY-MM-DD ou null", 
    "duration": null,
    "budget": null,
    "origin": "ville ou null",
    "mode": "party|relax|luxury|student|group|surprise|null",
    "interests": [],
    "discoveryMode": "classic|hidden_gem|null"
  },
  "isReady": false
}`;

  try {
    const raw = await callAI(
      `${systemPrompt}\n\nMessage utilisateur : "${sanitizeInput(userMessage)}"`,
      undefined,
      'onboarding'
    );

    const result = parseJSON(raw);

    // Sécurité : fusionner avec les données existantes
    const merged = { ...d, ...(result.extractedData || {}) };
    // Nettoyer les null pour garder les anciennes valeurs
    Object.keys(merged).forEach(k => {
      if (merged[k] === null && d[k]) merged[k] = d[k];
    });

    return {
      response:      result.response      ?? "Dis-moi en plus sur ton projet de voyage !",
      chips:         result.chips         ?? [],
      extractedData: merged,
      isReady:       result.isReady       ?? false,
      isMock:        false,
    };

  } catch (err) {
    console.error('chatIntake error:', err.message);
    // Fallback mode survie intelligent
    const fallbacks = {
      noProfile:   { response: "Super projet ! C'est pour combien de personnes et vous partez d'où ?", chips: ["Solo 🎒", "En couple ❤️", "Amis 🍻", "Famille 👨‍👩‍👧"] },
      noDates:     { response: "Parfait ! Vous avez des dates en tête ?", chips: ["Ce week-end", "Dans 1 mois", "Cet été", "Dates flexibles"] },
      noBudget:    { response: "Quel budget par personne vous convient ?", chips: ["< 300€", "300-600€", "600-1000€", "1000€+"] },
      noOrigin:    { response: "Vous partez de quelle ville ?", chips: ["Paris", "Lyon", "Bordeaux", "Marseille"] },
      default:     { response: "Oups, petit souci technique ! Décris ton voyage idéal en quelques mots 😊", chips: ["Festival", "Week-end surprise", "Road trip", "Voyage"] },
    };

    const fb = !already.hasProfile ? fallbacks.noProfile
             : !already.hasDates   ? fallbacks.noDates
             : !already.hasBudget  ? fallbacks.noBudget
             : !already.hasOrigin  ? fallbacks.noOrigin
             : fallbacks.default;

    return { ...fb, extractedData: d, isReady: false, isMock: true };
  }
}

export async function chatModify({ currentPack, userMessage, mode }) {
  const systemPrompt = `Tu es l'expert voyage TripGenie. L'utilisateur veut modifier son voyage à ${currentPack?.destination}.
  
  CONTEXTE ACTUEL :
  - Destination : ${currentPack?.destination}
  - Budget : ${currentPack?.summary?.total_budget}
  - Pack actuel : ${JSON.stringify(currentPack)}

  CONSIGNES :
  1. Réponds de manière amicale et concise (champ "response").
  2. Si l'utilisateur demande une modification majeure (ex: changer de ville), mets "needs_full_regen" à true.
  3. Pour des modifications précises (ex: "enlève l'activité 2", "trouve un hôtel moins cher", "ajoute un jour"), suggère les changements dans "modifications".
  4. Le champ "modifications" peut contenir n'importe quelle clé du pack (hotels, activities, itinerary, budget_breakdown, tips).

  FORMAT RÉPONSE (JSON UNIQUEMENT) :
  {
    "response": "Ma réponse à l'utilisateur",
    "needs_full_regen": false,
    "modifications": {
      "hotels": [...], 
      "activities": [...],
      "itinerary": [...]
    }
  }`;

  const raw = await callAI(
    `${systemPrompt}\n\nMessage de l'utilisateur : "${sanitizeInput(userMessage)}"`
  );
  
  return parseJSON(raw);
}

export { callAI as callClaude };