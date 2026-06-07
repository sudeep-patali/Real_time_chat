import { useState } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import ConfirmModal from '../ConfirmModal'
import Toggle from '../Toggle'

// FIX: Get the current user id so we can protect per-user keys from clearCache.
function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    return user?.id || user?._id || null
  } catch { return null }
}

function ChatSettingsSection() {
  const { settings, updateSection, saveSettings } = useSettingsStore()
  const addAlert = useNotificationStore(s => s.addAlert)
  const [showClearModal, setShowClearModal] = useState(false)
  const chat = settings.chat || {}

  const update = async (key, value) => {
    updateSection('chat', { [key]: value })
    try { await saveSettings() }
    catch { addAlert({ message: 'Failed to save', type: 'error' }) }
  }

  const getStorageSize = () => {
    let size = 0
    try {
      for (const key of Object.keys(localStorage)) {
        size += (localStorage.getItem(key) || '').length * 2 // bytes
      }
    } catch {}
    return (size / (1024 * 1024)).toFixed(2)
  }

  const clearCache = () => {
    const uid = getCurrentUserId()

    // FIX: The original code only preserved bare keys like 'theme', 'fontSize'
    // etc., but all per-user settings follow the pattern `key_userId`.
    // Clearing without preserving the user-keyed variants destroyed all
    // appearance settings on every cache clear.
    //
    // Strategy: preserve auth data, per-user appearance prefs, and wallpapers.
    // Everything else (cached API responses, temp blobs, etc.) is removed.
    const keysToPreserve = new Set([
      'token',
      'user',
    ])

    // Always preserve user-specific appearance keys if a user is logged in
    if (uid) {
      keysToPreserve.add(`theme_${uid}`)
      keysToPreserve.add(`fontSize_${uid}`)
      keysToPreserve.add(`bubbleSize_${uid}`)
      keysToPreserve.add(`compactMode_${uid}`)
      keysToPreserve.add(`wallpaper-light_${uid}`)
      keysToPreserve.add(`wallpaper-dark_${uid}`)
    }

    // Also preserve bare (non-user-keyed) fallback values
    keysToPreserve.add('theme')
    keysToPreserve.add('fontSize')
    keysToPreserve.add('bubbleSize')
    keysToPreserve.add('compactMode')

    const allKeys = Object.keys(localStorage)
    allKeys.forEach(k => {
      if (!keysToPreserve.has(k)) localStorage.removeItem(k)
    })

    addAlert({ message: 'Cache cleared successfully', type: 'success' })
    setShowClearModal(false)
  }

  return (
    <>
      <div className="settings-panel">
        <div className="settings-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat Settings
        </div>

        <div className="settings-subsection-label">Message Management</div>
        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Auto Delete Messages</div>
            <div className="settings-row-desc">Automatically delete messages after a set time</div>
          </div>
          <select
            className="settings-select"
            value={chat.autoDeleteMessages || 'off'}
            onChange={e => update('autoDeleteMessages', e.target.value)}
          >
            <option value="off">Off</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
        </div>

        <div className="settings-subsection-label">Media Auto-Download</div>
        <div className="settings-row">
          <Toggle
            checked={!!chat.autoDownloadImages}
            onChange={v => update('autoDownloadImages', v)}
            label="Auto-Download Images"
            description="Automatically download images in chats"
          />
        </div>
        <div className="settings-row">
          <Toggle
            checked={!!chat.autoDownloadVideos}
            onChange={v => update('autoDownloadVideos', v)}
            label="Auto-Download Videos"
            description="Automatically download video files"
          />
        </div>
        <div className="settings-row">
          <Toggle
            checked={!!chat.autoDownloadDocs}
            onChange={v => update('autoDownloadDocs', v)}
            label="Auto-Download Documents"
            description="Automatically download documents and files"
          />
        </div>
      </div>

      <div className="settings-panel">
        <div className="settings-section-title" style={{ fontSize: 16 }}>Storage Management</div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Storage Used</div>
            <div className="settings-row-desc">Approximate local storage usage</div>
          </div>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            ~{getStorageSize()} MB
          </span>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Clear Cache</div>
            <div className="settings-row-desc">Remove cached media and temporary files</div>
          </div>
          <button className="settings-btn danger" onClick={() => setShowClearModal(true)}>
            Clear
          </button>
        </div>
      </div>

      {showClearModal && (
        <ConfirmModal
          title="Clear Cache"
          message="This will remove cached media and temporary data. Your messages and settings will not be affected."
          confirmLabel="Clear Cache"
          onConfirm={clearCache}
          onCancel={() => setShowClearModal(false)}
        />
      )}
    </>
  )
}

export default ChatSettingsSection