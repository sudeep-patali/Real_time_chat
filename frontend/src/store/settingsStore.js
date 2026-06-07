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
  privacy: {
    readReceipts: true,
    typingIndicator: true,
  },
  chat: {
    autoDeleteMessages: 'off',
    autoDownloadImages: true,
    autoDownloadVideos: false,
    autoDownloadDocs: false,
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

export const useSettingsStore = create((set, get) => ({
  settings: defaultSettings,
  loading: false,
  saving: false,

  loadSettings: async () => {
    set({ loading: true })
    try {
      const res = await api.get('/users/me/settings')
      const merged = {
        ...defaultSettings,
        ...res.data.settings,
        notifications: { ...defaultSettings.notifications, ...res.data.settings?.notifications },
        privacy:       { ...defaultSettings.privacy,       ...res.data.settings?.privacy },
        chat:          { ...defaultSettings.chat,          ...res.data.settings?.chat },
        groups:        { ...defaultSettings.groups,        ...res.data.settings?.groups },
        twoFactor:     { ...defaultSettings.twoFactor,     ...res.data.settings?.twoFactor },
        accessibility: { ...defaultSettings.accessibility, ...res.data.settings?.accessibility },
      }
      set({ settings: merged })
    } catch (e) {
      // Use defaults silently
    } finally {
      set({ loading: false })
    }
  },

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
      set({ settings: res.data.settings || get().settings })
    } finally {
      set({ saving: false })
    }
  },
}))