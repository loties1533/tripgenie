import 'dotenv/config';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function searchWeb(query) {
  if (!TAVILY_API_KEY) {
    console.warn('⚠️ Recherche Web ignorée (Pas de clé Tavily).');
    return '';
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: "basic",
        include_answer: false,
        include_images: false,
        include_raw_content: false,
        max_results: 3,
        include_domains: [],
        exclude_domains: []
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur Tavily: ${response.status}`);
    }

    const data = await response.json();
    
    // Concaténer le contenu des résultats de recherche sous forme de "Contexte Web"
    let contextStr = "==== CONTEXTE WEB RECENT ====\n";
    if (data.results && data.results.length > 0) {
      data.results.forEach((r, idx) => {
        contextStr += `[Source ${idx+1}: ${r.title}] : ${r.content}\n`;
      });
    } else {
      contextStr += "Pas de résultats récents.\n";
    }
    contextStr += "=============================\n";
    
    return contextStr;
  } catch (err) {
    console.error('❌ Echec du Web Search :', err.message);
    return ''; // On ne crashe pas l'application si internet bug
  }
}
