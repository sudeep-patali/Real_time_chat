import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettingsStore, applyHighContrast, applyScreenReader } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import Toggle from '../Toggle'

// ── Shortcuts shown in the modal — mirrors the shortcuts actually registered
// below when keyboardShortcuts is enabled.
const SHORTCUTS = [
  { keys: 'Ctrl+K', action: 'Focus search' },
  { keys: 'Ctrl+N', action: 'Find people' },
  { keys: 'Ctrl+,', action: 'Open settings' },
  { keys: 'Escape', action: 'Close current dialog' },
]

function AccessibilitySection() {
  const { settings, updateSection, saveSettings } = useSettingsStore()
  const addAlert = useNotificationStore(s => s.addAlert)
  const navigate = useNavigate()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const acc = settings.accessibility || {}

  const shortcutHandlerRef = useRef(null)

  // FIX: Re-apply DOM side-effects when the component mounts (i.e. when the
  // user navigates to the Accessibility section). The settingsStore.loadSettings()
  // already does this on initial app load, but this ensures the DOM is correct
  // if somehow the class got stripped (e.g. theme change resets body.className).
  useEffect(() => {
    applyHighContrast(!!acc.highContrast)
    applyScreenReader(!!acc.screenReader)
  }, [acc.highContrast, acc.screenReader])

  // ── Keyboard shortcuts registration ───────────────────────────────────────
  // Registers/unregisters a single window-level keydown listener based on the
  // keyboardShortcuts toggle. The handler is stored in a ref so it can be
  // cleanly removed on toggle-off or unmount.
  useEffect(() => {
    if (!acc.keyboardShortcuts) {
      if (shortcutHandlerRef.current) {
        window.removeEventListener('keydown', shortcutHandlerRef.current)
        shortcutHandlerRef.current = null
      }
      return
    }

    const handler = (e) => {
      const target = e.target
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isEditable) return

      // Escape — close any open modal app-wide
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('close-modal'))
        return
      }

      if (!(e.ctrlKey || e.metaKey)) return

      const key = e.key.toLowerCase()

      if (key === 'k') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('focus-search'))
      } else if (key === 'n') {
        e.preventDefault()
        navigate('/find-people')
      } else if (key === ',') {
        e.preventDefault()
        navigate('/settings')
      }
    }

    shortcutHandlerRef.current = handler
    window.addEventListener('keydown', handler)

    return () => {
      window.removeEventListener('keydown', handler)
      shortcutHandlerRef.current = null
    }
  }, [acc.keyboardShortcuts, navigate])

  // ── Shortcuts modal: focus trap + Escape to close ─────────────────────────
  useEffect(() => {
    if (!showShortcuts) return
    const onKey = (e) => { if (e.key === 'Escape') setShowShortcuts(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showShortcuts])

  // ── Optimistic update with rollback on save failure ───────────────────────
  const update = async (key, value) => {
    const prev = acc[key]
    updateSection('accessibility', { [key]: value })

    // Apply DOM side-effects immediately (real-time update)
    if (key === 'highContrast') applyHighContrast(value)
    if (key === 'screenReader')  applyScreenReader(value)

    try {
      await saveSettings()
    } catch {
      // rollback
      updateSection('accessibility', { [key]: prev })
      if (key === 'highContrast') applyHighContrast(prev)
      if (key === 'screenReader')  applyScreenReader(prev)
      addAlert({ message: 'Failed to save accessibility setting', type: 'error' })
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        Accessibility
      </div>

      <div className="settings-subsection-label">Visual</div>
      <div className="settings-row">
        <Toggle
          checked={!!acc.highContrast}
          onChange={v => update('highContrast', v)}
          label="High Contrast Mode"
          description="Increase contrast for better readability"
        />
      </div>

      <div className="settings-subsection-label">Input</div>
      <div className="settings-row">
        <div className="settings-row-info">
          <div className="settings-row-label">Keyboard Shortcuts</div>
          <div className="settings-row-desc">Enable keyboard navigation shortcuts</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="settings-btn secondary"
            onClick={() => setShowShortcuts(true)}
          >
            Show
          </button>
          <Toggle
            checked={!!acc.keyboardShortcuts}
            onChange={v => update('keyboardShortcuts', v)}
          />
        </div>
      </div>

      {showShortcuts && (
        <div
          className="shortcuts-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShortcuts(false) }}
        >
          <div className="shortcuts-modal">
            <div className="shortcuts-modal-header">
              <h3>Keyboard Shortcuts</h3>
              <button
                className="shortcuts-modal-close"
                onClick={() => setShowShortcuts(false)}
                aria-label="Close shortcuts modal"
                autoFocus
              >✕</button>
            </div>
            <table className="settings-shortcuts-table">
              <tbody>
                {SHORTCUTS.map(s => (
                  <tr key={s.keys}>
                    <td><kbd className="kbd">{s.keys}</kbd></td>
                    <td>{s.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="settings-subsection-label">Screen Reader</div>
      <div className="settings-row">
        <Toggle
          checked={!!acc.screenReader}
          onChange={v => update('screenReader', v)}
          label="Screen Reader Support"
          description="Adds skip navigation and enhanced aria-live regions"
        />
      </div>
    </div>
  )
}

export default AccessibilitySection