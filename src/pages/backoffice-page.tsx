import { type ReactNode, useEffect, useState } from 'react'
import type { AuthSession } from '../api/api-client'
import { AppShell, type AppPage } from '../components/app-shell'
import { HomePage } from './home-page'
import { LoginPage } from './login-page'
import { PlayerCreatePage } from './player-create-page'
import { PlayerEditPage } from './player-edit-page'
import { PlayersPage } from './players-page'
import { TournamentCreatePage } from './tournament-create-page'
import { TournamentDetailPage } from './tournament-detail-page'
import { TournamentEditPage } from './tournament-edit-page'
import { TournamentsPage } from './tournaments-page'

type EntityPage = 'players/edit' | 'tournaments/edit' | 'tournaments/detail'
type StaticPage = Exclude<AppPage, EntityPage>
type AppRoute = { page: StaticPage } | { page: EntityPage; entityId: string }

const SESSION_KEY = 'mini-hoops-backoffice-session'
const staticPages: StaticPage[] = ['home', 'tournaments', 'tournaments/new', 'players', 'players/new']
const editPathPattern = /^(players|tournaments)\/([^/]+)\/edit$/
const tournamentDetailPathPattern = /^tournaments\/([^/]+)$/

function normalizePage(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

function buildPath(route: AppRoute) {
  if (!('entityId' in route)) return `/${route.page}`
  const entityId = encodeURIComponent(route.entityId)
  return route.page === 'tournaments/detail' ? `/tournaments/${entityId}` : `/${route.page.replace('/edit', '')}/${entityId}/edit`
}

function getRouteFromLocation(): AppRoute {
  const legacyPath = normalizePage(window.location.hash.replace(/^#/, '').split('?')[0])
  const path = legacyPath || normalizePage(window.location.pathname)
  if (staticPages.includes(path as StaticPage)) return { page: path as StaticPage }

  const editMatch = editPathPattern.exec(path)
  if (editMatch) return { page: `${editMatch[1]}/edit` as EntityPage, entityId: decodeURIComponent(editMatch[2]) }

  const tournamentDetailMatch = tournamentDetailPathPattern.exec(path)
  if (tournamentDetailMatch) return { page: 'tournaments/detail', entityId: decodeURIComponent(tournamentDetailMatch[1]) }

  return { page: 'home' }
}

export function BackofficePage() {
  const [route, setRoute] = useState(getRouteFromLocation)
  const [session, setSession] = useState<AuthSession | null>(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY)
    if (!storedSession) return null
    try { return JSON.parse(storedSession) as AuthSession } catch { sessionStorage.removeItem(SESSION_KEY); return null }
  })

  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', `${buildPath(getRouteFromLocation())}${window.location.search}`)
    }

    function handlePopState() { setRoute(getRouteFromLocation()) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function handleLogin(authSession: AuthSession) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(authSession)); setSession(authSession) }
  function handleLogout() { sessionStorage.removeItem(SESSION_KEY); setSession(null) }
  function handleNavigateRoute(nextRoute: AppRoute) { window.history.pushState(null, '', buildPath(nextRoute)); setRoute(nextRoute) }
  function handleNavigate(page: StaticPage) { handleNavigateRoute({ page }) }

  if (!session) return <LoginPage onLogin={handleLogin} />

  const pages: Record<StaticPage, ReactNode> = {
    home: <HomePage token={session.token} onUnauthorized={handleLogout} />,
    tournaments: <TournamentsPage token={session.token} onUnauthorized={handleLogout} onCreate={() => handleNavigate('tournaments/new')} onOpen={(tournamentId) => handleNavigateRoute({ page: 'tournaments/detail', entityId: tournamentId })} onEdit={(tournamentId) => handleNavigateRoute({ page: 'tournaments/edit', entityId: tournamentId })} />,
    'tournaments/new': <TournamentCreatePage token={session.token} onUnauthorized={handleLogout} onCancel={() => handleNavigate('tournaments')} onCreated={() => handleNavigate('tournaments')} />,
    players: <PlayersPage token={session.token} onUnauthorized={handleLogout} onCreate={() => handleNavigate('players/new')} onEdit={(playerId) => handleNavigateRoute({ page: 'players/edit', entityId: playerId })} />,
    'players/new': <PlayerCreatePage token={session.token} onUnauthorized={handleLogout} onCancel={() => handleNavigate('players')} onCreated={() => handleNavigate('players')} />,
  }

  function renderEntityPage(page: EntityPage, entityId: string, token: string) {
    if (page === 'players/edit') return <PlayerEditPage playerId={entityId} token={token} onUnauthorized={handleLogout} onCancel={() => handleNavigate('players')} onUpdated={() => handleNavigate('players')} />
    if (page === 'tournaments/edit') return <TournamentEditPage tournamentId={entityId} token={token} onUnauthorized={handleLogout} onCancel={() => handleNavigateRoute({ page: 'tournaments/detail', entityId })} onUpdated={() => handleNavigateRoute({ page: 'tournaments/detail', entityId })} />
    return <TournamentDetailPage tournamentId={entityId} token={token} onUnauthorized={handleLogout} onBack={() => handleNavigate('tournaments')} onEdit={(tournamentId) => handleNavigateRoute({ page: 'tournaments/edit', entityId: tournamentId })} />
  }

  return <AppShell activePage={route.page} session={session} onNavigate={handleNavigate} onLogout={handleLogout}>
    {'entityId' in route ? renderEntityPage(route.page, route.entityId, session.token) : pages[route.page]}
  </AppShell>
}
