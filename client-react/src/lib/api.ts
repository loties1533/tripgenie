// =============================================
// TRIPGENIE — src/lib/api.ts
// Toutes les requêtes HTTP vers l'API Express
// =============================================

import type { Pack } from '../../../server/lib/types'

// En développement : Vite proxifie /api → localhost:3000
// En production : VITE_API_URL pointe vers l'API distante
const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
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
export const login    = (email: string, password: string) => request('/auth/login',  { method: 'POST', body: JSON.stringify({ email, password }) })
export const signup   = (email: string, password: string, name: string) => request('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) })
export const getMe    = () => request('/auth/me')

// AI
export const chatOnboarding  = (userMessage: string, currentData: Record<string, unknown>) =>
  request('/ai/onboarding', { method: 'POST', body: JSON.stringify({ userMessage, currentData }) })

export const getDestinations = (params: Record<string, unknown>) =>
  request('/ai/destinations', { method: 'POST', body: JSON.stringify(params) })

export const generatePack    = (params: Record<string, unknown>) =>
  request('/ai/generate', { method: 'POST', body: JSON.stringify(params) })

export const chatModify      = (message: string, currentPack: Pack, mode: string, tripId: string | null) =>
  request('/ai/chat', { method: 'POST', body: JSON.stringify({ message, current_pack: currentPack, mode, trip_id: tripId }) })

// Trips
export const getTrips     = (filters: Record<string, string> = {}) => request(`/trips?${new URLSearchParams(filters)}`)
export const getTrip      = (id: string) => request(`/trips/${id}`)
export const getPublicTrip = (id: string) => request(`/trips/share/${id}`)
export const deleteTrip   = (id: string) => request(`/trips/${id}`, { method: 'DELETE' })
export const updateTrip   = (id: string, fields: { status?: string; travelers?: number; budget?: string }) =>
  request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(fields) })

// Photos — proxy backend (clé Unsplash jamais exposée côté client)
export const getCityPhoto = (city: string) => request(`/photos/${encodeURIComponent(city)}`)

// Votes
export const saveVote     = (trip_id: string, item_id: string, vote_type: boolean, voter_name = '') =>
  request('/votes', { method: 'POST', body: JSON.stringify({ trip_id, item_id, vote_type, voter_name }) })

export const getVotes     = (trip_id: string) => request(`/votes/${trip_id}`)
