import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

// ── Per-user storage helpers ──────────────────────────────────────────────
function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user'))
    return user?.id || user?._id || null
  } catch { return null }
}

function getUserThemeKey() {
  const uid = getUserId()
  return uid ? `theme_${uid}` : 'theme'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem(getUserThemeKey()) || 'dark'
  })

  const applyTheme = (t) => {
   
    const hasHighContrast = document.body.classList.contains('high-contrast')
    const resolved = t === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : t
    document.body.className = hasHighContrast ? `${resolved} high-contrast` : resolved
  }

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(getUserThemeKey(), theme)
  }, [theme])

  // Listen for system preference changes when theme=system
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (value) => setThemeState(value)

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark')
  }

  // Re-read from per-user key when user changes (e.g. after login)
  const rehydrate = () => {
    const saved = localStorage.getItem(getUserThemeKey()) || 'dark'
    setThemeState(saved)
    applyTheme(saved)
  }

  // Re-read per-user theme whenever auth state changes (login / logout / switch)
  useEffect(() => {
    const handler = () => rehydrate()
    window.addEventListener('auth:user-changed', handler)
    return () => window.removeEventListener('auth:user-changed', handler)
  }, [])

  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, toggleTheme, setTheme, rehydrate }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export default ThemeContext