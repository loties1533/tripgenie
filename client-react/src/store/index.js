import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================
// SEARCH STORE — état de la recherche et du pack
// =============================================
export const useSearchStore = create(
  persist(
    (set) => ({
      // Form
      destination: '',
      origin:      'Bordeaux',
      departure:   '',
      returnDate:  '',
      travelers:   2,
      budget:      2000,
      mode:        'party',
      prefs:       [],

      // Results
      concepts:    null,
      pack:        null,
      tripId:      null,
      isLoading:   false,
      error:       null,

      // Actions
      setField:    (key, val) => set({ [key]: val }),
      setPack:     (pack, tripId) => set({ pack, tripId, isLoading: false, error: null }),
      setLoading:  (v) => set({ isLoading: v }),
      setError:    (e) => set({ error: e, isLoading: false }),
      clearPack:   () => set({ pack: null, tripId: null }),
    }),
    {
      name:    'tg_v2_search',
      partialize: (s) => ({ destination: s.destination }),
    }
  )
)

// =============================================
// CHAT STORE — état du chatbot onboarding
// =============================================
export const useChatStore = create((set, get) => ({
  messages: [],
  chatData: {
    travelers:     null,
    profile:       null,
    mode:          'party',
    interests:     [],
    budget:        null,
    origin:        'Paris',
    destination:   null,
    duration:      null,
    departure:     null,
    return_date:   null,
    discoveryMode: null,
    moods:         [],
  },
  isTyping:   false,
  isReady:    false,
  turnCount:  0,
  isMockMode: false,
  quizMode:   false,
  quizStep:   0,

  addMessage:    (msg) => set((s) => ({ messages: [...s.messages, { id: Date.now() + Math.random(), ...msg }] })),
  setTyping:     (v) => set({ isTyping: v }),
  mergeChatData: (data) => set((s) => ({ chatData: { ...s.chatData, ...data }, turnCount: s.turnCount + 1 })),
  setReady:      (v) => set({ isReady: v }),
  setMockMode:   (v) => set({ isMockMode: v }),
  setQuizMode:   (v) => set({ quizMode: v, quizStep: 0 }),
  nextQuizStep:  ()  => set((s) => ({ quizStep: s.quizStep + 1 })),

  resetChat: () => set({
    messages:   [],
    chatData:   { travelers: null, profile: null, mode: 'party', interests: [], budget: null, origin: 'Paris', destination: null, duration: null, departure: null, return_date: null, discoveryMode: null, moods: [] },
    isTyping:   false,
    isReady:    false,
    turnCount:  0,
    isMockMode: false,
    quizMode:   false,
    quizStep:   0,
  }),
}))

// =============================================
// AUTH STORE — utilisateur connecté
// =============================================
export const useAuthStore = create(
  persist(
    (set) => ({
      user:  null,
      token: null,
      setAuth:  (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    { name: 'tg_v2_auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)

// =============================================
// THEME STORE
// =============================================
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('dark', next === 'dark')
      },
      init: () => {
        const { theme } = get()
        document.documentElement.classList.toggle('dark', theme === 'dark')
      }
    }),
    { name: 'tg_v2_theme' }
  )
)
