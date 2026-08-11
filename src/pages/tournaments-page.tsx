import { Plus } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError, getTournaments, type Tournament, type TournamentStatus } from '../api/api-client'
import { translate, type TranslationKey } from '../utils/translations'
import './workspace-pages.css'

interface TournamentsPageProps { token: string; onUnauthorized: () => void; onCreate: () => void }

const statusKeys: Record<TournamentStatus, TranslationKey> = { planned: 'tournaments.planned', in_progress: 'tournaments.inProgress', completed: 'tournaments.completed' }
const dateFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

export function TournamentsPage({ token, onUnauthorized, onCreate }: TournamentsPageProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const handleUnauthorized = useEffectEvent(onUnauthorized)

  useEffect(() => {
    const controller = new AbortController()
    getTournaments(token, controller.signal).then(setTournaments).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      if (requestError instanceof ApiError && requestError.status === 401) return handleUnauthorized()
      setError(translate('tournaments.loadError'))
    }).finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [token])

  return <section className="workspace-page">
    <div className="page-heading-row">
      <header className="page-heading"><p className="eyebrow">{translate('tournaments.eyebrow')}</p><h1>{translate('tournaments.title')}</h1><p>{translate('tournaments.description')}</p></header>
      <button className="primary-action" type="button" onClick={onCreate}><Plus size={18} />{translate('tournaments.create')}</button>
    </div>
    {error && <p className="page-error" role="alert">{error}</p>}
    {isLoading ? <div className="page-state">{translate('common.loading')}</div> : tournaments.length === 0 ? <div className="page-state"><strong>{translate('tournaments.emptyTitle')}</strong><p>{translate('tournaments.emptyDescription')}</p></div> :
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{translate('tournaments.name')}</th><th>{translate('tournaments.category')}</th><th>{translate('tournaments.dates')}</th><th>{translate('tournaments.status')}</th></tr></thead><tbody>{tournaments.map((tournament) => <tr key={tournament._id}><td><strong>{tournament.name}</strong></td><td>{tournament.category ?? translate('common.notAvailable')}</td><td>{dateFormatter.format(new Date(tournament.startDate))} – {dateFormatter.format(new Date(tournament.endDate))}</td><td><span className={`status-badge status-badge--${tournament.status}`}>{translate(statusKeys[tournament.status])}</span></td></tr>)}</tbody></table></div>}
  </section>
}