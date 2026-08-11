import { useEffect, useState } from 'react'
import type { AuthSession } from '../api/api-client'
import { AppShell, type AppPage } from '../components/app-shell'
import { HomePage } from './home-page'
import { LoginPage } from './login-page'
import { PlayersPage } from './players-page'
import { TournamentsPage } from './tournaments-page'

const SESSION_KEY = 'mini-hoops-backoffice-session'
const validPages: AppPage[] = ['home', 'tournaments', 'players']

function getPageFromHash(): AppPage {
  const page = window.location.hash.replace('#/', '') as AppPage
  return validPages.includes(page) ? page : 'home'
}

export function BackofficePage() {
  const [activePage, setActivePage] = useState(getPageFromHash)
  const [session, setSession] = useState<AuthSession | null>(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY)
    if (!storedSession) return null
    try { return JSON.parse(storedSession) as AuthSession } catch { sessionStorage.removeItem(SESSION_KEY); return null }
  })

  useEffect(() => {
    function handleHashChange() { setActivePage(getPageFromHash()) }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function handleLogin(authSession: AuthSession) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(authSession)); setSession(authSession) }
  function handleLogout() { sessionStorage.removeItem(SESSION_KEY); setSession(null) }
  function handleNavigate(page: AppPage) { window.location.hash = `/${page}`; setActivePage(page) }

  if (!session) return <LoginPage onLogin={handleLogin} />

  const pages = {
    home: <HomePage token={session.token} onUnauthorized={handleLogout} />,
    tournaments: <TournamentsPage token={session.token} onUnauthorized={handleLogout} />,
    players: <PlayersPage token={session.token} onUnauthorized={handleLogout} />,
  }

  return <AppShell activePage={activePage} session={session} onNavigate={handleNavigate} onLogout={handleLogout}>{pages[activePage]}</AppShell>
}