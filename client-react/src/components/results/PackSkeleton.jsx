import { motion } from 'framer-motion'

export default function PackSkeleton() {
  return (
    <div className="mt-12 animate-fade-in">
      {/* Header Skeleton */}
      <div className="glass rounded-3xl p-8 border border-gold/10 mb-8">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="h-4 w-24 rounded bg-gold/10 animate-shimmer" />
            <div className="h-10 w-64 rounded-lg bg-gold/20 animate-shimmer" />
            <div className="h-4 w-full max-w-lg rounded bg-parchment-dark/20 dark:bg-white/5 animate-shimmer" />
            <div className="h-4 w-3/4 rounded bg-parchment-dark/20 dark:bg-white/5 animate-shimmer" />
          </div>
          <div className="flex gap-4">
            <div className="h-20 w-24 rounded-2xl bg-gold/10 animate-shimmer" />
            <div className="h-20 w-24 rounded-2xl bg-gold/10 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-10 w-28 rounded-xl bg-parchment-dark/30 dark:bg-white/10 shrink-0 animate-shimmer" />
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass rounded-2xl p-6 border border-gold/5 space-y-4">
            <div className="h-40 w-full rounded-xl bg-gold/5 animate-shimmer" />
            <div className="h-6 w-3/4 rounded bg-gold/10 animate-shimmer" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-parchment-dark/20 dark:bg-white/5 animate-shimmer" />
              <div className="h-3 w-5/6 rounded bg-parchment-dark/20 dark:bg-white/5 animate-shimmer" />
            </div>
            <div className="flex justify-between items-center pt-4">
              <div className="h-8 w-20 rounded-lg bg-gold/10 animate-shimmer" />
              <div className="h-4 w-12 rounded bg-parchment-dark/20 dark:bg-white/5 animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
