const API_URL = import.meta.env.VITE_API_URL

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

export interface Player {
  _id: string
  firstName?: string
  lastName?: string
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
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

export async function getPlayers(token: string, signal?: AbortSignal) {
  const response = await apiRequest<{ players: Player[] }>('/players', { signal }, token)
  return response.players
}