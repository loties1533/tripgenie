import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout'
import { SkeletonCard, ModeBadge, ScoreBadge } from '../components/ui'
import { getTrips } from '../lib/api'
import { useAuthStore } from '../store'

export default function Trips() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['trips'],
    queryFn:  getTrips,
    enabled:  !!user,
  })

  if (!user) {
    return (
      <PageLayout>
        <div className="text-center py-24">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="font-display text-2xl font-bold text-ink dark:text-parchment mb-2">
            Connexion requise
          </h2>
          <p className="text-muted mb-6">Connecte-toi pour voir tes voyages sauvegardés.</p>
          <Link to="/login" className="btn-primary">Se connecter</Link>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-ink dark:text-parchment mb-1">Mes voyages</h1>
            <p className="text-muted">Retrouvez tous vos itinéraires générés par TripGenie</p>
          </div>
          {data?.trips?.length > 0 && (
            <div className="flex gap-4">
              <div className="glass-premium px-4 py-2 rounded-xl text-center shadow-glow-gold">
                <p className="text-xs text-muted uppercase tracking-wider font-semibold">Voyages</p>
                <p className="text-xl font-bold text-gold font-display">{data.trips.length}</p>
              </div>
              <div className="glass-premium px-4 py-2 rounded-xl text-center shadow-glow-gold">
                <p className="text-xs text-muted uppercase tracking-wider font-semibold">Score Moyen</p>
                <p className="text-xl font-bold text-gold font-display">
                  {Math.round(data.trips.reduce((acc, t) => acc + (t.score || 0), 0) / data.trips.length)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="text-center py-24 glass rounded-3xl border-dashed border-2 border-red-500/20">
            <p className="text-4xl mb-4">⚠️</p>
            <h3 className="text-xl font-bold text-ink dark:text-parchment mb-2">Oups, un petit problème...</h3>
            <p className="text-muted mb-6">Impossible de charger vos voyages pour le moment.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">Réessayer</button>
          </div>
        )}

        {data?.trips?.length === 0 && (
          <div className="text-center py-24 glass-premium rounded-3xl shadow-glow-gold">
            <p className="text-6xl mb-6">✈️</p>
            <h3 className="font-display text-2xl font-bold text-ink dark:text-parchment mb-2">
              Votre carnet est vide
            </h3>
            <p className="text-muted mb-8 max-w-sm mx-auto">
              Laissez TripGenie vous concocter un itinéraire sur-mesure pour votre prochaine aventure.
            </p>
            <Link to="/" className="btn-primary px-8">Créer un voyage</Link>
          </div>
        )}

        {data?.trips && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.trips.map((trip, i) => (
              <motion.div key={trip.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="glass-premium rounded-3xl p-6 cursor-pointer hover:shadow-glow-gold transition-all duration-300 group relative overflow-hidden">
                
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -mr-16 -mt-16 group-hover:bg-gold/10 transition-colors" />

                <div className="flex items-start justify-between gap-3 mb-5 relative z-10">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-bold text-ink dark:text-parchment truncate group-hover:text-gold transition-colors">
                      {trip.destination}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted mt-1">
                      <span>📅 {trip.departure}</span>
                      <span>•</span>
                      <span>👥 {trip.travelers || 2} pers.</span>
                    </div>
                  </div>
                  <ScoreBadge score={{ total: trip.score || 0 }} />
                </div>

                <div className="flex items-center gap-2 mb-6 relative z-10">
                  <ModeBadge mode={trip.mode} />
                </div>

                <div className="flex items-center justify-between border-t border-gold/10 pt-4 mt-auto relative z-10">
                  <div>
                    <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Budget estimé</p>
                    <p className="text-lg font-bold text-ink dark:text-parchment font-display">{trip.budget}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-white transition-all duration-300">
                    →
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
