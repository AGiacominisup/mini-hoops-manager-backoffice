import { ArrowLeft } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { ApiError, createPlayer, type CreatePlayerPayload } from '../api/api-client'
import { parseJerseyNumber, sanitizeJerseyNumberInput } from '../utils/jersey-number'
import { translate } from '../utils/translations'
import './workspace-pages.css'

interface PlayerCreatePageProps {
  token: string
  onUnauthorized: () => void
  onCancel: () => void
  onCreated: () => void
}

export function PlayerCreatePage({ token, onUnauthorized, onCancel, onCreated }: PlayerCreatePageProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [guardianContact, setGuardianContact] = useState('')
  const [skillRating, setSkillRating] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const parsedJerseyNumber = parseJerseyNumber(jerseyNumber)
    if (jerseyNumber.trim() && !parsedJerseyNumber) {
      setError(translate('playerForm.jerseyNumberInvalid'))
      return
    }

    const payload: CreatePlayerPayload = {
      ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
      ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
      ...(parsedJerseyNumber ? { jerseyNumber: parsedJerseyNumber } : {}),
      ...(birthDate ? { birthDate: `${birthDate}T00:00:00.000Z` } : {}),
      ...(guardianContact.trim() ? { guardianContact: guardianContact.trim() } : {}),
      ...(skillRating ? { skillRating: Number(skillRating) } : {}),
    }

    if (Object.keys(payload).length === 0) {
      setError(translate('playerForm.emptyPayload'))
      return
    }

    setIsSubmitting(true)
    try {
      await createPlayer(payload, token)
      onCreated()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      setError(translate('playerCreate.createError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return <section className="workspace-page">
    <button className="text-action" type="button" onClick={onCancel}><ArrowLeft size={17} />{translate('playerCreate.back')}</button>
    <header className="page-heading"><p className="eyebrow">{translate('playerCreate.eyebrow')}</p><h1>{translate('playerCreate.title')}</h1><p>{translate('playerCreate.description')}</p></header>

    <form className="tournament-form" onSubmit={handleSubmit}>
      <section className="form-section">
        <div className="form-section-heading"><div><h2>{translate('playerForm.details')}</h2></div></div>
        <div className="form-grid">
          <div className="form-field"><label htmlFor="player-first-name">{translate('playerForm.firstName')}</label><input id="player-first-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder={translate('playerForm.firstNamePlaceholder')} autoFocus /></div>
          <div className="form-field"><label htmlFor="player-last-name">{translate('playerForm.lastName')}</label><input id="player-last-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder={translate('playerForm.lastNamePlaceholder')} /></div>
          <div className="form-field"><label htmlFor="player-jersey-number">{translate('playerForm.jerseyNumber')}</label><input id="player-jersey-number" type="text" inputMode="numeric" autoComplete="off" maxLength={2} pattern="\d{1,2}" value={jerseyNumber} onChange={(event) => setJerseyNumber(sanitizeJerseyNumberInput(event.target.value))} placeholder={translate('playerForm.jerseyNumberPlaceholder')} /></div>
          <div className="form-field"><label htmlFor="player-birth-date">{translate('playerForm.birthDate')}</label><input id="player-birth-date" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="player-guardian-contact">{translate('playerForm.guardianContact')}</label><input id="player-guardian-contact" type="tel" autoComplete="tel" value={guardianContact} onChange={(event) => setGuardianContact(event.target.value)} placeholder={translate('playerForm.guardianContactPlaceholder')} /></div>
          <div className="form-field"><label htmlFor="player-skill-rating">{translate('playerForm.skillRating')}</label><input id="player-skill-rating" type="number" min="0" max="10" step="1" inputMode="numeric" value={skillRating} onChange={(event) => setSkillRating(event.target.value)} placeholder={translate('playerForm.skillRatingPlaceholder')} /></div>
        </div>
      </section>

      {error && <p className="page-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="secondary-action" type="button" onClick={onCancel}>{translate('playerForm.cancel')}</button><button className="primary-action" type="submit" disabled={isSubmitting}>{translate(isSubmitting ? 'playerCreate.submitting' : 'playerCreate.submit')}</button></div>
    </form>
  </section>
}