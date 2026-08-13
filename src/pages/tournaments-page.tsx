import { LayoutDashboard, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { ApiError, deleteTournament, getTournaments, type Tournament } from '../api/api-client'
import { ConfirmDialog } from '../components/confirm-dialog'
import { tournamentStatusKeys } from '../utils/tournament-status'
import { translate } from '../utils/translations'
import './workspace-pages.css'

interface TournamentsPageProps { token: string; onUnauthorized: () => void; onCreate: () => void; onOpen: (tournamentId: string) => void; onEdit: (tournamentId: string) => void }

export function TournamentsPage({ token, onUnauthorized, onCreate, onOpen, onEdit }: TournamentsPageProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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

  async function handleConfirmDelete() {
    if (!tournamentToDelete) return
    setError('')
    setIsDeleting(true)
    try {
      await deleteTournament(tournamentToDelete._id, token)
      setTournaments((currentTournaments) => currentTournaments.filter((tournament) => tournament._id !== tournamentToDelete._id))
      setTournamentToDelete(null)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (requestError instanceof ApiError && requestError.status === 409) setError(translate('tournaments.deleteConflict'))
      else if (requestError instanceof ApiError && requestError.status === 404) setError(translate('tournaments.deleteNotFound'))
      else setError(translate('tournaments.deleteError'))
      setTournamentToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return <section className="workspace-page">
    <div className="page-heading-row">
      <header className="page-heading"><p className="eyebrow">{translate('tournaments.eyebrow')}</p><h1>{translate('tournaments.title')}</h1><p>{translate('tournaments.description')}</p></header>
      <button className="primary-action" type="button" onClick={onCreate}><Plus size={18} />{translate('tournaments.create')}</button>
    </div>
    {error && <p className="page-error" role="alert">{error}</p>}
    {isLoading ? <div className="page-state">{translate('common.loading')}</div> : tournaments.length === 0 ? <div className="page-state"><strong>{translate('tournaments.emptyTitle')}</strong><p>{translate('tournaments.emptyDescription')}</p></div> :
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{translate('tournaments.name')}</th><th>{translate('tournaments.category')}</th><th>{translate('tournaments.status')}</th><th className="actions-column">{translate('tournaments.actions')}</th></tr></thead><tbody>{tournaments.map((tournament) => <tr key={tournament._id}><td><button className="table-link" type="button" onClick={() => onOpen(tournament._id)}>{tournament.name}</button></td><td>{tournament.category ?? translate('common.notAvailable')}</td><td><span className={`status-badge status-badge--${tournament.status}`}>{translate(tournamentStatusKeys[tournament.status])}</span></td><td className="actions-column"><div className="row-actions">
        <button className="icon-action" type="button" onClick={() => onOpen(tournament._id)} title={translate('tournaments.open')} aria-label={translate('tournaments.open')}><LayoutDashboard size={16} /></button>
        <button className="icon-action" type="button" onClick={() => onEdit(tournament._id)} title={translate('tournaments.edit')} aria-label={translate('tournaments.edit')}><Pencil size={16} /></button>
        <button className="icon-action icon-action--danger" type="button" onClick={() => setTournamentToDelete(tournament)} title={translate('tournaments.delete')} aria-label={translate('tournaments.delete')}><Trash2 size={16} /></button>
      </div></td></tr>)}</tbody></table></div>}
    {tournamentToDelete && <ConfirmDialog
      title={translate('tournaments.deleteTitle')}
      description={translate('tournaments.deleteDescription')}
      subject={tournamentToDelete.name}
      confirmLabel={translate(isDeleting ? 'tournaments.deleting' : 'tournaments.deleteConfirm')}
      cancelLabel={translate('tournaments.deleteCancel')}
      isConfirming={isDeleting}
      onConfirm={handleConfirmDelete}
      onCancel={() => setTournamentToDelete(null)}
    />}
  </section>
}
