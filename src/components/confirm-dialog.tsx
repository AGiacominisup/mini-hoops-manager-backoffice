import { AlertTriangle } from 'lucide-react'
import { useEffect, useEffectEvent } from 'react'
import './confirm-dialog.css'

interface ConfirmDialogProps {
  title: string
  description: string
  subject?: string
  confirmLabel: string
  cancelLabel: string
  confirmVariant?: 'danger' | 'primary'
  isConfirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, description, subject, confirmLabel, cancelLabel, confirmVariant = 'danger', isConfirming = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const handleCancel = useEffectEvent(onCancel)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') handleCancel() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return <div className="confirm-dialog-backdrop">
    <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
      <div className="confirm-dialog-icon" aria-hidden="true"><AlertTriangle size={20} /></div>
      <h2 id="confirm-dialog-title">{title}</h2>
      {subject && <strong className="confirm-dialog-subject">{subject}</strong>}
      <p id="confirm-dialog-description">{description}</p>
      <div className="confirm-dialog-actions">
        <button className="secondary-action" type="button" onClick={onCancel} disabled={isConfirming} autoFocus>{cancelLabel}</button>
        <button className={confirmVariant === 'primary' ? 'primary-action' : 'danger-action'} type="button" onClick={onConfirm} disabled={isConfirming}>{confirmLabel}</button>
      </div>
    </div>
  </div>
}
