import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore, useSearchStore } from '../../store'
import { chatOnboarding, getDestinations, generatePack } from '../../lib/api'

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

// ---- Single message bubble ----
function Message({ msg }) {
  const isBot = msg.role === 'bot'
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
        <div className={isBot ? 'bubble-bot' : 'bubble-user'}>
          {msg.text}
        </div>
        {/* Chips */}
        {isBot && msg.chips?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {msg.chips.map((c, i) => (
              <ChipButton key={i} label={c} msgId={msg.id} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---- Chip button (se désactive après click) ----
function ChipButton({ label, msgId }) {
  const [used, setUsed] = useState(false)
  const { addMessage, mergeChatData, setTyping, setReady, setMockMode, chatData, turnCount } = useChatStore()
  const { setLoading, setPack, setField } = useSearchStore()

  const handleClick = useCallback(async () => {
    if (used) return
    setUsed(true)
    addMessage({ role: 'user', text: label })
    await processUserMessage(label, {
      addMessage, mergeChatData, setTyping, setReady, setMockMode,
      setLoading, setPack, setField, chatData, turnCount
    })
  }, [used, label])

  return (
    <button onClick={handleClick} disabled={used}
      className={`chip text-sm transition-all duration-200 ${used ? 'opacity-40 cursor-default' : ''}`}>
      {label}
    </button>
  )
}

// L'ancien composant DestinationCards a été supprimé pour faire place à TripConcepts

// ---- Core business logic (outside component to avoid re-creation) ----
async function processUserMessage(value, ctx) {
  const { addMessage, mergeChatData, setTyping, setReady, setMockMode,
          setLoading, setPack, setField, chatData, turnCount } = ctx

  // Force isReady après 7 tours pour éviter les boucles infinies
  const forceReady = turnCount >= 6

  try {
    setTyping(true)
    const res = await chatOnboarding(value, chatData)
    setTyping(false)

    if (res.isMock) setMockMode(true)
    if (res.extractedData) mergeChatData(res.extractedData)

    if (res.isReady || forceReady) {
      setReady(true)
      addMessage({ role: 'bot', text: '🎯 Super, j\'ai tout ce qu\'il me faut ! Je cherche les meilleures pépites pour vous...' })
      await suggestDestinations(chatData, { addMessage, setTyping, setLoading, setPack, setField })
    } else {
      addMessage({ role: 'bot', text: res.response, chips: res.chips || [] })
    }
  } catch (err) {
    setTyping(false)
    console.error(err)
    addMessage({ role: 'bot', text: 'Oups, petit souci technique. Réessaie !' })
  }
}

async function suggestDestinations(chatData, ctx) {
  const { addMessage, setTyping, setLoading, setPack, setField } = ctx
  setTyping(true)
  try {
    const res = await getDestinations({
      mode:          chatData.mode,
      profile:       chatData.profile,
      interests:     chatData.interests,
      budget:        chatData.budget,
      travelers:     chatData.travelers,
      duration:      chatData.duration,
      origin:        chatData.origin,
      moods:         chatData.moods,
      discoveryMode: chatData.discoveryMode,
      departure:     chatData.departure,
      preferences:   []
    })
    setTyping(false)
    const dests = res.destinations || []
    if (dests.length) {
      setField('concepts', dests)
    } else {
      addMessage({ role: 'bot', text: 'Je génère votre pack directement !', chips: [] })
      if (chatData.destination) {
        await launchGeneration(chatData.destination, chatData, { setLoading, setPack, setField, addMessage, setTyping })
      }
    }
  } catch {
    setTyping(false)
    addMessage({ role: 'bot', text: 'Impossible de charger les destinations. Réessaie !' })
  }
}

async function launchGeneration(destination, chatData, ctx) {
  const { setLoading, setPack, setField, addMessage } = ctx
  setLoading(true)
  setField('destination', destination)
  try {
    const today = new Date()
    const dep   = new Date(today); dep.setDate(dep.getDate() + 30)
    const ret   = new Date(dep);   ret.setDate(ret.getDate() + (chatData.duration || 7))
    const fmt   = d => d.toISOString().slice(0, 10)

    const result = await generatePack({
      destination,
      origin:      chatData.origin || 'Paris',
      departure:   fmt(dep),
      return_date: fmt(ret),
      travelers:   chatData.travelers || 2,
      budget:      chatData.budget    || 2000,
      mode:        chatData.mode      || 'party',
      preferences: chatData.interests || []
    })
    setPack(result.pack || result, result.trip_id)
    addMessage({ role: 'bot', text: `✅ Ton pack **${destination}** est prêt ! Scroll vers le bas pour le découvrir.` })

    // Scroll vers les résultats
    setTimeout(() => {
      document.getElementById('pack-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 400)
  } catch (err) {
    setLoading(false)
    addMessage({ role: 'bot', text: 'Erreur lors de la génération du pack. Réessaie !' })
  }
}

// =============================================
// MAIN CHAT WIDGET
// =============================================
export default function ChatWidget() {
  const { messages, isTyping, addMessage, mergeChatData, setTyping,
          setReady, setMockMode, chatData, turnCount, isMockMode } = useChatStore()
  const { setLoading, setPack, setField } = useSearchStore()
  const [input, setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const initRef = useRef(false)
  // Message de bienvenue au montage
  useEffect(() => {
    if (messages.length === 0 && !initRef.current) {
      initRef.current = true
      setTimeout(() => {
        addMessage({
          role:  'bot',
          text:  'Bienvenue. ✦ Je suis votre Concierge Privé TripGenie. Quelques questions suffisent pour orchestrer une expérience à la hauteur de vos aspirations. Quelle est l\'occasion de cette escapade ?',
          chips: ['Duo Romantique 💑', 'Entre Amis 🥂', 'En Famille 👨‍👩‍👧', 'Solo & Liberté 🌍']
        })
      }, 800)
    }
  }, [])

  // Auto-scroll à chaque nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    addMessage({ role: 'user', text })
    await processUserMessage(text, {
      addMessage, mergeChatData, setTyping, setReady, setMockMode,
      setLoading, setPack, setField, chatData, turnCount
    })
    setSending(false)
    inputRef.current?.focus()
  }, [input, sending, chatData, turnCount])

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mock mode indicator */}
      <AnimatePresence>
        {isMockMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mt-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40
                       rounded-lg text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <span>⚡</span> Mode démonstration actif (quotas IA saturés)
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto scroll-hide px-4 py-4 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div className="flex gap-2 justify-start"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-[13px]">✦</span>
              </div>
              <div className="bubble-bot">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
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
                       focus:outline-none focus:ring-0
                       transition-all duration-200 max-h-32 overflow-y-auto scroll-hide
                       leading-relaxed"
            style={{ minHeight: '48px' }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
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
    </div>
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
