import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Pack, TravelMode } from '../../../server/lib/types'

// =============================================
// SEARCH STORE — état de la recherche et du pack
// =============================================
interface SearchState {
  destination: string;
  origin: string;
  departure: string;
  returnDate: string;
  travelers: number;
  budget: number;
  mode: TravelMode | string;
  prefs: string[];
  concepts: unknown[] | null;
  pack: Pack | null;
  tripId: string | null;
  isLoading: boolean;
  error: string | null;
  setField: (key: keyof SearchState, val: any) => void;
  setPack: (pack: Pack | null, tripId: string | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  clearPack: () => void;
}

export const useSearchStore = create<SearchState>()(
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
      setField:    (key, val) => set({ [key]: val } as Partial<SearchState>),
      setPack:     (pack, tripId) => set({ pack, tripId, isLoading: false, error: null }),
      setLoading:  (v) => set({ isLoading: v }),
      setError:    (e) => set({ error: e, isLoading: false }),
      clearPack:   () => set({ pack: null, tripId: null }),
    }),
    {
      name:    'tg_v2_search',
      partialize: (s) => ({ destination: s.destination } as any),
    }
  )
)

// =============================================
// CHAT STORE — état du chatbot onboarding
// =============================================
export interface ChatMessage {
  id?: number | string;
  role: 'user' | 'assistant' | 'bot';
  text?: string;
  chips?: (string | { label: string })[];
  isFlightSearch?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  chatData: Record<string, any>;
  isTyping: boolean;
  isReady: boolean;
  turnCount: number;
  isMockMode: boolean;
  quizMode: boolean;
  quizStep: number;
  addMessage: (msg: ChatMessage) => void;
  setTyping: (v: boolean) => void;
  mergeChatData: (data: Record<string, any>) => void;
  setReady: (v: boolean) => void;
  setMockMode: (v: boolean) => void;
  setQuizMode: (v: boolean) => void;
  nextQuizStep: () => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'tg_v2_chat',
      partialize: (s) => ({ chatData: s.chatData }) as any,
    }
  )
)

// =============================================
// AUTH STORE — utilisateur connecté
// =============================================
interface User {
  id: string;
  email: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  setAuth: (user: User | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth:  (user) => set({ user }),        // plus de token — géré par cookie httpOnly
      clearAuth: () => set({ user: null }),
    }),
    { name: 'tg_v2_auth', partialize: (s) => ({ user: s.user }) }
  )
)

// =============================================
// THEME STORE
// =============================================
interface ThemeState {
  theme: 'dark' | 'light';
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>()(
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
