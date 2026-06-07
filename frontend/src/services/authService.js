import api from '../config/api.config'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const signup = (name, email, password) =>
  api.post('/auth/signup', { name, email, password })

export const logout = () =>
  api.post('/auth/logout')

export const refreshToken = (token) =>
  api.post('/auth/refresh', { token })