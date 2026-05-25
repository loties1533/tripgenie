/**
 * @fileoverview Agrégateur de vrais lieux locaux — 3 sources en parallèle.
 *
 * 1. Yelp Fusion API     (gratuit 500 req/jour)  → restaurants, bars, nightlife
 * 2. OpenTripMap API     (gratuit 5000 req/jour) → monuments, activités, POI culturels
 * 3. Overpass API (OSM)  (gratuit, illimité)     → fallback universel
 *
 * Remplace Foursquare Places API v3 (410 Gone depuis 2024).
 * Conserve la même interface FoursquareVenue et le même export getFoursquareVenues
 * pour compatibilité totale avec le pipeline (ai.ts, pack.ts).
 *
 * Variables d'environnement requises :
 *   YELP_API_KEY         → https://www.yelp.com/developers/v3/manage_app
 *   OPENTRIPMAP_API_KEY  → https://opentripmap.io/product
 *   (Overpass ne nécessite pas de clé)
 */

import type { TravelMode } from '../lib/types.js';

// ─── Interface publique (inchangée) ───────────────────────────────────────────

export interface FoursquareVenue {
  name: string;
  category: string;
  address: string;
  fsq_id: string;
  rating?: number;
  url?: string;
}

// ─── Types internes ───────────────────────────────────────────────────────────

interface GeoResult {
  latitude: number;
  longitude: number;
}

interface OTMFeature {
  properties: {
    xid: string;
    name: string;
    kinds: string;
  };
}
interface OTMResponse {
  features?: OTMFeature[];
}

interface YelpBusiness {
  id: string;
  name: string;
  categories?: { title: string }[];
  location?: { display_address?: string[] };
  rating?: number;
  url?: string;
}
interface YelpResponse {
  businesses?: YelpBusiness[];
}

interface OverpassElement {
  id: number;
  tags?: {
    name?: string;
    amenity?: string;
    'addr:street'?: string;
    'addr:city'?: string;
  };
}
interface OverpassResponse {
  elements?: OverpassElement[];
}

// ─── Mapping des catégories par mode ──────────────────────────────────────────

const OTM_KINDS: Record<TravelMode, string> = {
  party:    'amusements,sport',
  luxury:   'architecture,cultural,historic',
  relax:    'natural,tourist_facilities',
  student:  'amusements,cultural',
  group:    'amusements,cultural,sport',
  surprise: 'interesting_places',
};

const YELP_CATEGORIES: Record<TravelMode, string> = {
  party:    'nightlife,danceclubs,bars',
  luxury:   'restaurants,spas,wine_bars',
  relax:    'spas,yoga,parks',
  student:  'bars,cafes,sandwiches',
  group:    'restaurants,arts,activities',
  surprise: 'localflavor,restaurants',
};

const OVERPASS_AMENITIES: Record<TravelMode, string[]> = {
  party:    ['nightclub', 'bar', 'pub'],
  luxury:   ['restaurant', 'spa'],
  relax:    ['spa', 'cafe'],
  student:  ['bar', 'cafe', 'fast_food'],
  group:    ['restaurant', 'bar', 'theatre'],
  surprise: ['restaurant', 'bar', 'museum'],
};

// ─── Géocodage (Open-Meteo, gratuit, sans clé) ────────────────────────────────

async function geocode(city: string): Promise<GeoResult | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: GeoResult[] };
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

// ─── Source 1 : Yelp Fusion ───────────────────────────────────────────────────

async function fetchYelp(destination: string, mode: TravelMode): Promise<FoursquareVenue[]> {
  const apiKey = process.env.YELP_API_KEY?.trim();
  if (!apiKey) return [];

  const categories = YELP_CATEGORIES[mode] ?? 'restaurants';
  const params = new URLSearchParams({
    location:   destination,
    categories,
    limit:      '6',
    sort_by:    'rating',
  });

  try {
    const res = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal:  AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      console.warn(`Yelp API ${res.status} for ${destination}`);
      return [];
    }

    const data = (await res.json()) as YelpResponse;
    return (data.businesses ?? []).map(b => ({
      fsq_id:   b.id,
      name:     b.name,
      category: b.categories?.[0]?.title ?? categories.split(',')[0],
      address:  b.location?.display_address?.join(', ') ?? destination,
      rating:   b.rating,
      url:      b.url,
    }));
  } catch {
    return [];
  }
}

