import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore, useThemeStore } from '../../store'
import { logout } from '../../lib/api'

export function Header() {
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try { await logout() } catch (_) {}
    clearAuth()
  }
  const { theme, toggle }   = useThemeStore()
  const loc = useLocation()

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-ink/70 backdrop-blur-md border-b border-gold/10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-light via-gold to-gold-dark flex items-center justify-center
                          shadow-glow-gold transition-transform group-hover:scale-105 shine-effect">
            <span className="text-white text-lg">✦</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-ink dark:text-parchment text-xl leading-none tracking-tight">TripGenie</span>
            <span className="text-[10px] text-gold-dark dark:text-gold font-bold uppercase tracking-widest mt-1">Conciergerie Privée</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center bg-parchment-dark/50 dark:bg-ink-light/50 p-1 rounded-xl border border-gold/10">
          <Link to="/"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${loc.pathname === '/'
                ? 'text-ink dark:text-parchment bg-white dark:bg-ink-light shadow-sm'
                : 'text-muted hover:text-ink dark:hover:text-parchment'
              }`}>
            Accueil
          </Link>
          <Link to="/trips"
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2
              ${loc.pathname === '/trips'
                ? 'text-white bg-gold shadow-glow-gold'
                : 'text-gold hover:bg-gold/10'
              }`}>
            <span className="text-lg">📖</span>
            Mes voyages
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button onClick={toggle}
            className="w-9 h-9 rounded-xl bg-parchment-dark dark:bg-ink-light border border-gold/10 
                       text-muted hover:text-gold transition-colors flex items-center justify-center">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user
            ? <div className="flex items-center gap-3 pl-3 border-l border-gold/20">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-ink dark:text-parchment leading-none">{user.name}</span>
                  <span className="text-[10px] text-muted mt-0.5">Membre</span>
                </div>
                <button onClick={handleLogout}
                  className="w-9 h-9 rounded-xl bg-coral/10 text-coral border border-coral/20 
                             hover:bg-coral hover:text-white transition-all flex items-center justify-center group">
                  <LogOutIcon />
                </button>
              </div>
            : <Link to="/login" className="btn-primary text-sm px-5 py-2 shine-effect">
                Connexion
              </Link>
          }
        </div>
      </div>
    </header>
  )
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="grain-overlay"></div>
      
      {/* Ambient Orbs */}
      <div className="ambient-orb w-[600px] h-[600px] bg-gold/10 -top-40 -left-40"></div>
      <div className="ambient-orb w-[500px] h-[500px] bg-sky/5 top-1/2 -right-20" style={{ animationDelay: '-5s' }}></div>

      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6 relative z-10">
        {children}
      </main>

      {/* Footer Premium */}
      <footer className="relative mt-24 border-t border-gold/10 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-ink dark:bg-ink-deep" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/80 to-ink" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        <div className="relative max-w-5xl mx-auto px-8 py-16">
          {/* Top footer */}
          <div className="grid md:grid-cols-3 gap-12 mb-16">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-light to-gold-dark flex items-center justify-center">
                  <span className="text-white text-sm">✦</span>
                </div>
                <span className="font-display font-bold text-white text-lg">TripGenie</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed font-light">
                L'intelligence artificielle au service de l'exception. Chaque voyage orchestré avec la précision d'un majordome de palace.
              </p>
            </div>

            {/* Destinations */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gold font-semibold mb-5">Destinations Signatures</p>
              <ul className="space-y-2.5">
                {['Côte d\'Azur', 'Ibiza', 'Mykonos', 'Amalfi', 'Maldives', 'Saint-Tropez'].map(d => (
                  <li key={d} className="text-white/40 hover:text-gold text-sm transition-colors cursor-pointer">{d}</li>
                ))}
              </ul>
            </div>

            {/* Expériences */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gold font-semibold mb-5">Expériences</p>
              <ul className="space-y-2.5">
                {['Yachting Privé', 'Dîners Étoilés', 'Soirées VIP', 'Casinos Exclusifs', 'Villas Privées', 'Jets Privés'].map(e => (
                  <li key={e} className="text-white/40 hover:text-gold text-sm transition-colors cursor-pointer">{e}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

          {/* Bottom footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/20 text-xs font-light tracking-wider">
              © 2025 TripGenie ✦ Conciergerie Privée — Tous droits réservés
            </p>
            <p className="text-white/15 text-xs font-serif italic">
              "Le vrai luxe n'a pas de prix, il a une valeur."
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
