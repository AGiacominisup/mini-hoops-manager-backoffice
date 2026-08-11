const API_URL = import.meta.env.VITE_API_URL

export type UserRole = 'admin' | 'coach' | 'staff'

export interface AuthSession {
  token: string
  user: {
    id: string
    email: string
    role: UserRole
  }
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
  if (!API_URL) throw new Error('VITE_API_URL non è configurato.')

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
    throw new ApiError(body.message ?? `Richiesta non riuscita (${response.status}).`, response.status)
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
    apiRequest<{ tournaments: unknown[] }>('/tournaments', { signal }, token),
    apiRequest<{ players: unknown[] }>('/players', { signal }, token),
    apiRequest<{ matches: unknown[] }>('/matches', { signal }, token),
  ])

  return {
    tournaments: tournaments.tournaments.length,
    players: players.players.length,
    matches: matches.matches.length,
  }
}