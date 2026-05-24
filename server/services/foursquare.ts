/**
 * @fileoverview Recherche de vrais lieux via Foursquare Places API v3.
 *
 * Retourne des noms de lieux réels (clubs, restaurants, plages, spas...)
 * selon la destination et le mode de voyage.
 * Ces données sont injectées dans le prompt LLM pour remplacer les noms génériques.
 */

import type { TravelMode } from '../lib/types.js';

export interface FoursquareVenue {
  name: string;
  category: string;
  address: string;
  fsq_id: string;
}

interface FoursquareCategory {
  name: string;
}

interface FoursquareLocation {
  formatted_address?: string;
  locality?: string;
}

interface FoursquarePlaceResult {
  fsq_id: string;
  name: string;
  categories?: FoursquareCategory[];
  location?: FoursquareLocation;
}

interface FoursquareSearchResponse {
  results?: FoursquarePlaceResult[];
}

// Requêtes de recherche par mode de voyage
const MODE_QUERIES: Record<TravelMode, string[]> = {
  party:    ['nightclub', 'rooftop bar', 'beach club'],
  luxury:   ['fine dining restaurant', 'luxury spa', '5 star hotel bar'],
  relax:    ['spa wellness', 'beach bar', 'yoga retreat'],
  student:  ['bar cocktails', 'street food market', 'hostel bar'],
  group:    ['restaurant group dining', 'nightclub', 'activity center'],
  surprise: ['local restaurant', 'cultural venue', 'hidden bar'],
};

async function searchVenues(query: string, near: string, limit = 4): Promise<FoursquareVenue[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY?.trim();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    query,
    near,
    limit:  String(limit),
    fields: 'fsq_id,name,categories,location',
  });

  const url = `https://api.foursquare.com/v3/places/search?${params}`;

  const res = await fetch(url, {
    headers: {
      Authorization: apiKey,
      Accept:        'application/json',
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!res.ok) {
    console.warn(`Foursquare API ${res.status} for "${query}" near ${near}`);
    return [];
  }

  const data = (await res.json()) as FoursquareSearchResponse;
  const results = data.results ?? [];

  return results.map(r => ({
    fsq_id:   r.fsq_id,
    name:     r.name,
    category: r.categories?.[0]?.name ?? query,
    address:  r.location?.formatted_address ?? r.location?.locality ?? near,
  }));
}

/**
 * Recherche des vrais lieux populaires pour une destination et un mode de voyage.
 * Effectue 2-3 recherches en parallèle selon le mode.
 *
 * @param destination  Ville/pays de destination
 * @param mode         Mode de voyage (party, luxury, relax, student, group, surprise)
 * @returns            Liste de vrais lieux avec nom, catégorie, adresse
 */
export async function getFoursquareVenues(
  destination: string,
  mode: TravelMode
): Promise<FoursquareVenue[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY?.trim();
  if (!apiKey) {
    console.warn('Foursquare: FOURSQUARE_API_KEY manquant');
    return [];
  }

  const queries = MODE_QUERIES[mode] ?? MODE_QUERIES.surprise;
  // On prend les 2 premières requêtes pour ne pas surcharger
  const top2 = queries.slice(0, 2);

  try {
    const results = await Promise.allSettled(
      top2.map(q => searchVenues(q, destination, 3))
    );

    const venues: FoursquareVenue[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        venues.push(...r.value);
      }
    }

    // Déduplique par nom
    const seen = new Set<string>();
    const unique = venues.filter(v => {
      const key = v.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (unique.length) {
      console.error(`🗺️  Foursquare: ${unique.length} lieux réels pour ${destination} [${mode}]`);
    }

    return unique.slice(0, 8); // Max 8 lieux injectés dans le prompt
  } catch (err) {
    console.error('Foursquare error:', (err as Error).message);
    return [];
  }
}
