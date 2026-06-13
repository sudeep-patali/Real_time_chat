

import { create } from 'zustand'

const getInitialState = () => {
  try {
    const token = localStorage.getItem('token')
    const user  = JSON.parse(localStorage.getItem('user'))
    if (token && user) {
      return { currentUser: user, token, isAuthenticated: true }
    }
  } catch (e) {}
  return { currentUser: null, token: null, isAuthenticated: false }
}

export const useAuthStore = create((set) => ({
  ...getInitialState(),

  // ── login ─────────────────────────────────────────────────────────────────
  login: (user, token) => {
    const normalized = { ...user, id: user.id || user._id }
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(normalized))
    set({ currentUser: normalized, token, isAuthenticated: true })
  },

 
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ currentUser: null, token: null, isAuthenticated: false })
  },

 
  forceLogout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    try {
      sessionStorage.removeItem('deviceId')
    } catch (_) {
      // sessionStorage may be unavailable in some restricted contexts — ignore
    }
    set({ currentUser: null, token: null, isAuthenticated: false })
  
    window.location.replace('/login')
  },

 
  setUser: (user) => {
    const existing   = JSON.parse(localStorage.getItem('user') || 'null') || {}
    const normalized = {
      ...existing,
      ...user,
      id: user.id || user._id || existing.id,
      // Always deep-merge privacy so a partial update never wipes stored settings.
      privacy: { ...(existing.privacy || {}), ...(user.privacy || {}) },
    }
    localStorage.setItem('user', JSON.stringify(normalized))
    set({ currentUser: normalized })
  },

  // ── hydrate ───────────────────────────────────────────────────────────────
  hydrate: () => {
    const token = localStorage.getItem('token')
    const user  = JSON.parse(localStorage.getItem('user') || 'null')
    if (token && user) {
      set({ currentUser: user, token, isAuthenticated: true })
    }
  },
}))
