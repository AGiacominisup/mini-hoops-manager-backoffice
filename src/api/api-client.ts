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
  courts: Array<{ _id: string; name: string; enabled?: boolean; displayOrder?: number }>
  finalGroups: Array<{ _id: string; themeName: string; level: number }>
  createdAt: string
  updatedAt: string
}

export interface CreateTournamentPayload {
  name: string
  category?: string
  winPoints: number
  courts: Array<{ name: string }>
  finalGroups: Array<{ themeName: string; level: number }>
}

export interface UpdateTournamentPayload {
  name?: string
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
  createdAt: string
  updatedAt: string
}

export interface CreatePlayerPayload {
  firstName?: string
  lastName?: string
  jerseyNumber?: number
  birthDate?: string
  guardianContact?: string
}

export type UpdatePlayerPayload = CreatePlayerPayload

export interface Registration {
  _id: string
  tournamentId: string
  playerId: string
  jerseyNumber?: number
  rankingPoints: number
  matchesPlayed: number
  wins: number
  pointsScored: number
  pointsAllowed: number
  finalGroupId: string | null
  attendanceStatus: AttendanceStatus
  checkedInAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MatchPlayer {
  registrationId: string
  jerseyNumber?: number
  name?: string
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
  teams: Array<{ side: 'A' | 'B'; players: MatchPlayer[] }>
  createdAt: string
  updatedAt: string
}

interface AuthResponse extends AuthSession {
  message: string
}

interface ApiErrorResponse {
  message?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
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
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
    const body = (await response.json().catch(() => ({}))) as ApiErrorResponse

    if (!response.ok) {
      throw new ApiError(body.message ?? `Request failed with status ${response.status}.`, response.status)
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
  await apiRequest<{ message: string }>(`/tournaments/${encodeURIComponent(tournamentId)}`, { method: 'DELETE' }, token)
}

export async function startTournament(tournamentId: string, token: string) {
  const response = await apiRequest<{ message: string; tournament: Tournament; matches: Match[]; idempotent: boolean }>(
    `/tournaments/${encodeURIComponent(tournamentId)}/start`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
  return response.tournament
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

export async function getTournamentMatches(tournamentId: string, token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ matches: Match[] }>(
    `/matches?tournamentId=${encodeURIComponent(tournamentId)}`,
    { signal },
    token,
  )
  return response.matches
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