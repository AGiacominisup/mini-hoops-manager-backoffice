import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useEffectEvent, useState } from 'react'
import { ApiError, getTournament, updateTournament, type TournamentStatus, type UpdateTournamentPayload } from '../api/api-client'
import { tournamentStatusKeys } from '../utils/tournament-status'
import { translate } from '../utils/translations'
import './workspace-pages.css'

interface TournamentEditPageProps {
  tournamentId: string
  token: string
  onUnauthorized: () => void
  onCancel: () => void
  onUpdated: () => void
}

interface FinalGroupInput {
  themeName: string
  level: string
}

export function TournamentEditPage({ tournamentId, token, onUnauthorized, onCancel, onUpdated }: TournamentEditPageProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [winPoints, setWinPoints] = useState('')
  const [courts, setCourts] = useState<string[]>([''])
  const [finalGroups, setFinalGroups] = useState<FinalGroupInput[]>([{ themeName: '', level: '1' }])
  const [status, setStatus] = useState<TournamentStatus>('draft')
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleUnauthorized = useEffectEvent(onUnauthorized)
  const areCourtsLocked = status !== 'draft'

  useEffect(() => {
    const controller = new AbortController()
    getTournament(tournamentId, token, controller.signal).then((tournament) => {
      setName(tournament.name)
      setCategory(tournament.category ?? '')
      setWinPoints(String(tournament.winPoints))
      setCourts(tournament.courts.length > 0 ? tournament.courts.map((court) => court.name) : [''])
      setFinalGroups(tournament.finalGroups.length > 0
        ? tournament.finalGroups.map((group) => ({ themeName: group.themeName, level: String(group.level) }))
        : [{ themeName: '', level: '1' }])
      setStatus(tournament.status)
    }).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      if (requestError instanceof ApiError && requestError.status === 401) return handleUnauthorized()
      const isNotFound = requestError instanceof ApiError && requestError.status === 404
      setIsMissing(isNotFound)
      setError(translate(isNotFound ? 'tournamentEdit.notFound' : 'tournamentEdit.loadError'))
    }).finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [tournamentId, token])

  function updateCourt(index: number, value: string) {
    setCourts((currentCourts) => currentCourts.map((court, courtIndex) => courtIndex === index ? value : court))
  }

  function updateFinalGroup(index: number, field: keyof FinalGroupInput, value: string) {
    setFinalGroups((currentGroups) => currentGroups.map((group, groupIndex) => groupIndex === index ? { ...group, [field]: value } : group))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const payload: UpdateTournamentPayload = {
      name: name.trim(),
      winPoints: Number(winPoints),
      finalGroups: finalGroups.map((group) => ({ themeName: group.themeName.trim(), level: Number(group.level) })),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(areCourtsLocked ? {} : { courts: courts.map((court) => ({ name: court.trim() })) }),
    }

    setIsSubmitting(true)
    try {
      await updateTournament(tournamentId, payload, token)
      onUpdated()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (requestError instanceof ApiError && requestError.status === 404) setError(translate('tournamentEdit.notFound'))
      else if (requestError instanceof ApiError && requestError.status === 409) setError(translate('tournamentEdit.lockedError'))
      else setError(translate('tournamentEdit.updateError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return <section className="workspace-page">
    <button className="text-action" type="button" onClick={onCancel}><ArrowLeft size={17} />{translate('tournamentEdit.back')}</button>
    <header className="page-heading"><p className="eyebrow">{translate('tournamentEdit.eyebrow')}</p><h1>{translate('tournamentEdit.title')}</h1><p>{translate('tournamentEdit.description')}</p></header>

    {isLoading ? <div className="page-state">{translate('common.loading')}</div> : isMissing ? <div className="page-state"><strong>{translate('tournamentEdit.notFound')}</strong></div> :
      <form className="tournament-form" onSubmit={handleSubmit}>
        <section className="form-section">
          <div className="form-section-heading"><div><h2>{translate('tournamentForm.details')}</h2></div></div>
          <div className="form-grid">
            <div className="form-field form-field--wide"><label htmlFor="tournament-name">{translate('tournamentForm.name')}</label><input id="tournament-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={translate('tournamentForm.namePlaceholder')} minLength={3} required autoFocus /></div>
            <div className="form-field"><label htmlFor="tournament-category">{translate('tournamentForm.category')}</label><input id="tournament-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={translate('tournamentForm.categoryPlaceholder')} /></div>
            <div className="form-field"><label htmlFor="tournament-status">{translate('tournamentEdit.status')}</label><select id="tournament-status" value={status} disabled><option value={status}>{translate(tournamentStatusKeys[status])}</option></select></div>
            <div className="form-field"><label htmlFor="tournament-win-points">{translate('tournamentForm.winPoints')}</label><input id="tournament-win-points" type="number" min="1" step="1" value={winPoints} onChange={(event) => setWinPoints(event.target.value)} required /></div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading"><div><h2>{translate('tournamentForm.courts')}</h2><p>{translate(areCourtsLocked ? 'tournamentEdit.courtsLocked' : 'tournamentForm.courtsDescription')}</p></div>{!areCourtsLocked && <button className="secondary-action" type="button" onClick={() => setCourts((currentCourts) => [...currentCourts, ''])}><Plus size={17} />{translate('tournamentForm.addCourt')}</button>}</div>
          <div className="repeater-list">{courts.map((court, index) => <div className="repeater-row repeater-row--court" key={index}><div className="form-field"><label htmlFor={`court-${index}`}>{translate('tournamentForm.courtName')}</label><input id={`court-${index}`} value={court} onChange={(event) => updateCourt(index, event.target.value)} placeholder={translate('tournamentForm.courtPlaceholder')} disabled={areCourtsLocked} required /></div><button className="remove-button" type="button" disabled={areCourtsLocked || courts.length === 1} onClick={() => setCourts((currentCourts) => currentCourts.filter((_, courtIndex) => courtIndex !== index))} aria-label={translate('common.remove')} title={translate('common.remove')}><Trash2 size={17} /></button></div>)}</div>
        </section>

        <section className="form-section">
          <div className="form-section-heading"><div><h2>{translate('tournamentForm.finalGroups')}</h2><p>{translate('tournamentForm.finalGroupsDescription')}</p></div><button className="secondary-action" type="button" onClick={() => setFinalGroups((currentGroups) => [...currentGroups, { themeName: '', level: String(currentGroups.length + 1) }])}><Plus size={17} />{translate('tournamentForm.addGroup')}</button></div>
          <div className="repeater-list">{finalGroups.map((group, index) => <div className="repeater-row" key={index}><div className="form-field"><label htmlFor={`group-name-${index}`}>{translate('tournamentForm.groupName')}</label><input id={`group-name-${index}`} value={group.themeName} onChange={(event) => updateFinalGroup(index, 'themeName', event.target.value)} placeholder={translate('tournamentForm.groupPlaceholder')} required /></div><div className="form-field"><label htmlFor={`group-level-${index}`}>{translate('tournamentForm.groupLevel')}</label><input id={`group-level-${index}`} type="number" min="1" step="1" value={group.level} onChange={(event) => updateFinalGroup(index, 'level', event.target.value)} required /></div><button className="remove-button" type="button" disabled={finalGroups.length === 1} onClick={() => setFinalGroups((currentGroups) => currentGroups.filter((_, groupIndex) => groupIndex !== index))} aria-label={translate('common.remove')} title={translate('common.remove')}><Trash2 size={17} /></button></div>)}</div>
        </section>

        {error && <p className="page-error" role="alert">{error}</p>}
        <div className="form-actions"><button className="secondary-action" type="button" onClick={onCancel}>{translate('tournamentForm.cancel')}</button><button className="primary-action" type="submit" disabled={isSubmitting}>{translate(isSubmitting ? 'tournamentEdit.submitting' : 'tournamentEdit.submit')}</button></div>
      </form>}
  </section>
}
