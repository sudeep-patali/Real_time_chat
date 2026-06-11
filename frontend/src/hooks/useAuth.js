/**
 * useAuth.js  —  frontend/src/hooks/useAuth.js
 *
 * CHANGE: loginWithGoogle() now calls authService.firebaseAuth() instead
 *         of authService.googleAuth().  The hook interface is identical so
 *         no other component needs to change.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import * as authService from '../services/authService'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const { currentUser, token, isAuthenticated } = useAuthStore()
  const authStore = useAuthStore()
  const navigate  = useNavigate()

  // ── Email + password login ──────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.login(email, password)
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
  // The component (GoogleSignInButton) handles the Firebase popup and returns
  // an ID token.  This hook exchanges that token with our backend.
  const loginWithGoogle = async (idToken) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.firebaseAuth(idToken)   // ← changed
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