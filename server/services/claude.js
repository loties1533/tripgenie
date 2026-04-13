// =============================================
// TRIPGENIE — server/services/claude.js
// =============================================

import 'dotenv/config';
import { searchWeb } from './tools/webSearch.js';

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY?.trim() || null;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY?.trim() || null;
const AI_TIMEOUT_MS  = 45_000;

console.log(`🤖 AI Provider: ${ANTHROPIC_KEY ? 'Claude' : process.env.GEMINI_API_KEY ? 'Gemini' : OPENROUTER_KEY ? 'OpenRouter' : '⚠️ AUCUN'}`);

const SYSTEM_PROMPT = `Tu es TripGenie, expert voyage. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.`;

const SURVIVAL_DESTINATIONS = {
  destinations: [
    { city: "Funchal", country: "Portugal", iata: "FNC", why: "Perle de l'Atlantique, climat parfait et paysages sauvages.", vibe: "Nature & Relax" },
    { city: "Séville", country: "Espagne", iata: "SVQ", why: "Culture vibrante, tapas incroyables et architecture magnifique.", vibe: "Culture & Fête" },
    { city: "Ljubljana", country: "Slovénie", iat: "LJU", why: "Capitale verte, ambiance conviviale et joyau caché de l'Europe.", vibe: "Calme & Découverte" }
  ]
};

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
JSON: {"destination":"ville ou null","origin":"Paris","mode":"party|student|luxury|group|relax|surprise","travelers":2,"duration_days":3,"budget_total":null,"preferences":[],"confidence":0.9}`
  );
  return parseJSON(raw);
}

export async function suggestDestinations({ mode, profile, interests, budget, travelers, duration, origin, preferences }) {
  try {
    const intStr = interests?.join(', ') || 'voyage';
    const query  = `Meilleures destinations pépites cachées (hidden gems) pour ${profile} cherchant ${mode} et ${intStr} budget ${budget}€ Europe`;
    const webContext = await searchWeb(query);

    const raw = await callAI(
      `${webContext}
      En t'inspirant FORCEMENT du contexte web, suggère 3 destinations RÉELLES (vérifie l'existence) et originales pour un profil de type "${profile}" cherchant une ambiance "${mode}" avec des intérêts pour "${intStr}".
      Profil:${profile} Intérêts:${intStr} Budget:${budget}€ Voyageurs:${travelers} Durée:${duration}j
      JSON: {"destinations":[{"city":"Ville","country":"Pays","iata":"XXX","why":"Pourquoi c'est parfait pour ce profil","vibe":"vibe"}]}`
    );
    return parseJSON(raw);
  } catch (err) {
    console.error('⚠️ SuggestDestinations failed, activation du Mode Survie:', err.message);
    return SURVIVAL_DESTINATIONS;
  }
}

async function callAI(userPrompt, systemPrompt = SYSTEM_PROMPT) {
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

  throw new Error(`Tous les services IA ont échoué. Détails : ${errors.join(' | ')}`);
}

// ---- assemblePack : l'IA génère SEULEMENT les textes courts ----
// La structure JSON complète est construite côté serveur
// → jamais de problème de troncature
export async function assemblePack({ destination, flights, events, mode, profile, travelers, budget, departure, return_date }) {
  const dest   = sanitizeInput(destination);
  const nights = departure && return_date
    ? Math.max(Math.round((new Date(return_date) - new Date(departure)) / 86400000), 1)
    : Math.max(Math.round(budget / 250), 2);
    
  // Adaptation du ton selon le profil
  const tone = profile === 'couple' ? 'romantique et intime' : profile === 'friends' ? 'dynamique et festif' : 'immersif et local';

  // Appel IA — uniquement les textes créatifs, format plat et court
  const textRaw = await callAI(
    `Tu es un expert voyage local pour ${dest}. Crée un itinéraire de type "${tone}" pour un profil "${profile}". Mode:${mode} ${travelers} pers. ${budget}€ ${nights} nuits.
    IMPORTANT pour le mode "party": Ne propose pas de clubs généralistes. Cherche des pépites underground, des bars secrets, des clubs de techno de renommée locale ou des festivals spécifiques. La description doit être électrique et donner envie au profil "${profile}".
    Génère UNIQUEMENT ce JSON avec des descriptions évocatrices adaptées au profil "${profile}" :
    {"country":"Pays","tagline":"accroche adaptée au profil","overview":"Paragraphe immersif captivant","weather_temp":"22°C","weather_cond":"Ensoleillé","weather_tip":"conseil vestimentaire","hotel1_name":"Hôtel parfait pour ce profil","hotel1_loc":"Quartier","hotel1_hl":"Pourquoi ce profil va adorer","hotel2_name":"Alternative","hotel2_loc":"Quartier","hotel2_hl":"Point fort","activity1":"Activité 1","activity1_desc":"Description","activity2":"Activité 2","activity2_desc":"Description","activity3":"Activité 3","activity3_desc":"Description","day1_title":"Jour 1","day1_am":"Matin","day1_pm":"Soirée","day2_title":"Jour 2","day2_am":"Matin","day2_pm":"Soirée","tip1_title":"Conseil","tip1":"Détail","tip2_title":"Miam","tip2":"Spécialité","phrase":"Argot","phrase_tr":"Traduction"}`
  );

  let t;
  try {
    t = parseJSON(textRaw);
  } catch (err) {
    console.warn('Fallback IA activé suite à un JSON malformé (ex: Modèle OpenRouter).', err.message);
    t = {
      tagline: `Découverte magique de ${dest}`,
      country: 'Europe',
      overview: "Profitez d'un programme sur-mesure créé par TripGenie pour vous faire découvrir les moindres secrets de cette ville.",
      weather_temp: "22°C", weather_cond: "Agréable", weather_tip: "Climat parfait pour explorer",
      hotel1_name: `Grand Hôtel ${dest}`, hotel1_loc: "Centre-ville", hotel1_hl: "Idéalement situé",
      hotel2_name: "Auberge Voyageurs", hotel2_loc: "Quartier animé", hotel2_hl: "Super rapport qualité-prix",
      activity1: "Visite des incontournables", activity1_desc: "Explorez les monuments principaux.",
      activity2: "Saveurs locales", activity2_desc: "Dégustation des spécialités culinaires.",
      activity3: "Balade nocturne", activity3_desc: "Découvrez la ville sous ses plus belles lumières.",
      day1_title: "Arrivée et immersion", day1_am: "Installation & visites", day1_pm: "Dîner local",
      day2_title: "Exploration", day2_am: "Visite guidée", day2_pm: "Repos ou achats souvenirs",
      tip1_title: "Transports locaux", tip1: "Utilisez les pass jours pour économiser.",
      tip2_title: "Culture", tip2: "Imprégnez-vous de l'ambiance des petits quartiers.",
      phrase: "Bonjour", phrase_tr: "Hello"
    };
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