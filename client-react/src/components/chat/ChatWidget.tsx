import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore, useSearchStore } from '../../store'
import { chatOnboarding, getDestinations } from '../../lib/api'

// ---- Helpers dates ----
function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10)
}

// =============================================
// QUIZ STEPS (questionnaire déterministe)
// =============================================
const QUIZ_STEPS = [
  {
    key:      'occasion',
    question: "Quelle est l'inspiration de cette escapade ?",
    chips: [
      { label: 'Duo Romantique 💑',    data: { mode: 'relax',   profile: 'couple' } },
      { label: 'Entre Amis 🥂',       data: { mode: 'party',   profile: 'amis' } },
      { label: 'En Famille 👨‍👩‍👧',     data: { mode: 'group',   profile: 'famille' } },
      { label: 'Solo & Liberté 🌍',   data: { mode: 'relax',   profile: 'solo' } },
    ]
  },
  {
    key:      'travelers',
    question: 'Vous serez combien ?',
    chips: [
      { label: '2 personnes',    data: { travelers: 2 } },
      { label: '3-4 personnes',  data: { travelers: 4 } },
      { label: '5-8 personnes',  data: { travelers: 6 } },
      { label: '9+ personnes',   data: { travelers: 10 } },
    ]
  },
  {
    key:      'budget',
    question: 'Quel budget souhaitez-vous allouer à cette escapade ?',
    chips: [
      { label: 'Dès 1 500€',     data: { budget: 1500 } },
      { label: 'Environ 5 000€', data: { budget: 5000 } },
      { label: '10 000€ et +',   data: { budget: 15000 } },
      { label: 'Surprise-moi ✦', data: { budget: 30000 } },
    ]
  },
  {
    key:      'departure',
    question: 'Quand souhaitez-vous partir ?',
    chips: [
      { label: 'Ce week-end',   data: { departure: addDays(3),  return_date: addDays(5),   duration: 2  } },
      { label: 'Dans 1 mois',   data: { departure: addDays(30), return_date: addDays(37),  duration: 7  } },
      { label: 'Dans 3 mois',   data: { departure: addDays(90), return_date: addDays(97),  duration: 7  } },
      { label: 'Dans 6 mois',   data: { departure: addDays(180),return_date: addDays(187), duration: 7  } },
    ]
  },
  {
    key:      'duration',
    question: 'Pour combien de temps ?',
    chips: [
      { label: 'Un week-end (2-3j)', data: { duration: 2 } },
      { label: '1 semaine',          data: { duration: 7 } },
      { label: '2 semaines',         data: { duration: 14 } },
      { label: '3 semaines et +',    data: { duration: 21 } },
    ]
  },
]

// ---- Typing indicator ----
function TypingDots() {
  return (
    <div className="flex items-end gap-1.5 px-4 py-3">
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot w-2 h-2 rounded-full bg-gold/60 inline-block"
          style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </div>
  )
}

