/**
 * authService.js  —  frontend/src/services/authService.js
 *
 * CHANGE: googleAuth()  →  firebaseAuth()   (hits /auth/firebase instead of /auth/google)
 */

import api from '../config/api.config'

// ── Email + Password login ────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/auth/login', { email, password })

// ── Email OTP signup flow ─────────────────────────────────────────────────────

/** Step 1: Send OTP — stores pending signup, emails the code */
export const sendSignupOtp = (name, email, password) =>
  api.post('/auth/signup/send-otp', { name, email, password })

/** Step 2: Verify OTP — creates account on success */
export const verifySignupOtp = (email, otp) =>
  api.post('/auth/signup/verify-otp', { email, otp })

/** Resend OTP (subject to cooldown on the server) */
export const resendSignupOtp = (email) =>
  api.post('/auth/signup/resend-otp', { email })

// ── Firebase Auth ─────────────────────────────────────────────────────────────

/** Exchange a Firebase ID token for a session */
export const firebaseAuth = (idToken) =>
  api.post('/auth/firebase', { idToken })

// ── Session ───────────────────────────────────────────────────────────────────
export const logout = () =>
  api.post('/auth/logout')

export const refreshToken = (token) =>
  api.post('/auth/refresh', { token })