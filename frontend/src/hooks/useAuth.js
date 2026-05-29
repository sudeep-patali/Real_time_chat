import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import * as authService from '../services/authService'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { currentUser, token, isAuthenticated } = useAuthStore()
  const authStore = useAuthStore()
  const navigate = useNavigate()

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.login(email, password)
      authStore.login(res.data.user, res.data.token)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.signup(name, email, password)
      authStore.login(res.data.user, res.data.token)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await authService.logout()
    authStore.logout()
    navigate('/login')
  }

  return {
    currentUser,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    signup,
    logout
  }
}