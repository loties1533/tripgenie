// =============================================
// TRIPGENIE — server/services/claude.js
// =============================================

import 'dotenv/config';
import { searchWeb } from './tools/webSearch.js';
import * as Mocks from './mocks.js';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY?.trim() || null;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY?.trim() || null;
const AI_TIMEOUT_MS = 45_000;

console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER === 'ollama' ? 'Ollama' : process.env.AI_PROVIDER === 'openrouter' ? 'OpenRouter' : process.env.AI_PROVIDER === 'gemini' ? 'Gemini' : ANTHROPIC_KEY ? 'Claude' : '⚠️ AUCUN'}`);

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

export function parseJSON(raw) {
  let str = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  const start = str.indexOf('{');
  const end = str.lastIndexOf('}');
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

function normalizeChips(chips) {
  if (!Array.isArray(chips)) return []
  return chips.map(c => {
    if (typeof c === 'string') return c
    if (c?.label) return c.label
    if (c?.value) return c.value
    if (c?.text) return c.text
    return String(c)
  }).filter(Boolean)
}

// =============================================
// PROVIDERS
// =============================================

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
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
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-medium-128k-instruct:free',
  'google/gemma-7b-it:free',
  'qwen/qwen-2-7b-instruct:free',
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'TripGenie'
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          messages: [
            { role: 'system', content: systemPrompt + "\n\nCRITICAL: REPONDS UNIQUEMENT EN JSON VALIDE. PAS DE TEXTE AVANT OU APRES. TON OUTPUT SERA PARSE DIRECTEMENT PAR UN SCRIPT." },
            { role: 'user', content: userPrompt }
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
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

async function callOllama(systemPrompt, userPrompt) {
  const res = await fetchWithTimeout(`${process.env.OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'gemma2:9b',
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  }, 60_000)
  const data = await res.json()
  if (!res.ok) throw new Error(`Ollama error: ${JSON.stringify(data)}`)
  return data.message.content
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

export async function suggestDestinations({ mode, profile, interests, budget, travelers, duration, origin, moods, discoveryMode, preferences, departure }) {
  try {
    const intStr = interests?.join(', ') || 'voyage';
    const moodStr = moods?.join(', ') || '';

    // Détection du mois pour la saisonnalité
    const month = departure ? new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(departure)) : 'actuellement';

    // Construction de la recherche ultra-ciblée
    let query = `Meilleures destinations ${mode} pour ${profile} en ${month}. `;
    if (mode === 'party') {
      query += `Focus sur la vie nocturne, clubs underground, festivals, ambiance électrique et branchée. `;
    }
    query += `Budget total ${budget}€ pour ${travelers} personnes. Intérêts: ${intStr} ${moodStr}.`;

    if (discoveryMode === 'hidden_gem') {
      query += ` Cherche des pépites cachées, pas les destinations ultra-touristiques habituelles.`;
    }

    const webContext = await searchWeb(query);

    const raw = await callAI(
      `CONTEXTE WEB RÉCENT : ${webContext}
      MISSION : Suggère 3 "Concepts de Voyage" d'exception pour un séjour en ${month}.
      PROFIL : ${profile}, MODE : ${mode}.
      BUDGET : ${budget >= 10000 ? 'LUXE / ILLIMITÉ' : budget + '€'} (Pour ${travelers} pers).
      
      STRATÉGIE : Propose 3 options très contrastées (ex: 1. Iconique, 2. Joyau Caché, 3. Tendance).
      Ton ton doit être VIP/Prestigieux.
      IMPORTANT : budget_estimate doit être un vrai montant en chiffres et symbole euro (ex: "4 500€" ou "12 000€"). JAMAIS de symboles répétés type "€€€".
      
      FORMAT JSON : {"destinations": [{"city": "Nom de la ville", "country": "Pays", "tagline": "Accroche luxueuse très courte", "vibe": "Ambiance (ex: Chic & Électrique)", "budget_estimate": "4 500€", "reason": "Pourquoi c'est l'expérience parfaite", "image_prompt": "Un mot clé anglais pour la photo (ex: monaco luxury yacht)"}]}`,
      undefined,
      'destinations'
    );
    return parseJSON(raw);
  } catch (err) {
    console.error('⚠️ SuggestDestinations failed, activation du Mode Survie:', err.message);
    return {
      destinations: [
        { city: "Cannes", country: "France", tagline: "Le joyau de la Riviera", vibe: "Glamour & Yachting", budget_estimate: "4500€", reason: "Idéal pour allier fête prestigieuse et luxe méditerranéen.", image_prompt: "cannes croisette luxury" },
        { city: "Saint-Tropez", country: "France", tagline: "L'iconique village", vibe: "Fête VIP & Plages privées", budget_estimate: "6000€", reason: "La référence absolue pour un week-end romantique et exclusif.", image_prompt: "saint tropez port" },
        { city: "Ibiza", country: "Espagne", tagline: "L'île blanche", vibe: "Bohème Chic", budget_estimate: "5000€", reason: "Pour des couchers de soleil inoubliables en villa privée.", image_prompt: "ibiza luxury villa sunset" }
      ]
    };
  }
}

