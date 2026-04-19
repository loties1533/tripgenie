import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageLayout } from '../components/layout'
import PackResults from '../components/results/PackResults'
import { SkeletonCard } from '../components/ui'
import { getPublicTrip } from '../lib/api'
import { useSearchStore } from '../store'
import { useEffect } from 'react'

export default function TripDetail() {
  const { id }             = useParams()
  const { setPack, setField } = useSearchStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['trip', id],
    queryFn:  () => getPublicTrip(id),
  })

  // Injecter le trip dans le store pour que PackResults l'affiche
  useEffect(() => {
    if (data?.trip?.pack_data) {
      setPack(data.trip.pack_data, data.trip.id)
      setField('mode', data.trip.mode || 'party')
    }
  }, [data])

  return (
    <PageLayout>
      {isLoading && (
        <div className="space-y-4 mt-6">
          <SkeletonCard />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard /><SkeletonCard />
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-24">
          <p className="text-4xl mb-3">🔍</p>
          <h2 className="font-display text-2xl font-bold text-ink dark:text-parchment mb-2">
            Voyage introuvable
          </h2>
          <p className="text-muted">Ce lien de partage est invalide ou expiré.</p>
        </div>
      )}

      {data?.trip && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted">
              Voyage partagé · {data.trip.travelers} pers. · {data.trip.budget}
            </p>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href) }}
              className="btn-ghost text-sm">
              📋 Copier le lien
            </button>
          </div>
          <PackResults />
        </motion.div>
      )}
    </PageLayout>
  )
}
