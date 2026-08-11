import { type FormEvent, useEffect, useState } from 'react'
import { ApiError, type AuthSession, getDashboardCounts, login } from './api'
import './backoffice.css'

const SESSION_KEY = 'mini-hoops-backoffice-session'

function ProductLogo({ onDark = false }: { onDark?: boolean }) {
  return (
    <img
      className={`product-logo${onDark ? ' on-dark' : ''}`}
      src="/minihmlogo.png"
      alt="Mini Hoops Manager"
    />
  )
}

function Login({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const session = await login(email.trim(), password)
      onLogin(session)
    } catch (loginError) {
      setError(
        loginError instanceof ApiError && loginError.status === 401
          ? 'Credenziali non valide. Controlla i dati e riprova.'
          : loginError instanceof Error
            ? loginError.message
            : 'Non è stato possibile contattare il server.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="brand-panel" aria-label="Mini Hoops Manager">
        <ProductLogo onDark />
        <div className="brand-message">
          <p className="eyebrow">BACKOFFICE</p>
          <h1>Il gioco si prepara qui.</h1>
          <p className="brand-copy">Organizza il campionato, aggiorna i risultati e tieni ogni squadra sotto controllo.</p>
        </div>
        <p className="season-label">STAGIONE 2026</p>
      </section>

      <section className="login-panel">
        <div className="login-content">
          <div className="mobile-brand"><ProductLogo /></div>
          <div className="login-heading">
            <p className="eyebrow">AREA RISERVATA</p>
            <h2>Bentornato</h2>
            <p>Accedi per gestire il tuo campionato.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@esempio.it" required autoFocus />

            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Inserisci la password" required />
              <button className="visibility-button" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}>
                {showPassword ? 'Nascondi' : 'Mostra'}
              </button>
            </div>

            <p className="form-error" role="alert" aria-live="polite">{error}</p>
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Verifica in corso...' : 'Accedi'}<span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="security-note"><span aria-hidden="true">●</span> Sessione protetta su questo dispositivo</p>
        </div>
      </section>
    </main>
  )
}

function Dashboard({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [counts, setCounts] = useState({ tournaments: 0, players: 0, matches: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    getDashboardCounts(session.token, controller.signal)
      .then(setCounts)
      .catch((dashboardError: unknown) => {
        if (dashboardError instanceof DOMException && dashboardError.name === 'AbortError') return
        if (dashboardError instanceof ApiError && dashboardError.status === 401) {
          onLogout()
          return
        }
        setError('Non è stato possibile aggiornare il riepilogo.')
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [session.token, onLogout])

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="brand-lockup dark"><ProductLogo onDark /><small>BACKOFFICE</small></div>
        <button type="button" className="logout-button" onClick={onLogout}>Esci</button>
      </header>
      <section className="dashboard-content">
        <p className="eyebrow">PANORAMICA</p>
        <h1>Bentornato.</h1>
        <p className="dashboard-intro">{session.user.email} · {session.user.role}</p>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        <div className="stats-grid">
          <article><span>Tornei</span><strong>{isLoading ? '—' : counts.tournaments}</strong><p>Tornei registrati</p></article>
          <article><span>Giocatori</span><strong>{isLoading ? '—' : counts.players}</strong><p>Giocatori registrati</p></article>
          <article><span>Partite</span><strong>{isLoading ? '—' : counts.matches}</strong><p>Partite complessive</p></article>
        </div>
      </section>
    </main>
  )
}

export default function Backoffice() {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY)
    if (!storedSession) return null

    try {
      return JSON.parse(storedSession) as AuthSession
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
  })

  function authenticate(authSession: AuthSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authSession))
    setSession(authSession)
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return session ? <Dashboard session={session} onLogout={logout} /> : <Login onLogin={authenticate} />
}