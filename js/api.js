// =============================================
// TRIPGENIE — client/js/api.js
// Toutes les requêtes HTTP vers le back Express
// La clé Claude n'est PLUS ici — elle est côté serveur
// =============================================

const BASE_URL = window.TRIPGENIE_API_URL || 'http://localhost:3000/api';

// ---- Helpers ----
function getToken() {
  return localStorage.getItem('tg_token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(),
    ...options
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }

  return data;
}

// =============================================
// AUTH
// =============================================

export async function signup(email, password, name) {
  const data = await request('/auth/signup', {
    method: 'POST',
    body:   JSON.stringify({ email, password, name })
  });
  localStorage.setItem('tg_token', data.token);
  localStorage.setItem('tg_user',  JSON.stringify(data.user));
  return data;
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body:   JSON.stringify({ email, password })
  });
  localStorage.setItem('tg_token', data.token);
  localStorage.setItem('tg_user',  JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('tg_token');
  localStorage.removeItem('tg_user');
  window.location.href = '/';
}

export function getCurrentUser() {
  const raw = localStorage.getItem('tg_user');
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn() {
  return !!getToken();
}

export async function getMe() {
  return request('/auth/me');
}

// =============================================
// AI — Génération de voyages
// =============================================

// Analyser une requête en langage naturel
export async function analyzeInput(input) {
  return request('/ai/analyze', {
    method: 'POST',
    body:   JSON.stringify({ input })
  });
}

// Suggérer des destinations
export async function getDestinations(params) {
  return request('/ai/destinations', {
    method: 'POST',
    body:   JSON.stringify(params)
  });
}

// Générer un pack complet
export async function generatePack(params) {
  return request('/ai/generate', {
    method: 'POST',
    body:   JSON.stringify(params)
  });
}

// Chat pour modifier l'itinéraire
export async function chatModify(message, currentPack, mode, tripId) {
  return request('/ai/chat', {
    method: 'POST',
    body:   JSON.stringify({
      message,
      current_pack: currentPack,
      mode,
      trip_id: tripId
    })
  });
}

// =============================================
// TRIPS — Mes voyages
// =============================================

export async function getTrips(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/trips${params ? '?' + params : ''}`);
}

export async function getTrip(id) {
  return request(`/trips/${id}`);
}

export async function getPublicTrip(id) {
  return request(`/trips/share/${id}`);
}

export async function saveTrip(tripData) {
  return request('/trips', {
    method: 'POST',
    body:   JSON.stringify(tripData)
  });
}

export async function updateTrip(id, updates) {
  return request(`/trips/${id}`, {
    method: 'PUT',
    body:   JSON.stringify(updates)
  });
}

export async function deleteTrip(id) {
  return request(`/trips/${id}`, { method: 'DELETE' });
}
