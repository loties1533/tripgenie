/**
 * @fileoverview Recherches web via Tavily pour vols, événements et hôtels.
 * Chaque fonction extrait des données réelles + URLs cliquables.
 */

import { searchWeb } from './tools/webSearch.js';
import { callAI, parseJSON } from './claude/index.js';
import type { TravelMode, FlightLinks, HotelLinks, ActivityLinks } from '../lib/types.js';

function encode(str: string): string {
  return encodeURIComponent(str?.trim() ?? '');
}

function flightLinks(origin: string, destination: string, departure?: string): FlightLinks {
  const dep = departure?.slice(0, 10).replace(/-/g, '') ?? '';
  return {
    skyscanner: `https://www.skyscanner.fr/transport/flights/${encode(origin)}/${encode(destination)}/${dep}/`,
    kayak:      `https://www.kayak.fr/flights/${encode(origin)}-${encode(destination)}/${departure ?? ''}`,
    google:     `https://www.google.com/travel/flights?q=vols+${encode(origin)}+${encode(destination)}`,
  };
}

function hotelLinks(hotelName: string, city: string): HotelLinks {
  return {
    booking: `https://www.booking.com/search.html?ss=${encode(hotelName + ' ' + city)}`,
    hotels:  `https://fr.hotels.com/search.do?q-destination=${encode(city)}&q-localised-check-in=&q-room-0-adults=2`,
    google:  `https://www.google.com/travel/hotels/${encode(city)}?q=${encode(hotelName)}`,
  };
}

function activityLinks(activityName: string, city: string): ActivityLinks {
  return {
    viator:       `https://www.viator.com/fr-FR/search?text=${encode(activityName + ' ' + city)}`,
    getyourguide: `https://www.getyourguide.fr/s/?q=${encode(activityName + ' ' + city)}`,
    airbnb:       `https://www.airbnb.fr/experiences/search?q=${encode(city)}`,
  };
}

// ---- Interfaces pour les résultats ----

export interface FlightSearchResult {
  price: number;
  airline: string;
  outbound_time: string;
  arrival_time: string;
  duration: string;
  stops: string;
  booking_url: string | null;
  links: FlightLinks;
}

export interface EventSearchResult {
  title: string;
  category: string;
  start: string;
  venue: string;
  description: string;
  booking_url: string | null;
  links: ActivityLinks;
}

export interface HotelSearchResult {
  name: string;
  loc: string;
  hl: string;
  stars: number;
  price_per_night: number;
  booking_url: string | null;
  links: HotelLinks;
}

interface SmartFlightParams {
  origin: string;
  destination: string;
  departure: string;
  return_date?: string;
}

interface SmartEventsParams {
  location: string;
  dateFrom?: string;
  dateTo?: string;
  mode: TravelMode;
}

interface SmartHotelParams {
  location: string;
  mode: TravelMode;
}

interface EventbriteParams {
  location: string;
  dateFrom?: string;
  dateTo?: string;
  mode: TravelMode;
}

export async function smartFlightSearch({
  origin, destination, departure, return_date,
}: SmartFlightParams): Promise<FlightSearchResult | null> {
  try {
    const query = `vols ${origin} ${destination} ${departure} prix compagnies aériennes`;
    const webContext = await searchWeb(query);
    if (!webContext) return null;

    const prompt = `
Voici des résultats web pour des vols de ${origin} à ${destination} :
${webContext}

Extrais le meilleur vol trouvé. RÈGLES STRICTES :
- "price" = prix EN EUROS par personne pour UN billet aller simple. Minimum 50€.
- Si tu vois un prix < 50€, IGNORE-LE. Si aucun prix fiable, estime un prix réaliste.

Retourne UNIQUEMENT ce JSON :
{
  "price": 150,
  "airline": "Compagnie",
  "outbound_time": "10:30",
  "arrival_time": "14:00",
  "duration": "2h30",
  "stops": "Direct",
  "booking_url": null
}`;

    const resRaw = await callAI(prompt, undefined, 'pack');
    const data = parseJSON(resRaw) as Omit<FlightSearchResult, 'links'>;
    return { ...data, links: flightLinks(origin, destination, departure) };
  } catch (err) {
    console.error('SmartFlightSearch error:', (err as Error).message);
    return null;
  }
}

interface EventbriteEvent {
  name?: { text?: string };
  start?: { local?: string };
  venue?: { name?: string; address?: { city?: string } };
  description?: { text?: string };
  url?: string;
}

interface EventbriteResponse {
  events?: EventbriteEvent[];
}

