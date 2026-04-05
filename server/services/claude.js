import 'dotenv/config';

const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

console.log(`🤖 AI Provider: ${ANTHROPIC_KEY ? 'Claude' : GEMINI_KEY ? 'Gemini' : '⚠️ AUCUN configuré'}`);

async function callAI(prompt) {
  if (ANTHROPIC_KEY) return callClaude(prompt);
  if (GEMINI_KEY)    return callGemini(prompt);
  throw new Error('Aucune clé API configurée dans .env');
}

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Claude error: ${JSON.stringify(data.error)}`);
  return data.content[0].text;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4000 }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data.error)}`);
  return data.candidates[0].content.parts[0].text;
}

function parseJSON(raw) {
  let str = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = str.indexOf('{');
  const end   = str.lastIndexOf('}');
  if (start !== -1 && end !== -1) str = str.slice(start, end + 1);
  return JSON.parse(str);
}

export async function analyzeRequest(userInput) {
  const raw = await callAI(`Analyse cette demande de voyage en JSON.
Demande: "${userInput}"
Réponds UNIQUEMENT en JSON:
{ "destination": "ville ou null", "origin": "Paris", "mode": "party|student|luxury|group|relax|surprise", "travelers": 2, "duration_days": 3, "budget_total": null, "preferences": [], "confidence": 0.9 }`);
  return parseJSON(raw);
}

export async function suggestDestinations({ mode, budget, travelers, duration, origin, preferences }) {
  const raw = await callAI(`Suggère 5 destinations. Mode:${mode} Budget:${budget}€ Voyageurs:${travelers} Durée:${duration}j Départ:${origin}
Réponds UNIQUEMENT en JSON:
{ "destinations": [{ "city": "Ville", "country": "Pays", "iata": "XXX", "why": "raison", "vibe": "mot", "estimated_flight_price": 200 }] }`);
  return parseJSON(raw);
}

export async function assemblePack({ destination, flights, events, mode, travelers, budget }) {
  const raw = await callAI(`Tu es TripGenie. Génère un pack voyage COMPLET pour ${destination}.
Mode:${mode} | Voyageurs:${travelers} | Budget:${budget}€
Événements: ${JSON.stringify(events?.slice(0,5) || [])}

Réponds UNIQUEMENT en JSON valide (pas de texte avant ou après):
{
  "destination": "${destination}",
  "country": "Pays",
  "tagline": "accroche poétique",
  "overview": "description 2-3 phrases",
  "weather": { "avg_temp": "20°C", "conditions": "Ensoleillé", "tip": "conseil météo" },
  "summary": { "total_budget": "1100€", "nights": 3, "activities_count": 5 },
  "flights": [
    { "from": "CDG", "from_city": "Paris", "to": "XXX", "to_city": "${destination}", "departure_time": "10:30", "arrival_time": "12:00", "duration": "1h30", "stops": "Direct", "airline": "Air France", "price_per_person": "150€", "type": "outbound" },
    { "from": "XXX", "from_city": "${destination}", "to": "CDG", "to_city": "Paris", "departure_time": "18:00", "arrival_time": "19:30", "duration": "1h30", "stops": "Direct", "airline": "Air France", "price_per_person": "150€", "type": "return" }
  ],
  "hotels": [
    { "name": "Nom hôtel", "location": "Quartier, ${destination}", "stars": 4, "price_per_night": "120€", "highlights": "description courte", "emoji": "🏨" },
    { "name": "Nom hôtel 2", "location": "Quartier 2", "stars": 3, "price_per_night": "80€", "highlights": "description courte", "emoji": "🏩" }
  ],
  "itinerary": [
    { "day": 1, "title": "Titre jour 1", "subtitle": "Thème", "items": [
      { "time": "14:00", "type": "activity", "title": "Activité", "description": "Description 2 phrases", "price": "20€", "duration": "2h" }
    ]}
  ],
  "activities": [
    { "name": "Activité", "category": "Culture", "emoji": "🏛", "description": "Description", "duration": "2h", "price": "20€", "best_time": "Matin" }
  ],
  "events": [
    { "name": "Événement", "category": "Festival", "date": "Mai 2026", "venue": "Lieu", "description": "Description" }
  ],
  "budget_breakdown": { "vols": "300€", "hebergement": "360€", "activites": "100€", "restauration": "200€", "transports": "80€", "divers": "60€", "total": "1100€" },
  "tips": [{ "title": "Conseil pratique", "content": "Contenu utile" }],
  "local_phrases": [{ "phrase": "Merci", "translation": "traduction locale" }]
}`);
  return parseJSON(raw);
}

export async function chatModify({ currentPack, userMessage, mode }) {
  const raw = await callAI(`Tu es TripGenie. L'utilisateur veut modifier son voyage pour ${currentPack?.destination}.
Message: "${userMessage}"
Réponds en JSON: { "response": "ta réponse en français", "needs_full_regen": false }`);
  return parseJSON(raw);
}

export { callAI as callClaude };