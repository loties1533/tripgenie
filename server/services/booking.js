// =============================================
// TRIPGENIE — server/services/booking.js
// Recherche d'hôtels RÉELS via RapidAPI Booking.com
// Compte gratuit sur rapidapi.com/apidojo/api/booking
// =============================================

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'booking-com.p.rapidapi.com';
const BASE_URL      = 'https://booking-com.p.rapidapi.com/v1';
const TIMEOUT_MS    = 10_000;

// ---- Cache destination_id en mémoire ----
// Évite de re-chercher l'ID de ville à chaque requête
const destIdCache = new Map();

// ---- Fetch avec timeout ----
function fetchWithTimeout(url, options, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}

// ---- Headers RapidAPI communs ----
function rapidHeaders() {
  return {
    'X-RapidAPI-Key':  RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST,
    'Accept':          'application/json'
  };
}

// =============================================
// ÉTAPE 1 — Résoudre l'ID de destination Booking
// =============================================

/**
 * Convertit un nom de ville en dest_id Booking.com
 * @param {string} cityName  ex: "Barcelona"
 * @returns {string|null}    ex: "-372490"
 */
async function getCityDestId(cityName) {
  const key = cityName.toLowerCase().trim();
  if (destIdCache.has(key)) return destIdCache.get(key);

  if (!RAPIDAPI_KEY) return null;

  try {
    const url = `${BASE_URL}/hotels/locations?name=${encodeURIComponent(cityName)}&locale=fr-fr`;
    const res  = await fetchWithTimeout(url, { headers: rapidHeaders() });
    const data = await res.json();

    if (!res.ok) throw new Error(`Booking locations error: ${res.status}`);

    // Prendre le premier résultat de type "city"
    const city = data.find(r => r.dest_type === 'city') || data[0];
    if (!city) return null;

    const destId = String(city.dest_id);
    destIdCache.set(key, destId);
    return destId;

  } catch (err) {
    console.warn(`[Booking] getCityDestId(${cityName}) failed:`, err.message);
    return null;
  }
}

// =============================================
// ÉTAPE 2 — Rechercher les hôtels
// =============================================

/**
 * Cherche des hôtels réels pour une destination et des dates
 *
 * @param {Object} params
 * @param {string} params.destination   - Nom de la ville ex: "Barcelona"
 * @param {string} params.checkin       - "YYYY-MM-DD"
 * @param {string} params.checkout      - "YYYY-MM-DD"
 * @param {number} params.adults        - Nombre d'adultes
 * @param {string} params.mode          - party|luxury|student|relax|group|surprise
 * @param {number} params.budget        - Budget total du voyage en €
 * @returns {Array} hôtels formatés avec nom réel, note, prix, lien
 */
export async function searchHotels({ destination, checkin, checkout, adults = 2, mode = 'party', budget = 1000 }) {
  // Sans clé → fallback immédiat
  if (!RAPIDAPI_KEY) {
    console.log('💡 Booking: Clé RapidAPI absente, hôtels fictifs utilisés.');
    return [];
  }

  try {
    const destId = await getCityDestId(destination);
    if (!destId) {
      console.warn(`[Booking] Destination introuvable: ${destination}`);
      return [];
    }

    // Calcul des nuits
    const nights = checkin && checkout
      ? Math.max(Math.round((new Date(checkout) - new Date(checkin)) / 86400000), 1)
      : 3;

    // Budget hôtel par nuit (selon le mode)
    const HEBERG_RATIO = { party: 0.25, student: 0.30, luxury: 0.45, group: 0.35, relax: 0.40, surprise: 0.32 };
    const budgetHotel  = Math.round(budget * (HEBERG_RATIO[mode] || 0.30));
    const maxPriceNight = Math.round(budgetHotel / nights / (adults || 1) * 1.3); // +30% marge

    // Stars minimum selon le mode
    const minStars = mode === 'luxury' ? 4 : mode === 'student' ? 1 : 3;

    const params = new URLSearchParams({
      dest_id:          destId,
      dest_type:        'city',
      checkin_date:     checkin  || getTodayStr(1),
      checkout_date:    checkout || getTodayStr(4),
      adults_number:    String(adults || 2),
      room_number:      '1',
      order_by:         mode === 'luxury' ? 'review_score' : 'popularity',
      filter_by_currency: 'EUR',
      locale:           'fr-fr',
      units:            'metric',
      page_number:      '0',
      include_adjacency: 'true'
    });

    const url = `${BASE_URL}/hotels/search?${params}`;
    const res  = await fetchWithTimeout(url, { headers: rapidHeaders() });
    const data = await res.json();

    if (!res.ok) throw new Error(`Booking search error: ${res.status} ${JSON.stringify(data)}`);

    const results = data.result || [];

    // Filtrer et formater les meilleurs hôtels
    const hotels = results
      .filter(h => {
        const stars = parseInt(h.class) || 0;
        const price = h.min_total_price || h.price_breakdown?.gross_price || 9999;
        return stars >= minStars && price <= maxPriceNight * nights * (adults || 1);
      })
      .slice(0, 5)
      .map(h => formatHotel(h, nights));

    console.log(`✅ [Booking] ${hotels.length} hôtels réels trouvés pour ${destination}`);
    return hotels;

  } catch (err) {
    console.error('[Booking] searchHotels error:', err.message);
    return []; // Fail gracieux — l'IA prendra le relais
  }
}

