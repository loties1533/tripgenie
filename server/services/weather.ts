/**
 * @fileoverview Météo réelle via Open-Meteo (gratuit, sans clé API).
 * Géocodage via Nominatim (OpenStreetMap), météo via Open-Meteo.
 * Remplace l'ancienne approche Tavily qui causait des timeouts fréquents.
 */

export interface WeatherData {
  temp: string;
  cond: string;
  humidity: number;
  wind: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

/** Traduit un WMO weather code en libellé français. */
function wmoToLabel(code: number): string {
  if (code === 0)                return 'Ciel dégagé';
  if (code <= 2)                 return 'Partiellement nuageux';
  if (code === 3)                return 'Couvert';
  if (code <= 49)                return 'Brouillard';
  if (code <= 59)                return 'Bruine';
  if (code <= 69)                return 'Pluie';
  if (code <= 79)                return 'Neige';
  if (code <= 84)                return 'Averses';
  if (code <= 99)                return 'Orage';
  return 'Variable';
}

export async function getRealWeather(city: string): Promise<WeatherData | null> {
  try {
    // Étape 1 — Géocodage de la ville
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'TripGenie/1.0 (alexislaubert@yahoo.fr)' },
      signal: AbortSignal.timeout(5000),
    });
    const geoData = (await geoRes.json()) as NominatimResult[];
    if (!geoData?.length) return null;

    const { lat, lon } = geoData[0];

    // Étape 2 — Récupération météo Open-Meteo
    const meteoUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&wind_speed_unit=kmh&timezone=auto`;

    const meteoRes = await fetch(meteoUrl, { signal: AbortSignal.timeout(6000) });
    if (!meteoRes.ok) return null;

    const meteo = (await meteoRes.json()) as OpenMeteoResponse;
    const c = meteo.current;

    return {
      temp:     `${Math.round(c.temperature_2m)}°C`,
      cond:     wmoToLabel(c.weather_code),
      humidity: Math.round(c.relative_humidity_2m),
      wind:     `${Math.round(c.wind_speed_10m)} km/h`,
    };
  } catch (err) {
    console.error('Open-Meteo weather error:', (err as Error).message);
    return null;
  }
}
