/**
 * @fileoverview Photo HD de la destination.
 * Priorité : Unsplash API (si clé dispo) → Pexels API (si clé dispo) → Curated static fallback.
 * Les URLs Unsplash statiques ne nécessitent pas de clé API.
 */

const DEFAULT_PHOTO =
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

/** Map de photos de haute qualité pour les destinations populaires (pas besoin de clé API) */
const CURATED_PHOTOS: Record<string, string> = {
  ibiza:          'https://images.unsplash.com/photo-1559494007-9f5847c49d94?auto=format&fit=crop&w=1200&q=80',
  mykonos:        'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  paris:          'https://images.unsplash.com/photo-1499856844078-53e0f0c4ee5c?auto=format&fit=crop&w=1200&q=80',
  barcelone:      'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
  barcelona:      'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
  london:         'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
  londres:        'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
  rome:           'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
  amsterdam:      'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80',
  berlin:         'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80',
  dubai:          'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
  bali:           'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
  tokyo:          'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80',
  new york:       'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?auto=format&fit=crop&w=1200&q=80',
  'new-york':     'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?auto=format&fit=crop&w=1200&q=80',
  maldives:       'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
  amalfi:         'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
  santorini:      'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1200&q=80',
  prague:         'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1200&q=80',
  budapest:       'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=1200&q=80',
  lisbonne:       'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
  lisbon:         'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1200&q=80',
  riga:           'https://images.unsplash.com/photo-1562329265-95a6d7a83440?auto=format&fit=crop&w=1200&q=80',
  tallinn:        'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?auto=format&fit=crop&w=1200&q=80',
  vienne:         'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=80',
  vienna:         'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=80',
  monaco:         'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
  nice:           'https://images.unsplash.com/photo-1490376625049-e86af72bf27d?auto=format&fit=crop&w=1200&q=80',
  marrakech:      'https://images.unsplash.com/photo-1558618047-f4e90e8e6e44?auto=format&fit=crop&w=1200&q=80',
  cancun:         'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&w=1200&q=80',
  miami:          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
};

interface UnsplashSearchResponse {
  results: Array<{ urls: { regular: string } }>;
}

interface PexelsResponse {
  photos: Array<{ src: { large2x: string } }>;
}

export async function getDestinationPhoto(query: string): Promise<string> {
  const key        = process.env.UNSPLASH_ACCESS_KEY?.trim();
  const pexelsKey  = process.env.PEXELS_API_KEY?.trim();
  const lowerQuery = query.toLowerCase().trim();

  // 1️⃣ — Unsplash API (si la clé est valide)
  if (key) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' city travel')}&per_page=1&orientation=landscape`;
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = (await res.json()) as UnsplashSearchResponse;
        const photo = data.results?.[0]?.urls?.regular;
        if (photo) {
          console.log(`📸 Unsplash OK: ${query}`);
          return photo;
        }
      } else {
        console.warn(`Unsplash ${res.status} for "${query}" — passage au fallback`);
      }
    } catch (err) {
      console.warn(`Unsplash timeout for "${query}":`, (err as Error).message);
    }
  }

  // 2️⃣ — Pexels API (si la clé est disponible)
  if (pexelsKey) {
    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + ' travel city')}&per_page=1&orientation=landscape`;
      const res = await fetch(url, {
        headers: { Authorization: pexelsKey },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = (await res.json()) as PexelsResponse;
        const photo = data.photos?.[0]?.src?.large2x;
        if (photo) {
          console.log(`📸 Pexels OK: ${query}`);
          return photo;
        }
      }
    } catch (err) {
      console.warn(`Pexels error for "${query}":`, (err as Error).message);
    }
  }

  // 3️⃣ — Curated static map (pas de clé nécessaire)
  for (const [key, url] of Object.entries(CURATED_PHOTOS)) {
    if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
      console.log(`📸 Curated photo: ${key} → ${query}`);
      return url;
    }
  }

  // 4️⃣ — Fallback universel
  return DEFAULT_PHOTO;
}
