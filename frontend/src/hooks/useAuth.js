
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import * as authService from '../services/authService'


function generateDeviceId() {
  try {
    let id = sessionStorage.getItem('deviceId')
    if (!id) {
      id = btoa(
        [
          navigator.userAgent,
          screen.width,
          screen.height,
          navigator.language,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ].join('|')
      )
        .replace(/=/g, '')   // strip base64 padding
        .slice(0, 64)        // keep to a reasonable column width in the DB
      sessionStorage.setItem('deviceId', id)
    }
    return id
  } catch {
    return ''
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const { currentUser, token, isAuthenticated } = useAuthStore()
  const authStore = useAuthStore()
  const navigate  = useNavigate()

  // ── Email + password login ──────────────────────────────────────────────────
  //
  // Phase 2: generates (or reads from sessionStorage) a deviceId and passes
  // it to authService.login() so the backend can deduplicate UserSession rows.
  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const deviceId = generateDeviceId()
      const res = await authService.login(email, password, deviceId)
      authStore.login(res.data.user, res.data.token)
      window.dispatchEvent(new CustomEvent('auth:user-changed'))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP signup step 1: send OTP ─────────────────────────────────────────────
  const sendSignupOtp = async (name, email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.sendSignupOtp(name, email, password)
      return { success: true, message: res.data.message, expiryMins: res.data.expiryMins }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send verification code.'
      setError(msg)
      return { success: false, message: msg }
    } finally {
      setLoading(false)
    }
  }

  // ── OTP signup step 2: verify OTP ───────────────────────────────────────────
  const verifySignupOtp = async (email, otp) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.verifySignupOtp(email, otp)
      authStore.login(res.data.user, res.data.token)
      window.dispatchEvent(new CustomEvent('auth:user-changed'))
      navigate('/')
      return { success: true }
    } catch (err) {
      const data = err.response?.data || {}
      const msg  = data.message || 'Verification failed. Please try again.'
      setError(msg)
      return { success: false, message: msg, remaining: data.remaining }
    } finally {
      setLoading(false)
    }
  }

  // ── OTP resend ──────────────────────────────────────────────────────────────
  const resendSignupOtp = async (email) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.resendSignupOtp(email)
      return {
        success:      true,
        message:      res.data.message,
        cooldownSecs: res.data.cooldownSecs,
      }
    } catch (err) {
      const data = err.response?.data || {}
      const msg  = data.message || 'Failed to resend code.'
      setError(msg)
      return { success: false, message: msg, waitSecs: data.waitSecs }
    } finally {
      setLoading(false)
    }
  }

  // ── Firebase Sign-In ────────────────────────────────────────────────────────
  //
  // Phase 2: generates (or reads from sessionStorage) a deviceId and passes
  // it to authService.firebaseAuth() so Firebase logins also benefit from
  // session deduplication on the same browser.
  const loginWithGoogle = async (idToken) => {
    setLoading(true)
    setError(null)
    try {
      const deviceId = generateDeviceId()
      const res = await authService.firebaseAuth(idToken, deviceId)
      authStore.login(res.data.user, res.data.token)
      window.dispatchEvent(new CustomEvent('auth:user-changed'))
      navigate('/')
      return { success: true, isNewUser: res.data.isNewUser }
    } catch (err) {
      const msg = err.response?.data?.message || 'Google Sign-In failed. Please try again.'
      setError(msg)
      return { success: false, message: msg }
    } finally {
      setLoading(false)
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await authService.logout()
    } catch (_) {
      // ignore network errors on logout
    } finally {
      authStore.logout()
      window.dispatchEvent(new CustomEvent('auth:user-changed'))
      navigate('/login')
    }
  }

  return {
    currentUser,
    token,
    isAuthenticated,
    loading,
    error,
    setError,
    login,
    sendSignupOtp,
    verifySignupOtp,
    resendSignupOtp,
    loginWithGoogle,
    logout,
  }
}
