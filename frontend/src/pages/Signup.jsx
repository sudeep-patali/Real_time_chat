/**
 * Signup.jsx
 *
 * Two-step signup flow:
 *   Step 1 (FORM)  — collect name, email, password, confirm password;
 *                    on submit → POST /auth/signup/send-otp
 *   Step 2 (OTP)   — show 6-digit OTP input with resend + countdown;
 *                    on submit → POST /auth/signup/verify-otp
 *
 * Also renders a "Continue with Google" button on the form screen.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useAuth }              from '../hooks/useAuth'
import { validateSignup }       from '../utils/validateForm'
import GoogleSignInButton       from '../components/GoogleSignInButton'
import '../styles/auth.css'

const SAVED_EMAILS_KEY     = 'wheeltrix_saved_emails'
const RESEND_COOLDOWN_SECS = 60   // mirrors server default

function getSavedEmails() {
  try { return JSON.parse(localStorage.getItem(SAVED_EMAILS_KEY)) || [] }
  catch { return [] }
}
function saveEmail(email) {
  if (!email) return
  const updated = [email, ...getSavedEmails().filter(e => e !== email)].slice(0, 5)
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(updated))
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function Signup() {
  // ── Screen state ────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState('form')   // 'form' | 'otp'

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [name,            setName]            = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors,     setFieldErrors]     = useState({})
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [showDropdown,    setShowDropdown]    = useState(false)
  const [suggestions,     setSuggestions]     = useState([])

  // ── OTP screen state ────────────────────────────────────────────────────────
  const [otp,             setOtp]             = useState(['', '', '', '', '', ''])
  const [otpError,        setOtpError]        = useState('')
  const [otpSuccess,      setOtpSuccess]      = useState('')
  const [cooldown,        setCooldown]        = useState(0)      // seconds remaining
  const [expiryMins,      setExpiryMins]      = useState(10)

  // ── Shared ──────────────────────────────────────────────────────────────────
  const [banner, setBanner] = useState(null)   // { type: 'success'|'error', text }

  const emailRef    = useRef(null)
  const dropdownRef = useRef(null)
  const otpRefs     = useRef([])
  const cooldownRef = useRef(null)

  const { sendSignupOtp, verifySignupOtp, resendSignupOtp, loginWithGoogle, loading, error, setError } = useAuth()

  // ── Email dropdown suggestions ───────────────────────────────────────────────
  useEffect(() => {
    const saved = getSavedEmails()
    setSuggestions(
      email.trim() === ''
        ? saved
        : saved.filter(e => e.toLowerCase().includes(email.toLowerCase()))
    )
  }, [email])

  useEffect(() => {
    const onOutside = (e) => {
      if (
        emailRef.current    && !emailRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setShowDropdown(false)
    }
    document.addEventListener('mousedown',  onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown',  onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [])

  // ── Cooldown timer ───────────────────────────────────────────────────────────
  const startCooldown = useCallback((secs = RESEND_COOLDOWN_SECS) => {
    setCooldown(secs)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }, [])

  // ── Auto-focus first OTP box when screen switches ────────────────────────────
  useEffect(() => {
    if (screen === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }, [screen])

  // ── Handlers: Form ───────────────────────────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const errors = validateSignup({ name, email, password, confirmPassword })
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setError(null)
    setBanner(null)

    const result = await sendSignupOtp(name, email, password)
    if (result.success) {
      saveEmail(email)
      setExpiryMins(result.expiryMins || 10)
      startCooldown(RESEND_COOLDOWN_SECS)
      setScreen('otp')
      setOtp(['', '', '', '', '', ''])
      setOtpError('')
      setOtpSuccess('')
    }
    // errors are set in the hook and propagated via `error`
  }

  const handleSelectEmail = (val) => {
    setEmail(val)
    setShowDropdown(false)
    document.getElementById('signup-password')?.focus()
  }

  // ── Handlers: OTP ────────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    // Accept only digits, one per cell
    const digit = value.replace(/\D/g, '').slice(-1)
    const next  = [...otp]
    next[index] = digit
    setOtp(next)
    setOtpError('')

    // Auto-advance
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0)  otpRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const text   = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const digits = text.split('')
    const next   = ['', '', '', '', '', '']
    digits.forEach((d, i) => { next[i] = d })
    setOtp(next)
    const focusIdx = Math.min(digits.length, 5)
    otpRefs.current[focusIdx]?.focus()
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { setOtpError('Please enter the complete 6-digit code.'); return }
    setOtpError('')
    setOtpSuccess('')

    const result = await verifySignupOtp(email, code)
    if (!result.success) {
      setOtpError(result.message || 'Invalid code.')
      // Clear OTP boxes on wrong attempt
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    }
    // on success the hook navigates away
  }

  const handleResend = async () => {
    if (cooldown > 0 || loading) return
    setOtpError('')
    setOtpSuccess('')

    const result = await resendSignupOtp(email)
    if (result.success) {
      setOtpSuccess('A new verification code has been sent!')
      startCooldown(result.cooldownSecs || RESEND_COOLDOWN_SECS)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } else {
      setOtpError(result.message || 'Failed to resend. Please try again.')
      if (result.waitSecs) startCooldown(result.waitSecs)
    }
  }

  // ── Handlers: Google ─────────────────────────────────────────────────────────
  const handleGoogleToken = async (idToken) => {
    setBanner(null)
    const result = await loginWithGoogle(idToken)
    if (!result.success) {
      setBanner({ type: 'error', text: result.message })
    }
    // on success the hook navigates away
  }

  const isOpen = showDropdown && suggestions.length > 0

  // ── Render: OTP screen ───────────────────────────────────────────────────────
  if (screen === 'otp') {
    return (
      <div className='auth-shell'>
        <div className='auth-card'>

          <button
            type='button'
            className='auth-back-btn'
            onClick={() => { setScreen('form'); setError(null); setBanner(null) }}
            aria-label='Back to signup form'
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className='auth-logo-wrap'>
            <div className='auth-logo-icon'>W</div>
            <span className='auth-logo'>Wheeltrix</span>
            <p className='auth-subtitle'>Verify your email</p>
          </div>

          <p className='auth-otp-hint'>
            We sent a {expiryMins}-minute verification code to<br />
            <strong className='auth-otp-email'>{email}</strong>
          </p>

          {/* Errors / success from hook or local */}
          {(error || otpError) && (
            <div className='auth-error-banner'>
              <AlertCircle size={14} />
              <span>{error || otpError}</span>
            </div>
          )}
          {otpSuccess && !error && !otpError && (
            <div className='auth-success-banner'>
              <CheckCircle size={14} />
              <span>{otpSuccess}</span>
            </div>
          )}

          <form onSubmit={handleOtpSubmit} noValidate>

            {/* 6-digit OTP boxes */}
            <div className='auth-otp-boxes' onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el }}
                  type='text'
                  inputMode='numeric'
                  maxLength={1}
                  className={`auth-otp-box${(error || otpError) ? ' error' : ''}`}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  aria-label={`Digit ${i + 1} of 6`}
                  autoComplete='one-time-code'
                />
              ))}
            </div>

            <button
              type='submit'
              className='auth-btn'
              disabled={loading || otp.join('').length < 6}
            >
              {loading ? 'Verifying…' : 'Verify & Create Account'}
            </button>

          </form>

          {/* Resend */}
          <div className='auth-resend-row'>
            <span className='auth-resend-label'>Didn&apos;t receive the code?</span>
            <button
              type='button'
              className={`auth-resend-btn${cooldown > 0 ? ' disabled' : ''}`}
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
            >
              <RefreshCw size={13} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>

        </div>
      </div>
    )
  }

  // ── Render: Signup form ──────────────────────────────────────────────────────
  return (
    <div className='auth-shell'>
      <div className='auth-card'>

        <div className='auth-logo-wrap'>
          <div className='auth-logo-icon'>W</div>
          <span className='auth-logo'>Wheeltrix</span>
          <p className='auth-subtitle'>Create your account</p>
        </div>

        {/* Global error banner */}
        {(error || (banner?.type === 'error')) && (
          <div className='auth-error-banner'>
            <AlertCircle size={14} />
            <span>{error || banner?.text}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} noValidate autoComplete='off'>

          {/* Honeypot — stops Chrome treating this as a credential form */}
          <input type='text'     aria-hidden='true' tabIndex={-1} style={{ display: 'none' }} readOnly />
          <input type='password' aria-hidden='true' tabIndex={-1} style={{ display: 'none' }} readOnly />

          {/* ── Full Name ── */}
          <div className='auth-field'>
            <label htmlFor='signup-name' className='auth-label'>Full Name</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'><User size={16} /></span>
              <input
                id='signup-name'
                className={`auth-input${fieldErrors.name ? ' error' : ''}`}
                type='text'
                name='signup-name-field'
                placeholder='Full Name'
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete='new-password'
              />
            </div>
            {fieldErrors.name && <span className='auth-field-error'>{fieldErrors.name}</span>}
          </div>

          {/* ── Email ── */}
          <div className='auth-field'>
            <label htmlFor='signup-email' className='auth-label'>Email</label>
            <div className='auth-field-wrap'>
              <div className='auth-field-inner'>
                <span className='auth-field-icon'><Mail size={16} /></span>
                <input
                  ref={emailRef}
                  id='signup-email'
                  className={`auth-input${fieldErrors.email ? ' error' : ''}`}
                  type='text'
                  inputMode='email'
                  name='signup-email-field'
                  placeholder='Email'
                  value={email}
                  autoComplete='new-password'
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                />
              </div>
              {isOpen && (
                <ul ref={dropdownRef} className='auth-dropdown' role='listbox'>
                  {suggestions.map(s => (
                    <li
                      key={s}
                      role='option'
                      className='auth-dropdown-item'
                      onMouseDown={e => { e.preventDefault(); handleSelectEmail(s) }}
                      onTouchEnd={e  => { e.preventDefault(); handleSelectEmail(s) }}
                    >
                      <Mail size={14} className='auth-dropdown-icon' />
                      <span className='auth-dropdown-email'>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {fieldErrors.email && <span className='auth-field-error'>{fieldErrors.email}</span>}
          </div>

          {/* ── Password ── */}
          <div className='auth-field'>
            <label htmlFor='signup-password' className='auth-label'>Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'><Lock size={16} /></span>
              <input
                id='signup-password'
                className={`auth-input has-toggle${fieldErrors.password ? ' error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name='signup-password-field'
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete='new-password'
              />
              <button
                type='button'
                className='auth-password-toggle'
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <span className='auth-field-error'>{fieldErrors.password}</span>}
          </div>

          {/* ── Confirm Password ── */}
          <div className='auth-field'>
            <label htmlFor='signup-confirm-password' className='auth-label'>Confirm Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'><Lock size={16} /></span>
              <input
                id='signup-confirm-password'
                className={`auth-input has-toggle${fieldErrors.confirmPassword ? ' error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                name='signup-confirm-password-field'
                placeholder='Confirm Password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete='new-password'
              />
              <button
                type='button'
                className='auth-password-toggle'
                onClick={() => setShowConfirm(v => !v)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className='auth-field-error'>{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <button type='submit' className='auth-btn' disabled={loading}>
            {loading ? 'Sending code…' : 'Send Verification Code'}
          </button>

        </form>

        {/* ── Divider + Google ── */}
        <div className='auth-divider-row'>
          <span className='auth-divider-line' />
          <span className='auth-divider-text'>or</span>
          <span className='auth-divider-line' />
        </div>

        <GoogleSignInButton onToken={handleGoogleToken} disabled={loading} />

        <p className='auth-footer'>
          Already have an account?{' '}
          <Link to='/login'>Sign in</Link>
        </p>

      </div>
    </div>
  )
}

export default Signup