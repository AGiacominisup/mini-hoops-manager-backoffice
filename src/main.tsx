import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Backoffice from './Backoffice.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Backoffice />
  </StrictMode>,
)
