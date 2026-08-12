const API_URL = import.meta.env.VITE_API_URL
const REQUEST_TIMEOUT_MS = 30_000

export type UserRole = 'admin' | 'coach' | 'staff'
export type TournamentStatus = 'planned' | 'in_progress' | 'completed'

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
  startDate: string
  endDate: string
  category?: string
  status: TournamentStatus
  courts: Array<{ _id: string; name: string }>
  qualification: {
    status: 'draft' | 'generated' | 'in_progress' | 'completed'
    totalMatches: number
  }
}

export interface CreateTournamentPayload {
  name: string
  startDate: string
  endDate: string
  category?: string
  winPoints: number
  status: 'planned'
  qualificationAppearancesPerPlayer: number
  courts: Array<{ name: string }>
  finalGroups: Array<{ themeName: string; level: number }>
}

export interface Player {
  _id: string
  firstName?: string
  lastName?: string
  jerseyNumber?: number
  birthDate?: string
  guardianContact?: string
}

export interface CreatePlayerPayload {
  firstName?: string
  lastName?: string
  jerseyNumber?: number
  birthDate?: string
  guardianContact?: string
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

export async function createTournament(payload: CreateTournamentPayload, token: string) {
  const response = await apiRequest<{ message: string; tournament: Tournament }>('/tournaments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return response.tournament
}

export async function getPlayers(token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ players: Player[] }>('/players', { signal }, token)
  return response.players
}

export async function createPlayer(payload: CreatePlayerPayload, token: string) {
  const response = await apiRequest<{ message: string; player: Player }>('/players', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
  return response.player
}