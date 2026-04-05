/* ============================================
   TRIPGENIE — API Claude
   js/api.js
   ============================================ */

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8000;

/**
 * Génère un itinéraire complet via l'API Claude
 * @param {Object} params - Paramètres du voyage
 * @returns {Object} - Données JSON de l'itinéraire
 */
export async function generateTrip(params) {
  const { origin, dest, tripType, departure, returnDate, travelers, budget, prefs, days } = params;

  const prompt = buildPrompt(params);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const raw = data.content[0].text;

  return parseJSON(raw);
}

/**
 * Construit le prompt pour Claude
 */
function buildPrompt({ origin, dest, tripType, departure, returnDate, travelers, budget, prefs, days }) {
  const tripLabel = tripType === 'roundtrip' ? 'Aller-retour'
    : tripType === 'oneway' ? 'Aller simple'
    : 'Multi-destinations';

  return `Tu es TripGenie, un expert en planification de voyages. Génère un itinéraire de voyage COMPLET et DÉTAILLÉ en JSON.

Paramètres:
- Départ: ${origin}
- Destination: ${dest}
- Type: ${tripLabel}
- Départ: ${departure || 'flexible'}
- Retour: ${returnDate || 'flexible'}
- Durée: ${days} jours
- Voyageurs: ${travelers}
- Budget: ${budget}
- Préférences: ${prefs.join(', ') || 'Général'}

Génère UNIQUEMENT un objet JSON valide avec cette structure exacte (sans markdown, sans backticks):
{
  "destination": "Nom de la ville",
  "country": "Pays",
  "tagline": "Phrase d'accroche poétique sur ce voyage",
  "overview": "Paragraphe de 3-4 phrases présentant le voyage",
  "weather": {
    "avg_temp": "XX°C",
    "conditions": "Ensoleillé / Nuageux / etc.",
    "tip": "Conseil météo court"
  },
  "summary": {
    "total_budget": "X XXX €",
    "nights": ${days - 1},
    "activities_count": 8,
    "flights_found": 3
  },
  "flights": [
    {
      "from": "CDG", "from_city": "${origin}",
      "to": "XXX", "to_city": "${dest}",
      "departure_time": "10:30", "arrival_time": "19:45",
      "duration": "Xh Xmin", "stops": "Direct",
      "airline": "Nom compagnie", "price_per_person": "XXX €",
      "type": "outbound"
    },
    {
      "from": "XXX", "from_city": "${dest}",
      "to": "CDG", "to_city": "${origin}",
      "departure_time": "11:00", "arrival_time": "18:30",
      "duration": "Xh Xmin", "stops": "Direct",
      "airline": "Nom compagnie", "price_per_person": "XXX €",
      "type": "return"
    }
  ],
  "hotels": [
    { "name": "Hôtel 1", "location": "Quartier, ${dest}", "stars": 4, "price_per_night": "XXX €", "highlights": "Description", "emoji": "🏨" },
    { "name": "Hôtel 2", "location": "Quartier 2", "stars": 3, "price_per_night": "XXX €", "highlights": "Description", "emoji": "🏩" },
    { "name": "Hôtel 3", "location": "Quartier 3", "stars": 5, "price_per_night": "XXX €", "highlights": "Description luxe", "emoji": "🏰" }
  ],
  "itinerary": [
    {
      "day": 1, "title": "Titre du jour", "subtitle": "Thème du jour",
      "items": [
        { "time": "09:00", "type": "activity", "title": "Activité", "description": "Description 2 phrases", "price": "XX €", "duration": "2h" }
      ]
    }
  ],
  "activities": [
    { "name": "Activité", "category": "Culture", "emoji": "🏛", "description": "Description", "duration": "2-3h", "price": "XX €", "best_time": "Matin" }
  ],
  "events": [
    { "name": "Événement", "category": "Festival", "date": "15 Juin", "venue": "Lieu", "description": "Description" }
  ],
  "budget_breakdown": {
    "vols": "X XXX €", "hebergement": "X XXX €", "activites": "XXX €",
    "restauration": "XXX €", "transports": "XXX €", "divers": "XXX €", "total": "X XXX €"
  },
  "tips": [
    { "title": "Titre conseil", "content": "Contenu 2 phrases" }
  ],
  "local_phrases": [
    { "phrase": "Merci", "translation": "arigatou" }
  ]
}

Génère un itinéraire de ${days} jours complet avec des activités RÉELLES et des prix RÉALISTES pour ${dest}. Adapte tout aux préférences: ${prefs.join(', ')}.`;
}

/**
 * Parse le JSON retourné par Claude (gère les backticks éventuels)
 */
function parseJSON(raw) {
  let jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const start = jsonStr.indexOf('{');
  const end = jsonStr.lastIndexOf('}');
  if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);
  return JSON.parse(jsonStr);
}
