/**
 * @fileoverview Photo HD de la destination.
 * Priorité : Unsplash API (si clé dispo) → fallback URL statique par destination.
 */

import { callAI } from './claude/index.js';
import { searchWeb } from './tools/webSearch.js';

const DEFAULT_PHOTO =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

interface UnsplashSearchResponse {
  results: Array<{
    urls: {
      regular: string;
    };
  }>;
}

export async function getDestinationPhoto(query: string): Promise<string> {
  const key = process.env.UNSPLASH_ACCESS_KEY;

  if (key) {
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' city travel')}&per_page=1&orientation=landscape`;
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) {
        console.warn(`Unsplash ${res.status} for "${query}"`);
      } else {
        const data = (await res.json()) as UnsplashSearchResponse;
        const photo = data.results?.[0]?.urls?.regular;
        if (photo) {
          console.log(`📸 Unsplash OK: ${query} → ${photo.slice(0, 60)}...`);
          return photo;
        }
        console.warn(`Unsplash: aucun résultat pour "${query}"`);
      }
    } catch (err) {
      console.warn(`Unsplash timeout/error for "${query}":`, (err as Error).message);
    }
  }

  // Fallback : Tavily cherche une URL Unsplash
  try {
    const webContext = await searchWeb(
      `high quality luxury travel photography ${query} unsplash image url`
    );
    if (!webContext) return DEFAULT_PHOTO;

    const resRaw = await callAI(
      `Trouve une URL d'image Unsplash (commençant par https://images.unsplash.com/) dans ce texte pour ${query}.
      Texte : ${webContext}
      Retourne UNIQUEMENT l'URL brute. Si aucune n'est trouvée, retourne : ${DEFAULT_PHOTO}`,
      undefined,
      'destinations'
    );
    const photoUrl = resRaw.trim();
    return photoUrl.startsWith('http') ? photoUrl : DEFAULT_PHOTO;
  } catch {
    return DEFAULT_PHOTO;
  }
}
