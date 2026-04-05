// =============================================
// TRIPGENIE — server/services/claude.js
// Proxy sécurisé vers Claude + logique d'assemblage
// La clé API reste côté serveur, jamais exposée
// =============================================

const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
const MODEL      = 'claude-sonnet-4-20250514';

// ---- Appel Claude générique ----
async function callClaude(prompt, maxTokens = 4000) {
  const res = await fetch(CLAUDE_URL, {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Claude API error: ${JSON.stringify(data.error)}`);

  return data.content[0].text;
}

// ---- Parser JSON sécurisé ----
function parseJSON(raw) {
  let str = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = str.indexOf('{');
  const end   = str.lastIndexOf('}');
  if (start !== -1 && end !== -1) str = str.slice(start, end + 1);
  return JSON.parse(str);
}

// ---- 1. Analyser la requête utilisateur en langage naturel ----
export async function analyzeRequest(userInput) {
  const prompt = `Analyse cette demande de voyage et extrais les informations en JSON.

Demande: "${userInput}"

Réponds UNIQUEMENT en JSON valide:
{
  "destination": "ville ou null si non précisée",
  "origin": "ville de départ ou 'Paris' par défaut",
  "mode": "party|student|luxury|group|relax|surprise",
  "travelers": nombre (défaut 2),
  "duration_days": nombre (défaut 3),
  "budget_total": nombre en euros ou null,
  "budget_per_person": nombre en euros ou null,
  "preferences": ["liste", "de", "préférences"],
  "departure_flexibility": "fixed|flexible",
  "detected_events": ["si l'user mentionne un festival/événement spécifique"],
  "confidence": 0.0 à 1.0
}`;

  const raw = await callClaude(prompt, 500);
  return parseJSON(raw);
}

// ---- 2. Suggérer des destinations si non précisée ----
export async function suggestDestinations({ mode, budget, travelers, duration, origin, preferences }) {
  const prompt = `Tu es TripGenie. Suggère 5 destinations parfaites pour ce voyage.

Mode: ${mode}
Budget total: ${budget}€
Voyageurs: ${travelers}
Durée: ${duration} jours
Départ: ${origin}
Préférences: ${preferences?.join(', ') || 'général'}

Réponds UNIQUEMENT en JSON:
{
  "destinations": [
    {
      "city": "Nom ville",
      "country": "Pays",
      "iata": "Code IATA aéroport",
      "why": "Raison en 1 phrase pourquoi c'est parfait pour ce mode",
      "best_for": "${mode}",
      "estimated_flight_price": nombre,
      "vibe": "mot qui résume l'ambiance"
    }
  ]
}`;

  const raw = await callClaude(prompt, 1000);
  return parseJSON(raw);
}

// ---- 3. Assembler le pack final avec vraies données ----
export async function assemblePack({ destination, flights, hotels, events, activities, mode, travelers, budget }) {
  const prompt = `Tu es TripGenie. Assemble le meilleur pack voyage à partir de ces données réelles.

Destination: ${destination}
Mode: ${mode}
Voyageurs: ${travelers}
Budget: ${budget}€

Vols disponibles: ${JSON.stringify(flights?.slice(0,3))}
Hôtels disponibles: ${JSON.stringify(hotels?.slice(0,5))}
Événements: ${JSON.stringify(events?.slice(0,10))}
Activités: ${JSON.stringify(activities?.slice(0,10))}

Génère un pack complet en JSON:
{
  "tagline": "accroche poétique",
  "overview": "description du voyage en 2-3 phrases",
  "recommended_flight": { le meilleur vol },
  "recommended_hotel": { le meilleur hôtel },
  "top_events": [ les 3 meilleurs événements ],
  "itinerary": [
    {
      "day": 1,
      "title": "Titre du jour",
      "subtitle": "Thème",
      "items": [
        { "time": "10:00", "type": "activity|food|event|hotel", "title": "...", "description": "...", "price": "XX€" }
      ]
    }
  ],
  "budget_breakdown": {
    "vols": "XXX€",
    "hebergement": "XXX€",
    "activites": "XXX€",
    "restauration": "XXX€",
    "transports": "XXX€",
    "divers": "XXX€",
    "total": "XXX€"
  },
  "tips": [ { "title": "...", "content": "..." } ],
  "weather": { "avg_temp": "XX°C", "conditions": "...", "tip": "..." }
}`;

  const raw = await callClaude(prompt, 4000);
  return parseJSON(raw);
}

// ---- 4. Chat conversationnel pour modifier un itinéraire ----
export async function chatModify({ currentPack, userMessage, mode }) {
  const prompt = `Tu es TripGenie, un assistant de voyage. L'utilisateur veut modifier son itinéraire.

Itinéraire actuel (résumé): ${JSON.stringify(currentPack?.itinerary?.slice(0,2))}
Mode: ${mode}

Message de l'utilisateur: "${userMessage}"

Réponds en JSON:
{
  "response": "ta réponse naturelle en français",
  "modifications": { "champs à modifier dans le pack" },
  "needs_full_regen": true|false
}`;

  const raw = await callClaude(prompt, 1000);
  return parseJSON(raw);
}

export { callClaude };
