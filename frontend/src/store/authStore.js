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

  setUser: (user) => {
    // Deep-merge with existing stored user so fields like createdAt / privacy
    // are never accidentally wiped when a partial update payload is passed in.
    const existing   = JSON.parse(localStorage.getItem('user') || 'null') || {}
    const normalized = { ...existing, ...user, id: user.id || user._id || existing.id }
    localStorage.setItem('user', JSON.stringify(normalized))
    set({ currentUser: normalized })
  },

  hydrate: () => {
    const token = localStorage.getItem('token')
    const user  = JSON.parse(localStorage.getItem('user') || 'null')
    if (token && user) {
      set({ currentUser: user, token, isAuthenticated: true })
    }
  }
}))