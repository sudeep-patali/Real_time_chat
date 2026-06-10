import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { validateLogin } from '../utils/validateForm'
import '../styles/auth.css'

const SAVED_EMAILS_KEY = 'wheeltrix_saved_emails'

function getSavedEmails() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_EMAILS_KEY)) || []
  } catch {
    return []
  }
}

function saveEmail(email) {
  if (!email) return
  const existing = getSavedEmails()
  const updated = [email, ...existing.filter(e => e !== email)].slice(0, 5)
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(updated))
}

function Login() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions]   = useState([])

  const emailRef    = useRef(null)
  const dropdownRef = useRef(null)
  const { login, loading, error } = useAuth()

  /* filter suggestions whenever email value changes */
  useEffect(() => {
    const saved = getSavedEmails()
    setSuggestions(
      email.trim() === ''
        ? saved
        : saved.filter(e => e.toLowerCase().includes(email.toLowerCase()))
    )
  }, [email])

  /* close dropdown on outside click */
  useEffect(() => {
    const onOutside = (e) => {
      if (
        emailRef.current    && !emailRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validateLogin({ email, password })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    saveEmail(email)
    setShowDropdown(false)
    await login(email, password)
  }

  const handleSelect = (val) => {
    setEmail(val)
    setShowDropdown(false)
    /* move focus to password after picking an email */
    document.getElementById('login-password')?.focus()
  }

  const isOpen = showDropdown && suggestions.length > 0

  return (
    <div className='auth-shell'>
      <div className='auth-card'>

        <div className='auth-logo-wrap'>
          <div className='auth-logo-icon'>W</div>
          <span className='auth-logo'>Wheeltrix</span>
          <p className='auth-subtitle'>Connect. Message. Collaborate.</p>
        </div>

        {error && (
          <div className='auth-error-banner'>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form className='auth-form' onSubmit={handleSubmit} noValidate autoComplete='off'>

          {/* ── Email ── */}
          <div className='auth-field'>
            <label htmlFor='login-email' className='auth-label'>Email</label>

            {/* wrapper is the anchor for the dropdown */}
            <div className='auth-field-wrap'>
              <div className='auth-field-inner'>
                <span className='auth-field-icon'><Mail size={16} /></span>
                <input
                  ref={emailRef}
                  id='login-email'
                  name='email'
                  className={`auth-input${fieldErrors.email ? ' error' : ''}`}
                  type='email'
                  placeholder='Email'
                  value={email}
                  autoComplete='off'
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                />
              </div>

              {/* dropdown sits inside .auth-field-wrap so it inherits the same width */}
              {isOpen && (
                <ul ref={dropdownRef} className='auth-dropdown'>
                  {suggestions.map(s => (
                    <li
                      key={s}
                      className='auth-dropdown-item'
                      onMouseDown={e => { e.preventDefault(); handleSelect(s) }}
                      onTouchEnd={e  => { e.preventDefault(); handleSelect(s) }}
                    >
                      <Mail size={14} className='auth-dropdown-icon' />
                      <span className='auth-dropdown-email'>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {fieldErrors.email && (
              <span className='auth-field-error'>{fieldErrors.email}</span>
            )}
          </div>

          {/* ── Password ── */}
          <div className='auth-field'>
            <label htmlFor='login-password' className='auth-label'>Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'><Lock size={16} /></span>
              <input
                id='login-password'
                name='password'
                className={`auth-input has-toggle${fieldErrors.password ? ' error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete='current-password'
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
            {fieldErrors.password && (
              <span className='auth-field-error'>{fieldErrors.password}</span>
            )}
          </div>

          <button type='submit' className='auth-btn' disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

        </form>

        <p className='auth-footer'>
          Don&apos;t have an account?{' '}
          <Link to='/signup'>Sign up</Link>
        </p>

      </div>
    </div>
  )
}

export default Login