export async function callAI(userPrompt, systemPrompt = SYSTEM_PROMPT, context = 'onboarding') {
  let errors = [];

  const provider = process.env.AI_PROVIDER;

  // 1. Tenter le provider spécifié en priorité
  if (provider === 'ollama' && process.env.OLLAMA_BASE_URL) {
    try { return await callOllama(systemPrompt, userPrompt); } catch (e) { errors.push(`Ollama: ${e.message}`); }
  }
  if (provider === 'openrouter' && OPENROUTER_KEY) {
    try { return await callOpenRouter(systemPrompt, userPrompt); } catch (e) { errors.push(`OpenRouter: ${e.message}`); }
  }
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
    try {
      return await callGemini(systemPrompt, userPrompt);
    } catch (e) {
      errors.push(`Gemini: ${e.message}`);
    }
  }

  // 2. Fallback si le premier a échoué ou n'était pas spécifié
  if (process.env.GEMINI_API_KEY && provider !== 'gemini') {
    try { return await callGemini(systemPrompt, userPrompt); } catch (e) { errors.push(`Gemini: ${e.message}`); }
  }
  if (OPENROUTER_KEY && provider !== 'openrouter') {
    try { return await callOpenRouter(systemPrompt, userPrompt); } catch (e) { errors.push(`OpenRouter: ${e.message}`); }
  }
  if (ANTHROPIC_KEY) {
    try { return await callClaude(systemPrompt, userPrompt); } catch (e) { errors.push(`Claude: ${e.message}`); }
  }

  // 5. Mode survie
  console.error('❌ AI FAILURES LOG:', JSON.stringify(errors, null, 2));
  console.error(`🚨 TOUS LES SERVICES IA ÉPUISÉS. Activation du Mode Survie (${context}).`);
  if (context === 'onboarding') return JSON.stringify(Mocks.MOCK_ONBOARDING);
  if (context === 'destinations') return JSON.stringify(Mocks.MOCK_DESTINATIONS);
  if (context === 'pack') return JSON.stringify(Mocks.MOCK_PACK);
  return JSON.stringify({ response: "Service temporairement limité. Réessayez dans 1 minute.", isMock: true });
}

