// =============================================
// TRIPGENIE — server/services/amadeus.js
// Recherche de vols via Amadeus API
// Sandbox gratuit : developers.amadeus.com
// =============================================

const BASE_URL = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
let accessToken = null;
let tokenExpiry  = 0;

// ---- Authentification OAuth2 ----
async function getToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Amadeus credentials missing in .env');
  }

  const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Amadeus auth error: ${data.error_description}`);

  accessToken = data.access_token;
  tokenExpiry  = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

// ---- Recherche vols ----
/**
 * @param {string} origin       - Code IATA ex: 'CDG'
 * @param {string} destination  - Code IATA ex: 'TYO'
 * @param {string} departureDate - 'YYYY-MM-DD'
 * @param {string} returnDate   - 'YYYY-MM-DD' (optionnel pour aller simple)
 * @param {number} adults
 * @returns {Array} vols formatés
 */
export async function searchFlights({ origin, destination, departureDate, returnDate, adults = 1 }) {
  try {
    // ---- [DÉBUT SECTION TEMPORAIRE MOCK] ----
    // Si tu n'as pas encore de clés Amadeus, on renvoie un vol fictif 
    // pour que l'interface reste jolie et fonctionnelle.
    // Supprime cette condition dès que tu as configuré tes clés dans .env !
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      console.log('💡 Amadeus: Clés absentes, utilisation d\'un vol démo.');
      return [{
        id: 'DEMO-123',
        price: 185,
        currency: 'EUR',
        price_per_person: 185,
        outbound: { from: origin || 'PAR', to: destination || 'DEST', departure_time: departureDate, arrival_time: departureDate, duration_min: 120, stops: 0, airline: 'GenieAir' },
        return: returnDate ? { from: destination || 'DEST', to: origin || 'PAR', departure_time: returnDate, arrival_time: returnDate, duration_min: 120, stops: 0, airline: 'GenieAir' } : null
      }];
    }
    // ---- [FIN SECTION TEMPORAIRE MOCK] ----

    const token = await getToken();

    const params = new URLSearchParams({
      originLocationCode:      origin,
      destinationLocationCode: destination,
      departureDate,
      adults: String(adults),
      max:    '10',
      currencyCode: 'EUR'
    });

    if (returnDate) params.append('returnDate', returnDate);

    const res = await fetch(
      `${BASE_URL}/v2/shopping/flight-offers?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(`Amadeus flights error: ${JSON.stringify(data.errors)}`);

    return formatFlights(data.data || []);

  } catch (err) {
    console.error('Amadeus searchFlights error:', err.message);
    return []; // Retourne tableau vide si API indisponible
  }
}

// ---- Recherche IATA code depuis ville ----
export async function cityToIata(cityName) {
  try {
    // ---- [DÉBUT SECTION TEMPORAIRE MOCK] ----
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      return cityName.slice(0, 3).toUpperCase(); // Mock code IATA (ex: Paris -> PAR)
    }
    // ---- [FIN SECTION TEMPORAIRE MOCK] ----

    const token = await getToken();
    const res = await fetch(
      `${BASE_URL}/v1/reference-data/locations?keyword=${encodeURIComponent(cityName)}&subType=AIRPORT,CITY&view=LIGHT&page[limit]=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    return data.data?.[0]?.iataCode || null;
  } catch (err) {
    if (err.message.includes('missing in .env')) {
       // Silencieux si clés absentes pour éviter de polluer les logs
       return null;
    }
    console.error('cityToIata error:', err.message);
    return null;
  }
}

// ---- Formatter les résultats ----
function formatFlights(raw) {
  return raw.map(offer => {
    const seg      = offer.itineraries[0].segments;
    const firstSeg = seg[0];
    const lastSeg  = seg[seg.length - 1];
    const retItinerary = offer.itineraries[1];

    return {
      id:             offer.id,
      price:          parseFloat(offer.price.total),
      currency:       offer.price.currency,
      price_per_person: parseFloat(offer.price.grandTotal) / (offer.travelerPricings?.length || 1),

      outbound: {
        from:           firstSeg.departure.iataCode,
        to:             lastSeg.arrival.iataCode,
        departure_time: firstSeg.departure.at,
        arrival_time:   lastSeg.arrival.at,
        duration_min:   parseDuration(offer.itineraries[0].duration),
        stops:          seg.length - 1,
        airline:        firstSeg.carrierCode
      },

      return: retItinerary ? (() => {
        const rSeg = retItinerary.segments;
        return {
          from:           rSeg[0].departure.iataCode,
          to:             rSeg[rSeg.length-1].arrival.iataCode,
          departure_time: rSeg[0].departure.at,
          arrival_time:   rSeg[rSeg.length-1].arrival.at,
          duration_min:   parseDuration(retItinerary.duration),
          stops:          rSeg.length - 1,
          airline:        rSeg[0].carrierCode
        };
      })() : null
    };
  });
}

function parseDuration(iso) {
  // PT2H30M → 150 minutes
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  return (parseInt(m?.[1] || 0) * 60) + parseInt(m?.[2] || 0);
}
