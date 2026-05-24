/**
 * @fileoverview Playlist Spotify selon la destination et le mode de voyage.
 * Utilise le flux Client Credentials (pas de login utilisateur requis).
 * Token mis en cache 55 min (expire à 60 min côté Spotify).
 */

import type { TravelMode } from '../lib/types.js';

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  url: string;
  embed_url: string;
  image: string | null;
  tracks_total: number;
}

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
}

interface SpotifySearchResponse {
  playlists: {
    items: Array<{
      id: string;
      name: string;
      description: string;
      external_urls: { spotify: string };
      images: Array<{ url: string }>;
      tracks: { total: number };
    }>;
  };
}

// Cache du token (évite de le redemander à chaque génération)
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId     = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body:   'grant_type=client_credentials',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as SpotifyTokenResponse;
    cachedToken    = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000; // -5min de marge
    return cachedToken;
  } catch (err) {
    console.error('Spotify token error:', (err as Error).message);
    return null;
  }
}

/** Requête de recherche selon le mode de voyage */
function buildQuery(destination: string, mode: TravelMode): string {
  const queries: Record<string, string> = {
    party:    `${destination} party club summer hits`,
    luxury:   `${destination} luxury lounge chic`,
    relax:    `${destination} chill relax ambient`,
    student:  `${destination} indie road trip`,
    group:    `${destination} group anthems good vibes`,
    surprise: `${destination} découverte world music`,
  };
  return queries[mode] ?? `${destination} travel`;
}

export async function getSpotifyPlaylist(
  destination: string,
  mode: TravelMode
): Promise<SpotifyPlaylist | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const query = buildQuery(destination, mode);
    const url   = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=playlist&limit=5&market=FR`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn(`Spotify search ${res.status}`);
      return null;
    }

    const data  = (await res.json()) as SpotifySearchResponse;
    const items = data.playlists?.items?.filter(p => p && p.id);
    if (!items?.length) return null;

    // Préfère les playlists avec le plus de titres
    const best = items.reduce((a, b) => (b.tracks.total > a.tracks.total ? b : a));

    return {
      id:           best.id,
      name:         best.name,
      description:  best.description || `La playlist parfaite pour ${destination}`,
      url:          best.external_urls.spotify,
      embed_url:    `https://open.spotify.com/embed/playlist/${best.id}?utm_source=generator&theme=0`,
      image:        best.images?.[0]?.url ?? null,
      tracks_total: best.tracks.total,
    };
  } catch (err) {
    console.error('Spotify search error:', (err as Error).message);
    return null;
  }
}