// ---- assemblePack : l'IA génère SEULEMENT les textes courts ----
// La structure JSON complète est construite côté serveur
// → jamais de problème de troncature
export async function assemblePack({ destination, flights, events, hotels, mode, profile, travelers, budget, departure, return_date, duration, realWeather, realPhoto }) {
  const dest = sanitizeInput(destination);

  // Calcul des nuits : priorité aux dates, puis à la durée explicite, puis défaut intelligent (4 nuits)
  let nights = 4;
  if (departure && return_date) {
    nights = Math.max(Math.round((new Date(return_date) - new Date(departure)) / 86400000), 1);
  } else if (duration) {
    nights = parseInt(duration);
  } else {
    // Si vraiment rien, on estime par le budget mais on capte à 14 nuits max pour éviter le bug "60 jours"
    nights = Math.min(Math.max(Math.round(budget / 500), 2), 14);
  }

  const budgetPerPers = Math.round(budget / travelers);

  // Appel IA — Instructions ultra-ciblées
  const textRaw = await callAI(
    `Tu es le concierge privé de TripGenie. Destination : ${dest}. 
    PROFIL : ${profile}, MODE : ${mode}, BUDGET : ${budgetPerPers}€/personne, DURÉE : ${nights} nuits.
    
    LOGIQUE DE GÉNÉRATION CONCIERGERIE ULTRA-LUXE :
    - Ton ADN est le LUXE ABSOLU. Tu ne proposes que l'exceptionnel.
    - ANTICIPATION : Tu es proactif. Pour chaque journée ou activité majeure, tu dois avoir un "Plan B" au cas où (météo, fatigue, changement d'envie).
    - LOGEMENTS : Favorise les Penthouses, Villas privées avec personnel, Suites présidentielles ou boutique-hôtels de renommée mondiale.
    - ACTIVITÉS : Pense "Accès Privé", "VIP", "Hélicoptère", "Yacht", "Backstage", "Guide privé exclusif".
    - GASTRONOMIE : Uniquement des tables étoilées Michelin, des rooftops secrets ou des dîners privés dans des lieux insolites.
    - TON : Expert, sophistiqué. Tu ne suggères JAMAIS de tourisme de masse.

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
        { 
          "day": 1, 
          "title": "Titre", 
          "am": "Activité matin", 
          "pm": "Activité soir",
          "plan_b": "Ton alternative de luxe proactive ici (Si météo ou imprévu)" 
        }
      ],
      "activities": [
        {"name": "Expérience 1", "desc": "Détails", "plan_b": "Alternative VIP"}
      ],
      "tip1": "Conseil", "tip2": "Miam", "phrase": "Argot", "phrase_tr": "Traduction"
    }`,
    undefined,
    'pack'
  );

  let t;
  try {
    t = parseJSON(textRaw);
  } catch (err) {
    console.warn('Fallback IA activé suite à un problème (ex: Quotas ou JSON malformé).', err.message);

    // Au lieu de retourner Ibiza, on crée un squelette basé sur la ville réelle
    t = {
      country: "Destination",
      tagline: `Découvrez les secrets de ${dest}`,
      overview: `Un voyage d'exception orchestré sur mesure à ${dest}. Profitez du luxe et de l'exclusivité.`,
      weather: { temp: "24°C", cond: "Ensoleillé", tip: "Tenue chic décontractée" },
      hotels: hotels?.length ? hotels : [
        { name: `Grand Palace ${dest}`, loc: "Centre", hl: "Vue panoramique" },
        { name: `Boutique Hôtel ${dest}`, loc: "Vieille ville", hl: "Design exclusif" }
      ],
      itinerary: Array.from({ length: Math.min(nights, 3) }).map((_, i) => ({
        day: i + 1,
        title: i === 0 ? "Arrivée & Prestige" : (i === 1 ? "Exploration Exclusive" : "Détente & Gastronomie"),
        am: i === 0 ? "Accueil VIP et transfert" : "Visite privée des joyaux cachés",
        pm: i === 0 ? "Cocktail au rooftop" : "Dîner signature face à la mer",
        plan_b: "Votre majordome ajustera l'itinéraire selon vos envies du moment."
      })),
      activities: [
        { name: "Expérience Signature", desc: "Une immersion totale dans le luxe local.", plan_b: "Alternative VIP disponible." },
        { name: "Accès Privilège", desc: "Découvrez des lieux fermés au public.", plan_b: "Transfert privé inclus." }
      ],
      tip1: "Réservez vos tables 48h à l'avance.",
      tip2: "Privilégiez les transferts en berline privée.",
      phrase: "Santé !", phrase_tr: "Cheers !"
    };
  }

  // Vols — données réelles si SmartSearch a répondu, sinon estimées
  const volPriceEst = Math.round(budget * 0.15);
  const flightData = flights?.length
    ? [
      {
        from: flights[0].outbound?.from || 'CDG',
        from_city: 'Paris',
        to: flights[0].outbound?.to || 'XXX',
        to_city: dest,
        departure_time: (flights[0].outbound?.departure_time || '').slice(11, 16) || '10:30',
        arrival_time: (flights[0].outbound?.arrival_time || '').slice(11, 16) || '12:00',
        duration: `${Math.floor((flights[0].outbound?.duration_min || 90) / 60)}h${String((flights[0].outbound?.duration_min || 90) % 60).padStart(2, '0')}`,
        stops: flights[0].outbound?.stops === 0 ? 'Direct' : `${flights[0].outbound?.stops} escale(s)`,
        airline: flights[0].outbound?.airline || 'Air France',
        price_per_person: `${Math.round((flights[0].price || 0) / (travelers || 1))}€`,
        type: 'outbound'
      },
      flights[0].return ? {
        from: flights[0].return?.from || 'XXX',
        from_city: dest,
        to: flights[0].return?.to || 'CDG',
        to_city: 'Paris',
        departure_time: (flights[0].return?.departure_time || '').slice(11, 16) || '18:00',
        arrival_time: (flights[0].return?.arrival_time || '').slice(11, 16) || '20:00',
        duration: `${Math.floor((flights[0].return?.duration_min || 90) / 60)}h${String((flights[0].return?.duration_min || 90) % 60).padStart(2, '0')}`,
        stops: flights[0].return?.stops === 0 ? 'Direct' : `${flights[0].return?.stops} escale(s)`,
        airline: flights[0].return?.airline || 'Air France',
        price_per_person: `${Math.round((flights[0].price || 0) / (travelers || 1))}€`,
        type: 'return'
      } : null
    ].filter(Boolean)
    : [
      { from: 'CDG', from_city: 'Paris', to: 'XXX', to_city: dest, departure_time: '10:30', arrival_time: '12:00', duration: '1h30', stops: 'Direct', airline: 'Air France', price_per_person: `${volPriceEst}€`, type: 'outbound' },
      { from: 'XXX', from_city: dest, to: 'CDG', to_city: 'Paris', departure_time: '18:00', arrival_time: '19:30', duration: '1h30', stops: 'Direct', airline: 'Air France', price_per_person: `${volPriceEst}€`, type: 'return' }
    ];

  // Événements — réels ou génériques
  const eventData = events?.length
    ? events.slice(0, 3).map(e => ({
      name: e.title,
      category: e.category,
      date: (e.start || '').slice(0, 10) || 'Pendant votre séjour',
      venue: e.venue || 'Centre ville',
      description: e.description || ''
    }))
    : [{ name: `Soirée à ${dest}`, category: 'Nightlife', date: 'Pendant votre séjour', venue: 'Centre ville', description: 'Animation locale garantie' }];

  // Budget
  // Répartition intelligente selon le mode
  const BUDGET_RATIOS = {
    party: { vols: 0.25, heberg: 0.25, activites: 0.25, resto: 0.12, trans: 0.08 },
    student: { vols: 0.35, heberg: 0.30, activites: 0.10, resto: 0.15, trans: 0.05 },
    luxury: { vols: 0.20, heberg: 0.45, activites: 0.20, resto: 0.10, trans: 0.03 },
    group: { vols: 0.30, heberg: 0.35, activites: 0.15, resto: 0.12, trans: 0.05 },
    relax: { vols: 0.22, heberg: 0.40, activites: 0.15, resto: 0.13, trans: 0.07 },
    surprise: { vols: 0.28, heberg: 0.32, activites: 0.18, resto: 0.13, trans: 0.06 },
  };

  const ratio = BUDGET_RATIOS[mode] || BUDGET_RATIOS.party;
  const vols = Math.round(budget * ratio.vols);

  // Réalisme Hôtels : Plafonnement si le prix par nuit devient indécent pour la destination
  // On estime un prix max par nuit raisonnable par personne (ex: 200€ en moyenne)
  const maxPpn = mode === 'luxury' ? 800 : 250;
  let heberg = Math.round(budget * ratio.heberg);
  const ppn = heberg / nights / travelers;

  if (ppn > maxPpn) {
    heberg = maxPpn * nights * travelers;
  }

  const activites = Math.round(budget * ratio.activites);
  const resto = Math.round(budget * ratio.resto);
  const trans = Math.round(budget * ratio.trans);
  const divers = budget - vols - heberg - activites - resto - trans;

  // Structure finale construite côté serveur
  return {
    destination: dest,
    country: t.country || 'Destination',
    tagline: t.tagline || `${dest}, votre prochaine aventure`,
    overview: t.overview || `Découvrez ${dest} sous son meilleur jour.`,
    photo_url: realPhoto || `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80`,
    weather: {
      avg_temp: realWeather?.temp || t.weather?.temp || '20°C',
      conditions: realWeather?.cond || t.weather?.cond || 'Ensoleillé',
      tip: t.weather?.tip || 'Prévoyez des couches',
      humidity: realWeather?.humidity,
      wind: realWeather?.wind
    },
    summary: { total_budget: `${budget}€`, nights, activities_count: (t.activities || []).length },
    flights: flightData,
    hotels: (hotels?.length ? hotels : (t.hotels || [])).map((h, i) => {
      // Pour la démo VIP, on force des prix qui font rêver, ou "Sur Devis"
      let priceStr = `${Math.round(heberg / nights / (i + 1))}€`;
      if (mode === 'luxury' || mode === 'party') {
        priceStr = i === 0 ? 'Dès 850€/nuit' : 'Dès 600€/nuit';
      }
      return {
        name: h.name || `Palace ${i + 1}`,
        location: h.loc || 'Emplacement Premium',
        stars: h.stars || ((mode === 'luxury' || mode === 'party') ? 5 : 4),
        price_per_night: priceStr,
        highlights: h.hl || 'Choix du Concierge',
        emoji: i === 0 ? '💎' : '🛎️',
        match_reason: h.hl || 'Sélection Signature',
        url: `https://www.google.com/search?q=${encodeURIComponent(h.name + ' ' + dest + ' official site')}`
      }
    }),
    itinerary: (t.itinerary || []).map(d => ({
      day: d.day,
      title: d.title || 'Journée d\'Exception',
      subtitle: (mode === 'party' || mode === 'luxury') ? 'VIP Experience' : 'Exploration',
      items: [
        {
          time: mode === 'party' ? '14:00' : '10:00',
          type: 'activity',
          title: d.am || 'Exploration VIP',
          description: 'Matinée orchestrée par votre majordome.',
          price: (mode === 'luxury' || mode === 'party') ? 'Privatisé' : 'Inclus',
          duration: '3h',
          plan_b: d.plan_b
        },
        {
          time: mode === 'party' ? '22:00' : '20:00',
          type: mode === 'party' ? 'event' : 'food',
          title: d.pm || 'Dîner Signature',
          description: 'Accès exclusif et service sur-mesure.',
          price: (mode === 'luxury' || mode === 'party') ? 'Sur Liste' : 'Sur Réservation',
          duration: '4h'
        }
      ]
    })),
    activities: (t.activities || []).map((a) => {
      // Déduire la catégorie et l'emoji depuis le nom de l'activité
      const name = (a.name || '').toLowerCase();
      let category = 'Accès Privé';
      let emoji = '✦';

      if (name.match(/club|boite|nuit|soirée|soiree|nightclub|vip|casino|bar|lounge|dj|rave|party/)) {
        category = 'Nightlife VIP'; emoji = '🍾';
      } else if (name.match(/yacht|bateau|voile|croisière|croisiere|mer|island|barque/)) {
        category = 'Nautique Privé'; emoji = '🛥️';
      } else if (name.match(/helico|hélicopt|vol|avion|survol/)) {
        category = 'Transfert Signature'; emoji = '🚁';
      } else if (name.match(/spa|massage|bien.être|bienetre|soin|hammam|therme|zen|detox/)) {
        category = 'Bien-Être'; emoji = '🌿';
      } else if (name.match(/restaurant|diner|dîner|gastronomie|chef|table|repas|brunch/)) {
        category = 'Gastronomie'; emoji = '🍽️';
      } else if (name.match(/golf|tennis|sport|polo|surf|ski|chasse|pêche|peche/)) {
        category = 'Sport & Loisirs'; emoji = '🏆';
      } else if (name.match(/safari|nature|randonnée|randonnee|trek|plage|beach|villa/)) {
        category = 'Nature Exclusive'; emoji = '🌴';
      } else if (name.match(/musée|musee|art|galerie|culture|opéra|opera|theatre/)) {
        category = 'Culture & Art'; emoji = '🎭';
      } else if (name.match(/shopping|boutique|mode|maison|luxe|bijou/)) {
        category = 'Shopping Signature'; emoji = '💎';
      }

      return {
        name: a.name || 'Expérience Inédite',
        category,
        emoji,
        description: a.desc || 'Une immersion totale.',
        duration: '3h',
        price: (mode === 'luxury' || mode === 'party') ? 'Inclus VIP' : 'Dès 150€',
        best_time: category === 'Nightlife VIP' ? 'Soir' : 'Matin / Après-midi',
        plan_b: a.plan_b || null
      }
    }),
    events: eventData,
    budget_breakdown: {
      vols: `${vols}€`, hebergement: `${heberg}€`, activites: `${activites}€`,
      restauration: `${resto}€`, transports: `${trans}€`, divers: `${divers}€`, total: `${budget}€`
    },
    tips: [
      { title: 'Conseil pratique', content: t.tip1 || 'Réservez à l\'avance' },
      { title: 'Sur place', content: t.tip2 || 'Explorez les quartiers locaux' }
    ],
    local_phrases: [
      { phrase: t.phrase || 'Santé !', translation: t.phrase_tr || 'Cheers !' }
    ]
  };
}