// =============================================
// ÉTAPE 3 — Formatter les résultats
// =============================================

function formatHotel(raw, nights = 1) {
  const priceTotal    = raw.min_total_price || raw.price_breakdown?.gross_price || 0;
  const pricePerNight = nights > 0 ? Math.round(priceTotal / nights) : priceTotal;
  const stars         = parseInt(raw.class) || 3;
  const score         = raw.review_score || 0;
  const scoreWord     = raw.review_score_word || '';

  return {
    // Données réelles Booking.com
    id:               raw.hotel_id,
    name:             raw.hotel_name,
    stars,
    rating:           score,
    rating_label:     scoreWord,
    review_count:     raw.review_nr || 0,
    address:          raw.address || '',
    city:             raw.city || '',
    neighborhood:     raw.district || raw.city_in_trans || '',
    latitude:         raw.latitude  || null,
    longitude:        raw.longitude || null,
    photo_url:        raw.main_photo_url || null,
    booking_url:      raw.url || null,

    // Données prix
    price_per_night:  `${pricePerNight}€`,
    price_total:      `${Math.round(priceTotal)}€`,
    currency:         'EUR',

    // Highlights extraits automatiquement
    highlights:       buildHighlights(raw, stars, score),
    emoji:            stars >= 5 ? '🏨' : stars >= 4 ? '🏩' : '🏠',

    // Flag pour le front — c'est une vraie donnée, pas une hallucination IA
    is_real: true
  };
}

function buildHighlights(raw, stars, score) {
  const parts = [];

  if (score >= 9)        parts.push(`Note exceptionnelle ${score}/10`);
  else if (score >= 8)   parts.push(`Très bien noté ${score}/10`);
  else if (score >= 7)   parts.push(`Bien noté ${score}/10`);

  if (raw.is_free_cancellable)   parts.push('Annulation gratuite');
  if (raw.is_no_prepayment_block) parts.push('Paiement à l\'arrivée');
  if (raw.has_swimming_pool)     parts.push('Piscine');
  if (raw.hotel_facilities_filtered?.some(f => f.name === 'Spa')) parts.push('Spa');
  if (raw.district)              parts.push(`Quartier ${raw.district}`);

  return parts.slice(0, 3).join(' · ') || `${stars}★ · Bien situé`;
}

// =============================================
// UTILITAIRES
// =============================================

function getTodayStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Cherche des restaurants réels autour d'une destination
 * Utilise le endpoint Booking Attractions en fallback
 */
export async function searchRestaurants({ destination, checkin }) {
  if (!RAPIDAPI_KEY) return [];

  try {
    const destId = await getCityDestId(destination);
    if (!destId) return [];

    const params = new URLSearchParams({
      dest_id:   destId,
      dest_type: 'city',
      locale:    'fr-fr',
      checkin:   checkin || getTodayStr(1),
      sort_by:   'review_score',
      page:      '0',
      rows:      '10'
    });

    const url = `${BASE_URL}/attractions/search?${params}`;
    const res  = await fetchWithTimeout(url, { headers: rapidHeaders() });
    const data = await res.json();

    if (!res.ok) return [];

    return (data.results || []).slice(0, 3).map(r => ({
      id:          r.id,
      name:        r.name,
      category:    r.shortDescription || 'Restaurant',
      rating:      r.reviewsStats?.combinedNumericStats?.average || 0,
      review_count: r.reviewsStats?.allReviewsCount || 0,
      price_range: r.representativePrice?.chargeAmount
        ? `${Math.round(r.representativePrice.chargeAmount)}€`
        : 'Prix variable',
      photo_url:   r.primaryPhoto?.small || null,
      booking_url: r.slug  ? `https://www.booking.com/attractions/${r.slug}.html` : null,
      is_real:     true
    }));

  } catch (err) {
    console.warn('[Booking] searchRestaurants error:', err.message);
    return [];
  }
}
