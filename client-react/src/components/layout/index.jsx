import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore, useThemeStore } from '../../store'

export function Header() {
  const { user, clearAuth } = useAuthStore()
  const { theme, toggle }   = useThemeStore()
  const loc = useLocation()

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-ink/70 backdrop-blur-md border-b border-gold/10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center
                          shadow-glow-gold transition-transform group-hover:scale-105">
            <span className="text-white text-sm">✦</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-ink dark:text-parchment text-lg leading-none tracking-tight">TripGenie</span>
            <span className="text-[10px] text-gold font-semibold uppercase tracking-widest mt-0.5">Premium Travel</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center bg-parchment-dark/50 dark:bg-ink-light/50 p-1 rounded-xl border border-gold/10">
          {[
            { to: '/',       label: 'Accueil' },
            { to: '/trips',  label: 'Mes voyages' },
          ].map(n => (
            <Link key={n.to} to={n.to}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
                ${loc.pathname === n.to
                  ? 'text-ink dark:text-parchment bg-white dark:bg-ink-light shadow-sm'
                  : 'text-muted hover:text-ink dark:hover:text-parchment'
                }`}>
              {n.label}
            </Link>
          ))}
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
                <button onClick={clearAuth}
                  className="w-9 h-9 rounded-xl bg-coral/10 text-coral border border-coral/20 
                             hover:bg-coral hover:text-white transition-all flex items-center justify-center group">
                  <LogOutIcon />
                </button>
              </div>
            : <Link to="/login" className="btn-primary text-sm px-5 py-2">
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

export function PageLayout({ children }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
