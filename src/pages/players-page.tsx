import { Pencil, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError, deletePlayer, getPlayers, type Player } from '../api/api-client'
import { ConfirmDialog } from '../components/confirm-dialog'
import { formatPlayerName } from '../utils/player-name'
import { translate } from '../utils/translations'
import './workspace-pages.css'

interface PlayersPageProps { token: string; onUnauthorized: () => void; onCreate: () => void; onEdit: (playerId: string) => void }
const dateFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

export function PlayersPage({ token, onUnauthorized, onCreate, onEdit }: PlayersPageProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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

  async function handleConfirmDelete() {
    if (!playerToDelete) return
    setError('')
    setIsDeleting(true)
    try {
      await deletePlayer(playerToDelete._id, token)
      setPlayers((currentPlayers) => currentPlayers.filter((player) => player._id !== playerToDelete._id))
      setPlayerToDelete(null)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (requestError instanceof ApiError && requestError.status === 409) setError(translate('players.deleteConflict'))
      else if (requestError instanceof ApiError && requestError.status === 404) setError(translate('players.deleteNotFound'))
      else setError(translate('players.deleteError'))
      setPlayerToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return <section className="workspace-page">
    <div className="page-heading-row">
      <header className="page-heading"><p className="eyebrow">{translate('players.eyebrow')}</p><h1>{translate('players.title')}</h1><p>{translate('players.description')}</p></header>
      <button className="primary-action" type="button" onClick={onCreate}><UserPlus size={18} />{translate('players.create')}</button>
    </div>
    {error && <p className="page-error" role="alert">{error}</p>}
    {isLoading ? <div className="page-state">{translate('common.loading')}</div> : players.length === 0 ? <div className="page-state"><strong>{translate('players.emptyTitle')}</strong><p>{translate('players.emptyDescription')}</p></div> :
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{translate('players.name')}</th><th>{translate('players.jerseyNumber')}</th><th>{translate('players.birthDate')}</th><th>{translate('players.contact')}</th><th className="actions-column">{translate('players.actions')}</th></tr></thead><tbody>{players.map((player) => <tr key={player._id}><td><strong>{formatPlayerName(player)}</strong></td><td>{player.jerseyNumber ?? translate('common.notAvailable')}</td><td>{player.birthDate ? dateFormatter.format(new Date(player.birthDate)) : translate('common.notAvailable')}</td><td>{player.guardianContact ?? translate('common.notAvailable')}</td><td className="actions-column"><div className="row-actions">
        <button className="icon-action" type="button" onClick={() => onEdit(player._id)} title={translate('players.edit')} aria-label={translate('players.edit')}><Pencil size={16} /></button>
        <button className="icon-action icon-action--danger" type="button" onClick={() => setPlayerToDelete(player)} title={translate('players.delete')} aria-label={translate('players.delete')}><Trash2 size={16} /></button>
      </div></td></tr>)}</tbody></table></div>}
    {playerToDelete && <ConfirmDialog
      title={translate('players.deleteTitle')}
      description={translate('players.deleteDescription')}
      subject={formatPlayerName(playerToDelete)}
      confirmLabel={translate(isDeleting ? 'players.deleting' : 'players.deleteConfirm')}
      cancelLabel={translate('players.deleteCancel')}
      isConfirming={isDeleting}
      onConfirm={handleConfirmDelete}
      onCancel={() => setPlayerToDelete(null)}
    />}
  </section>
}
