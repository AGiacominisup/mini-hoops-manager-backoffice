import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BackofficePage } from './pages/backoffice-page'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackofficePage />
  </StrictMode>,
)
