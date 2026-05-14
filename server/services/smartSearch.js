import { searchWeb } from './tools/webSearch.js';
import { callAI } from './claude.js';

export async function smartFlightSearch({ origin, destination, departure, return_date }) {
  try {
    const query = `vols aller-retour de ${origin} à ${destination} du ${departure} au ${return_date} prix compagnies aériennes`;
    const webContext = await searchWeb(query);
    if (!webContext) return null;

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

export async function smartEventsSearch({ location, dateFrom, dateTo, mode }) {
  try {
    let query = `événements soirées clubs exclusifs spectacles à ${location} entre le ${dateFrom} et le ${dateTo}`;
    if (mode === 'luxury' || mode === 'party') {
      query = `exclusive VIP parties, private clubs, best nightlife in ${location} between ${dateFrom} and ${dateTo}`;
    }

    const webContext = await searchWeb(query);
    if (!webContext) return [];

    const prompt = `
      Voici des résultats de recherche web récents pour les événements à ${location} :
      ${webContext}

      Extraire les 3 événements ou lieux incontournables.
      Si aucun événement précis aux dates indiquées, sélectionne les 3 meilleurs hotspots toujours valides.

      Retourne UNIQUEMENT un tableau JSON strict :
      [
        {
          "title": "Nom de l'événement ou lieu",
          "category": "Nightlife",
          "start": "${dateFrom || 'Pendant le séjour'}",
          "venue": "Nom du lieu",
          "description": "Description courte."
        }
      ]
    `;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    try {
      const parsed = JSON.parse(resRaw.replace(/```json/g, '').replace(/```/g, '').trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch (err) {
    console.error('SmartEventsSearch error:', err.message);
    return [];
  }
}

export async function smartHotelSearch({ location, mode }) {
  try {
    const query = mode === 'student'
      ? `best hostels and affordable hotels in ${location}`
      : `best luxury 5 star hotels in ${location}`;

    const webContext = await searchWeb(query);
    if (!webContext) return [];

    const prompt = `
      Voici des résultats de recherche web pour des hébergements à ${location} :
      ${webContext}

      Extraire les 2 meilleurs hôtels.
      Retourne UNIQUEMENT un tableau JSON strict :
      [
        {
          "name": "Nom de l'hôtel",
          "loc": "Quartier",
          "hl": "Point fort",
          "stars": 4
        }
      ]
    `;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    try {
      const parsed = JSON.parse(resRaw.replace(/```json/g, '').replace(/```/g, '').trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch (err) {
    console.error('SmartHotelSearch error:', err.message);
    return [];
  }
}
