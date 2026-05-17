// =============================================
// TRIPGENIE — src/lib/api.js
// Toutes les requêtes HTTP vers l'API Express
// =============================================

// En développement : Vite proxifie /api → localhost:3000
// En production : VITE_API_URL pointe vers l'API distante
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // cookie httpOnly envoyé automatiquement
    ...opts
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
  return data
}

// Logout — appelle le serveur pour effacer le cookie
export const logout = () => request('/auth/logout', { method: 'POST' })

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

// Photos — proxy backend (clé Unsplash jamais exposée côté client)
export const getCityPhoto = (city) => request(`/photos/${encodeURIComponent(city)}`)

// Votes
export const saveVote     = (trip_id, item_id, vote_type, voter_name) => 
  request('/votes', { method: 'POST', body: JSON.stringify({ trip_id, item_id, vote_type, voter_name }) })

export const getVotes     = (trip_id) => request(`/votes/${trip_id}`)
