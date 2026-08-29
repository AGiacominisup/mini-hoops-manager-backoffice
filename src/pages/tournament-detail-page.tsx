import { ArrowLeft, Eye, Flag, Pencil, Play, Trash2, UserPlus, X, Zap } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import {
  addTournamentRegistrations,
  ApiError,
  assignMatchToCourt,
  generateFinals,
  getAvailablePlayers,
  getPlayers,
  getTournament,
  getTournamentMatches,
  getTournamentRegistrations,
  getTournamentSetup,
  getMatchReport,
  getMatch,
  getMatchRefereeAvailability,
  getMatchRefereeUser,
  getMatchRefereeUserId,
  assignMatchReferee,
  removeTournamentRegistrations,
  startTournament,
  type FinalsReadiness,
  type Match,
  type MatchReport,
  type RefereeAvailability,
  type MatchPlayer,
  type Player,
  type Registration,
  type Tournament,
} from '../api/api-client'
import { ConfirmDialog } from '../components/confirm-dialog'
import { FinalMatchStats } from '../components/final-match-stats'
import { MatchReportBoxScore } from '../components/match-report-box-score'
import { attendanceStatusKeys } from '../utils/attendance-status'
import { matchPhaseKeys, matchStatusKeys } from '../utils/match-status'
import { findDuplicateIdentityKeys, getPlayerIdentity, type PlayerIdentity } from '../utils/player-identity'
import { formatPlayerLabel } from '../utils/player-name'
import { formatRefereeName } from '../utils/referee-name'
import { tournamentStatusKeys } from '../utils/tournament-status'
import { translate, type TranslationKey } from '../utils/translations'
import './workspace-pages.css'

interface TournamentDetailPageProps {
  tournamentId: string
  token: string
  onUnauthorized: () => void
  onBack: () => void
  onEdit: (tournamentId: string) => void
}

interface RosterRow {
  registration: Registration
  label: string
  identity: PlayerIdentity | null
}

type PhaseTab = 'qualification' | 'finals'

function sortMatchesByQueue(matches: Match[]) {
  return [...matches].sort((first, second) =>
    (first.queuePosition ?? Number.MAX_SAFE_INTEGER) - (second.queuePosition ?? Number.MAX_SAFE_INTEGER)
    || (first.scheduledAt ?? '').localeCompare(second.scheduledAt ?? ''))
}

const dateFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function formatDate(value?: string) {
  return value ? dateFormatter.format(new Date(value)) : translate('common.notAvailable')
}

function getRegistrationLosses(registration: Registration) {
  return Math.max(0, registration.matchesPlayed - registration.wins)
}

