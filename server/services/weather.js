/**
 * @fileoverview Météo réelle via Tavily + extraction IA.
 * Aucune clé OpenWeather nécessaire.
 */

import { searchWeb } from './tools/webSearch.js';
import { callAI } from './claude/index.js';

export async function getRealWeather(city) {
  try {
    const query = `météo actuelle à ${city} température conditions humidité vent`;
    const webContext = await searchWeb(query);
    if (!webContext) return null;

    const prompt = `
      Voici des infos météo pour ${city} :
      ${webContext}

      Extrais les données suivantes au format JSON :
      {
        "temp": "22°C",
        "cond": "Partiellement nuageux",
        "humidity": 65,
        "wind": "15 km/h"
      }
      Retourne UNIQUEMENT le JSON.
    `;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    try {
      return JSON.parse(resRaw.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch {
      return null;
    }
  } catch (err) {
    console.error('Weather via Tavily error:', err.message);
    return null;
  }
}
