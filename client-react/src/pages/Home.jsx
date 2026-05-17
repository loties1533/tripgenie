import { useState, useEffect, useRef } from 'react'
import { getCityPhoto } from '../lib/api'

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80',
  'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
  'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80',
]

function CityPhoto({ city, photo }) {
  const [src, setSrc] = useState(photo || null)
  const fetched = useRef(false)

  useEffect(() => {
    if (src || fetched.current) return
    fetched.current = true
    getCityPhoto(city)
      .then(data => setSrc(data.url || FALLBACK_PHOTOS[0]))
      .catch(() => setSrc(FALLBACK_PHOTOS[Math.floor(Math.random() * FALLBACK_PHOTOS.length)]))
  }, [city])

  return (
    <img
      src={src || FALLBACK_PHOTOS[0]}
      alt={city}
      onError={e => { e.target.src = FALLBACK_PHOTOS[0] }}
      className="w-full h-full object-cover opacity-80 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700"
    />
  )
}
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
      className="relative w-screen left-1/2 right-1/2 -translate-x-1/2 -mt-6 mb-12 h-[80vh] min-h-[550px] flex items-center justify-center overflow-hidden">

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
    setField('concepts', null)
    setLoading(true)
    addMessage({ role: 'bot', text: `Excellent choix ! 🚀 Je génère ton pack VIP pour **${dest.city}**...` })

    // Normalise une date DD/MM ou DD/MM/YY → YYYY-MM-DD
    const normalizeDate = (d) => {
      if (!d) return null
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d // déjà bon
      const [day, month, year] = d.split('/')
      if (!day || !month) return null
      const y = year ? (year.length === 2 ? '20' + year : year) : new Date().getFullYear()
      return `${y}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`
    }

    const dep = normalizeDate(chatData.departure)
      || new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
    const ret = normalizeDate(chatData.return_date)
      || new Date(new Date(dep).getTime() + 86400000 * (chatData.duration || 7)).toISOString().slice(0, 10)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: dest.city,
          origin:      chatData.origin || 'Paris',
          departure:   dep,
          return_date: ret,
          budget:      chatData.budget || 5000,
          travelers:   chatData.travelers || 2,
          mode:        chatData.mode || 'party'
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
              <CityPhoto city={c.city} photo={c.photo} />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            </div>


            {/* Content */}
            <div className="absolute inset-0 p-8 flex flex-col justify-end">
              <span className="text-gold font-bold tracking-widest uppercase text-[10px] mb-2 drop-shadow-md">{c.country}</span>
              <h3 className="font-display text-4xl text-white font-bold mb-1 leading-none">{c.city}</h3>
              <p className="text-parchment/80 italic font-serif text-lg mb-4 line-clamp-2">{c.tagline || c.reason}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Budget estimé</p>
                  <p className="text-gold font-bold text-lg">
                    {c.budget_estimate || (chatData.budget && chatData.travelers
                      ? `~${Math.round(chatData.budget / chatData.travelers).toLocaleString('fr-FR')}€/pers`
                      : 'Sur devis')}
                  </p>
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
        <>
          {/* Section titre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="text-center mt-20 mb-12">
            <p className="text-[10px] uppercase tracking-widest text-gold font-semibold mb-3">Notre Savoir-Faire</p>
            <h2 className="font-display text-4xl text-ink dark:text-parchment font-bold">L'Art de Voyager Autrement</h2>
          </motion.div>

          {/* 3 Cartes immersives avec images de fond */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="grid sm:grid-cols-3 gap-4 pb-24">
            {[
              {
                img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
                label: "Hébergements",
                title: "Résidences d'Exception",
                desc: "Penthouses, villas privées et suites présidentielles sélectionnées par nos experts.",
                badge: "5★ & Boutique"
              },
              {
                img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80",
                label: "Gastronomie",
                title: "Tables Étoilées",
                desc: "De Paris à Tokyo, nos concierges réservent les tables les plus convoitées du monde.",
                badge: "Michelin & Secret"
              },
              {
                img: "https://images.unsplash.com/photo-1519690889869-e705e59f72e1?auto=format&fit=crop&w=800&q=80",
                label: "Nightlife",
                title: "Accès VIP Exclusifs",
                desc: "Clubs privés, soirées sur invitation et casinos fermés au grand public.",
                badge: "Sur Liste"
              }
            ].map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.15 }}
                className="group relative h-[360px] rounded-2xl overflow-hidden cursor-pointer">

                {/* Image fond */}
                <img src={f.img} alt={f.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent group-hover:via-ink/20 transition-all duration-500" />

                {/* Badge */}
                <div className="absolute top-5 left-5">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-gold bg-ink/60 backdrop-blur-sm px-3 py-1 rounded-full border border-gold/20">
                    {f.badge}
                  </span>
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-7 flex flex-col justify-end">
                  <p className="text-[9px] uppercase tracking-widest text-gold/80 font-semibold mb-1">{f.label}</p>
                  <h3 className="font-display text-2xl text-white font-bold mb-2 leading-tight">{f.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed font-light">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </PageLayout>
  )
}
