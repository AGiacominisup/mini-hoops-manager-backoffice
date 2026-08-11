import { useEffect, useState } from 'react'
import type { AuthSession } from '../api/api-client'
import { AppShell, type AppPage } from '../components/app-shell'
import { HomePage } from './home-page'
import { LoginPage } from './login-page'
import { PlayerCreatePage } from './player-create-page'
import { PlayersPage } from './players-page'
import { TournamentCreatePage } from './tournament-create-page'
import { TournamentsPage } from './tournaments-page'

const SESSION_KEY = 'mini-hoops-backoffice-session'
const validPages: AppPage[] = ['home', 'tournaments', 'tournaments/new', 'players', 'players/new']

function normalizePage(value: string) {
  return value.replace(/^\/+|\/+$/g, '') as AppPage
}

function getPageFromLocation(): AppPage {
  const legacyPage = normalizePage(window.location.hash.replace(/^#/, '').split('?')[0])
  const page = legacyPage || normalizePage(window.location.pathname)
  return validPages.includes(page) ? page : 'home'
}

export function BackofficePage() {
  const [activePage, setActivePage] = useState(getPageFromLocation)
  const [session, setSession] = useState<AuthSession | null>(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY)
    if (!storedSession) return null
    try { return JSON.parse(storedSession) as AuthSession } catch { sessionStorage.removeItem(SESSION_KEY); return null }
  })

  useEffect(() => {
    if (window.location.hash) {
      const legacyPage = getPageFromLocation()
      window.history.replaceState(null, '', `/${legacyPage}${window.location.search}`)
    }

    function handlePopState() { setActivePage(getPageFromLocation()) }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function handleLogin(authSession: AuthSession) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(authSession)); setSession(authSession) }
  function handleLogout() { sessionStorage.removeItem(SESSION_KEY); setSession(null) }
  function handleNavigate(page: AppPage) { window.history.pushState(null, '', `/${page}`); setActivePage(page) }

  if (!session) return <LoginPage onLogin={handleLogin} />

  const pages = {
    home: <HomePage token={session.token} onUnauthorized={handleLogout} />,
    tournaments: <TournamentsPage token={session.token} onUnauthorized={handleLogout} onCreate={() => handleNavigate('tournaments/new')} />,
    'tournaments/new': <TournamentCreatePage token={session.token} onUnauthorized={handleLogout} onCancel={() => handleNavigate('tournaments')} onCreated={() => handleNavigate('tournaments')} />,
    players: <PlayersPage token={session.token} onUnauthorized={handleLogout} onCreate={() => handleNavigate('players/new')} />,
    'players/new': <PlayerCreatePage token={session.token} onUnauthorized={handleLogout} onCancel={() => handleNavigate('players')} onCreated={() => handleNavigate('players')} />,
  }

  return <AppShell activePage={activePage} session={session} onNavigate={handleNavigate} onLogout={handleLogout}>{pages[activePage]}</AppShell>
}