import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  currentUser: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ currentUser: user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ currentUser: null, token: null, isAuthenticated: false })
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ currentUser: user })
  },

  hydrate: () => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user'))
    if (token && user) {
      set({ currentUser: user, token, isAuthenticated: true })
    }
  }
}))