async function eventbriteSearch({
  location, dateFrom, dateTo, mode,
}: EventbriteParams): Promise<EventSearchResult[] | null> {
  const token = process.env.EVENTBRITE_API_KEY;
  if (!token) return null;

  const categoryMap: Record<string, string> = {
    party:   '103,105',
    luxury:  '110,105',
    student: '103,108',
    relax:   '107,110',
    group:   '103,110',
    surprise:'103,105',
  };
  const categories = categoryMap[mode] ?? '103,105';

  const params = new URLSearchParams({
    'location.address':       location,
    'location.within':        '50km',
    'start_date.range_start': dateFrom ? `${dateFrom}T00:00:00` : new Date().toISOString().slice(0, 19),
    'start_date.range_end':   dateTo   ? `${dateTo}T23:59:59`   : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 19),
    categories,
    sort_by:    'best',
    expand:     'venue',
    page_size:  '5',
  });

  const url = `https://www.eventbriteapi.com/v3/events/search/?${params}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal:  AbortSignal.timeout(8000),
  });

  if (!resp.ok) {
    console.warn(`Eventbrite API ${resp.status}: ${await resp.text()}`);
    return null;
  }

  const data = (await resp.json()) as EventbriteResponse;
  const events = (data.events ?? []).slice(0, 3);
  if (!events.length) return null;

  return events.map(e => ({
    title:       e.name?.text ?? 'Événement',
    category:    mode === 'party' ? 'Nightlife' : 'Event',
    start:       e.start?.local?.slice(0, 10) ?? dateFrom ?? 'Pendant le séjour',
    venue:       e.venue?.name ?? e.venue?.address?.city ?? location,
    description: e.description?.text?.slice(0, 150) ?? '',
    booking_url: e.url ?? null,
    links:       activityLinks(e.name?.text ?? '', location),
  }));
}

export async function smartEventsSearch({
  location, dateFrom, dateTo, mode,
}: SmartEventsParams): Promise<EventSearchResult[]> {
  try {
    const realEvents = await eventbriteSearch({ location, dateFrom, dateTo, mode });
    if (realEvents?.length) {
      console.error(`✅ Eventbrite: ${realEvents.length} événements réels pour ${location}`);
      return realEvents;
    }
  } catch (err) {
    console.warn('Eventbrite fallback:', (err as Error).message);
  }

  try {
    const query = (mode === 'luxury' || mode === 'party')
      ? `exclusive VIP parties private clubs best nightlife ${location} ${dateFrom ?? ''}`
      : `événements spectacles concerts incontournables ${location} ${dateFrom ?? ''}`;

    const webContext = await searchWeb(query);
    if (!webContext) return [];

    const prompt = `
Voici des résultats web pour des événements à ${location} :
${webContext}

Extrais les 3 meilleurs événements. Retourne UNIQUEMENT un tableau JSON :
[
  {
    "title": "Nom",
    "category": "Nightlife",
    "start": "${dateFrom ?? 'Pendant le séjour'}",
    "venue": "Lieu",
    "description": "Description courte.",
    "booking_url": null
  }
]`;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    const parsed = parseJSON(resRaw);
    const events: Omit<EventSearchResult, 'links'>[] = Array.isArray(parsed) ? parsed : [];

    return events.map(e => ({ ...e, links: activityLinks(e.title, location) }));
  } catch (err) {
    console.error('SmartEventsSearch error:', (err as Error).message);
    return [];
  }
}

export async function smartHotelSearch({ location, mode }: SmartHotelParams): Promise<HotelSearchResult[]> {
  try {
    const query = mode === 'student'
      ? `best hostels affordable hotels ${location} booking price`
      : `best luxury 5 star hotels ${location} booking price`;

    const webContext = await searchWeb(query);
    if (!webContext) return [];

    const prompt = `
Voici des résultats web pour des hôtels à ${location} :
${webContext}

Extrais les 2 meilleurs hôtels. Retourne UNIQUEMENT un tableau JSON :
[
  {
    "name": "Nom de l'hôtel",
    "loc": "Quartier",
    "hl": "Point fort",
    "stars": 4,
    "price_per_night": 150,
    "booking_url": null
  }
]`;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    const parsed = parseJSON(resRaw);
    const hotels: Omit<HotelSearchResult, 'links'>[] = Array.isArray(parsed) ? parsed : [];

    return hotels.map(h => ({ ...h, links: hotelLinks(h.name, location) }));
  } catch (err) {
    console.error('SmartHotelSearch error:', (err as Error).message);
    return [];
  }
}
