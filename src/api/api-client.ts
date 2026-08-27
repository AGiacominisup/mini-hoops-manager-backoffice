const API_URL = import.meta.env.VITE_API_URL
const REQUEST_TIMEOUT_MS = 30_000

export type UserRole = 'admin' | 'coach' | 'staff'
export type TournamentStatus = 'draft' | 'qualification' | 'finals' | 'completed'
export type AttendanceStatus = 'registered' | 'checked_in' | 'withdrawn'
export type MatchPhase = 'qualification' | 'final'
export type MatchStatus = 'scheduled' | 'queued' | 'ready' | 'in_progress' | 'completed'

export interface AuthSession {
  token: string
  user: {
    id: string
    email: string
    role: UserRole
  }
}

export interface Tournament {
  _id: string
  name: string
  startDate?: string
  endDate?: string
  category?: string
  winPoints: number
  status: TournamentStatus
  configuration: {
    gameFormat: '3v3'
    competitionFormat: 'individual_rotating_teams'
    teamSize: 3
    playersPerMatch: 6
    qualificationAppearancesPerPlayer: number
    queueMode: 'dynamic'
  }
  qualification: {
    seed?: string
    rosterFingerprint?: string
    generatedAt?: string
    totalMatches: number
  }
  finals?: {
    generatedAt?: string
    totalMatches: number
  }
  courts: Array<{ _id: string; name: string; enabled?: boolean; displayOrder?: number }>
  finalGroups: Array<{ _id: string; themeName: string; level: number }>
  createdAt: string
  updatedAt: string
}

export interface RefereeAvailability {
  refereeUserId: string
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  status?: string
  requestedAt?: string
}

export interface RefereeUser {
  _id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
}

export interface CreateTournamentPayload {
  name: string
  startDate?: string
  endDate?: string
  category?: string
  winPoints: number
  courts: Array<{ name: string }>
  finalGroups: Array<{ themeName: string; level: number }>
}

export interface UpdateTournamentPayload {
  name?: string
  startDate?: string
  endDate?: string
  category?: string
  winPoints?: number
  courts?: Array<{ name: string }>
  finalGroups?: Array<{ themeName: string; level: number }>
}

export interface Player {
  _id: string
  firstName?: string
  lastName?: string
  jerseyNumber?: number
  birthDate?: string
  guardianContact?: string
  skillRating?: number
  createdAt: string
  updatedAt: string
}

export interface CreatePlayerPayload {
  firstName?: string
  lastName?: string
  jerseyNumber?: number
  birthDate?: string
  guardianContact?: string
  skillRating?: number
}

export type UpdatePlayerPayload = CreatePlayerPayload

