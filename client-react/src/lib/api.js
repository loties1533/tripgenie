// =============================================
// TRIPGENIE — src/lib/api.js
// Toutes les requêtes HTTP vers l'API Express
// =============================================

const BASE = '/api'

function getToken() {
  try {
    const raw = localStorage.getItem('tg_v2_auth')
    return raw ? JSON.parse(raw)?.state?.token : null
  } catch { return null }
}

async function request(path, opts = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...opts
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
  return data
}

// Auth
export const login    = (email, password) => request('/auth/login',  { method: 'POST', body: JSON.stringify({ email, password }) })
export const signup   = (email, password, name) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) })
export const getMe    = () => request('/auth/me')

// AI
export const chatOnboarding  = (userMessage, currentData) =>
  request('/ai/onboarding', { method: 'POST', body: JSON.stringify({ userMessage, currentData }) })

export const getDestinations = (params) =>
  request('/ai/destinations', { method: 'POST', body: JSON.stringify(params) })

export const generatePack    = (params) =>
  request('/ai/generate', { method: 'POST', body: JSON.stringify(params) })

export const chatModify      = (message, currentPack, mode, tripId) =>
  request('/ai/chat', { method: 'POST', body: JSON.stringify({ message, current_pack: currentPack, mode, trip_id: tripId }) })

// Trips
export const getTrips     = (filters = {}) => request(`/trips?${new URLSearchParams(filters)}`)
export const getTrip      = (id) => request(`/trips/${id}`)
export const getPublicTrip = (id) => request(`/trips/share/${id}`)
export const deleteTrip   = (id) => request(`/trips/${id}`, { method: 'DELETE' })
