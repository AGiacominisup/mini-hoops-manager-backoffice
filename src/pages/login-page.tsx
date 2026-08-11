import { type FormEvent, useState } from 'react'
import { ApiError, type AuthSession, login } from '../api/api-client'
import { ProductLogo } from '../components/product-logo'
import { translate } from '../utils/translations'
import './login-page.css'

interface LoginPageProps {
  onLogin: (session: AuthSession) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      onLogin(await login(email.trim(), password))
    } catch (loginError) {
      setError(
        loginError instanceof ApiError && loginError.status === 401
          ? translate('login.invalidCredentials')
          : translate('login.serverUnavailable'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="brand-panel" aria-label={translate('app.name')}>
        <div className="login-brand"><ProductLogo /></div>
        <div className="brand-message">
          <p className="eyebrow">{translate('app.backoffice')}</p>
          <h1>{translate('login.brandTitle')}</h1>
          <p className="brand-copy">{translate('login.brandDescription')}</p>
        </div>
        <p className="season-label">{translate('login.season')}</p>
      </section>
      <section className="login-panel">
        <div className="login-content">
          <div className="mobile-brand"><ProductLogo /></div>
          <div className="login-heading">
            <p className="eyebrow">{translate('login.privateArea')}</p>
            <h2>{translate('login.welcome')}</h2>
            <p>{translate('login.description')}</p>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">{translate('login.email')}</label>
            <input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={translate('login.emailPlaceholder')} required autoFocus />
            <label htmlFor="password">{translate('login.password')}</label>
            <div className="password-field">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={translate('login.passwordPlaceholder')} required />
              <button className="visibility-button" type="button" onClick={() => setShowPassword((isVisible) => !isVisible)} aria-label={translate(showPassword ? 'login.hidePassword' : 'login.showPassword')}>
                {translate(showPassword ? 'login.hide' : 'login.show')}
              </button>
            </div>
            <p className="form-error" role="alert" aria-live="polite">{error}</p>
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {translate(isSubmitting ? 'login.submitting' : 'login.submit')}<span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="security-note"><span aria-hidden="true">●</span>{translate('login.securityNote')}</p>
        </div>
      </section>
    </main>
  )
}