export interface Registration {
  _id: string
  tournamentId: string
  playerId: string
  jerseyNumber?: number
  skillRating?: number
  rankingPoints: number
  matchesPlayed: number
  wins: number
  pointsScored: number
  pointsAllowed: number
  pointsMade: number
  assists: number
  fouls: number
  mvpAwards: number
  fairPlayAwards: number
  finalGroupId: string | null
  qualificationRank?: number | null
  attendanceStatus: AttendanceStatus
  checkedInAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MatchPlayer {
  registrationId: string
  jerseyNumber?: number
  name?: string
  skillRating?: number
}

export interface MatchAvailability {
  playable: boolean
  busyRegistrationIds: string[]
}

export interface Match {
  _id: string
  tournamentId: string
  courtId: string | null
  finalGroupId: string | null
  phase: MatchPhase
  scheduledAt?: string
  status: MatchStatus
  queuePosition?: number
  scoreA: number
  scoreB: number
  refereeUserId?: string | RefereeUser | null
  teams: Array<{ side: 'A' | 'B'; players: MatchPlayer[] }>
  availability?: MatchAvailability
  createdAt: string
  updatedAt: string
}

interface AuthResponse extends AuthSession {
  message: string
}

interface ApiErrorResponse {
  message?: string
  errors?: Record<string, string[]>
}

export interface FinalsReadiness {
  ready: boolean
  blockers: string[]
  requiredFinalGroups: number
  checkedIn: number
}

export interface TournamentSetup {
  tournament: Tournament
  attendance: {
    total: number
    registered: number
    checkedIn: number
    withdrawn: number
  }
  readiness: {
    ready: boolean
    blockers: string[]
  }
  finalsReadiness: FinalsReadiness
}

export interface QualificationMetrics {
  matches: number
  extraAppearances: number
  maxAppearanceDifference: number
  maxTeammatePairCount: number
  maxOpponentPairCount: number
  maxSkillDifference: number
  averageSkillDifference: number
  matchesOverSkillTolerance: number
}

export interface QualificationPreview {
  matches: Match[]
  metrics: QualificationMetrics
  seed: string
  rosterFingerprint: string
}

export interface DeleteTournamentSummary {
  matches: number
  matchReports: number
  registrations: number
  courtAccessCodes: number
}

export interface MatchReportBasketInput {
  registrationId: string
  points: 1 | 2
  assistRegistrationId?: string | null
  clientSequence: number
  clientRecordedAt?: string
}

export interface MatchReportFoulInput {
  registrationId: string
  clientSequence: number
  clientRecordedAt?: string
}

export interface MatchReportSubmitRequest {
  submissionId: string
  scoreA: number
  scoreB: number
  baskets?: MatchReportBasketInput[]
  fouls?: MatchReportFoulInput[]
  awards?: {
    mvpRegistrationId?: string | null
    fairPlayRegistrationId?: string | null
  }
}

export interface MatchReport {
  _id: string
  matchId: string
  tournamentId: string
  courtId: string
  submissionId: string
  scoreA: number
  scoreB: number
  unattributedPointsA: number
  unattributedPointsB: number
  submittedAt: string
  revision: number
  baskets?: Array<MatchReportBasketInput & { side: 'A' | 'B' }>
  fouls?: Array<MatchReportFoulInput & { side: 'A' | 'B' }>
  submittedBy?: { kind: 'referee_session' | 'user'; sessionId?: string; userId?: string }
}

export class ApiError extends Error {
  readonly status: number
  readonly errors?: Record<string, string[]>

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
) {
  if (!API_URL) throw new Error('VITE_API_URL is not configured.')

  const requestController = new AbortController()
  const handleAbort = () => requestController.abort(options.signal?.reason)
  const timeoutId = window.setTimeout(
    () => requestController.abort(new DOMException('Request timed out.', 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  )
  options.signal?.addEventListener('abort', handleAbort, { once: true })

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: requestController.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const body = (await response.json().catch(() => ({}))) as ApiErrorResponse

    if (!response.ok) {
      throw new ApiError(body.message ?? `Request failed with status ${response.status}.`, response.status, body.errors)
    }

    return body as T
  } finally {
    window.clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', handleAbort)
  }
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function getDashboardCounts(token: string, signal?: AbortSignal) {
  const [tournaments, players, matches] = await Promise.all([
    apiRequest<{ tournaments: Tournament[] }>('/tournaments', { signal }, token),
    apiRequest<{ players: Player[] }>('/players', { signal }, token),
    apiRequest<{ matches: unknown[] }>('/matches', { signal }, token),
  ])

  return {
    tournaments: tournaments.tournaments.length,
    players: players.players.length,
    matches: matches.matches.length,
  }
}

export async function getTournaments(token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ tournaments: Tournament[] }>('/tournaments', { signal }, token)
  return response.tournaments
}

export async function getTournament(tournamentId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ tournament: Tournament }>(`/tournaments/${encodeURIComponent(tournamentId)}`, { signal }, token)
  return response.tournament
}

export async function createTournament(payload: CreateTournamentPayload, token: string) {
  const response = await apiRequest<{ message: string; tournament: Tournament }>('/tournaments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return response.tournament
}

export async function updateTournament(tournamentId: string, payload: UpdateTournamentPayload, token: string) {
  const response = await apiRequest<{ message: string; tournament: Tournament }>(`/tournaments/${encodeURIComponent(tournamentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token)
  return response.tournament
}

export async function deleteTournament(tournamentId: string, token: string) {
  const response = await apiRequest<{ message: string; summary: DeleteTournamentSummary }>(
    `/tournaments/${encodeURIComponent(tournamentId)}`,
    { method: 'DELETE' },
    token,
  )
  return response.summary
}

export async function getTournamentSetup(tournamentId: string, token: string, signal?: AbortSignal) {
  return apiRequest<TournamentSetup>(`/tournaments/${encodeURIComponent(tournamentId)}/setup`, { signal }, token)
}

export async function previewQualification(tournamentId: string, token: string) {
  return apiRequest<QualificationPreview>(
    `/tournaments/${encodeURIComponent(tournamentId)}/qualification/preview`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
}

export async function generateQualification(
  tournamentId: string,
  seed: string,
  rosterFingerprint: string,
  token: string,
) {
  const response = await apiRequest<{ message: string; tournament: Tournament; matches: Match[] }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/qualification/generate`,
    { method: 'POST', body: JSON.stringify({ seed, rosterFingerprint }) },
    token,
  )
  return response
}

export async function cancelQualification(tournamentId: string, token: string) {
  const response = await apiRequest<{ message: string; tournament: Tournament }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/qualification`,
    { method: 'DELETE' },
    token,
  )
  return response.tournament
}

export async function startTournament(tournamentId: string, token: string) {
  const response = await apiRequest<{ message: string; tournament: Tournament; matches: Match[]; idempotent: boolean }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/start`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
  return response.tournament
}

export async function generateFinals(tournamentId: string, token: string) {
  return apiRequest<{ message: string; tournament: Tournament; matches: Match[]; idempotent: boolean }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/finals/generate`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
}

export async function getTournamentRegistrations(tournamentId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ registrations: Registration[] }>(
    `/registrations?tournamentId=${encodeURIComponent(tournamentId)}`,
    { signal },
    token,
  )
  return response.registrations
}

export async function getAvailablePlayers(tournamentId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ players: Player[] }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/available-players`,
    { signal },
    token,
  )
  return response.players
}

export async function addTournamentRegistrations(tournamentId: string, playerIds: string[], token: string) {
  const response = await apiRequest<{ registrations: Registration[]; summary: { created: number; alreadyRegistered: number } }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/registrations/bulk`,
    { method: 'POST', body: JSON.stringify({ playerIds }) },
    token,
  )
  return response.registrations
}

export async function removeTournamentRegistrations(tournamentId: string, playerIds: string[], token: string) {
  await apiRequest<{ message: string; summary: { deleted: number } }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/registrations/bulk`,
    { method: 'DELETE', body: JSON.stringify({ playerIds }) },
    token,
  )
}

