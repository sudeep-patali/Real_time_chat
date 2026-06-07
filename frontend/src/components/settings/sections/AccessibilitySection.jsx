import { useState } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import Toggle from '../Toggle'

const SHORTCUTS = [
  { keys: 'Ctrl+K',   action: 'Search conversations' },
  { keys: 'Ctrl+/',   action: 'New chat' },
  { keys: 'Escape',   action: 'Close current panel' },
  { keys: 'Ctrl+B',   action: 'Toggle sidebar' },
  { keys: 'Ctrl+M',   action: 'Mute/unmute notifications' },
  { keys: 'Ctrl+↑',  action: 'Previous conversation' },
  { keys: 'Ctrl+↓',  action: 'Next conversation' },
]

function AccessibilitySection() {
  const { settings, updateSection, saveSettings } = useSettingsStore()
  const addAlert = useNotificationStore(s => s.addAlert)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const acc = settings.accessibility || {}

  const update = async (key, value) => {
    updateSection('accessibility', { [key]: value })

    if (key === 'highContrast') {
      if (value) document.body.classList.add('high-contrast')
      else document.body.classList.remove('high-contrast')
    }
    if (key === 'screenReader') {
      // Add/remove skip-nav and aria-live improvements
      let skip = document.getElementById('skip-nav-link')
      if (value && !skip) {
        skip = document.createElement('a')
        skip.id = 'skip-nav-link'
        skip.href = '#main-content'
        skip.textContent = 'Skip to main content'
        skip.style.cssText = 'position:fixed;top:-40px;left:0;background:var(--color-primary);color:#fff;padding:8px 16px;z-index:9999;transition:top 0.2s'
        skip.onfocus = () => skip.style.top = '0'
        skip.onblur  = () => skip.style.top = '-40px'
        document.body.prepend(skip)
      } else if (!value && skip) {
        skip.remove()
      }
    }

    try { await saveSettings() }
    catch { addAlert({ message: 'Failed to save', type: 'error' }) }
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
            onClick={() => setShowShortcuts(v => !v)}
          >
            {showShortcuts ? 'Hide' : 'Show'}
          </button>
          <Toggle
            checked={!!acc.keyboardShortcuts}
            onChange={v => update('keyboardShortcuts', v)}
          />
        </div>
      </div>

      {showShortcuts && (
        <div style={{ marginTop: 8, padding: '12px 0' }}>
          <table className="settings-shortcuts-table">
            <tbody>
              {SHORTCUTS.map(s => (
                <tr key={s.keys}>
                  <td><span className="kbd">{s.keys}</span></td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
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