export async function chatIntake({ currentData, userMessage }) {
  const systemPrompt = `Tu es le Concierge Privé de TripGenie. Tu incarnes l'excellence du service personnalisé.

TON OBJECTIF : Collecter ces 4 informations ESSENTIELLES, dans cet ordre, en 2-3 échanges maximum :
1. TYPE DE GROUPE : amis, couple, famille, solo
2. NOMBRE DE PERSONNES : combien voyagent
3. BUDGET TOTAL : en euros (pour le groupe entier)
4. DATE DE DÉPART : mois ou date précise

- Déduis intelligemment : "on est 4 amis" → travelers=4, profile="amis". "fin juillet" → departure="2025-07-28". "une semaine" → duration=7.
- Si l'utilisateur donne plusieurs infos en un seul message, extrait-les toutes et passe à la question manquante suivante.
- IMPORTANT : Si l'utilisateur donne une durée (ex: "une semaine", "10 jours"), remplis le champ "duration" avec le chiffre.

LOGIQUE D'AVANCEMENT :
- Si tu as (groupe + personnes + budget + départ) → isReady: TRUE immédiatement.
- Si budget manque après acte 2 → utilise 3000€/pers comme valeur par défaut et passe isReady: TRUE.
- Le mode (luxury/party/relax) se déduit du profil : couple → relax/luxury, amis → party, famille → relax.

VOCABULAIRE LUXE :
- "escapade" pas "voyage", "résidence" pas "hôtel", "orchestrer" pas "organiser", "fenêtre de dates" pas "dates"

DONNÉES DÉJÀ COLLECTÉES (ne pas redemander) :
${JSON.stringify(currentData, null, 2)}

QUESTIONS À POSER (seulement si manquantes) :
${!currentData?.profile ? '→ PRIORITÉ 1 : "Quelle est l\'occasion de cette escapade ?" + chips [Duo Romantique 💑, Entre Amis 🥂, En Famille 👨‍👩‍👧, Solo & Liberté 🌍]' : '✅ Groupe connu'}
${!currentData?.travelers ? '→ PRIORITÉ 2 : Combien de personnes voyagent ?' : '✅ Personnes connues'}
${!currentData?.budget ? '→ PRIORITÉ 3 : Quel budget avez-vous en tête pour cette escapade ? + chips [2 000€, 5 000€, 10 000€, Surprise-moi]' : '✅ Budget connu'}
${!currentData?.departure ? '→ PRIORITÉ 4 : Quelle est votre fenêtre de dates idéale ? + chips [Ce weekend, Dans 1 mois, Cet été, Fin d\'année]' : '✅ Date connue'}

FORMAT DE RÉPONSE (JSON STRICT, aucun texte après/avant) :
{
  "response": "Ta réponse élégante en 1-2 phrases.",
  "chips": ["Option 1", "Option 2", "Option 3"],
  "extractedData": {
    "travelers": null,
    "profile": null,
    "mode": "luxury",
    "budget": null,
    "duration": null,
    "origin": "Paris",
    "departure": null,
    "interests": []
  },
  "isReady": false
}`;

  console.log(`💬 Message Utilisateur: "${userMessage}"`);

  const msg = sanitizeInput(userMessage).toLowerCase();

  // Mode Survie / Debug rapide
  if (msg.includes('montre-moi') || msg.includes('on y va')) {
    return {
      response: "C'est parti ! Je prépare votre itinéraire signature...",
      isReady: true,
      isMock: true
    };
  }

  if (msg.includes('attendre')) {
    return {
      response: "Pas de souci ! Je comprends. N'hésite pas à revenir d'ici une heure ou demain, je serai de nouveau au top de ma forme pour te créer un voyage sur-mesure. À bientôt ! 👋",
      isReady: false,
      chips: ["Réessayer"],
      isMock: true
    };
  }
  try {
    const raw = await callAI(
      `${systemPrompt}\n\nMessage utilisateur : "${sanitizeInput(userMessage)}"`,
      undefined,
      'onboarding'
    );
    return parseJSON(raw);
  } catch (err) {
    console.error('⚠️ ChatIntake failed, activation du Mode Survie:', err.message);
    return {
      ...Mocks.MOCK_ONBOARDING,
      response: "Je capte un peu mal mais je continue ! On part sur une base solide, qu'est-ce que tu en penses ?",
      isMock: true
    };
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

  const result = parseJSON(raw)
  if (result.chips) result.chips = normalizeChips(result.chips)
  return result
}

export { callAI as callClaude };