export function TournamentDetailPage({ tournamentId, token, onUnauthorized, onBack, onEdit }: TournamentDetailPageProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)
  const [error, setError] = useState('')
  const [isSelectionOpen, setIsSelectionOpen] = useState(false)
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [isLoadingAvailablePlayers, setIsLoadingAvailablePlayers] = useState(false)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [registrationToRemove, setRegistrationToRemove] = useState<RosterRow | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isGenerateFinalsDialogOpen, setIsGenerateFinalsDialogOpen] = useState(false)
  const [isGeneratingFinals, setIsGeneratingFinals] = useState(false)
  const [finalsReadiness, setFinalsReadiness] = useState<FinalsReadiness | null>(null)
  const [activePhaseTab, setActivePhaseTab] = useState<PhaseTab>('qualification')
  const [matchToAssign, setMatchToAssign] = useState<Match | null>(null)
  const [selectedCourtId, setSelectedCourtId] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [matchInDrawer, setMatchInDrawer] = useState<Match | null>(null)
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null)
  const [isLoadingMatchReport, setIsLoadingMatchReport] = useState(false)
  const [refereeCandidates, setRefereeCandidates] = useState<RefereeAvailability[]>([])
  const [draftRefereeId, setDraftRefereeId] = useState('')
  const [assignedReferee, setAssignedReferee] = useState<RefereeAvailability | null>(null)
  const [isLoadingReferees, setIsLoadingReferees] = useState(false)
  const [isAssigningReferee, setIsAssigningReferee] = useState(false)
  const [drawerError, setDrawerError] = useState('')
  const [finalReportsByMatchId, setFinalReportsByMatchId] = useState<Record<string, MatchReport>>({})
  const [isLoadingFinalReports, setIsLoadingFinalReports] = useState(false)
  const handleUnauthorized = useEffectEvent(onUnauthorized)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getTournament(tournamentId, token, controller.signal),
      getTournamentRegistrations(tournamentId, token, controller.signal),
      getPlayers(token, controller.signal),
      getTournamentMatches(tournamentId, token, controller.signal),
      getTournamentSetup(tournamentId, token, controller.signal),
    ]).then(([loadedTournament, loadedRegistrations, loadedPlayers, loadedMatches, loadedSetup]) => {
      const nextTournament = loadedSetup.tournament ?? loadedTournament
      setTournament(nextTournament)
      setRegistrations(loadedRegistrations)
      setPlayers(loadedPlayers)
      setMatches(loadedMatches)
      setFinalsReadiness(loadedSetup.finalsReadiness)
      const hasGeneratedFinals = (nextTournament.finals?.totalMatches ?? 0) > 0
        || nextTournament.status === 'finals'
        || nextTournament.status === 'completed'
      setActivePhaseTab(hasGeneratedFinals ? 'finals' : 'qualification')
    }).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      if (requestError instanceof ApiError && requestError.status === 401) return handleUnauthorized()
      const isNotFound = requestError instanceof ApiError && requestError.status === 404
      setIsMissing(isNotFound)
      setError(translate(isNotFound ? 'tournamentDetail.notFound' : 'tournamentDetail.loadError'))
    }).finally(() => setIsLoading(false))
    return () => controller.abort()
  }, [tournamentId, token])

  const playersById = useMemo(() => new Map(players.map((player) => [player._id, player])), [players])
  const courtNamesById = useMemo(() => new Map((tournament?.courts ?? []).map((court) => [court._id, court.name])), [tournament])
  const finalGroupNamesById = useMemo(() => new Map((tournament?.finalGroups ?? []).map((group) => [group._id, group.themeName])), [tournament])

  const rosterRows = useMemo<RosterRow[]>(() => registrations
    .map((registration) => {
      const player = playersById.get(registration.playerId)
      return {
        registration,
        label: formatPlayerLabel(player, registration.jerseyNumber),
        identity: getPlayerIdentity(player, registration.jerseyNumber),
      }
    })
    .sort((first, second) => first.label.localeCompare(second.label, 'it')), [registrations, playersById])

  const rosterLabelsByRegistrationId = useMemo(() => new Map(rosterRows.map((row) => [row.registration._id, row.label])), [rosterRows])
  const rosterIdentityKeys = useMemo(() => new Set(rosterRows.flatMap((row) => row.identity ? [row.identity.key] : [])), [rosterRows])
  const duplicateIdentityKeys = useMemo(() => findDuplicateIdentityKeys(rosterRows.map((row) => row.identity)), [rosterRows])

  const selectedIdentityOwners = useMemo(() => {
    const owners = new Map<string, string>()
    for (const player of availablePlayers) {
      if (!selectedPlayerIds.includes(player._id)) continue
      const identity = getPlayerIdentity(player)
      if (identity && !owners.has(identity.key)) owners.set(identity.key, player._id)
    }
    return owners
  }, [availablePlayers, selectedPlayerIds])

  const qualificationMatches = useMemo(
    () => sortMatchesByQueue(matches.filter((match) => match.phase === 'qualification')),
    [matches],
  )
  const finalMatches = useMemo(
    () => sortMatchesByQueue(matches.filter((match) => match.phase === 'final')),
    [matches],
  )

  const standingsRows = useMemo(() => [...rosterRows].sort((first, second) =>
    second.registration.rankingPoints - first.registration.rankingPoints
    || second.registration.wins - first.registration.wins
    || second.registration.pointsMade - first.registration.pointsMade
    || second.registration.assists - first.registration.assists
    || first.registration.fouls - second.registration.fouls), [rosterRows])

  const completedFinalMatches = useMemo(
    () => finalMatches.filter((match) => match.status === 'completed'),
    [finalMatches],
  )
  const reportedFinalMatches = useMemo(
    () => completedFinalMatches.filter((match) => finalReportsByMatchId[match._id]),
    [completedFinalMatches, finalReportsByMatchId],
  )

  const isDraft = tournament?.status === 'draft'
  const isQualification = tournament?.status === 'qualification'
  const hasGeneratedFinals = (tournament?.finals?.totalMatches ?? 0) > 0
    || tournament?.status === 'finals'
    || tournament?.status === 'completed'
  const activeRegistrations = registrations.filter((registration) => registration.attendanceStatus !== 'withdrawn')
  const checkedInRegistrations = registrations.filter((registration) => registration.attendanceStatus === 'checked_in')
  const hasEnabledCourt = (tournament?.courts ?? []).some((court) => court.enabled !== false)
  const canStart = Boolean(tournament) && isDraft && hasEnabledCourt && activeRegistrations.length >= (tournament?.configuration.playersPerMatch ?? 6)
  const hasPlayedMatches = registrations.some((registration) => registration.matchesPlayed > 0)
  const allQualificationMatchesCompleted = qualificationMatches.length > 0
    && qualificationMatches.every((match) => match.status === 'completed')
  const canGenerateFinals = Boolean(isQualification && finalsReadiness?.ready)
  const showFinalsBlockedHint = Boolean(isQualification && !finalsReadiness?.ready && allQualificationMatchesCompleted)
  const completedFinalMatchIds = completedFinalMatches.map((match) => match._id).join(',')

  useEffect(() => {
    if (!completedFinalMatchIds) {
      setFinalReportsByMatchId({})
      setIsLoadingFinalReports(false)
      return
    }

    const controller = new AbortController()
    const matchIds = completedFinalMatchIds.split(',')
    setIsLoadingFinalReports(true)
    Promise.all(matchIds.map(async (matchId) => {
      try {
        const report = await getMatchReport(matchId, token, controller.signal)
        return [matchId, report] as const
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') throw requestError
        if (requestError instanceof ApiError && requestError.status === 401) {
          handleUnauthorized()
          return [matchId, null] as const
        }
        if (requestError instanceof ApiError && requestError.status === 404) return [matchId, null] as const
        throw requestError
      }
    })).then((entries) => {
      const nextReports: Record<string, MatchReport> = {}
      for (const [matchId, report] of entries) {
        if (report) nextReports[matchId] = report
      }
      setFinalReportsByMatchId(nextReports)
    }).catch((requestError: unknown) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
    }).finally(() => setIsLoadingFinalReports(false))

    return () => controller.abort()
  }, [completedFinalMatchIds, token])

  function getMatchPlayerLabel(matchPlayer: MatchPlayer) {
    return rosterLabelsByRegistrationId.get(matchPlayer.registrationId)
      ?? matchPlayer.name
      ?? (matchPlayer.jerseyNumber ? `#${matchPlayer.jerseyNumber}` : translate('common.notAvailable'))
  }

  function getMatchPlayerLabelFromId(registrationId: string, match?: Match) {
    const fromRoster = rosterLabelsByRegistrationId.get(registrationId)
    if (fromRoster) return fromRoster

    const sourceMatch = match ?? matchInDrawer
    const matchPlayer = sourceMatch
      ? [...getTeamPlayers(sourceMatch, 'A'), ...getTeamPlayers(sourceMatch, 'B')]
        .find((player) => player.registrationId === registrationId)
      : undefined
    return matchPlayer ? getMatchPlayerLabel(matchPlayer) : translate('common.notAvailable')
  }

  function getTeamPlayers(match: Match, side: 'A' | 'B') {
    return match.teams.find((team) => team.side === side)?.players ?? []
  }

  function getSelectionBlockKey(player: Player): TranslationKey | null {
    const identity = getPlayerIdentity(player)
    if (!identity) return 'tournamentDetail.identityMissing'
    if (rosterIdentityKeys.has(identity.key)) return identity.kind === 'jersey' ? 'tournamentDetail.jerseyTaken' : 'tournamentDetail.nameTaken'

    const ownerPlayerId = selectedIdentityOwners.get(identity.key)
    if (ownerPlayerId && ownerPlayerId !== player._id) return identity.kind === 'jersey' ? 'tournamentDetail.jerseySelected' : 'tournamentDetail.nameSelected'
    return null
  }

  async function loadAvailablePlayers() {
    const loadedPlayers = await getAvailablePlayers(tournamentId, token)
    setAvailablePlayers(loadedPlayers)
    setPlayers((currentPlayers) => {
      const knownPlayerIds = new Set(currentPlayers.map((player) => player._id))
      return [...currentPlayers, ...loadedPlayers.filter((player) => !knownPlayerIds.has(player._id))]
    })
  }

  async function handleOpenSelection() {
    setError('')
    setSelectedPlayerIds([])
    setIsSelectionOpen(true)
    setIsLoadingAvailablePlayers(true)
    try {
      await loadAvailablePlayers()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      setError(translate('tournamentDetail.availableLoadError'))
    } finally {
      setIsLoadingAvailablePlayers(false)
    }
  }

  function handleTogglePlayer(playerId: string) {
    setSelectedPlayerIds((currentIds) => currentIds.includes(playerId)
      ? currentIds.filter((currentId) => currentId !== playerId)
      : [...currentIds, playerId])
  }

  async function handleAddSelectedPlayers() {
    if (selectedPlayerIds.length === 0) return
    if (availablePlayers.some((player) => selectedPlayerIds.includes(player._id) && getSelectionBlockKey(player))) {
      return setError(translate('tournamentDetail.identityConflictError'))
    }

    setError('')
    setIsAdding(true)
    try {
      await addTournamentRegistrations(tournamentId, selectedPlayerIds, token)
      setRegistrations(await getTournamentRegistrations(tournamentId, token))
      setSelectedPlayerIds([])
      await loadAvailablePlayers()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (requestError instanceof ApiError && requestError.status === 409) setError(translate('tournamentDetail.addConflict'))
      else setError(translate('tournamentDetail.addError'))
    } finally {
      setIsAdding(false)
    }
  }

  async function handleConfirmRemove() {
    if (!registrationToRemove) return
    setError('')
    setIsRemoving(true)
    try {
      await removeTournamentRegistrations(tournamentId, [registrationToRemove.registration.playerId], token)
      setRegistrations((currentRegistrations) => currentRegistrations.filter((registration) => registration._id !== registrationToRemove.registration._id))
      setRegistrationToRemove(null)
      if (isSelectionOpen) await loadAvailablePlayers()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (requestError instanceof ApiError && requestError.status === 409) setError(translate('tournamentDetail.removeConflict'))
      else setError(translate('tournamentDetail.removeError'))
      setRegistrationToRemove(null)
    } finally {
      setIsRemoving(false)
    }
  }

  async function handleConfirmStart() {
    setError('')
    setIsStarting(true)
    try {
      setTournament(await startTournament(tournamentId, token))
      const [nextRegistrations, nextMatches, nextSetup] = await Promise.all([
        getTournamentRegistrations(tournamentId, token),
        getTournamentMatches(tournamentId, token),
        getTournamentSetup(tournamentId, token),
      ])
      setRegistrations(nextRegistrations)
      setMatches(nextMatches)
      setFinalsReadiness(nextSetup.finalsReadiness)
      setTournament(nextSetup.tournament)
      setIsStartDialogOpen(false)
      setIsSelectionOpen(false)
      setActivePhaseTab('qualification')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      setError(translate(requestError instanceof ApiError && requestError.status === 409 ? 'tournamentDetail.startConflict' : 'tournamentDetail.startError'))
      setIsStartDialogOpen(false)
    } finally {
      setIsStarting(false)
    }
  }

  async function handleConfirmGenerateFinals() {
    setError('')
    setIsGeneratingFinals(true)
    try {
      const result = await generateFinals(tournamentId, token)
      const [nextRegistrations, nextMatches, nextSetup] = await Promise.all([
        getTournamentRegistrations(tournamentId, token),
        getTournamentMatches(tournamentId, token),
        getTournamentSetup(tournamentId, token),
      ])
      setTournament(nextSetup.tournament ?? result.tournament)
      setMatches(nextMatches.length > 0 ? nextMatches : result.matches)
      setRegistrations(nextRegistrations)
      setFinalsReadiness(nextSetup.finalsReadiness)
      setIsGenerateFinalsDialogOpen(false)
      setActivePhaseTab('finals')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (requestError instanceof ApiError && requestError.status === 409) {
        setError(requestError.message || translate('tournamentDetail.generateFinalsConflict'))
      } else {
        setError(translate('tournamentDetail.generateFinalsError'))
      }
      setIsGenerateFinalsDialogOpen(false)
      try {
        const nextSetup = await getTournamentSetup(tournamentId, token)
        setFinalsReadiness(nextSetup.finalsReadiness)
        setTournament(nextSetup.tournament)
      } catch {
        // Keep the previous readiness state if the refresh fails.
      }
    } finally {
      setIsGeneratingFinals(false)
    }
  }

  function handleOpenAssignDialog(match: Match) {
    if (match.status !== 'queued' || match.availability?.playable === false) {
      return
    }
    setError('')
    setMatchToAssign(match)
    setSelectedCourtId('')
  }

  function toAssignedReferee(candidate: RefereeAvailability): RefereeAvailability {
    return {
      refereeUserId: candidate.refereeUserId,
      email: candidate.email,
      name: candidate.name,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      status: 'selected',
    }
  }

  function resolveAssignedReferee(
    match: Match,
    candidates: RefereeAvailability[] = [],
  ): RefereeAvailability | null {
    const assignedId = getMatchRefereeUserId(match)
    if (!assignedId) return null

    const fromCandidates = candidates.find((candidate) => candidate.refereeUserId === assignedId)
    if (fromCandidates) return toAssignedReferee(fromCandidates)

    const populated = getMatchRefereeUser(match)
    if (populated) {
      return {
        refereeUserId: populated._id,
        email: populated.email,
        name: populated.name,
        firstName: populated.firstName,
        lastName: populated.lastName,
        status: 'selected',
      }
    }

    return { refereeUserId: assignedId, status: 'selected' }
  }

  async function handleOpenMatchDrawer(match: Match) {
    setMatchInDrawer(match)
    setMatchReport(null)
    setRefereeCandidates([])
    setDraftRefereeId('')
    setAssignedReferee(resolveAssignedReferee(match))
    setDrawerError('')
    setIsLoadingMatchReport(true)
    setIsLoadingReferees(true)
    void getMatchReport(match._id, token).then((loadedReport) => {
      setMatchReport(loadedReport)
      if (loadedReport && match.phase === 'final') {
        setFinalReportsByMatchId((currentReports) => ({ ...currentReports, [match._id]: loadedReport }))
      }
    }).catch((requestError: unknown) => {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (!(requestError instanceof ApiError && requestError.status === 404)) setDrawerError(translate('tournamentDetail.matchReportLoadError'))
    }).finally(() => setIsLoadingMatchReport(false))
    void Promise.all([
      getMatch(match._id, token),
      getMatchRefereeAvailability(match._id, token),
    ]).then(([freshMatch, loadedCandidates]) => {
      const pendingCandidates = loadedCandidates.filter((candidate) => candidate.status !== 'selected')
      setMatchInDrawer(freshMatch)
      setMatches((currentMatches) => currentMatches.map((current) => current._id === freshMatch._id ? freshMatch : current))
      setRefereeCandidates(pendingCandidates)
      setAssignedReferee(resolveAssignedReferee(freshMatch, loadedCandidates))
    }).catch((requestError: unknown) => {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      setDrawerError(translate('tournamentDetail.refereeCandidatesLoadError'))
    }).finally(() => setIsLoadingReferees(false))
  }

  async function handleAssignReferee() {
    if (!matchInDrawer || !draftRefereeId) return
    setDrawerError('')
    setIsAssigningReferee(true)
    try {
      await assignMatchReferee(matchInDrawer._id, draftRefereeId, token)
      const assignedCandidate = refereeCandidates.find((candidate) => candidate.refereeUserId === draftRefereeId)
        ?? { refereeUserId: draftRefereeId }
      const nextAssignedReferee = toAssignedReferee(assignedCandidate)
      const updatedMatch: Match = {
        ...matchInDrawer,
        refereeUserId: {
          _id: nextAssignedReferee.refereeUserId,
          email: nextAssignedReferee.email ?? '',
          name: nextAssignedReferee.name,
          firstName: nextAssignedReferee.firstName,
          lastName: nextAssignedReferee.lastName,
        },
      }
      setAssignedReferee(nextAssignedReferee)
      setDraftRefereeId('')
      setMatchInDrawer(updatedMatch)
      setMatches((currentMatches) => currentMatches.map((match) => match._id === updatedMatch._id ? updatedMatch : match))
      setRefereeCandidates((currentCandidates) => currentCandidates.filter((candidate) => candidate.refereeUserId !== nextAssignedReferee.refereeUserId))
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      setDrawerError(translate('tournamentDetail.refereeAssignmentError'))
    } finally {
      setIsAssigningReferee(false)
    }
  }

  async function handleConfirmAssign() {
    if (!matchToAssign || !selectedCourtId) return
    setError('')
    setIsAssigning(true)
    try {
      const updatedMatch = await assignMatchToCourt(matchToAssign._id, selectedCourtId, token)
      setMatches((currentMatches) => currentMatches.map((match) => match._id === matchToAssign._id ? updatedMatch : match))
      setMatchToAssign(null)
      setSelectedCourtId('')
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return onUnauthorized()
      if (requestError instanceof ApiError && requestError.status === 409) setError(translate('tournamentDetail.assignConflict'))
      else setError(translate('tournamentDetail.assignError'))
    } finally {
      setIsAssigning(false)
    }
  }

  if (isLoading) {
    return <section className="workspace-page">
      <button className="text-action" type="button" onClick={onBack}><ArrowLeft size={17} />{translate('tournamentDetail.back')}</button>
      <div className="page-state">{translate('common.loading')}</div>
    </section>
  }

  if (!tournament) {
    return <section className="workspace-page">
      <button className="text-action" type="button" onClick={onBack}><ArrowLeft size={17} />{translate('tournamentDetail.back')}</button>
      <div className="page-state"><strong>{translate(isMissing ? 'tournamentDetail.notFound' : 'tournamentDetail.loadError')}</strong></div>
    </section>
  }

  return <section className="workspace-page">
    <button className="text-action" type="button" onClick={onBack}><ArrowLeft size={17} />{translate('tournamentDetail.back')}</button>

    <div className="page-heading-row">
      <header className="page-heading">
        <p className="eyebrow">{translate('tournamentDetail.eyebrow')}</p>
        <h1>{tournament.name}</h1>
        <div className="detail-heading-meta">
          <span className={`status-badge status-badge--${tournament.status}`}>{translate(tournamentStatusKeys[tournament.status])}</span>
          <span>{tournament.category ?? translate('common.notAvailable')}</span>
        </div>
      </header>
      <div className="detail-actions">
        <button className="secondary-action" type="button" onClick={() => onEdit(tournament._id)}><Pencil size={17} />{translate('tournamentDetail.edit')}</button>
        {isDraft && <button className="primary-action" type="button" onClick={() => setIsStartDialogOpen(true)} disabled={!canStart || isStarting}><Play size={17} />{translate(isStarting ? 'tournamentDetail.starting' : 'tournamentDetail.start')}</button>}
      </div>
    </div>

    {error && <p className="page-error" role="alert">{error}</p>}
    {isDraft && !canStart && <p className="page-hint">{translate('tournamentDetail.startHint')}</p>}

    <div className="summary-grid summary-grid--compact">
      <article className="summary-card summary-card--compact"><span>{translate('tournamentDetail.registeredPlayers')}</span><strong>{activeRegistrations.length}</strong><p>{translate('tournamentDetail.registeredPlayersDescription')}</p></article>
      <article className="summary-card summary-card--compact"><span>{translate('tournamentDetail.checkedInPlayers')}</span><strong>{checkedInRegistrations.length}</strong><p>{translate('tournamentDetail.checkedInPlayersDescription')}</p></article>
      <article className="summary-card summary-card--compact"><span>{translate('tournamentDetail.generatedMatches')}</span><strong>{matches.length}</strong><p>{translate('tournamentDetail.generatedMatchesDescription')}</p></article>
      <article className="summary-card summary-card--compact"><span>{translate('tournamentDetail.completedMatches')}</span><strong>{matches.filter((match) => match.status === 'completed').length}</strong><p>{translate('tournamentDetail.completedMatchesDescription')}</p></article>
    </div>

    <div className="detail-sections">
      <section className="form-section">
        <div className="form-section-heading"><div><h2>{translate('tournamentDetail.configuration')}</h2><p>{translate('tournamentDetail.configurationDescription')}</p></div></div>
        <div className="detail-facts">
          <div className="detail-fact"><span>{translate('tournamentDetail.gameFormat')}</span><strong>{tournament.configuration.gameFormat}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.competitionFormat')}</span><strong>{translate('tournamentDetail.competitionFormatValue')}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.queueMode')}</span><strong>{translate('tournamentDetail.queueModeValue')}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.teamSize')}</span><strong>{tournament.configuration.teamSize}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.playersPerMatch')}</span><strong>{tournament.configuration.playersPerMatch}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.appearances')}</span><strong>{tournament.configuration.qualificationAppearancesPerPlayer}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.winPoints')}</span><strong>{tournament.winPoints}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.category')}</span><strong>{tournament.category ?? translate('common.notAvailable')}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.statusLabel')}</span><strong>{translate(tournamentStatusKeys[tournament.status])}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.startDate')}</span><strong>{formatDate(tournament.startDate)}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.endDate')}</span><strong>{formatDate(tournament.endDate)}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.generatedAt')}</span><strong>{tournament.qualification.generatedAt ? dateTimeFormatter.format(new Date(tournament.qualification.generatedAt)) : translate('common.notAvailable')}</strong></div>
          <div className="detail-fact"><span>{translate('tournamentDetail.finalsGeneratedAt')}</span><strong>{tournament.finals?.generatedAt ? dateTimeFormatter.format(new Date(tournament.finals.generatedAt)) : translate('common.notAvailable')}</strong></div>
        </div>

        <div className="detail-subsection">
          <h3>{translate('tournamentDetail.courts')}</h3>
          {tournament.courts.length === 0 ? <p className="detail-empty">{translate('tournamentDetail.courtsEmpty')}</p> :
            <div className="chip-list">{tournament.courts.map((court) => <span className="chip" key={court._id}>{court.name}{court.enabled === false && <span>{translate('tournamentDetail.courtDisabled')}</span>}</span>)}</div>}
        </div>

        <div className="detail-subsection">
          <h3>{translate('tournamentDetail.finalGroups')}</h3>
          {tournament.finalGroups.length === 0 ? <p className="detail-empty">{translate('tournamentDetail.finalGroupsEmpty')}</p> :
            <div className="chip-list">{tournament.finalGroups.map((group) => <span className="chip" key={group._id}>{group.themeName}<span>{translate('tournamentForm.groupLevel')} {group.level}</span></span>)}</div>}
        </div>
      </section>
    </div>

    {canGenerateFinals && <div className="finals-banner finals-banner--ready">
      <div>
        <h2>{translate('tournamentDetail.generateFinalsReadyTitle')}</h2>
        <p>{translate('tournamentDetail.generateFinalsReadyDescription')}</p>
      </div>
      <div className="finals-banner-actions">
        <button className="primary-action" type="button" onClick={() => setIsGenerateFinalsDialogOpen(true)} disabled={isGeneratingFinals}>
          <Flag size={17} />{translate(isGeneratingFinals ? 'tournamentDetail.generatingFinals' : 'tournamentDetail.generateFinals')}
        </button>
      </div>
    </div>}

    {showFinalsBlockedHint && <div className="finals-banner finals-banner--blocked">
      <div>
        <h2>{translate('tournamentDetail.generateFinalsBlockedTitle')}</h2>
        <p>{translate('tournamentDetail.generateFinalsBlockedDescription')}</p>
        {(finalsReadiness?.blockers.length ?? 0) > 0 && <ul className="finals-banner-blockers">
          {finalsReadiness?.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
        </ul>}
      </div>
    </div>}

    <div className="phase-tabs" role="tablist" aria-label={translate('tournamentDetail.eyebrow')}>
      <button
        className={activePhaseTab === 'qualification' ? 'phase-tab phase-tab--active' : 'phase-tab'}
        type="button"
        role="tab"
        aria-selected={activePhaseTab === 'qualification'}
        onClick={() => setActivePhaseTab('qualification')}
      >
        {translate('tournamentDetail.tabQualification')}
      </button>
      <button
        className={activePhaseTab === 'finals' ? 'phase-tab phase-tab--active' : 'phase-tab'}
        type="button"
        role="tab"
        aria-selected={activePhaseTab === 'finals'}
        disabled={!hasGeneratedFinals}
        title={!hasGeneratedFinals ? translate('tournamentDetail.finalsTabDisabled') : undefined}
        onClick={() => hasGeneratedFinals && setActivePhaseTab('finals')}
      >
        {translate('tournamentDetail.tabFinals')}
      </button>
    </div>

    {activePhaseTab === 'qualification' && <div className="detail-sections phase-tab-panel" role="tabpanel">
      <section className="form-section">
        <div className="form-section-heading">
          <div><h2>{translate('tournamentDetail.roster')}</h2><p>{translate(isDraft ? 'tournamentDetail.rosterDescription' : 'tournamentDetail.rosterLocked')}</p></div>
          {isDraft && !isSelectionOpen && <button className="secondary-action" type="button" onClick={handleOpenSelection}><UserPlus size={17} />{translate('tournamentDetail.addPlayers')}</button>}
        </div>

        {isDraft && isSelectionOpen && <div className="selection-panel">
          <div className="selection-heading">
            <div><strong>{translate('tournamentDetail.addPlayersTitle')}</strong><p>{translate('tournamentDetail.addPlayersDescription')}</p></div>
            <button className="icon-action" type="button" onClick={() => setIsSelectionOpen(false)} title={translate('tournamentDetail.closeSelection')} aria-label={translate('tournamentDetail.closeSelection')}><X size={16} /></button>
          </div>
          {isLoadingAvailablePlayers ? <p className="detail-empty">{translate('common.loading')}</p> : availablePlayers.length === 0 ? <p className="detail-empty">{translate('tournamentDetail.availableEmpty')}</p> :
            <>
              <p className="selection-rule">{translate('tournamentDetail.identityRule')}</p>
              <div className="selection-list">{availablePlayers.map((player) => {
                const blockKey = getSelectionBlockKey(player)
                return <label className={blockKey ? 'selection-option selection-option--blocked' : 'selection-option'} key={player._id}>
                  <input type="checkbox" checked={selectedPlayerIds.includes(player._id)} disabled={Boolean(blockKey)} onChange={() => handleTogglePlayer(player._id)} />
                  <span>{formatPlayerLabel(player)}{blockKey && <em>{translate(blockKey)}</em>}</span>
                </label>
              })}</div>
              <div className="selection-actions">
                <button className="secondary-action" type="button" onClick={() => setIsSelectionOpen(false)}>{translate('common.cancel')}</button>
                <button className="primary-action" type="button" onClick={handleAddSelectedPlayers} disabled={isAdding || selectedPlayerIds.length === 0}>{translate(isAdding ? 'tournamentDetail.adding' : 'tournamentDetail.addSelected')}</button>
              </div>
            </>}
        </div>}

        {duplicateIdentityKeys.size > 0 && <p className="page-hint page-hint--warning" role="alert">{translate('tournamentDetail.duplicateIdentityWarning')}</p>}

        {rosterRows.length === 0 ? <div className="page-state page-state--embedded"><strong>{translate('tournamentDetail.rosterEmpty')}</strong><p>{translate('tournamentDetail.rosterEmptyDescription')}</p></div> :
          <div className="data-table-wrap data-table-wrap--embedded"><table className="data-table">
            <thead><tr>
              <th>{translate('tournamentDetail.player')}</th>
              <th>{translate('tournamentDetail.jerseyNumber')}</th>
              <th>{translate('tournamentDetail.attendance')}</th>
              {isDraft && <th className="actions-column">{translate('tournaments.actions')}</th>}
            </tr></thead>
            <tbody>{rosterRows.map((row) => {
              const isDuplicate = Boolean(row.identity && duplicateIdentityKeys.has(row.identity.key))
              const duplicateBadge = <span className="status-badge status-badge--conflict">{translate('tournamentDetail.duplicateIdentity')}</span>
              return <tr key={row.registration._id}>
                <td><div className="roster-cell"><strong>{row.label}</strong>{isDuplicate && row.identity?.kind === 'name' && duplicateBadge}</div></td>
                <td><div className="roster-cell">{row.registration.jerseyNumber ?? playersById.get(row.registration.playerId)?.jerseyNumber ?? translate('common.notAvailable')}{isDuplicate && row.identity?.kind === 'jersey' && duplicateBadge}</div></td>
                <td><span className={`status-badge status-badge--${row.registration.attendanceStatus}`}>{translate(attendanceStatusKeys[row.registration.attendanceStatus])}</span></td>
                {isDraft && <td className="actions-column"><div className="row-actions">
                  <button className="icon-action icon-action--danger" type="button" onClick={() => setRegistrationToRemove(row)} title={translate('tournamentDetail.remove')} aria-label={translate('tournamentDetail.remove')}><Trash2 size={16} /></button>
                </div></td>}
              </tr>
            })}</tbody>
          </table></div>}
      </section>

      <section className="form-section">
        <div className="form-section-heading"><div><h2>{translate('tournamentDetail.standings')}</h2><p>{translate('tournamentDetail.standingsDescription')}</p></div></div>
        {!hasPlayedMatches ? <div className="page-state page-state--embedded"><strong>{translate('tournamentDetail.standingsEmpty')}</strong><p>{translate('tournamentDetail.standingsEmptyDescription')}</p></div> :
          <div className="data-table-wrap data-table-wrap--embedded"><table className="data-table">
            <thead><tr>
              <th>{translate('tournamentDetail.position')}</th>
              <th>{translate('tournamentDetail.player')}</th>
              <th>{translate('tournamentDetail.overall')}</th>
              <th>{translate('tournamentDetail.wins')}</th>
              <th>{translate('tournamentDetail.losses')}</th>
              <th>{translate('tournamentDetail.pointsMade')}</th>
              <th>{translate('tournamentDetail.assists')}</th>
              <th>{translate('tournamentDetail.fouls')}</th>
              <th>{translate('tournamentDetail.mvpAwards')}</th>
              <th>{translate('tournamentDetail.fairPlayAwards')}</th>
            </tr></thead>
            <tbody>{standingsRows.map((row, index) => <tr key={row.registration._id}>
              <td>{index + 1}</td>
              <td><strong>{row.label}</strong></td>
              <td><strong>{row.registration.rankingPoints}</strong></td>
              <td>{row.registration.wins}</td>
              <td>{getRegistrationLosses(row.registration)}</td>
              <td>{row.registration.pointsMade}</td>
              <td>{row.registration.assists}</td>
              <td>{row.registration.fouls}</td>
              <td>{row.registration.mvpAwards}</td>
              <td>{row.registration.fairPlayAwards}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>

      <section className="form-section">
        <div className="form-section-heading"><div><h2>{translate('tournamentDetail.matches')}</h2><p>{translate('tournamentDetail.matchesDescription')}</p></div></div>
        {qualificationMatches.length === 0 ? <div className="page-state page-state--embedded"><strong>{translate('tournamentDetail.matchesEmpty')}</strong><p>{translate('tournamentDetail.matchesEmptyDescription')}</p></div> :
          <div className="data-table-wrap data-table-wrap--embedded"><table className="data-table">
            <thead><tr>
              <th>{translate('tournamentDetail.queuePosition')}</th>
              <th>{translate('tournamentDetail.teamA')}</th>
              <th>{translate('tournamentDetail.score')}</th>
              <th>{translate('tournamentDetail.teamB')}</th>
              <th>{translate('tournamentDetail.court')}</th>
              <th>{translate('tournamentDetail.statusLabel')}</th>
              <th className="actions-column">{translate('tournaments.actions')}</th>
            </tr></thead>
            <tbody>{qualificationMatches.map((match) => {
              const canAssign = match.status === 'queued' && !match.courtId && match.availability?.playable === true
              const isBusy = match.status === 'queued' && match.availability?.playable === false
              const busyPlayers = isBusy ? (match.availability?.busyRegistrationIds ?? [])
                .map((regId) => rosterLabelsByRegistrationId.get(regId))
                .filter((name): name is string => Boolean(name))
                : []
              return <tr key={match._id}>
                <td>{match.queuePosition ?? translate('common.notAvailable')}</td>
                <td><div className="team-cell">{getTeamPlayers(match, 'A').map((matchPlayer) => <span key={matchPlayer.registrationId}>{getMatchPlayerLabel(matchPlayer)}</span>)}</div></td>
                <td><span className="score-cell">{match.scoreA} - {match.scoreB}</span></td>
                <td><div className="team-cell">{getTeamPlayers(match, 'B').map((matchPlayer) => <span key={matchPlayer.registrationId}>{getMatchPlayerLabel(matchPlayer)}</span>)}</div></td>
                <td>{(match.courtId && courtNamesById.get(match.courtId)) ?? translate('common.notAvailable')}</td>
                <td>
                  <span className={`status-badge status-badge--${match.status}`}>{translate(matchStatusKeys[match.status])}</span>
                  {isBusy && <span className="status-badge status-badge--conflict" title={`${translate('tournamentDetail.assignBusyPlayers')} ${busyPlayers.join(', ')}`}>{translate('tournamentDetail.assignUnavailable')}</span>}
                </td>
                <td className="actions-column"><div className="row-actions">
                  <button className="icon-action" type="button" onClick={() => void handleOpenMatchDrawer(match)} title={translate('tournamentDetail.openMatch')} aria-label={translate('tournamentDetail.openMatch')}><Eye size={16} /></button>
                  {canAssign && <button className="icon-action" type="button" onClick={() => handleOpenAssignDialog(match)} title={translate('tournamentDetail.assignCourt')} aria-label={translate('tournamentDetail.assignCourt')}><Zap size={16} /></button>}
                  {!canAssign && match.status === 'queued' && !match.courtId && <button className="icon-action" type="button" disabled title={`${translate('tournamentDetail.assignUnavailableReason')}: ${busyPlayers.join(', ')}`} aria-label={translate('tournamentDetail.assignUnavailable')}><Zap size={16} /></button>}
                </div></td>
              </tr>
            })}</tbody>
          </table></div>}
      </section>
    </div>}

    {activePhaseTab === 'finals' && <div className="detail-sections phase-tab-panel" role="tabpanel">
      {!hasGeneratedFinals ? <div className="page-state page-state--embedded"><strong>{translate('tournamentDetail.finalsEmpty')}</strong><p>{translate('tournamentDetail.finalsEmptyDescription')}</p></div> : <>
        <section className="form-section">
          <div className="form-section-heading"><div><h2>{translate('tournamentDetail.matches')}</h2><p>{translate('tournamentDetail.matchesDescription')}</p></div></div>
          {finalMatches.length === 0 ? <div className="page-state page-state--embedded"><strong>{translate('tournamentDetail.finalMatchesEmpty')}</strong><p>{translate('tournamentDetail.finalMatchesEmptyDescription')}</p></div> :
            <div className="data-table-wrap data-table-wrap--embedded"><table className="data-table">
              <thead><tr>
                <th>{translate('tournamentDetail.queuePosition')}</th>
                <th>{translate('tournamentDetail.finalGroup')}</th>
                <th>{translate('tournamentDetail.teamA')}</th>
                <th>{translate('tournamentDetail.score')}</th>
                <th>{translate('tournamentDetail.teamB')}</th>
                <th>{translate('tournamentDetail.court')}</th>
                <th>{translate('tournamentDetail.statusLabel')}</th>
                <th className="actions-column">{translate('tournaments.actions')}</th>
              </tr></thead>
              <tbody>{finalMatches.map((match) => {
                const canAssign = match.status === 'queued' && !match.courtId && match.availability?.playable === true
                const isBusy = match.status === 'queued' && match.availability?.playable === false
                const busyPlayers = isBusy ? (match.availability?.busyRegistrationIds ?? [])
                  .map((regId) => rosterLabelsByRegistrationId.get(regId))
                  .filter((name): name is string => Boolean(name))
                  : []
                return <tr key={match._id}>
                  <td>{match.queuePosition ?? translate('common.notAvailable')}</td>
                  <td>{(match.finalGroupId && finalGroupNamesById.get(match.finalGroupId)) ?? translate('common.notAvailable')}</td>
                  <td><div className="team-cell">{getTeamPlayers(match, 'A').map((matchPlayer) => <span key={matchPlayer.registrationId}>{getMatchPlayerLabel(matchPlayer)}</span>)}</div></td>
                  <td><span className="score-cell">{match.scoreA} - {match.scoreB}</span></td>
                  <td><div className="team-cell">{getTeamPlayers(match, 'B').map((matchPlayer) => <span key={matchPlayer.registrationId}>{getMatchPlayerLabel(matchPlayer)}</span>)}</div></td>
                  <td>{(match.courtId && courtNamesById.get(match.courtId)) ?? translate('common.notAvailable')}</td>
                  <td>
                    <span className={`status-badge status-badge--${match.status}`}>{translate(matchStatusKeys[match.status])}</span>
                    {isBusy && <span className="status-badge status-badge--conflict" title={`${translate('tournamentDetail.assignBusyPlayers')} ${busyPlayers.join(', ')}`}>{translate('tournamentDetail.assignUnavailable')}</span>}
                  </td>
                  <td className="actions-column"><div className="row-actions">
                    <button className="icon-action" type="button" onClick={() => void handleOpenMatchDrawer(match)} title={translate('tournamentDetail.openMatch')} aria-label={translate('tournamentDetail.openMatch')}><Eye size={16} /></button>
                    {canAssign && <button className="icon-action" type="button" onClick={() => handleOpenAssignDialog(match)} title={translate('tournamentDetail.assignCourt')} aria-label={translate('tournamentDetail.assignCourt')}><Zap size={16} /></button>}
                    {!canAssign && match.status === 'queued' && !match.courtId && <button className="icon-action" type="button" disabled title={`${translate('tournamentDetail.assignUnavailableReason')}: ${busyPlayers.join(', ')}`} aria-label={translate('tournamentDetail.assignUnavailable')}><Zap size={16} /></button>}
                  </div></td>
                </tr>
              })}</tbody>
            </table></div>}
        </section>

        <section className="form-section">
          <div className="form-section-heading"><div><h2>{translate('tournamentDetail.finalStats')}</h2><p>{translate('tournamentDetail.finalStatsDescription')}</p></div></div>
          {isLoadingFinalReports ? <p>{translate('common.loading')}</p> : reportedFinalMatches.length === 0 ? <div className="page-state page-state--embedded"><strong>{translate('tournamentDetail.finalStatsEmpty')}</strong><p>{translate('tournamentDetail.finalStatsEmptyDescription')}</p></div> :
            <div className="final-stats-list">
              {reportedFinalMatches.map((match) => {
                const report = finalReportsByMatchId[match._id]
                if (!report) return null
                return (
                  <FinalMatchStats
                    key={match._id}
                    match={match}
                    report={report}
                    groupName={(match.finalGroupId && finalGroupNamesById.get(match.finalGroupId)) ?? translate('common.notAvailable')}
                    courtName={(match.courtId && courtNamesById.get(match.courtId)) ?? translate('common.notAvailable')}
                    getPlayerLabel={(registrationId) => getMatchPlayerLabelFromId(registrationId, match)}
                  />
                )
              })}
            </div>}
        </section>
      </>}
    </div>}

    {registrationToRemove && <ConfirmDialog
      title={translate('tournamentDetail.removeTitle')}
      description={translate('tournamentDetail.removeDescription')}
      subject={registrationToRemove.label}
      confirmLabel={translate(isRemoving ? 'tournamentDetail.removing' : 'tournamentDetail.removeConfirm')}
      cancelLabel={translate('tournamentDetail.removeCancel')}
      isConfirming={isRemoving}
      onConfirm={handleConfirmRemove}
      onCancel={() => setRegistrationToRemove(null)}
    />}

    {isStartDialogOpen && <ConfirmDialog
      title={translate('tournamentDetail.startTitle')}
      description={translate('tournamentDetail.startDescription')}
      subject={tournament.name}
      confirmLabel={translate(isStarting ? 'tournamentDetail.starting' : 'tournamentDetail.startConfirm')}
      cancelLabel={translate('tournamentDetail.startCancel')}
      confirmVariant="primary"
      isConfirming={isStarting}
      onConfirm={handleConfirmStart}
      onCancel={() => setIsStartDialogOpen(false)}
    />}

    {isGenerateFinalsDialogOpen && <ConfirmDialog
      title={translate('tournamentDetail.generateFinalsTitle')}
      description={translate('tournamentDetail.generateFinalsDescription')}
      subject={tournament.name}
      confirmLabel={translate(isGeneratingFinals ? 'tournamentDetail.generatingFinals' : 'tournamentDetail.generateFinalsConfirm')}
      cancelLabel={translate('tournamentDetail.generateFinalsCancel')}
      confirmVariant="primary"
      isConfirming={isGeneratingFinals}
      onConfirm={handleConfirmGenerateFinals}
      onCancel={() => setIsGenerateFinalsDialogOpen(false)}
    />}

    {matchToAssign && <div className="confirm-dialog-backdrop" onClick={() => !isAssigning && setMatchToAssign(null)}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="assign-dialog-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="assign-dialog-title">{translate('tournamentDetail.assignTitle')}</h2>
        <p>{translate('tournamentDetail.assignDescription')}</p>
        {error && <p className="page-error" role="alert">{error}</p>}
        {matchToAssign.availability?.playable === false && <p className="page-hint page-hint--warning" role="alert">
          <strong>{translate('tournamentDetail.assignUnavailable')}</strong>
          <br />
          {translate('tournamentDetail.assignUnavailableReason')}
          {matchToAssign.availability.busyRegistrationIds.length > 0 && <>: {matchToAssign.availability.busyRegistrationIds
            .map((regId) => rosterLabelsByRegistrationId.get(regId))
            .filter((name): name is string => Boolean(name))
            .join(', ')}</>}
        </p>}
        <div className="form-group">
          <label htmlFor="court-select">{translate('tournamentDetail.selectCourt')}</label>
          <select
            id="court-select"
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            disabled={isAssigning || matchToAssign.availability?.playable === false}
          >
            <option value="">{translate('tournamentDetail.selectCourt')}</option>
            {(tournament?.courts ?? []).map((court) => {
              const isOccupied = matches.some((m) => m.courtId === court._id && (m.status === 'ready' || m.status === 'in_progress'))
              const isDisabled = court.enabled === false || isOccupied
              return <option key={court._id} value={court._id} disabled={isDisabled}>
                {court.name}{court.enabled === false && ` (${translate('tournamentDetail.courtDisabled')})`}{isOccupied && ' (occupato)'}
              </option>
            })}
          </select>
        </div>
        <div className="confirm-dialog-actions">
          <button className="secondary-action" type="button" onClick={() => setMatchToAssign(null)} disabled={isAssigning}>{translate('tournamentDetail.assignCancel')}</button>
          <button className="primary-action" type="button" onClick={handleConfirmAssign} disabled={isAssigning || !selectedCourtId || matchToAssign.availability?.playable === false}>{translate(isAssigning ? 'tournamentDetail.assigning' : 'tournamentDetail.assignConfirm')}</button>
        </div>
      </div>
    </div>}

    {matchInDrawer && <div className="drawer-backdrop" onClick={() => !isAssigningReferee && setMatchInDrawer(null)}>
      <aside className="match-drawer" role="dialog" aria-modal="true" aria-labelledby="match-drawer-title" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><p className="eyebrow">{translate('tournamentDetail.matchDetails')}</p><h2 id="match-drawer-title">{translate(matchPhaseKeys[matchInDrawer.phase])} #{matchInDrawer.queuePosition ?? '-'}</h2></div>
          <button className="icon-action" type="button" onClick={() => setMatchInDrawer(null)} title={translate('tournamentDetail.closeMatch')} aria-label={translate('tournamentDetail.closeMatch')}><X size={17} /></button>
        </div>
        <div className="drawer-content">
          {drawerError && <p className="page-error" role="alert">{drawerError}</p>}
          <div className="drawer-status"><span className={`status-badge status-badge--${matchInDrawer.status}`}>{translate(matchStatusKeys[matchInDrawer.status])}</span><span>{matchInDrawer.courtId ? courtNamesById.get(matchInDrawer.courtId) : translate('common.notAvailable')}</span></div>
          <div className="drawer-score"><div><span>{translate('tournamentDetail.teamA')}</span><strong>{getTeamPlayers(matchInDrawer, 'A').map(getMatchPlayerLabel).join(' · ')}</strong></div><b>{matchReport?.scoreA ?? matchInDrawer.scoreA} - {matchReport?.scoreB ?? matchInDrawer.scoreB}</b><div><span>{translate('tournamentDetail.teamB')}</span><strong>{getTeamPlayers(matchInDrawer, 'B').map(getMatchPlayerLabel).join(' · ')}</strong></div></div>

          <section className="drawer-section">
            <h3>{translate('tournamentDetail.refereeAssignment')}</h3>
            {getMatchRefereeUserId(matchInDrawer) ? (
              <p className="selected-referee selected-referee--assigned">
                {translate('tournamentDetail.selectedReferee')}: <strong>{formatRefereeName(assignedReferee)}</strong>
                {assignedReferee?.email && assignedReferee.name ? ` (${assignedReferee.email})` : ''}
              </p>
            ) : isLoadingReferees ? (
              <p>{translate('common.loading')}</p>
            ) : (
              <>
                <label className="drawer-field-label" htmlFor="referee-select">{translate('tournamentDetail.refereeCandidates')}</label>
                <select
                  id="referee-select"
                  className="drawer-select"
                  value={draftRefereeId}
                  onChange={(event) => setDraftRefereeId(event.target.value)}
                  disabled={isAssigningReferee}
                >
                  <option value="">{translate('tournamentDetail.selectReferee')}</option>
                  {refereeCandidates.map((candidate) => (
                    <option key={candidate.refereeUserId} value={candidate.refereeUserId}>{formatRefereeName(candidate)}</option>
                  ))}
                </select>
                {refereeCandidates.length === 0 && <p>{translate('tournamentDetail.refereeCandidatesEmpty')}</p>}
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => void handleAssignReferee()}
                  disabled={isAssigningReferee || !draftRefereeId}
                >
                  {translate(isAssigningReferee ? 'tournamentDetail.refereeAssigning' : 'tournamentDetail.assignReferee')}
                </button>
              </>
            )}
          </section>

          <section className="drawer-section">
            <h3>{translate('tournamentDetail.matchReport')}</h3>
            {isLoadingMatchReport ? <p>{translate('common.loading')}</p> : !matchReport ? <p>{translate('tournamentDetail.matchReportEmpty')}</p> : <>
              <div className="report-facts">
                <div><span>{translate('tournamentDetail.reportSubmittedAt')}</span><strong>{dateTimeFormatter.format(new Date(matchReport.submittedAt))}</strong></div>
                <div><span>{translate('tournamentDetail.reportRevision')}</span><strong>{matchReport.revision}</strong></div>
                <div><span>{translate('tournamentDetail.reportBaskets')}</span><strong>{matchReport.baskets?.length ?? 0}</strong></div>
                <div><span>{translate('tournamentDetail.reportFouls')}</span><strong>{matchReport.fouls?.length ?? 0}</strong></div>
                <div><span>{translate('tournamentDetail.mvpAward')}</span><strong>{matchReport.awards?.mvpRegistrationId ? getMatchPlayerLabelFromId(matchReport.awards.mvpRegistrationId, matchInDrawer) : translate('common.notAvailable')}</strong></div>
                <div><span>{translate('tournamentDetail.fairPlayAward')}</span><strong>{matchReport.awards?.fairPlayRegistrationId ? getMatchPlayerLabelFromId(matchReport.awards.fairPlayRegistrationId, matchInDrawer) : translate('common.notAvailable')}</strong></div>
                {matchReport.unattributedPointsA > 0 && <div><span>{translate('tournamentDetail.unattributedPointsA')}</span><strong>{matchReport.unattributedPointsA}</strong></div>}
                {matchReport.unattributedPointsB > 0 && <div><span>{translate('tournamentDetail.unattributedPointsB')}</span><strong>{matchReport.unattributedPointsB}</strong></div>}
              </div>
              <div className="report-box-score">
                <h4>{translate('tournamentDetail.playerStats')}</h4>
                <MatchReportBoxScore
                  match={matchInDrawer}
                  report={matchReport}
                  getPlayerLabel={(registrationId) => getMatchPlayerLabelFromId(registrationId, matchInDrawer)}
                />
              </div>
            </>}
          </section>
        </div>
      </aside>
    </div>}
  </section>
}