// ---- Message bubble ----
function Message({ msg, onChipClick }: { msg: any; onChipClick?: (label: string) => void }) {
  const isBot = msg.role === 'bot' || msg.role === 'assistant'
  return (
    <motion.div
      className={`flex gap-2 ${isBot ? 'justify-start' : 'justify-end'} msg-enter`}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.34,1.2,0.64,1] }}
    >
      {isBot && (
        <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-[13px]">✦</span>
        </div>
      )}
      <div className={`max-w-[78%] flex flex-col gap-2 ${isBot ? 'items-start' : 'items-end'}`}>
        <div className={isBot ? 'bubble-bot' : 'bubble-user'}>{msg.text}</div>
        {isBot && msg.chips?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {msg.chips.map((c: string | { label: string }, i: number) => {
              const label = typeof c === 'string' ? c : c.label
              return onChipClick ? (
                <button
                  key={i}
                  onClick={() => onChipClick(label)}
                  className="chip text-sm hover:border-gold/60 hover:bg-gold/10 active:scale-95 transition-all cursor-pointer"
                >
                  {label}
                </button>
              ) : (
                <StaticChip key={i} label={label} msgId={msg.id} />
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Chip qui ne fait rien (déjà traité via quiz)
function StaticChip({ label }: { label: string; msgId?: string | number }) {
  return <span className="chip text-sm opacity-60 cursor-default">{label}</span>
}

// =============================================
// LOGIQUE TEXTE LIBRE (IA parsing)
// =============================================
async function processAIMessage(value: string, ctx: any) {
  const { addMessage, mergeChatData, setTyping, setReady, setMockMode,
          setLoading, setPack, setField, chatData, turnCount } = ctx
  const forceReady = turnCount >= 5
  try {
    setTyping(true)
    const res = await chatOnboarding(value, chatData)
    setTyping(false)
    if (res.isMock) setMockMode(true)
    if (res.extractedData) mergeChatData(res.extractedData)
    const merged = { ...chatData, ...(res.extractedData || {}) }
    if (res.isReady || forceReady) {
      setReady(true)
      addMessage({ role: 'bot', text: '🎯 Parfait, j\'ai tout ce qu\'il me faut ! Je cherche les meilleures destinations pour vous...' })
      await suggestDestinations(merged, { addMessage, setTyping, setLoading, setPack, setField })
    } else {
      addMessage({ role: 'bot', text: res.response, chips: res.chips || [] })
    }
  } catch (err) {
    setTyping(false)
    addMessage({ role: 'bot', text: 'Oups, petit souci technique. Réessaie !' })
  }
}

// =============================================
// SUGGESTION DESTINATIONS (commun aux 2 chemins)
// =============================================
async function suggestDestinations(chatData: any, ctx: any) {
  const { addMessage, setTyping, setLoading, setPack, setField } = ctx
  setTyping(true)
  try {
    const res = await getDestinations({
      mode:      chatData.mode,
      profile:   chatData.profile,
      budget:    chatData.budget,
      travelers: chatData.travelers,
      duration:  chatData.duration,
      origin:    chatData.origin || 'Paris',
      departure: chatData.departure,
      preferences: []
    })
    setTyping(false)
    const dests = res.destinations || []
    if (dests.length) {
      setField('concepts', dests)
    } else {
      addMessage({ role: 'bot', text: 'Impossible de charger les destinations. Réessaie !' })
    }
  } catch {
    setTyping(false)
    addMessage({ role: 'bot', text: 'Impossible de charger les destinations. Réessaie !' })
  }
}

// =============================================
// MAIN CHAT WIDGET
// =============================================
export default function ChatWidget() {
  const {
    messages, isTyping, addMessage, mergeChatData, setTyping,
    setReady, setMockMode, chatData, turnCount, isMockMode,
    quizMode, quizStep, setQuizMode, nextQuizStep
  } = useChatStore()
  const { setLoading, setPack, setField } = useSearchStore()
  const [input, setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const initRef   = useRef<boolean>(false)

  // Message de bienvenue
  useEffect(() => {
    if (messages.length === 0 && !initRef.current) {
      initRef.current = true
      setTimeout(() => {
        addMessage({
          role: 'bot',
          text: 'Bienvenue chez TripGenie. ✦ Je suis votre Concierge Privé. Comment souhaitez-vous orchestrer votre prochaine escapade ?',
          chips: []
        })
      }, 500)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // ---- Handler chip quiz ----
  const handleQuizChip = useCallback(async (chip: any) => {
    const currentStep = QUIZ_STEPS[quizStep]
    addMessage({ role: 'user', text: chip.label })
    mergeChatData(typeof chip.data === 'function' ? chip.data() : chip.data)

    const isLast = quizStep === QUIZ_STEPS.length - 1
    if (isLast) {
      // On a tout — suggérer destinations
      const merged = { ...chatData, ...(typeof chip.data === 'function' ? chip.data() : chip.data) }
      setTimeout(() => {
        addMessage({ role: 'bot', text: '🎯 Parfait ! Je cherche les meilleures destinations pour votre voyage...' })
      }, 200)
      setReady(true)
      await suggestDestinations(merged, { addMessage, setTyping, setLoading, setPack, setField })
    } else {
      nextQuizStep()
      const next = QUIZ_STEPS[quizStep + 1]
      setTimeout(() => {
        addMessage({ role: 'bot', text: next.question })
      }, 300)
    }
  }, [quizStep, chatData])

  // ---- Envoi texte libre ----
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    addMessage({ role: 'user', text })
    await processAIMessage(text, {
      addMessage, mergeChatData, setTyping, setReady, setMockMode,
      setLoading, setPack, setField, chatData, turnCount
    })
    setSending(false)
    inputRef.current?.focus()
  }, [input, sending, chatData, turnCount])

  // ---- Clic sur un chip de réponse bot (envoie le texte directement) ----
  const sendChip = useCallback(async (label: string) => {
    if (sending || isTyping) return
    setSending(true)
    addMessage({ role: 'user', text: label })
    await processAIMessage(label, {
      addMessage, mergeChatData, setTyping, setReady, setMockMode,
      setLoading, setPack, setField, chatData, turnCount
    })
    setSending(false)
  }, [sending, isTyping, chatData, turnCount])

  const onKey = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // Chip d'accueil pour choisir le mode
  const handleModeSelect = useCallback((mode: string) => {
    if (mode === 'quiz') {
      addMessage({ role: 'user', text: 'Questionnaire guidé' })
      setQuizMode(true)
      setTimeout(() => {
        addMessage({ role: 'bot', text: QUIZ_STEPS[0].question })
      }, 300)
    } else {
      addMessage({ role: 'user', text: 'Je décris mon voyage' })
      setQuizMode(false)
      setTimeout(() => {
        addMessage({ role: 'bot', text: 'Décrivez-moi votre voyage en une phrase — je m\'occupe du reste.\nEx : "4 amis, fête, du 15/06 au 21/06, départ Bordeaux, budget 16 000€"' })
      }, 300)
    }
  }, [])

  // Détecter si on est sur le message d'accueil (avant choix de mode)
  const isWelcomeState = messages.length === 1 && messages[0].role === 'bot' && !quizMode

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence>
        {isMockMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mt-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40
                       rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <span>⚡</span> Mode démonstration actif (quotas IA saturés)
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-4 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            // Seul le dernier message bot a des chips cliquables (les anciens sont décoratifs)
            const isLastBot = idx === messages.length - 1
              && (msg.role === 'bot' || msg.role === 'assistant')
              && !quizMode
              && !sending
              && !isTyping
            return (
              <Message
                key={msg.id}
                msg={msg}
                onChipClick={isLastBot ? sendChip : undefined}
              />
            )
          })}
        </AnimatePresence>

        {/* Boutons de choix de mode (état d'accueil) */}
        {isWelcomeState && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2 pl-9">
            <button
              onClick={() => handleModeSelect('quiz')}
              className="chip text-sm text-left hover:border-gold/60 hover:bg-gold/10 transition-all">
              🧭 Définir mes préférences signature (Guidé)
            </button>
            <button
              onClick={() => handleModeSelect('freeform')}
              className="chip text-sm text-left hover:border-gold/60 hover:bg-gold/10 transition-all">
              ✍️ Confier mon projet d'escapade (Libre)
            </button>
          </motion.div>
        )}

        {/* Quiz chips interactifs */}
        {quizMode && !isWelcomeState && (
          <QuizChips
            step={quizStep}
            onSelect={handleQuizChip}
            disabled={isTyping}
          />
        )}

        <AnimatePresence>
          {isTyping && (
            <motion.div className="flex gap-2 justify-start"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-[13px]">✦</span>
              </div>
              <div className="bubble-bot"><TypingDots /></div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input texte libre (uniquement en mode freeform ou non-quiz) */}
      {!quizMode && (
        <div className="px-4 pb-4 pt-2">
          <div className="flex gap-2 items-end bg-white/60 dark:bg-ink-light/40 backdrop-blur-md border border-gold/20 rounded-2xl p-1 shadow-inner">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Confiez-moi vos envies de voyage..."
              rows={1}
              className="flex-1 resize-none bg-transparent border-none
                         px-4 py-3 text-[15px] text-ink dark:text-parchment placeholder:text-muted/60
                         focus:outline-none focus:ring-0 transition-all duration-200 max-h-32 overflow-y-auto scroll-hide leading-relaxed"
              style={{ minHeight: '48px' }}
              onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                e.currentTarget.style.height = 'auto'
                e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 128) + 'px'
              }}
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-11 h-11 rounded-xl bg-gold text-white flex items-center justify-center
                         disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-dark
                         transition-all duration-200 flex-shrink-0 shadow-glow-gold hover:shadow-none"
            >
              {sending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <SendIcon />
              }
            </motion.button>
          </div>
          <p className="text-[11px] text-muted/60 mt-1.5 text-center">Entrée pour envoyer · Shift+Entrée pour saut de ligne</p>
        </div>
      )}
    </div>
  )
}

// ---- Quiz chips interactifs (non désactivés après click — gérés par quizStep) ----
function QuizChips({ step, onSelect, disabled }: { step: number; onSelect: (chip: any) => void; disabled: boolean }) {
  const currentStep = QUIZ_STEPS[step]
  if (!currentStep) return null
  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 pl-9">
      {currentStep.chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => !disabled && onSelect(chip)}
          disabled={disabled}
          className="chip text-sm hover:border-gold/60 hover:bg-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {chip.label}
        </button>
      ))}
    </motion.div>
  )
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  )
}
