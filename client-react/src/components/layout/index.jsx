import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore, useThemeStore } from '../../store'

export function Header() {
  const { user, clearAuth } = useAuthStore()
  const { theme, toggle }   = useThemeStore()
  const loc = useLocation()

  return (
    <header className="sticky top-0 z-40 glass border-b border-parchment-dark dark:border-white/10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gold/20 border border-gold/40 flex items-center justify-center
                          group-hover:bg-gold/30 transition-colors">
            <span className="text-gold text-sm font-bold">✦</span>
          </div>
          <span className="font-display font-bold text-ink dark:text-parchment text-lg tracking-tight">TripGenie</span>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {[
            { to: '/',       label: 'Accueil' },
            { to: '/trips',  label: 'Mes voyages' },
          ].map(n => (
            <Link key={n.to} to={n.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${loc.pathname === n.to
                  ? 'text-ink dark:text-parchment bg-parchment-dark dark:bg-ink-light'
                  : 'text-muted hover:text-ink dark:hover:text-parchment hover:bg-parchment-dark dark:hover:bg-ink-light'
                }`}>
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button onClick={toggle}
            className="w-8 h-8 rounded-lg hover:bg-parchment-dark dark:hover:bg-ink-light transition-colors
                       text-muted hover:text-ink dark:hover:text-parchment flex items-center justify-center text-sm">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user
            ? <div className="flex items-center gap-2">
                <span className="text-sm text-muted hidden sm:block">{user.name || user.email}</span>
                <button onClick={clearAuth}
                  className="text-xs text-muted hover:text-coral transition-colors px-2 py-1">
                  Déco.
                </button>
              </div>
            : <Link to="/login" className="btn-primary text-sm px-4 py-1.5">
                Connexion
              </Link>
          }
        </div>
      </div>
    </header>
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
