/**
 * @fileoverview Recherches web via Tavily pour vols, événements et hôtels.
 * Chaque fonction extrait des données réelles + URLs cliquables.
 */

import { searchWeb } from './tools/webSearch.js';
import { callAI } from './claude/index.js';

function encode(str) {
  return encodeURIComponent(str?.trim() || '');
}

// ---- Liens de réservation générés à partir du nom réel ----
function flightLinks(origin, destination, departure) {
  const dep = departure?.slice(0, 10).replace(/-/g, '') || '';
  return {
    skyscanner: `https://www.skyscanner.fr/transport/flights/${encode(origin)}/${encode(destination)}/${dep}/`,
    kayak:      `https://www.kayak.fr/flights/${encode(origin)}-${encode(destination)}/${departure || ''}`,
    google:     `https://www.google.com/travel/flights?q=vols+${encode(origin)}+${encode(destination)}`
  };
}

function hotelLinks(hotelName, city) {
  return {
    booking:   `https://www.booking.com/search.html?ss=${encode(hotelName + ' ' + city)}`,
    hotels:    `https://fr.hotels.com/search.do?q-destination=${encode(city)}&q-localised-check-in=&q-room-0-adults=2`,
    google:    `https://www.google.com/travel/hotels/${encode(city)}?q=${encode(hotelName)}`
  };
}

function activityLinks(activityName, city) {
  return {
    viator:        `https://www.viator.com/fr-FR/search?text=${encode(activityName + ' ' + city)}`,
    getyourguide:  `https://www.getyourguide.fr/s/?q=${encode(activityName + ' ' + city)}`,
    airbnb:        `https://www.airbnb.fr/experiences/search?q=${encode(city)}`
  };
}

export async function smartFlightSearch({ origin, destination, departure, return_date }) {
  try {
    const query = `vols ${origin} ${destination} ${departure} prix compagnies aériennes`;
    const webContext = await searchWeb(query);
    if (!webContext) return null;

    const prompt = `
Voici des résultats web pour des vols de ${origin} à ${destination} :
${webContext}

Extrais les infos du meilleur vol trouvé. Si tu trouves une URL de réservation directe dans les sources, inclus-la.
Retourne UNIQUEMENT ce JSON :
{
  "price": 450,
  "airline": "Compagnie",
  "outbound_time": "10:30",
  "arrival_time": "14:00",
  "duration": "3h30",
  "stops": "Direct",
  "booking_url": "URL directe si trouvée, sinon null"
}`;

    const resRaw = await callAI(prompt, undefined, 'pack');
    const data = JSON.parse(resRaw.replace(/```json/g,'').replace(/```/g,'').trim());
    return {
      ...data,
      links: flightLinks(origin, destination, departure)
    };
  } catch (err) {
    console.error('SmartFlightSearch error:', err.message);
    return null;
  }
}

export async function smartEventsSearch({ location, dateFrom, dateTo, mode }) {
  try {
    const query = (mode === 'luxury' || mode === 'party')
      ? `exclusive VIP parties private clubs best nightlife ${location} ${dateFrom}`
      : `événements spectacles concerts incontournables ${location} ${dateFrom}`;

    const webContext = await searchWeb(query);
    if (!webContext) return [];

    const prompt = `
Voici des résultats web pour des événements à ${location} :
${webContext}

Extrais les 3 meilleurs événements ou lieux. Si tu trouves des URLs de billets ou de réservation dans les sources, inclus-les.
Retourne UNIQUEMENT un tableau JSON :
[
  {
    "title": "Nom",
    "category": "Nightlife",
    "start": "${dateFrom || 'Pendant le séjour'}",
    "venue": "Lieu",
    "description": "Description courte.",
    "booking_url": "URL directe si trouvée, sinon null"
  }
]`;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    const parsed = JSON.parse(resRaw.replace(/```json/g,'').replace(/```/g,'').trim());
    const events = Array.isArray(parsed) ? parsed : [];

    return events.map(e => ({
      ...e,
      links: activityLinks(e.title, location)
    }));
  } catch (err) {
    console.error('SmartEventsSearch error:', err.message);
    return [];
  }
}

export async function smartHotelSearch({ location, mode }) {
  try {
    const query = mode === 'student'
      ? `best hostels affordable hotels ${location} booking price`
      : `best luxury 5 star hotels ${location} booking price`;

    const webContext = await searchWeb(query);
    if (!webContext) return [];

    const prompt = `
Voici des résultats web pour des hôtels à ${location} :
${webContext}

Extrais les 2 meilleurs hôtels. Si tu trouves des URLs Booking.com ou Hotels.com dans les sources, inclus-les.
Retourne UNIQUEMENT un tableau JSON :
[
  {
    "name": "Nom de l'hôtel",
    "loc": "Quartier",
    "hl": "Point fort",
    "stars": 4,
    "price_per_night": 150,
    "booking_url": "URL directe si trouvée, sinon null"
  }
]`;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    const parsed = JSON.parse(resRaw.replace(/```json/g,'').replace(/```/g,'').trim());
    const hotels = Array.isArray(parsed) ? parsed : [];

    return hotels.map(h => ({
      ...h,
      links: hotelLinks(h.name, location)
    }));
  } catch (err) {
    console.error('SmartHotelSearch error:', err.message);
    return [];
  }
}
