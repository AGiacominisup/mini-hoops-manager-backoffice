import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError, getPlayers, type Player } from '../api/api-client'
import { translate } from '../utils/translations'
import './workspace-pages.css'

interface PlayersPageProps { token: string; onUnauthorized: () => void }
const dateFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

export function PlayersPage({ token, onUnauthorized }: PlayersPageProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const handleUnauthorized = useEffectEvent(onUnauthorized)

  useEffect(() => {
    const controller = new AbortController()
    getPlayers(token, controller.signal).then(setPlayers).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      if (requestError instanceof ApiError && requestError.status === 401) return handleUnauthorized()
      setError(translate('players.loadError'))
    }).finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [token])

  return <section className="workspace-page">
    <header className="page-heading"><p className="eyebrow">{translate('players.eyebrow')}</p><h1>{translate('players.title')}</h1><p>{translate('players.description')}</p></header>
    {error && <p className="page-error" role="alert">{error}</p>}
    {isLoading ? <div className="page-state">{translate('common.loading')}</div> : players.length === 0 ? <div className="page-state"><strong>{translate('players.emptyTitle')}</strong><p>{translate('players.emptyDescription')}</p></div> :
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{translate('players.name')}</th><th>{translate('players.birthDate')}</th><th>{translate('players.contact')}</th></tr></thead><tbody>{players.map((player) => <tr key={player._id}><td><strong>{[player.firstName, player.lastName].filter(Boolean).join(' ') || translate('common.notAvailable')}</strong></td><td>{player.birthDate ? dateFormatter.format(new Date(player.birthDate)) : translate('common.notAvailable')}</td><td>{player.guardianContact ?? translate('common.notAvailable')}</td></tr>)}</tbody></table></div>}
  </section>
}