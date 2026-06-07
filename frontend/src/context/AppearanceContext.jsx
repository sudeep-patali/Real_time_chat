import { createContext, useContext, useState, useEffect } from 'react'
import api from '../config/api.config'

const AppearanceContext = createContext(null)

const FONT_SIZES = { small: '13px', medium: '15px', large: '17px' }

// ── Per-user localStorage key helpers ────────────────────────────────────
function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    return user?.id || user?._id || null
  } catch { return null }
}

function key(name) {
  const uid = getUserId()
  return uid ? `${name}_${uid}` : name
}

// ── Persist appearance settings to the database ───────────────────────────
// Appearance settings (theme excluded — ThemeContext handles that) are stored
// in user.settings.appearance on the backend so they survive cross-device login.
// FIX: Previously these settings only lived in localStorage, so logging in on
// a new device always reset them to defaults.
async function persistAppearanceToDb(patch) {
  try {
    await api.put('/users/me/settings', { appearance: patch })
  } catch {
    // Silently fail — localStorage already has the value as a fallback.
  }
}

export function AppearanceProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(() =>
    localStorage.getItem(key('fontSize')) || 'medium'
  )
  const [bubbleSize, setBubbleSizeState] = useState(() =>
    localStorage.getItem(key('bubbleSize')) || 'normal'
  )
  const [compactMode, setCompactModeState] = useState(() =>
    localStorage.getItem(key('compactMode')) === 'true'
  )

  // Apply font size to DOM and save to localStorage + DB
  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', FONT_SIZES[fontSize])
    localStorage.setItem(key('fontSize'), fontSize)
  }, [fontSize])

  // Apply compact mode class and save
  useEffect(() => {
    if (compactMode) document.body.classList.add('compact')
    else document.body.classList.remove('compact')
    localStorage.setItem(key('compactMode'), String(compactMode))
  }, [compactMode])

  useEffect(() => {
    localStorage.setItem(key('bubbleSize'), bubbleSize)
  }, [bubbleSize])

  // ── Setters that update state AND persist to DB ───────────────────────
  const setFontSize = (v) => {
    setFontSizeState(v)
    persistAppearanceToDb({ fontSize: v })
  }

  const setBubbleSize = (v) => {
    setBubbleSizeState(v)
    persistAppearanceToDb({ bubbleSize: v })
  }

  const setCompactMode = (v) => {
    setCompactModeState(v)
    persistAppearanceToDb({ compactMode: v })
  }

  // ── Wallpaper (kept in localStorage only — too large for DB) ─────────
  const getWallpaper = (mode) =>
    localStorage.getItem(`wallpaper-${mode}_${getUserId() || 'guest'}`) || null

  const setWallpaper = (mode, dataUrl) => {
    const k = `wallpaper-${mode}_${getUserId() || 'guest'}`
    if (dataUrl) localStorage.setItem(k, dataUrl)
    else localStorage.removeItem(k)
  }

  // ── Rehydrate: re-read localStorage and DB for the current user ───────
  // Called when the auth:user-changed event fires (login / logout / switch).
  const rehydrate = async () => {
    // 1. Read localStorage first (instant — no flicker)
    const lsFont    = localStorage.getItem(key('fontSize'))    || 'medium'
    const lsBubble  = localStorage.getItem(key('bubbleSize'))  || 'normal'
    const lsCompact = localStorage.getItem(key('compactMode')) === 'true'

    setFontSizeState(lsFont)
    setBubbleSizeState(lsBubble)
    setCompactModeState(lsCompact)

    // 2. Then try to load from DB so cross-device settings take effect
    //    (only meaningful when a user is logged in)
    const uid = getUserId()
    if (!uid) return
    try {
      const res = await api.get('/users/me/settings')
      const appearance = res.data?.settings?.appearance
      if (appearance) {
        if (appearance.fontSize) {
          localStorage.setItem(key('fontSize'), appearance.fontSize)
          setFontSizeState(appearance.fontSize)
        }
        if (appearance.bubbleSize) {
          localStorage.setItem(key('bubbleSize'), appearance.bubbleSize)
          setBubbleSizeState(appearance.bubbleSize)
        }
        if (appearance.compactMode !== undefined) {
          localStorage.setItem(key('compactMode'), String(appearance.compactMode))
          setCompactModeState(appearance.compactMode)
        }
      }
    } catch {
      // localStorage values already applied above — silently continue.
    }
  }

  // Re-read per-user appearance settings whenever auth state changes
  useEffect(() => {
    const handler = () => rehydrate()
    window.addEventListener('auth:user-changed', handler)
    return () => window.removeEventListener('auth:user-changed', handler)
  }, [])

  return (
    <AppearanceContext.Provider value={{
      fontSize, setFontSize,
      bubbleSize, setBubbleSize,
      compactMode, setCompactMode,
      getWallpaper, setWallpaper,
      rehydrate,
    }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  return useContext(AppearanceContext)
}

export default AppearanceContext