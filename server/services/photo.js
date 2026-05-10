import axios from 'axios';

/**
 * Récupère une photo HD de la destination via Unsplash
 */
export async function getDestinationPhoto(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  
  // Si pas de clé, on utilise l'URL source publique (limité mais fonctionne)
  if (!key) {
    return `https://source.unsplash.com/featured/?${encodeURIComponent(query)},luxury`;
  }

  try {
    const res = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: { query: `${query} luxury`, per_page: 1, orientation: 'landscape' },
      headers: { Authorization: `Client-ID ${key}` }
    });
    return res.data.results[0]?.urls?.regular || null;
  } catch (err) {
    console.error('Unsplash API error:', err.message);
    return null;
  }
}
