import { motion } from 'framer-motion'
import { PageLayout } from '../components/layout'
import ChatWidget from '../components/chat/ChatWidget'
import PackResults from '../components/results/PackResults'
import PackSkeleton from '../components/results/PackSkeleton'
import { useSearchStore, useChatStore } from '../store'

// ---- Hero section ----
function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="relative -mx-4 sm:-mx-8 -mt-24 mb-12 h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
      
      {/* Background Image with Cinematic Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-ink/30 z-10"></div>
        <img 
          src="/assets/hero.png" 
          alt="Travel Destinations" 
          className="w-full h-[120%] object-cover scale-105 animate-slow-zoom"
          style={{ transformOrigin: 'center 30%' }}
        />
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-ink/80 via-transparent to-bg dark:to-ink-deep" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
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
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-display text-5xl sm:text-7xl lg:text-8xl font-bold text-white leading-[1.05] mb-8 drop-shadow-2xl">
          L'Excellence,
          <br />
          <span className="text-gradient-gold italic font-serif font-light">à votre service.</span>
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg sm:text-2xl text-parchment/80 max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
          Confiez-nous vos aspirations. Notre intelligence artificielle orchestre vos voyages signatures avec la précision d'un majordome de palace.
        </motion.p>
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
      className="relative z-20 max-w-3xl mx-auto -mt-24">

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
// HOME PAGE
// =============================================
export default function Home() {
  const { pack, isLoading } = useSearchStore()

  return (
    <PageLayout>
      <Hero />
      <ChatSection />
      
      {isLoading && <PackSkeleton />}
      {pack && !isLoading && <PackResults />}

      {/* Features section (si pas de pack affiché) */}
      {!pack && (
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
