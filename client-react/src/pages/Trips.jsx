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
        <h1 className="font-display text-3xl font-bold text-ink dark:text-parchment mb-1">Mes voyages</h1>
        <p className="text-muted mb-8">Retrouvez tous vos itinéraires générés</p>

        {isLoading && (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-muted">
            <p className="text-2xl mb-2">⚠️</p>
            <p>Impossible de charger vos voyages.</p>
          </div>
        )}

        {data?.trips?.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">✈️</p>
            <h3 className="font-display text-xl font-semibold text-ink dark:text-parchment mb-2">
              Aucun voyage encore
            </h3>
            <p className="text-muted mb-6">Demande à TripGenie de créer ton premier itinéraire !</p>
            <Link to="/" className="btn-primary">Créer un voyage</Link>
          </div>
        )}

        {data?.trips && (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.trips.map((trip, i) => (
              <motion.div key={trip.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="glass rounded-2xl p-5 cursor-pointer hover:border-gold/40 transition-all duration-200 group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-ink dark:text-parchment">{trip.destination}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {trip.departure} → {trip.return_date}
                      {trip.travelers && ` · ${trip.travelers} pers.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ModeBadge mode={trip.mode} />
                    {trip.score && <ScoreBadge score={{ total: trip.score }} />}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gold">{trip.budget}</span>
                  <span className="text-xs text-muted group-hover:text-ink dark:group-hover:text-parchment transition-colors">
                    Voir le détail →
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
