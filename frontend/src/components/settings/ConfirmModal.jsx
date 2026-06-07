import { useState } from 'react'

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = true,
  requiresInput = false,
  inputLabel = 'Enter your password',
  inputType = 'password',
}) {
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm(requiresInput ? inputValue : undefined)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-modal-overlay" onClick={onCancel}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-title">{title}</div>
        <div className="settings-modal-msg">{message}</div>

        {requiresInput && (
          <div className="settings-input-group">
            <label style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{inputLabel}</label>
            <input
              type={inputType}
              className="settings-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
          </div>
        )}

        <div className="settings-modal-actions">
          <button className="settings-btn secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`settings-btn ${danger ? 'danger' : 'primary'}`}
            onClick={handleConfirm}
            disabled={loading || (requiresInput && !inputValue)}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal