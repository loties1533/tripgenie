import { motion } from 'framer-motion'
import { PageLayout } from '../components/layout'
import ChatWidget from '../components/chat/ChatWidget'
import PackResults from '../components/results/PackResults'
import { useSearchStore, useChatStore } from '../store'

// ---- Hero section ----
function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center py-12 sm:py-16">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                   bg-gold/10 border border-gold/30 text-gold text-sm font-medium mb-6">
        <span className="animate-pulse-slow">✦</span>
        Powered by AI · Vos voyages de rêve
      </motion.div>

      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink dark:text-parchment leading-tight mb-4">
        Votre itinéraire parfait,
        <br />
        <em className="text-gold not-italic">créé en secondes</em>
      </h1>

      <p className="text-lg text-muted max-w-xl mx-auto leading-relaxed">
        Décris ton voyage en une phrase. TripGenie trouve la destination,
        les vols, l'hôtel et les activités — tout optimisé pour toi.
      </p>

      {/* Stats */}
      <div className="flex items-center justify-center gap-8 mt-8">
        {[
          { val: '12 400+', label: 'voyages créés' },
          { val: '98%',     label: 'satisfaction' },
          { val: '45 s',    label: 'en moyenne' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.1 }}>
            <p className="font-display font-bold text-2xl text-gold">{s.val}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </motion.div>
        ))}
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
  const { pack } = useSearchStore()

  return (
    <PageLayout>
      <Hero />
      <ChatSection />
      {pack && <PackResults />}

      {/* Features section (si pas de pack affiché) */}
      {!pack && (
        <motion.section
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-16 grid sm:grid-cols-3 gap-6 pb-16">
          {[
            { emoji: '✈️', title: 'Vols réels',      desc: 'Prix live via Amadeus pour votre date exacte' },
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
