
import api from '../config/api.config'

// ── Email + Password login ────────────────────────────────────────────────────
// deviceId defaults to '' so existing callers that don't pass it still work.
export const login = (email, password, deviceId = '') =>
  api.post('/auth/login', {
    email,
    password,
    ...(deviceId ? { deviceId } : {}),
  })

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


export const firebaseAuth = (idToken, deviceId = '') =>
  api.post('/auth/firebase', {
    idToken,
    ...(deviceId ? { deviceId } : {}),
  })

// ── Session ───────────────────────────────────────────────────────────────────
export const logout = () =>
  api.post('/auth/logout')

export const refreshToken = (token) =>
  api.post('/auth/refresh', { token })
