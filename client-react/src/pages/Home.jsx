import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PageLayout } from '../components/layout'
import ChatWidget from '../components/chat/ChatWidget'
import PackResults from '../components/results/PackResults'
import PackSkeleton from '../components/results/PackSkeleton'
import { useSearchStore, useChatStore } from '../store'

const HERO_SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1920&q=90",
    city: "Côte d'Azur",
    label: "L'Excellence méditerranéenne"
  },
  {
    img: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1920&q=90",
    city: "Maldives",
    label: "L'île de tous les rêves"
  },
  {
    img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1920&q=90",
    city: "Amalfi",
    label: "L'élégance italienne"
  },
  {
    img: "https://images.unsplash.com/photo-1559494007-9f5847c49d94?auto=format&fit=crop&w=1920&q=90",
    city: "Mykonos",
    label: "La fête en blanc et or"
  },
  {
    img: "https://images.unsplash.com/photo-1499856844078-53e0f0c4ee5c?auto=format&fit=crop&w=1920&q=90",
    city: "Paris",
    label: "L'éternel raffinement"
  }
]

// ---- Hero section ----
function Hero() {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % HERO_SLIDES.length)
        setFading(false)
      }, 800)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const slide = HERO_SLIDES[current]

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="relative -mx-4 sm:-mx-8 -mt-24 mb-12 h-[90vh] min-h-[600px] flex items-center justify-center overflow-hidden">

      {/* Slideshow Background */}
      <div className="absolute inset-0 z-0">
        <img
          key={current}
          src={slide.img}
          alt={slide.city}
          className={`w-full h-full object-cover scale-105 animate-slow-zoom transition-opacity duration-[800ms] ${fading ? 'opacity-0' : 'opacity-100'}`}
          style={{ transformOrigin: 'center 40%' }}
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/40 via-transparent to-ink/40 z-10" />
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {HERO_SLIDES.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-0.5 rounded-full transition-all duration-500 ${i === current ? 'w-8 bg-gold' : 'w-3 bg-white/30'}`}
          />
        ))}
      </div>

      {/* Current Location Label */}
      <motion.div
        key={current + 'label'}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="absolute top-1/2 left-8 z-20 -rotate-90 origin-left hidden lg:block">
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold">{slide.city}</span>
      </motion.div>

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full
                     bg-gold/10 backdrop-blur-md border border-gold/20 text-gold-light text-xs font-semibold tracking-widest uppercase mb-10
                     animate-float shadow-glow-gold">
          <span className="animate-pulse-slow">✦</span>
          Conciergerie Privée
        </motion.div>

        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-display text-5xl sm:text-7xl lg:text-[6rem] font-bold text-white leading-[1.0] mb-8 drop-shadow-2xl">
          L'Excellence,
          <br />
          <span className="text-gradient-gold italic font-serif font-light">à votre service.</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xl sm:text-2xl text-parchment/70 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
          {slide.label}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex justify-center">
          <button
            onClick={() => document.getElementById('chat-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 text-parchment/70 hover:text-gold text-sm tracking-widest uppercase transition-colors animate-bounce-slow">
            <span>Commencer</span>
            <span className="text-lg">↓</span>
          </button>
        </motion.div>
      </div>
    </motion.section>
  )
}


// ---- Chat section ----
function ChatSection() {
  const { resetChat } = useChatStore()

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative z-20 max-w-3xl mx-auto -mt-24" id="chat-section">

      {/* Glow effect derrière le chat */}
      <div className="absolute inset-0 bg-gold/10 blur-[100px] rounded-[3rem] pointer-events-none" />

      <div className="relative glass-premium rounded-[2.5rem] overflow-hidden shadow-2xl border-t border-gold/30"
           style={{ height: 560 }}>
        {/* Chat header Minimalist */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gold/10
                        bg-gradient-to-b from-white/40 to-transparent dark:from-ink-light/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-light to-gold-dark flex items-center justify-center shadow-glow-gold">
              <span className="text-white text-lg">✦</span>
            </div>
            <div>
              <p className="text-base font-display font-bold text-ink dark:text-parchment leading-none tracking-wide">TripGenie Concierge</p>
              <p className="text-[10px] uppercase tracking-widest text-gold mt-1.5 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gold animate-pulse" />
                À votre écoute
              </p>
            </div>
          </div>
          <button onClick={resetChat}
            className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-gold transition-colors
                       px-4 py-2 rounded-full border border-transparent hover:border-gold/20 hover:bg-gold/5">
            Nouvelle Requête
          </button>
        </div>

        {/* Chat body */}
        <div className="h-[calc(100%-56px)]">
          <ChatWidget />
        </div>
      </div>
    </motion.section>
  )
}

// =============================================
// TRIP CONCEPTS (Vitrine)
// =============================================
function TripConcepts() {
  const { concepts, setField, setLoading, setPack } = useSearchStore()
  const { chatData, addMessage, setTyping } = useChatStore()

  if (!concepts) return null

  const handleSelect = async (dest) => {
    // Relance la génération complète depuis ici
    setField('concepts', null) // on cache les concepts
    setLoading(true)
    addMessage({ role: 'bot', text: `Excellent choix ! 🚀 Je génère ton pack VIP pour **${dest.city}**...` })
    
    // Fake the launchGeneration logic here or call an API directly
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: dest.city,
          origin:      chatData.origin || 'Paris',
          departure:   chatData.departure || new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
          budget:      chatData.budget || 5000,
          travelers:   chatData.travelers || 2,
          mode:        chatData.mode || 'luxury'
        })
      })
      const data = await res.json()
      if (data.pack) {
        setPack(data.pack, data.trip_id)
      } else {
        throw new Error("No pack data")
      }
    } catch (err) {
      setLoading(false)
      addMessage({ role: 'bot', text: 'Erreur lors de la création du pack. Réessaie !' })
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
      className="relative z-20 max-w-6xl mx-auto -mt-24 px-4 pb-20">
      
      <div className="text-center mb-10">
        <h2 className="font-display text-4xl text-ink dark:text-parchment font-bold mb-3">Vos Concepts de Voyage</h2>
        <p className="text-muted text-lg">Choisissez la toile de fond de votre prochaine aventure.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {concepts.map((c, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }}
            onClick={() => handleSelect(c)}
            className="group cursor-pointer relative h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-gold/20 hover:border-gold/60 transition-all duration-500 hover:-translate-y-2">
            
            {/* Image (Images Premium garanties pour la démo) */}
            <div className="absolute inset-0 bg-ink">
              <img 
                src={[
                  "https://images.unsplash.com/photo-1515238152791-8226bf1f6643?auto=format&fit=crop&w=800&q=80",
                  "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80",
                  "https://images.unsplash.com/photo-1542314831-c6a420325142?auto=format&fit=crop&w=800&q=80",
                  "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=800&q=80"
                ][i % 4]} 
                alt={c.city} 
                className="w-full h-full object-cover opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            </div>


            {/* Content */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end">
              <span className="text-gold font-bold tracking-widest uppercase text-[10px] mb-2 drop-shadow-md">{c.country}</span>
              <h3 className="font-display text-4xl text-white font-bold mb-1 leading-none">{c.city}</h3>
              <p className="text-parchment/80 italic font-serif text-lg mb-4">{c.tagline || c.reason}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Budget estimé</p>
                  <p className="text-gold font-bold text-lg">{c.budget_estimate || 'Sur devis'}</p>
                </div>
                <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-gold transition-colors">
                  ↗
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

// =============================================
// HOME PAGE
// =============================================
export default function Home() {
  const { pack, concepts, isLoading } = useSearchStore()

  return (
    <PageLayout>
      <Hero />
      
      {/* N'afficher le chat que si on n'a ni concepts ni pack */}
      {!concepts && !pack && !isLoading && <ChatSection />}
      
      {/* Afficher les concepts si on en a */}
      {concepts && !isLoading && <TripConcepts />}

      {/* Afficher le pack une fois généré */}
      {isLoading && <PackSkeleton />}
      {pack && !isLoading && <PackResults />}

      {/* Features section (si pas de pack ni concepts) */}
      {!pack && !concepts && (
        <motion.section
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 grid sm:grid-cols-3 gap-6 pb-16">
          {[
            { emoji: '💎', title: 'Curation d\'Exception', desc: 'Une sélection rigoureuse des meilleurs établissements mondiaux' },
            { emoji: '🤵', title: 'Service Signature',    desc: 'Un assistant dédié qui comprend vos préférences implicites' },
            { emoji: '✨', title: 'Expériences Uniques',   desc: 'Événements privés et lieux secrets pour un voyage mémorable' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass-premium rounded-2xl p-6 text-center group hover:border-gold/50 transition-all duration-500 shine-effect">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-500">{f.emoji}</div>
              <h3 className="font-display text-xl font-bold text-ink dark:text-parchment mb-2 group-hover:text-gold transition-colors">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed italic">{f.desc}</p>
            </motion.div>
          ))}
        </motion.section>
      )}
    </PageLayout>
  )
}
