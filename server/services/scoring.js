// =============================================
// TRIPGENIE — server/services/scoring.js
// Algorithme de scoring multi-critères par mode
// =============================================

// ---- Poids par mode ----
const MODE_WEIGHTS = {
  party: {
    events:      0.40,   // Vie nocturne, festivals, concerts
    prix:        0.30,   // Budget maîtrisé
    hotel:       0.20,   // Proximité centre-ville
    vol:         0.10    // Durée pas critique
  },
  student: {
    prix:        0.50,   // Budget serré = priorité max
    activities_free: 0.25, // Musées gratuits, parcs, street food
    hotel:       0.15,   // Hostel ok
    events:      0.10
  },
  luxury: {
    hotel:       0.40,   // 5★, spa, suite
    activities:  0.30,   // Expériences premium
    vol:         0.20,   // Business, direct
    prix:        0.10    // Prix non limitant
  },
  group: {
    hotel:       0.35,   // Capacité (appartement, villa, chambres multiples)
    activities:  0.30,   // Activités collectives
    prix:        0.20,   // Prix par personne
    vol:         0.15    // Logistique vols groupe
  },
  relax: {
    calme:       0.35,   // Destination calme, hors saison
    hotel:       0.30,   // Spa, nature, vue
    activities:  0.25,   // Randos, yoga, bien-être
    prix:        0.10
  },
  surprise: {
    global:      0.60,   // Meilleur score global
    originalite: 0.40    // Destinations moins évidentes
  }
};

// ---- Normalise une valeur entre 0 et 1 ----
function normalise(value, min, max) {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// ---- Score un vol ----
function scoreVol(vol, mode) {
  const prixScore   = 1 - normalise(vol.price, 50, 2000);  // moins cher = mieux
  const dureeScore  = 1 - normalise(vol.duration_min, 60, 720);
  const directScore = vol.stops === 0 ? 1 : vol.stops === 1 ? 0.6 : 0.3;

  if (mode === 'luxury') {
    return directScore * 0.5 + prixScore * 0.1 + dureeScore * 0.4;
  }
  if (mode === 'student') {
    return prixScore * 0.85 + directScore * 0.15;
  }
  return prixScore * 0.5 + directScore * 0.3 + dureeScore * 0.2;
}

// ---- Score un hôtel ----
function scoreHotel(hotel, mode, travelers) {
  const starsScore    = normalise(hotel.stars || 3, 1, 5);
  const prixScore     = 1 - normalise(hotel.price_per_night, 20, 800);
  const capacityScore = hotel.max_guests >= travelers ? 1 : 0.3;
  const ratingScore   = normalise(hotel.rating || 7, 5, 10);

  if (mode === 'luxury') {
    return starsScore * 0.5 + ratingScore * 0.35 + prixScore * 0.15;
  }
  if (mode === 'student') {
    return prixScore * 0.6 + ratingScore * 0.3 + starsScore * 0.1;
  }
  if (mode === 'group') {
    return capacityScore * 0.5 + prixScore * 0.3 + ratingScore * 0.2;
  }
  return starsScore * 0.35 + ratingScore * 0.4 + prixScore * 0.25;
}

// ---- Score les événements ----
function scoreEvents(events, mode) {
  if (!events || events.length === 0) return 0;

  const countScore   = normalise(events.length, 0, 20);
  const partyEvents  = events.filter(e =>
    ['concert', 'festival', 'nightlife', 'club', 'party'].some(k =>
      e.category?.toLowerCase().includes(k) ||
      e.title?.toLowerCase().includes(k)
    )
  ).length;

  const partyScore   = normalise(partyEvents, 0, 10);

  if (mode === 'party')   return partyScore * 0.7 + countScore * 0.3;
  if (mode === 'student') return countScore * 0.6 + partyScore * 0.4;
  if (mode === 'relax')   return 1 - partyScore; // moins d'événements = mieux
  return countScore;
}

// ---- Score activités ----
function scoreActivities(activities, mode) {
  if (!activities || activities.length === 0) return 0;

  const total       = activities.length;
  const freeCount   = activities.filter(a => a.price === 0 || a.price_range === 'free').length;
  const luxeCount   = activities.filter(a => a.price > 100).length;
  const calmCount   = activities.filter(a =>
    ['spa', 'yoga', 'hiking', 'beach', 'nature'].some(k =>
      a.category?.toLowerCase().includes(k)
    )
  ).length;

  if (mode === 'student') return normalise(freeCount, 0, total);
  if (mode === 'luxury')  return normalise(luxeCount, 0, total) * 0.6 + normalise(total, 0, 20) * 0.4;
  if (mode === 'relax')   return normalise(calmCount, 0, total) * 0.7 + normalise(total, 0, 20) * 0.3;
  return normalise(total, 0, 20);
}

// ---- Score calme de destination ----
function scoreCalme(destination, events) {
  const eventCount = events?.length || 0;
  return 1 - normalise(eventCount, 0, 30); // moins d'events = destination plus calme
}

// ---- Score originalité (mode surprise) ----
const COMMON_DESTINATIONS = ['paris', 'london', 'rome', 'barcelona', 'amsterdam', 'new york', 'tokyo'];
function scoreOriginalite(destination) {
  const dest = destination.toLowerCase();
  return COMMON_DESTINATIONS.some(d => dest.includes(d)) ? 0.3 : 0.9;
}

// ---- FONCTION PRINCIPALE ----
/**
 * Calcule le score d'un pack complet
 * @param {Object} pack - { vol, hotel, events, activities, totalPrice }
 * @param {string} mode - 'party' | 'student' | 'luxury' | 'group' | 'relax' | 'surprise'
 * @param {number} travelers - nombre de voyageurs
 * @param {string} destination - nom de la destination
 * @returns {number} score entre 0 et 1
 */
export function scorepack(pack, mode, travelers = 2, destination = '') {
  const { vol, hotel, events, activities, totalPrice } = pack;
  const weights = MODE_WEIGHTS[mode] || MODE_WEIGHTS.party;

  const scores = {
    vol:              scoreVol(vol, mode),
    hotel:            scoreHotel(hotel, mode, travelers),
    events:           scoreEvents(events, mode),
    activities:       scoreActivities(activities, mode),
    prix:             1 - normalise(totalPrice, 200, 10000),
    activities_free:  scoreActivities(activities, 'student'),
    calme:            scoreCalme(destination, events),
    global:           0,
    originalite:      scoreOriginalite(destination)
  };

  // Score global = moyenne pondérée de tous les scores
  scores.global = Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key] || 0) * weight;
  }, 0);

  return {
    total:   Math.round(scores.global * 100) / 100,
    details: scores
  };
}

/**
 * Classe une liste de packs et retourne le top 3
 * @param {Array} packs - liste de packs
 * @param {string} mode
 * @param {number} travelers
 * @param {string} destination
 * @returns {Array} top 3 packs triés par score décroissant
 */
export function rankPacks(packs, mode, travelers, destination) {
  return packs
    .map((pack, idx) => ({
      ...pack,
      rank:  idx + 1,
      score: scorepack(pack, mode, travelers, destination)
    }))
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 3)
    .map((pack, idx) => ({ ...pack, rank: idx + 1 }));
}

export { MODE_WEIGHTS };
