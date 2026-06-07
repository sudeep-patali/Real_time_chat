import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext(null)

const FONT_SIZES = { small: '13px', medium: '15px', large: '17px' }

// ── Per-user storage helpers ──────────────────────────────────────────────
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

  // Apply font size
  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', FONT_SIZES[fontSize])
    localStorage.setItem(key('fontSize'), fontSize)
  }, [fontSize])

  // Apply compact mode class
  useEffect(() => {
    if (compactMode) document.body.classList.add('compact')
    else document.body.classList.remove('compact')
    localStorage.setItem(key('compactMode'), String(compactMode))
  }, [compactMode])

  useEffect(() => {
    localStorage.setItem(key('bubbleSize'), bubbleSize)
  }, [bubbleSize])

  const setFontSize    = (v) => setFontSizeState(v)
  const setBubbleSize  = (v) => setBubbleSizeState(v)
  const setCompactMode = (v) => setCompactModeState(v)

  const getWallpaper = (mode) =>
    localStorage.getItem(`wallpaper-${mode}_${getUserId() || 'guest'}`) || null

  const setWallpaper = (mode, dataUrl) => {
    const k = `wallpaper-${mode}_${getUserId() || 'guest'}`
    if (dataUrl) localStorage.setItem(k, dataUrl)
    else localStorage.removeItem(k)
  }

  // Re-read all settings from localStorage under the current user's keys.
  // Call this after login so the newly logged-in user's preferences are loaded.
  const rehydrate = () => {
    setFontSizeState(localStorage.getItem(key('fontSize')) || 'medium')
    setBubbleSizeState(localStorage.getItem(key('bubbleSize')) || 'normal')
    setCompactModeState(localStorage.getItem(key('compactMode')) === 'true')
  }

  // Re-read all per-user settings whenever auth state changes (login / logout / switch)
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