// ─── Source 2 : OpenTripMap ───────────────────────────────────────────────────

async function fetchOpenTripMap(lat: number, lon: number, mode: TravelMode): Promise<FoursquareVenue[]> {
  const apiKey = process.env.OPENTRIPMAP_API_KEY?.trim();
  if (!apiKey) return [];

  const kinds = OTM_KINDS[mode] ?? 'interesting_places';
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=10000&lon=${lon}&lat=${lat}&kinds=${kinds}&limit=8&format=geojson&apikey=${apiKey}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) {
      console.warn(`OpenTripMap ${res.status}`);
      return [];
    }

    const data = (await res.json()) as OTMResponse;
    return (data.features ?? [])
      .filter(f => f.properties.name)
      .slice(0, 5)
      .map(f => ({
        fsq_id:   f.properties.xid,
        name:     f.properties.name,
        category: f.properties.kinds.split(',')[0].replace(/_/g, ' '),
        address:  '',
      }));
  } catch {
    return [];
  }
}

// ─── Source 3 : Overpass / OpenStreetMap (fallback sans clé) ──────────────────

async function fetchOverpass(lat: number, lon: number, mode: TravelMode): Promise<FoursquareVenue[]> {
  const amenities = OVERPASS_AMENITIES[mode] ?? ['restaurant', 'bar'];

  const nodeQueries = amenities
    .map(a => `node["amenity"="${a}"](around:3000,${lat},${lon});`)
    .join('');
  const query = `[out:json][timeout:10];(${nodeQueries});out 8;`;

  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as OverpassResponse;
    return (data.elements ?? [])
      .filter(e => e.tags?.name)
      .slice(0, 5)
      .map(e => ({
        fsq_id:   String(e.id),
        name:     e.tags!.name!,
        category: e.tags!.amenity ?? 'lieu local',
        address:  [e.tags!['addr:street'], e.tags!['addr:city']].filter(Boolean).join(', '),
      }));
  } catch {
    return [];
  }
}

// ─── Point d'entrée public ────────────────────────────────────────────────────

/**
 * Agrège les vrais lieux locaux depuis Yelp + OpenTripMap + Overpass en parallèle.
 * Résultat dédupliqué, max 10 lieux injectés dans le prompt LLM.
 */
export async function getFoursquareVenues(
  destination: string,
  mode: TravelMode
): Promise<FoursquareVenue[]> {
  try {
    const geo = await geocode(destination);

    const [yelpRes, otmRes, overpassRes] = await Promise.allSettled([
      fetchYelp(destination, mode),
      geo ? fetchOpenTripMap(geo.latitude, geo.longitude, mode) : Promise.resolve([]),
      geo ? fetchOverpass(geo.latitude, geo.longitude, mode)    : Promise.resolve([]),
    ]);

    const yelp     = yelpRes.status     === 'fulfilled' ? yelpRes.value     : [];
    const otm      = otmRes.status      === 'fulfilled' ? otmRes.value      : [];
    const overpass = overpassRes.status === 'fulfilled' ? overpassRes.value : [];

    // Merge : Yelp en priorité (plus riche en données), puis OTM, puis OSM
    const all = [...yelp, ...otm, ...overpass];

    // Déduplique par nom normalisé
    const seen = new Set<string>();
    const unique = all.filter(v => {
      const key = v.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const sources = [
      yelp.length     ? `Yelp:${yelp.length}`   : null,
      otm.length      ? `OTM:${otm.length}`      : null,
      overpass.length ? `OSM:${overpass.length}` : null,
    ].filter(Boolean).join(' + ');

    if (unique.length) {
      console.log(`🗺️  Venues [${mode}] ${destination}: ${unique.length} lieux réels (${sources})`);
    } else {
      console.warn(`🗺️  Venues: aucun résultat pour "${destination}" [${mode}] — vérifier YELP_API_KEY et OPENTRIPMAP_API_KEY`);
    }

    return unique.slice(0, 10);
  } catch (err) {
    console.error('Venues aggregator error:', (err as Error).message);
    return [];
  }
}
