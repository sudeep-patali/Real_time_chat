import { useState, useRef } from 'react'
import { useSettingsStore } from '../../../store/settingsStore'
import { useNotificationStore } from '../../../store/notificationStore'
import { clearCacheAPI } from '../../../services/settingsService'
import ConfirmModal from '../ConfirmModal'
import Toggle from '../Toggle'

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcStorageSize() {
  let size = 0
  try {
    for (const key of Object.keys(localStorage)) {
      size += (localStorage.getItem(key) || '').length * 2 // approximate bytes (UTF-16)
    }
  } catch {}
  return (size / (1024 * 1024)).toFixed(2)
}

// Keys that must survive a cache clear (same allowlist as settingsStore)
const PRESERVE_KEYS     = new Set(['token', 'user'])
const PRESERVE_PREFIXES = ['theme_', 'fontSize_', 'bubbleSize_', 'compactMode_', 'wallpaper-']

function shouldPreserveKey(key) {
  if (PRESERVE_KEYS.has(key)) return true
  return PRESERVE_PREFIXES.some(prefix => key.startsWith(prefix))
}

function clearNonEssentialStorage() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (!shouldPreserveKey(key)) localStorage.removeItem(key)
    })
  } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────

function ChatSettingsSection() {
  const { settings, updateSection, saveSettings } = useSettingsStore()
  const addAlert = useNotificationStore(s => s.addAlert)

  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing, setClearing]             = useState(false)

  // Reactive storage size — recalculated after a cache clear
  const [storageSize, setStorageSize] = useState(() => calcStorageSize())

  // Debounce ref: holds the pending timer id for toggle-change saves
  const debounceRef = useRef(null)

  const chat = settings.chat || {}

  // ── Toggle handler with optimistic rollback + debounce ───────────────────
  const update = (key, value) => {
    // Save the previous value for rollback
    const prev = chat[key]

    // Optimistic update — UI reflects the change immediately
    updateSection('chat', { [key]: value })

    // Debounce the actual API save by 300ms so rapid clicks only cause one request
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await saveSettings()
      } catch {
        // Rollback to the previous value on failure
        updateSection('chat', { [key]: prev })
        addAlert({ message: 'Failed to save setting', type: 'error' })
      }
    }, 300)
  }

  // ── Auto-delete select (no debounce needed — less frequent interaction) ──
  const updateSelect = async (key, value) => {
    const prev = chat[key]
    updateSection('chat', { [key]: value })
    try {
      await saveSettings()
    } catch {
      updateSection('chat', { [key]: prev })
      addAlert({ message: 'Failed to save setting', type: 'error' })
    }
  }

  // ── Clear cache ───────────────────────────────────────────────────────────
  const handleClearCache = async () => {
    setClearing(true)
    try {
      // 1. Notify backend → it emits 'cacheCleared' to other tabs via socket
      await clearCacheAPI()
    } catch {
      // Non-fatal: backend notification failed but we still clear locally
    }

    // 2. Wipe non-essential localStorage on this tab
    clearNonEssentialStorage()

    // 3. Refresh the displayed storage size
    setStorageSize(calcStorageSize())

    addAlert({ message: 'Cache cleared successfully', type: 'success' })
    setShowClearModal(false)
    setClearing(false)
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Message Management ─────────────────────────────────────────── */}
      <div className="settings-panel">
        <div className="settings-section-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
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
            onChange={e => updateSelect('autoDeleteMessages', e.target.value)}
          >
            <option value="off">Off</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </select>
        </div>

        {/* ── Media Auto-Download ─────────────────────────────────────── */}
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

        {/* Phase 1: 4th auto-download toggle — voice messages */}
        <div className="settings-row">
          <Toggle
            checked={chat.autoDownloadVoiceMessages !== false}
            onChange={v => update('autoDownloadVoiceMessages', v)}
            label="Auto-Download Voice Messages"
            description="Automatically download audio and voice messages"
          />
        </div>
      </div>

      {/* ── Storage Management ────────────────────────────────────────── */}
      <div className="settings-panel">
        <div className="settings-section-title" style={{ fontSize: 16 }}>Storage Management</div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Storage Used</div>
            <div className="settings-row-desc">Approximate local storage usage</div>
          </div>
          {/* storageSize is now reactive state — updates after every cache clear */}
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>
            ~{storageSize} MB
          </span>
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <div className="settings-row-label">Clear Cache</div>
            <div className="settings-row-desc">Remove cached media and temporary files</div>
          </div>
          <button
            className="settings-btn danger"
            onClick={() => setShowClearModal(true)}
            disabled={clearing}
          >
            {clearing ? 'Clearing…' : 'Clear'}
          </button>
        </div>
      </div>

      {showClearModal && (
        <ConfirmModal
          title="Clear Cache"
          message="This will remove cached media and temporary data. Your messages and settings will not be affected."
          confirmLabel={clearing ? 'Clearing…' : 'Clear Cache'}
          onConfirm={handleClearCache}
          onCancel={() => !clearing && setShowClearModal(false)}
        />
      )}
    </>
  )
}

export default ChatSettingsSection