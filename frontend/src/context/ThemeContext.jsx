import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    localStorage.getItem('theme') || 'dark'
  )

  const applyTheme = (t) => {
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.body.className = prefersDark ? 'dark' : 'light'
    } else {
      document.body.className = t
    }
  }

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
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

  // Expose the actual applied class (dark/light) even when system
  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export default ThemeContext