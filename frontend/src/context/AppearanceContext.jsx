import { createContext, useContext, useState, useEffect, useCallback } from 'react'
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

function wallpaperKey(mode) {
  return `wallpaper-${mode}_${getUserId() || 'guest'}`
}

// ── Persist appearance settings to the database ───────────────────────────
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

  // ── FIX: Wallpapers are now stored in React state so UI re-renders instantly ──
  // Previously setWallpaper only wrote to localStorage without updating state,
  // meaning the preview and chat background never updated without a page refresh.
  const [wallpapers, setWallpapersState] = useState(() => ({
    light: localStorage.getItem(wallpaperKey('light')) || null,
    dark:  localStorage.getItem(wallpaperKey('dark'))  || null,
  }))

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

  // ── FIX: Wallpaper setters now update React state for instant reactivity ──
  // Also persists to localStorage so wallpaper survives refresh and
  // is user-specific (keyed by userId).
  const getWallpaper = useCallback((mode) => {
    return wallpapers[mode] || null
  }, [wallpapers])

  const setWallpaper = useCallback((mode, dataUrl) => {
    const k = wallpaperKey(mode)
    if (dataUrl) {
      localStorage.setItem(k, dataUrl)
    } else {
      localStorage.removeItem(k)
    }
    // FIX: Update state so every consumer re-renders instantly
    setWallpapersState(prev => ({ ...prev, [mode]: dataUrl || null }))
  }, [])

  // ── Rehydrate: re-read localStorage and DB for the current user ───────
  // Called when the auth:user-changed event fires (login / logout / switch).
  const rehydrate = useCallback(async () => {
    // 1. Read localStorage first (instant — no flicker)
    const lsFont    = localStorage.getItem(key('fontSize'))    || 'medium'
    const lsBubble  = localStorage.getItem(key('bubbleSize'))  || 'normal'
    const lsCompact = localStorage.getItem(key('compactMode')) === 'true'

    setFontSizeState(lsFont)
    setBubbleSizeState(lsBubble)
    setCompactModeState(lsCompact)

    // FIX: Also rehydrate wallpapers from the (now user-keyed) localStorage
    // so switching users shows the correct wallpaper immediately.
    const lsLightWp = localStorage.getItem(wallpaperKey('light')) || null
    const lsDarkWp  = localStorage.getItem(wallpaperKey('dark'))  || null
    setWallpapersState({ light: lsLightWp, dark: lsDarkWp })

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
  }, [])

  // Re-read per-user appearance settings whenever auth state changes
  useEffect(() => {
    const handler = () => rehydrate()
    window.addEventListener('auth:user-changed', handler)
    return () => window.removeEventListener('auth:user-changed', handler)
  }, [rehydrate])

  return (
    <AppearanceContext.Provider value={{
      fontSize, setFontSize,
      bubbleSize, setBubbleSize,
      compactMode, setCompactMode,
      getWallpaper, setWallpaper,
      wallpapers, // FIX: expose raw wallpapers object for direct reactive use
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