export async function updateTournamentAttendance(
  tournamentId: string,
  updates: Array<{ playerId: string; attendanceStatus: AttendanceStatus }>,
  token: string,
) {
  return apiRequest<{ message: string; summary: { modified: number } }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/registrations/attendance`,
    { method: 'PATCH', body: JSON.stringify({ registrations: updates }) },
    token,
  )
}

export async function getTournamentMatches(tournamentId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ matches: Match[] }>(
    `/matches?tournamentId=${encodeURIComponent(tournamentId)}`,
    { signal },
    token,
  )
  return response.matches
}

export async function getMatch(matchId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ match: Match }>(
    `/matches/${encodeURIComponent(matchId)}`,
    { signal },
    token,
  )
  return response.match
}

export async function getMatchRefereeAvailability(matchId: string, token: string) {
  const response = await apiRequest<unknown>(
    `/matches/${encodeURIComponent(matchId)}/referee-availability`,
    {},
    token,
  )
  if (Array.isArray(response)) return response.map(normalizeRefereeAvailability).filter(isRefereeAvailability)

  if (!response || typeof response !== 'object') return []
  const payload = response as Record<string, unknown>
  const candidates = payload.availabilities
    ?? payload.availability
    ?? payload.refereeAvailabilities
    ?? payload.referees
    ?? payload.candidates
    ?? payload.requests
    ?? payload.data
    ?? (payload.refereeUserId || payload.userId || payload.refereeId || payload.referee || payload.user ? response : [])
  const candidateList = Array.isArray(candidates) ? candidates : [candidates]
  return candidateList.map(normalizeRefereeAvailability).filter(isRefereeAvailability)
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function normalizeRefereeAvailability(value: unknown): RefereeAvailability | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const user = (candidate.refereeUserId ?? candidate.referee ?? candidate.user ?? candidate.refereeUser) as Record<string, unknown> | string | undefined
  const userObject = typeof user === 'object' && user !== null ? user : undefined
  const refereeUserId = readOptionalString(candidate.refereeUserId)
    ?? readOptionalString(candidate.userId)
    ?? readOptionalString(candidate.refereeId)
    ?? readOptionalString(user)
    ?? readOptionalString(typeof candidate.refereeUserId === 'object' && candidate.refereeUserId !== null ? (candidate.refereeUserId as Record<string, unknown>)._id : undefined)
    ?? readOptionalString(userObject?.refereeUserId)
    ?? readOptionalString(userObject?.userId)
    ?? readOptionalString(userObject?.id)
    ?? readOptionalString(userObject?._id)
  if (!refereeUserId) return null
  return {
    refereeUserId,
    email: readOptionalString(candidate.email) ?? readOptionalString(userObject?.email),
    name: readOptionalString(candidate.name) ?? readOptionalString(userObject?.name),
    firstName: readOptionalString(candidate.firstName) ?? readOptionalString(userObject?.firstName),
    lastName: readOptionalString(candidate.lastName) ?? readOptionalString(userObject?.lastName),
    status: readOptionalString(candidate.status),
    requestedAt: readOptionalString(candidate.requestedAt),
  }
}

function isRefereeAvailability(value: RefereeAvailability | null): value is RefereeAvailability {
  return value !== null
}

export function getMatchRefereeUserId(match: Pick<Match, 'refereeUserId'>): string {
  const referee = match.refereeUserId
  if (typeof referee === 'string') return referee
  if (referee && typeof referee === 'object') {
    return readOptionalString(referee._id) ?? ''
  }
  return ''
}

export function getMatchRefereeUser(match: Pick<Match, 'refereeUserId'>): RefereeUser | null {
  const referee = match.refereeUserId
  if (!referee || typeof referee !== 'object') return null
  const id = readOptionalString(referee._id)
  if (!id) return null
  return {
    _id: id,
    email: readOptionalString(referee.email) ?? '',
    name: readOptionalString(referee.name),
    firstName: readOptionalString(referee.firstName),
    lastName: readOptionalString(referee.lastName),
  }
}

export async function assignMatchReferee(matchId: string, refereeUserId: string, token: string) {
  await apiRequest<{ message: string; availability?: unknown; match?: Match }>(
    `/matches/${encodeURIComponent(matchId)}/referee-assignment`,
    { method: 'POST', body: JSON.stringify({ refereeUserId }) },
    token,
  )
}

export async function assignMatchToCourt(matchId: string, courtId: string, token: string) {
  const response = await apiRequest<{ message: string; match: Match }>(
    `/matches/${encodeURIComponent(matchId)}/assign`,
    { method: 'POST', body: JSON.stringify({ courtId }) },
    token,
  )
  return response.match
}

export async function assignNextMatch(tournamentId: string, courtId: string, token: string) {
  const response = await apiRequest<{ message: string; match: Match | null }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/courts/${encodeURIComponent(courtId)}/assign-next`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
  return response.match
}

