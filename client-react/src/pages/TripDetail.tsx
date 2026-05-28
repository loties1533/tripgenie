import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { PageLayout } from '../components/layout'
import PackResults from '../components/results/PackResults'
import ModifyChat from '../components/chat/ModifyChat'
import { SkeletonCard } from '../components/ui'
import { getPublicTrip, updateTrip } from '../lib/api'
import { useSearchStore } from '../store'

export default function TripDetail() {
  const { id }                        = useParams()
  const { setPack, setField, tripId } = useSearchStore()
  const [chatOpen, setChatOpen]       = useState(false)
  const [copied, setCopied]           = useState(false)
  const [status, setStatus]           = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['trip', id],
    queryFn:  () => getPublicTrip(id as string),
    enabled:  !!id,
  })

  useEffect(() => {
    if (data?.trip?.pack_data && tripId !== data.trip.id) {
      setPack(data.trip.pack_data, data.trip.id)
      setField('mode', data.trip.mode || 'party')
    }
    if (data?.trip?.status) setStatus(data.trip.status)
  }, [data])

  const handleStatus = async (newStatus: string) => {
    if (!id || statusLoading) return
    setStatusLoading(true)
    try {
      await updateTrip(id, { status: newStatus })
      setStatus(newStatus)
    } catch {
      /* silencieux */
    } finally {
      setStatusLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-4 mt-6">
          <SkeletonCard />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard /><SkeletonCard />
          </div>
        </div>
      </PageLayout>
    )
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <PageLayout>
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="font-display text-2xl font-bold text-ink dark:text-parchment mb-2">
            Voyage introuvable
          </h2>
          <p className="text-muted mb-6">Ce lien de partage est invalide ou expiré.</p>
          <Link to="/" className="btn-primary">Créer un voyage</Link>
        </div>
      </PageLayout>
    )
  }

  /* ---- Content ---- */
  return (
    <PageLayout>
      {data?.trip && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5 items-start">

          {/* ── Left : Pack ── */}
          <div className="flex-1 min-w-0">

            {/* Barre d'actions */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted">
                <span className="font-semibold text-ink dark:text-parchment">
                  {data.trip.destination}
                </span>
                {' · '}{data.trip.travelers} pers.
                {data.trip.budget ? ` · ${data.trip.budget}` : ''}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="btn-ghost text-sm flex items-center gap-1.5"
                >
                  {copied ? '✅ Copié' : '📋 Partager'}
                </button>
                <button
                  onClick={() => setChatOpen(v => !v)}
                  className={`text-sm px-4 py-2 rounded-xl font-bold transition-all border flex items-center gap-1.5 ${
                    chatOpen
                      ? 'bg-gold text-white border-gold shadow-glow-gold'
                      : 'border-gold/30 text-gold hover:bg-gold/10'
                  }`}
                >
                  ✏️ {chatOpen ? 'Fermer' : 'Modifier'}
                </button>
              </div>
            </div>

            {/* Workflow statut */}
            {status && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">Statut :</span>
                {[
                  { key: 'draft',     label: '🟡 Brouillon',  desc: 'Pack généré, non validé' },
                  { key: 'confirmed', label: '🟢 Confirmé',   desc: 'Je pars !' },
                  { key: 'archived',  label: '⬛ Archivé',    desc: 'Voyage terminé' },
                ].map(s => (
                  <button key={s.key}
                    onClick={() => handleStatus(s.key)}
                    disabled={statusLoading || status === s.key}
                    title={s.desc}
                    className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                      status === s.key
                        ? 'bg-gold text-white border-gold'
                        : 'border-gold/20 text-muted hover:border-gold/50 hover:text-ink dark:hover:text-parchment'
                    } disabled:opacity-50`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <PackResults />
          </div>

          {/* ── Right : Chat modifier (desktop uniquement) ── */}
          <AnimatePresence>
            {chatOpen && (
              <motion.div
                key="modify-panel"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.25 }}
                className="hidden lg:flex flex-col flex-shrink-0 sticky top-20"
                style={{ width: 340, height: 'calc(100vh - 6rem)' }}
              >
                <div className="glass-premium rounded-2xl overflow-hidden h-full flex flex-col border border-gold/20 shadow-glow-gold">

                  {/* Header du panel */}
                  <div className="px-4 py-3 border-b border-gold/10 flex items-center justify-between
                                  bg-gradient-to-r from-gold/5 to-transparent">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-light to-gold-dark
                                      flex items-center justify-center text-white text-sm shadow-glow-gold">
                        ✦
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink dark:text-parchment leading-none">
                          Modifier le pack
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">{data.trip.destination}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setChatOpen(false)}
                      className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center
                                 text-muted hover:text-ink dark:hover:text-parchment transition-colors text-base"
                    >
                      ×
                    </button>
                  </div>

                  {/* Résumé rapide du pack actuel */}
                  <div className="px-4 py-2.5 border-b border-gold/10 bg-gold/3">
                    <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-1.5">Pack actuel</p>
                    <div className="space-y-0.5 text-xs text-muted">
                      {data.trip.pack_data?.flights?.[0] && (
                        <p>✈️ {data.trip.pack_data.flights[0].airline || 'Vol'} · {data.trip.pack_data.flights[0].price_per_person || '–'}€/pers</p>
                      )}
                      {data.trip.pack_data?.hotels?.[0] && (
                        <p>🏨 {data.trip.pack_data.hotels[0].name} · {data.trip.pack_data.hotels[0].price_per_night || '–'}€/nuit</p>
                      )}
                      {data.trip.pack_data?.summary && (
                        <p>📅 {data.trip.pack_data.summary.nights} nuits · {data.trip.pack_data.summary.activities_count || '–'} activités</p>
                      )}
                    </div>
                  </div>

                  {/* Chat */}
                  <ModifyChat tripId={id} mode={data.trip.mode} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </PageLayout>
  )
}
