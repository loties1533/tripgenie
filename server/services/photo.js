import axios from 'axios';
import { searchWeb } from './tools/webSearch.js';
import { callAI } from './claude.js';

/**
 * Récupère une photo HD de la destination via Unsplash API (Direct)
 * Si la clé est manquante, utilise Tavily comme backup
 */
export async function getDestinationPhoto(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  
  if (key) {
    try {
      console.log(`📸 Recherche photo Unsplash API pour : ${query}`);
      const res = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: { query: `${query} luxury travel`, per_page: 1, orientation: 'landscape' },
        headers: { Authorization: `Client-ID ${key}` }
      });
      const photo = res.data.results[0]?.urls?.regular;
      if (photo) return photo;
    } catch (err) {
      console.error('Unsplash API error, falling back to Tavily:', err.message);
    }
  }

  // BACKUP : Tavily
  try {
    const webQuery = `high quality luxury travel photography ${query} unsplash image url`;
    const webContext = await searchWeb(webQuery);
    if (!webContext) return `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80`;

    const prompt = `
      Trouve une URL d'image Unsplash (commençant par https://images.unsplash.com/) dans ce texte pour ${query}.
      Texte : ${webContext}
      Retourne UNIQUEMENT l'URL brute. Si aucune n'est trouvée, retourne l'URL par défaut.
      Défaut : https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80
    `;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    const url = resRaw.trim();
    return url.startsWith('http') ? url : `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80`;
  } catch (err) {
    return `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80`;
  }
}
