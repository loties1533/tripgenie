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
      transition={{ duration: 1 }}
      className="relative -mx-4 sm:-mx-8 -mt-8 mb-12 h-[450px] sm:h-[550px] flex items-center justify-center overflow-hidden">
      
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/hero.png" 
          alt="Travel Destinations" 
          className="w-full h-full object-cover scale-105 animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/40 to-ink dark:from-ink/80 dark:via-ink/60 dark:to-ink" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                     bg-gold/20 backdrop-blur-md border border-gold/30 text-gold text-sm font-medium mb-8">
          <span className="animate-pulse-slow">✦</span>
          Expertise IA · Voyages d'exception
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 drop-shadow-lg">
          Votre itinéraire parfait,
          <br />
          <span className="text-gold italic font-serif">créé en secondes</span>
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg sm:text-xl text-parchment/90 max-w-2xl mx-auto leading-relaxed font-light">
          Décrivez votre voyage idéal. TripGenie s'occupe du reste : destination, vols, hôtels et activités sur-mesure.
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
      className="relative">

      {/* Glow effect derrière le chat */}
      <div className="absolute inset-0 -m-4 bg-gold/5 blur-2xl rounded-3xl pointer-events-none" />

      <div className="relative glass rounded-3xl overflow-hidden border border-gold/20 shadow-card-lg"
           style={{ height: 520 }}>
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-parchment-dark dark:border-white/10
                        bg-white/50 dark:bg-ink-light/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center">
              <span className="text-gold text-sm">✦</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink dark:text-parchment leading-none">TripGenie</p>
              <p className="text-xs text-sage flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block" />
                En ligne · Expert voyage IA
              </p>
            </div>
          </div>
          <button onClick={resetChat}
            className="text-xs text-muted hover:text-ink dark:hover:text-parchment transition-colors
                       hover:bg-parchment-dark dark:hover:bg-ink-light px-3 py-1.5 rounded-lg">
            Nouveau chat
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
            { emoji: '✈️', title: 'Vols réels',      desc: 'Prix live via SmartSearch pour votre date exacte' },
            { emoji: '🏨', title: 'Hôtels vérifiés', desc: 'Données réelles Booking.com, notés et photographiés' },
            { emoji: '🎉', title: 'Événements live',  desc: 'Concerts, festivals et sorties sur vos dates' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass rounded-2xl p-5 text-center group hover:border-gold/30 transition-all duration-300">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-ink dark:text-parchment mb-1">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.section>
      )}
    </PageLayout>
  )
}