export async function startMatch(matchId: string, token: string) {
  const response = await apiRequest<{ message: string; match: Match }>(
    `/matches/${encodeURIComponent(matchId)}/start`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
  return response.match
}

export async function completeMatch(matchId: string, token: string) {
  return apiRequest<{ message: string; match: Match; nextMatch: Match | null; idempotent: boolean }>(
    `/matches/${encodeURIComponent(matchId)}/complete`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
}

export async function getMatchReport(matchId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ report: MatchReport | null }>(
    `/matches/${encodeURIComponent(matchId)}/report`,
    { signal },
    token,
  )
  return response.report
}

export async function submitMatchReport(matchId: string, payload: MatchReportSubmitRequest, token: string) {
  return apiRequest<{ message: string; report: MatchReport; match: Match; nextMatch: Match | null; warnings: string[]; idempotent: boolean }>(
    `/matches/${encodeURIComponent(matchId)}/report`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export async function getPlayers(token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ players: Player[] }>('/players', { signal }, token)
  return response.players
}

export async function getPlayer(playerId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ player: Player }>(`/players/${encodeURIComponent(playerId)}`, { signal }, token)
  return response.player
}

export async function createPlayer(payload: CreatePlayerPayload, token: string) {
  const response = await apiRequest<{ message: string; player: Player }>('/players', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return response.player
}

export async function updatePlayer(playerId: string, payload: UpdatePlayerPayload, token: string) {
  const response = await apiRequest<{ message: string; player: Player }>(`/players/${encodeURIComponent(playerId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token)
  return response.player
}

export async function deletePlayer(playerId: string, token: string) {
  await apiRequest<{ message: string }>(`/players/${encodeURIComponent(playerId)}`, { method: 'DELETE' }, token)
}