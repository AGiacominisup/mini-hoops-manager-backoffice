import { CalendarDays, Trophy, Users } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError, getDashboardCounts } from '../api/api-client'
import { translate } from '../utils/translations'
import './workspace-pages.css'

interface HomePageProps { token: string; onUnauthorized: () => void }

export function HomePage({ token, onUnauthorized }: HomePageProps) {
  const [counts, setCounts] = useState({ tournaments: 0, players: 0, matches: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const handleUnauthorized = useEffectEvent(onUnauthorized)

  useEffect(() => {
    const controller = new AbortController()
    getDashboardCounts(token, controller.signal).then(setCounts).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      if (requestError instanceof ApiError && requestError.status === 401) return handleUnauthorized()
      setError(translate('home.error'))
    }).finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [token])

  const cards = [
    { label: translate('home.tournaments'), detail: translate('home.registeredTournaments'), value: counts.tournaments, icon: Trophy },
    { label: translate('home.players'), detail: translate('home.registeredPlayers'), value: counts.players, icon: Users },
    { label: translate('home.matches'), detail: translate('home.totalMatches'), value: counts.matches, icon: CalendarDays },
  ]

  return <section className="workspace-page">
    <header className="page-heading"><p className="eyebrow">{translate('home.eyebrow')}</p><h1>{translate('home.title')}</h1><p>{translate('home.description')}</p></header>
    {error && <p className="page-error" role="alert">{error}</p>}
    <div className="summary-grid">{cards.map(({ label, detail, value, icon: Icon }) => <article className="summary-card" key={label}><div className="summary-icon"><Icon size={20} /></div><span>{label}</span><strong>{isLoading ? '—' : value}</strong><p>{detail}</p></article>)}</div>
  </section>
}