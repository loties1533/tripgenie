import { searchWeb } from './tools/webSearch.js';
import { callAI } from './claude.js';

/**
 * Recherche des vols via le Web (Tavily) + extraction IA
 */
export async function smartFlightSearch({ origin, destination, departure, return_date }) {
  try {
    const query = `vols aller-retour de ${origin} à ${destination} du ${departure} au ${return_date} prix compagnies aériennes`;
    
    // 1. Recherche Web
    const webContext = await searchWeb(query);
    if (!webContext) return null;

    // 2. Extraction par l'IA
    const prompt = `
      Voici des résultats de recherche web récents pour des vols :
      ${webContext}

      Extraire les infos du meilleur vol trouvé (le plus réaliste/récent).
      Retourne UNIQUEMENT ce JSON :
      {
        "price": 450,
        "airline": "Compagnie",
        "outbound_time": "10:30",
        "arrival_time": "14:00",
        "duration": "3h30",
        "stops": "Direct"
      }
    `;

    const resRaw = await callAI(prompt, undefined, 'pack');
    try {
      return JSON.parse(resRaw);
    } catch {
      return null;
    }
  } catch (err) {
    console.error('SmartFlightSearch error:', err.message);
    return null;
  }
}

/**
 * Recherche des événements exclusifs et soirées VIP via le Web (Tavily) + extraction IA
 */
export async function smartEventsSearch({ location, dateFrom, dateTo, mode }) {
  try {
    let query = `événements soirées clubs exclusifs casino spectacles VIP à ${location} entre le ${dateFrom} et le ${dateTo}`;
    if (mode === 'luxury' || mode === 'party') {
      query = `exclusive VIP parties, luxury casino events, private clubs, best nightlife in ${location} between ${dateFrom} and ${dateTo}`;
    }

    // 1. Recherche Web
    const webContext = await searchWeb(query);
    if (!webContext) return [];

    // 2. Extraction par l'IA
    const prompt = `
      Voici des résultats de recherche web récents pour la vie nocturne et les événements à ${location} :
      ${webContext}

      Extraire les 3 événements ou lieux les plus luxueux, exclusifs ou spectaculaires (Clubs VIP, Casinos, Dîners spectacles, Soirées privées).
      Si aucun événement précis n'est trouvé aux dates indiquées, sélectionne les 3 meilleurs "Hotspots" (lieux incontournables) toujours valides.
      
      Retourne UNIQUEMENT un tableau JSON strict au format exact suivant (n'ajoute aucun texte avant ou après) :
      [
        {
          "title": "Nom de la soirée ou de l'expérience",
          "category": "Nightlife VIP",
          "start": "${dateFrom || 'Ce soir'}",
          "venue": "Lieu (ex: Pacha, Casino de Monte-Carlo)",
          "description": "Une description très alléchante et luxueuse."
        }
      ]
    `;

    const resRaw = await callAI(prompt, undefined, 'destinations'); // On utilise 'destinations' car c'est rapide
    try {
      const parsed = JSON.parse(resRaw.replace(/```json/g, '').replace(/```/g, '').trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseErr) {
      console.error('Erreur parsing JSON Events:', parseErr);
      return [];
    }
  } catch (err) {
    console.error('SmartEventsSearch error:', err.message);
    return [];
  }
}
