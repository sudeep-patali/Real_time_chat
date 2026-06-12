import { create } from 'zustand'
import api from '../config/api.config'

const defaultSettings = {
  notifications: {
    enabled: true,
    sound: true,
    browser: false,
    groupEnabled: true,
    mentionEnabled: true,
    messageSound: 'default',
    groupSound: 'default',
  },
  // FIX: privacy now includes visibility fields (lastSeen, onlineStatus, addToGroups)
  // that come from user.privacy on the backend. The fixed getSettings endpoint
  // merges them into settings.privacy so the store sees them in one place.
  privacy: {
    readReceipts: true,
    typingIndicator: true,
    lastSeen: 'everyone',
    onlineStatus: 'everyone',
    addToGroups: 'everyone',
  },
  chat: {
    autoDeleteMessages: 'off',
    autoDownloadImages: true,
    autoDownloadVideos: false,
    autoDownloadDocs: false,
    autoDownloadVoiceMessages: true,
  },
  groups: {
    muteAll: false,
    mentionNotifs: true,
  },
  twoFactor: {
    enabled: false,
    method: 'email',
  },
  accessibility: {
    highContrast: false,
    keyboardShortcuts: true,
    screenReader: false,
  },
}

// Keys / prefixes that must never be removed during a cache clear.
// This mirrors the logic in ChatSettingsSection and the cacheCleared handler.
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
  } catch (err) {
    console.error('[settingsStore] clearNonEssentialStorage error:', err)
  }
}

export const useSettingsStore = create((set, get) => ({
  settings: defaultSettings,
  loading: false,
  saving: false,

  loadSettings: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/users/me/settings')
      const remote = res.data.settings || {}

      // Deep-merge each section so missing remote keys fall back to defaults.
      // FIX: privacy now contains lastSeen/onlineStatus/addToGroups from the
      // improved getSettings endpoint, so we deep-merge them here too.
      const merged = {
        ...defaultSettings,
        ...remote,
        notifications: { ...defaultSettings.notifications, ...remote.notifications },
        privacy:       { ...defaultSettings.privacy,       ...remote.privacy },
        chat:          { ...defaultSettings.chat,          ...remote.chat },
        groups:        { ...defaultSettings.groups,        ...remote.groups },
        twoFactor:     { ...defaultSettings.twoFactor,     ...remote.twoFactor },
        accessibility: { ...defaultSettings.accessibility, ...remote.accessibility },
      }
      set({ settings: merged })

      // FIX: Re-apply DOM side-effects for accessibility settings that were
      // loaded from DB. Previously these were only applied when the user
      // toggled them in the UI, so they were lost on page refresh.
      const acc = merged.accessibility || {}
      if (acc.highContrast) {
        document.body.classList.add('high-contrast')
      } else {
        document.body.classList.remove('high-contrast')
      }
      if (acc.screenReader) {
        if (!document.getElementById('skip-nav-link')) {
          const skip = document.createElement('a')
          skip.id = 'skip-nav-link'
          skip.href = '#main-content'
          skip.textContent = 'Skip to main content'
          skip.style.cssText = 'position:fixed;top:-40px;left:0;background:var(--color-primary);color:#fff;padding:8px 16px;z-index:9999;transition:top 0.2s'
          skip.onfocus = () => { skip.style.top = '0' }
          skip.onblur  = () => { skip.style.top = '-40px' }
          document.body.prepend(skip)
        }
      } else {
        document.getElementById('skip-nav-link')?.remove()
      }
    } catch (e) {
      // Use defaults silently
    } finally {
      set({ loading: false })
    }
  },

  // FIX: updateSection now immediately updates the store AND persists to the DB.
  // Previously, each section component called updateSection() then saveSettings()
  // separately which was fine, but this centralises the save so callers that only
  // call updateSection() (if any) still persist correctly.
  updateSection: (section, patch) => {
    set(state => ({
      settings: {
        ...state.settings,
        [section]: { ...state.settings[section], ...patch }
      }
    }))
  },

  saveSettings: async () => {
    set({ saving: true })
    try {
      const res = await api.put('/users/me/settings', get().settings)
      // Merge the server response back (server may normalise values)
      if (res.data.settings) {
        const remote = res.data.settings
        set(state => ({
          settings: {
            ...state.settings,
            ...remote,
            notifications: { ...state.settings.notifications, ...remote.notifications },
            privacy:       { ...state.settings.privacy,       ...remote.privacy },
            chat:          { ...state.settings.chat,          ...remote.chat },
            groups:        { ...state.settings.groups,        ...remote.groups },
            twoFactor:     { ...state.settings.twoFactor,     ...remote.twoFactor },
            accessibility: { ...state.settings.accessibility, ...remote.accessibility },
          }
        }))
      }
    } finally {
      set({ saving: false })
    }
  },

  // ── Phase 1: Real-time socket sync ────────────────────────────────────────
  // Call this once from useGlobalSocket (or wherever the raw socket is available)
  // after the socket connects. Registers listeners for:
  //   • chatSettingsUpdated — another tab/device changed chat settings; merge them in.
  //   • cacheCleared        — another tab/device cleared the cache; do the same here.
  //
  // Always calls socket.off before socket.on to prevent duplicate listeners if
  // the function is called more than once (e.g. on reconnect).
  setupSocketListeners: (socket) => {
    if (!socket) return

    // ── chatSettingsUpdated ──────────────────────────────────────────────────
    const handleChatSettingsUpdated = (data) => {
      if (!data?.chat || typeof data.chat !== 'object') return
      set(state => ({
        settings: {
          ...state.settings,
          chat: { ...state.settings.chat, ...data.chat },
        },
      }))
    }

    socket.off('chatSettingsUpdated', handleChatSettingsUpdated)
    socket.on('chatSettingsUpdated',  handleChatSettingsUpdated)

    // ── cacheCleared ─────────────────────────────────────────────────────────
    // Another tab called clearCacheAPI() which caused the backend to emit this
    // event to all of this user's personal-room sockets. Mirror the clear here.
    const handleCacheCleared = () => {
      clearNonEssentialStorage()
      console.log('[settingsStore] Cache cleared by remote tab signal')
    }

    socket.off('cacheCleared', handleCacheCleared)
    socket.on('cacheCleared',  handleCacheCleared)
  },
}))