import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext(null)

const FONT_SIZES = { small: '13px', medium: '15px', large: '17px' }

export function AppearanceProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(
    localStorage.getItem('fontSize') || 'medium'
  )
  const [bubbleSize, setBubbleSizeState] = useState(
    localStorage.getItem('bubbleSize') || 'normal'
  )
  const [compactMode, setCompactModeState] = useState(
    localStorage.getItem('compactMode') === 'true'
  )

  // Apply font size
  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', FONT_SIZES[fontSize])
    localStorage.setItem('fontSize', fontSize)
  }, [fontSize])

  // Apply compact mode class
  useEffect(() => {
    if (compactMode) document.body.classList.add('compact')
    else document.body.classList.remove('compact')
    localStorage.setItem('compactMode', String(compactMode))
  }, [compactMode])

  useEffect(() => {
    localStorage.setItem('bubbleSize', bubbleSize)
  }, [bubbleSize])

  const setFontSize    = (v) => setFontSizeState(v)
  const setBubbleSize  = (v) => setBubbleSizeState(v)
  const setCompactMode = (v) => setCompactModeState(v)

  const getWallpaper = (mode) => localStorage.getItem(`wallpaper-${mode}`) || null
  const setWallpaper = (mode, dataUrl) => {
    if (dataUrl) localStorage.setItem(`wallpaper-${mode}`, dataUrl)
    else localStorage.removeItem(`wallpaper-${mode}`)
  }

  return (
    <AppearanceContext.Provider value={{
      fontSize, setFontSize,
      bubbleSize, setBubbleSize,
      compactMode, setCompactMode,
      getWallpaper, setWallpaper,
    }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  return useContext(AppearanceContext)
}

export default AppearanceContext