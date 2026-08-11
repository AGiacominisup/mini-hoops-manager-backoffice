import { Home, LogOut, Menu, Trophy, Users, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import type { AuthSession } from '../api/api-client'
import { translate } from '../utils/translations'
import { ProductLogo } from './product-logo'
import './app-shell.css'

export type AppPage = 'home' | 'tournaments' | 'players'

interface AppShellProps {
  activePage: AppPage
  children: ReactNode
  session: AuthSession
  onNavigate: (page: AppPage) => void
  onLogout: () => void
}

const navigationItems = [
  { page: 'home' as const, label: translate('navigation.home'), icon: Home },
  { page: 'tournaments' as const, label: translate('navigation.tournaments'), icon: Trophy },
  { page: 'players' as const, label: translate('navigation.players'), icon: Users },
]

export function AppShell({ activePage, children, session, onNavigate, onLogout }: AppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function handleNavigate(page: AppPage) {
    onNavigate(page)
    setIsMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <ProductLogo compact />
        <button
          className="icon-button"
          type="button"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          aria-label={translate(isMenuOpen ? 'navigation.closeMenu' : 'navigation.openMenu')}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      <aside className={`sidebar${isMenuOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <ProductLogo />
          <span>{translate('app.backoffice')}</span>
        </div>
        <nav className="sidebar-navigation" aria-label={translate('navigation.main')}>
          {navigationItems.map(({ page, label, icon: Icon }) => (
            <a
              className={activePage === page ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}
              href={`#/${page}`}
              key={page}
              onClick={(event) => {
                event.preventDefault()
                handleNavigate(page)
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="account-avatar" aria-hidden="true">{session.user.email.charAt(0).toUpperCase()}</div>
          <div className="account-copy">
            <strong>{session.user.email}</strong>
            <span>{translate(`role.${session.user.role}`)}</span>
          </div>
          <button className="account-logout" type="button" onClick={onLogout} title={translate('common.logout')} aria-label={translate('common.logout')}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {isMenuOpen && <button className="sidebar-backdrop" type="button" onClick={() => setIsMenuOpen(false)} aria-label={translate('navigation.closeMenu')} />}
      <main className="app-content">{children}</main>
    </div>
  )
}