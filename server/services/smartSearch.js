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
