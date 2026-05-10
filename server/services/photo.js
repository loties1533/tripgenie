import { searchWeb } from './tools/webSearch.js';
import { callAI } from './claude.js';

/**
 * Récupère une photo HD de la destination via Tavily + Extraction IA
 * Plus besoin de clé Unsplash !
 */
export async function getDestinationPhoto(query) {
  try {
    const webQuery = `high quality luxury travel photography ${query} unsplash image url`;
    const webContext = await searchWeb(webQuery);
    if (!webContext) return `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80`;

    const prompt = `
      Voici des résultats pour une recherche d'image de ${query} :
      ${webContext}

      Trouve une URL d'image Unsplash (commençant par https://images.unsplash.com/) qui correspond bien à la destination.
      Retourne UNIQUEMENT l'URL brute. Si aucune n'est trouvée, retourne l'URL par défaut ci-dessous.
      Défaut : https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80
    `;

    const resRaw = await callAI(prompt, undefined, 'destinations');
    const url = resRaw.trim();
    return url.startsWith('http') ? url : `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80`;
  } catch (err) {
    return `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80`;
  }
}
