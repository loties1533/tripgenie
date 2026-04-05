// =============================================
// TRIPGENIE — server/services/predicthq.js
// Événements locaux via PredictHQ API
// Freemium : predicthq.com
// =============================================

const BASE_URL = 'https://api.predicthq.com/v1';

/**
 * Cherche des événements à une destination sur une période
 * @param {string} location   - ex: 'Tokyo, Japan'
 * @param {string} dateFrom   - 'YYYY-MM-DD'
 * @param {string} dateTo     - 'YYYY-MM-DD'
 * @param {string} mode       - pour filtrer les catégories
 * @returns {Array} événements formatés
 */
export async function searchEvents({ location, dateFrom, dateTo, mode = 'party' }) {
  try {
    const categories = getCategoriesByMode(mode);

    const params = new URLSearchParams({
      q:                location,
      'active.gte':     dateFrom,
      'active.lte':     dateTo,
      category:         categories.join(','),
      sort:             'rank',
      limit:            '20',
      'rank.gte':       '30'
    });

    const res = await fetch(`${BASE_URL}/events/?${params}`, {
      headers: {
        Authorization:  `Bearer ${process.env.PREDICTHQ_API_KEY}`,
        Accept:         'application/json'
      }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(`PredictHQ error: ${JSON.stringify(data)}`);

    return formatEvents(data.results || []);

  } catch (err) {
    console.error('PredictHQ searchEvents error:', err.message);
    return [];
  }
}

// ---- Catégories par mode ----
function getCategoriesByMode(mode) {
  const map = {
    party:   ['concerts', 'festivals', 'performing-arts', 'community'],
    student: ['concerts', 'festivals', 'community', 'expos'],
    luxury:  ['performing-arts', 'sports', 'expos', 'conferences'],
    group:   ['concerts', 'festivals', 'sports', 'community'],
    relax:   ['expos', 'community', 'performing-arts'],
    surprise: ['concerts', 'festivals', 'performing-arts', 'community', 'sports']
  };
  return map[mode] || map.party;
}

// ---- Formatter les événements ----
function formatEvents(raw) {
  return raw.map(ev => ({
    id:          ev.id,
    title:       ev.title,
    category:    ev.category,
    start:       ev.start,
    end:         ev.end,
    location:    ev.location,
    venue:       ev.entities?.find(e => e.type === 'venue')?.name || '',
    rank:        ev.rank,
    description: ev.description || '',
    url:         ev.url || ''
  }));
}
