import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { ApiError, createTournament } from '../api/api-client'
import { translate } from '../utils/translations'
import './workspace-pages.css'

interface TournamentCreatePageProps {
  token: string
  onUnauthorized: () => void
  onCancel: () => void
  onCreated: () => void
}

interface FinalGroupInput {
  themeName: string
  level: string
}

export function TournamentCreatePage({ token, onUnauthorized, onCancel, onCreated }: TournamentCreatePageProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [winPoints, setWinPoints] = useState('10')
  const [courts, setCourts] = useState([''])
  const [finalGroups, setFinalGroups] = useState<FinalGroupInput[]>([{ themeName: '', level: '1' }])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateCourt(index: number, value: string) {
    setCourts((currentCourts) => currentCourts.map((court, courtIndex) => courtIndex === index ? value : court))
  }

  function updateFinalGroup(index: number, field: keyof FinalGroupInput, value: string) {
    setFinalGroups((currentGroups) => currentGroups.map((group, groupIndex) => groupIndex === index ? { ...group, [field]: value } : group))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    setIsSubmitting(true)
    try {
      await createTournament({
        name: name.trim(),
        ...(startDate ? { startDate: `${startDate}T00:00:00.000Z` } : {}),
        ...(endDate ? { endDate: `${endDate}T23:59:59.999Z` } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        winPoints: Number(winPoints),
        courts: courts.map((court) => ({ name: court.trim() })),
        finalGroups: finalGroups.map((group) => ({ themeName: group.themeName.trim(), level: Number(group.level) })),
      }, token)
      onCreated()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      setError(translate('tournamentCreate.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return <section className="workspace-page">
    <button className="text-action" type="button" onClick={onCancel}><ArrowLeft size={17} />{translate('tournamentCreate.back')}</button>
    <header className="page-heading"><p className="eyebrow">{translate('tournamentCreate.eyebrow')}</p><h1>{translate('tournamentCreate.title')}</h1><p>{translate('tournamentCreate.description')}</p></header>

    <form className="tournament-form" onSubmit={handleSubmit}>
      <section className="form-section">
        <div className="form-section-heading"><div><h2>{translate('tournamentForm.details')}</h2></div></div>
        <div className="form-grid">
          <div className="form-field form-field--wide"><label htmlFor="tournament-name">{translate('tournamentForm.name')}</label><input id="tournament-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={translate('tournamentForm.namePlaceholder')} required autoFocus /></div>
          <div className="form-field"><label htmlFor="tournament-category">{translate('tournamentForm.category')}</label><input id="tournament-category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder={translate('tournamentForm.categoryPlaceholder')} /></div>
          <div className="form-field"><label htmlFor="tournament-start-date">{translate('tournamentForm.startDate')}</label><input id="tournament-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="tournament-end-date">{translate('tournamentForm.endDate')}</label><input id="tournament-end-date" type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="tournament-status">{translate('tournamentCreate.status')}</label><select id="tournament-status" value="draft" disabled><option value="draft">{translate('tournaments.draft')}</option></select></div>
          <div className="form-field"><label htmlFor="tournament-win-points">{translate('tournamentForm.winPoints')}</label><input id="tournament-win-points" type="number" min="1" step="1" value={winPoints} onChange={(event) => setWinPoints(event.target.value)} required /></div>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-heading"><div><h2>{translate('tournamentForm.courts')}</h2><p>{translate('tournamentForm.courtsDescription')}</p></div><button className="secondary-action" type="button" onClick={() => setCourts((currentCourts) => [...currentCourts, ''])}><Plus size={17} />{translate('tournamentForm.addCourt')}</button></div>
        <div className="repeater-list">{courts.map((court, index) => <div className="repeater-row repeater-row--court" key={index}><div className="form-field"><label htmlFor={`court-${index}`}>{translate('tournamentForm.courtName')}</label><input id={`court-${index}`} value={court} onChange={(event) => updateCourt(index, event.target.value)} placeholder={translate('tournamentForm.courtPlaceholder')} required /></div><button className="remove-button" type="button" disabled={courts.length === 1} onClick={() => setCourts((currentCourts) => currentCourts.filter((_, courtIndex) => courtIndex !== index))} aria-label={translate('common.remove')} title={translate('common.remove')}><Trash2 size={17} /></button></div>)}</div>
      </section>

      <section className="form-section">
        <div className="form-section-heading"><div><h2>{translate('tournamentForm.finalGroups')}</h2><p>{translate('tournamentForm.finalGroupsDescription')}</p></div><button className="secondary-action" type="button" onClick={() => setFinalGroups((currentGroups) => [...currentGroups, { themeName: '', level: String(currentGroups.length + 1) }])}><Plus size={17} />{translate('tournamentForm.addGroup')}</button></div>
        <div className="repeater-list">{finalGroups.map((group, index) => <div className="repeater-row" key={index}><div className="form-field"><label htmlFor={`group-name-${index}`}>{translate('tournamentForm.groupName')}</label><input id={`group-name-${index}`} value={group.themeName} onChange={(event) => updateFinalGroup(index, 'themeName', event.target.value)} placeholder={translate('tournamentForm.groupPlaceholder')} required /></div><div className="form-field"><label htmlFor={`group-level-${index}`}>{translate('tournamentForm.groupLevel')}</label><input id={`group-level-${index}`} type="number" min="1" step="1" value={group.level} onChange={(event) => updateFinalGroup(index, 'level', event.target.value)} required /></div><button className="remove-button" type="button" disabled={finalGroups.length === 1} onClick={() => setFinalGroups((currentGroups) => currentGroups.filter((_, groupIndex) => groupIndex !== index))} aria-label={translate('common.remove')} title={translate('common.remove')}><Trash2 size={17} /></button></div>)}</div>
      </section>

      {error && <p className="page-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="secondary-action" type="button" onClick={onCancel}>{translate('tournamentForm.cancel')}</button><button className="primary-action" type="submit" disabled={isSubmitting}>{translate(isSubmitting ? 'tournamentCreate.submitting' : 'tournamentCreate.submit')}</button></div>
    </form>
  </section>
}