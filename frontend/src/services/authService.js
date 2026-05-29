import api from '../config/api.config'

// Dummy phase — remove delays when backend is ready

export const login = async (email, password) => {
  // Real call: return api.post('/auth/login', { email, password })
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          user: { id: '1', name: 'Test User', email, avatar: null, role: 'member' },
          token: 'fake-jwt-token'
        }
      })
    }, 800)
  })
}

export const signup = async (name, email, password) => {
  // Real call: return api.post('/auth/signup', { name, email, password })
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          user: { id: '1', name, email, avatar: null, role: 'member' },
          token: 'fake-jwt-token'
        }
      })
    }, 800)
  })
}

export const logout = async () => {
  // Real call: return api.post('/auth/logout')
  return Promise.resolve()
}

export const refreshToken = async () => {
  // Real call: return api.post('/auth/refresh')
  return Promise.resolve({ data: { token: 'fake-jwt-token' } })
}