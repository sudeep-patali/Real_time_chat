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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const emailWrapRef = useRef(null)
  const { login, loading, error } = useAuth()

  // Filter saved emails based on current input
  useEffect(() => {
    const saved = getSavedEmails()
    if (email.trim() === '') {
      setSuggestions(saved)
    } else {
      setSuggestions(saved.filter(e => e.toLowerCase().includes(email.toLowerCase())))
    }
  }, [email])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (emailWrapRef.current && !emailWrapRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
    setShowSuggestions(false)
    await login(email, password)
  }

  const handleSelectSuggestion = (val) => {
    setEmail(val)
    setShowSuggestions(false)
  }

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

        <form className='auth-form' onSubmit={handleSubmit} noValidate>

          {/* Email field with custom autocomplete */}
          <div className='auth-field'>
            <label htmlFor='login-email' className='sr-only'>Email</label>
            <div className='auth-field-inner' ref={emailWrapRef}>
              <span className='auth-field-icon'>
                <Mail size={16} />
              </span>
              <input
                id='login-email'
                name='email'
                className={`auth-input${fieldErrors.email ? ' error' : ''}`}
                type='email'
                placeholder='Email'
                value={email}
                autoComplete='off'
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
              />

              {/* Custom suggestions dropdown — anchored to input bottom */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className='auth-suggestions'>
                  {suggestions.map((s) => (
                    <li
                      key={s}
                      className='auth-suggestion-item'
                      onMouseDown={() => handleSelectSuggestion(s)}
                    >
                      <Mail size={14} className='auth-suggestion-icon' />
                      <span className='auth-suggestion-email'>{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <span className='auth-field-error'>{fieldErrors.email || ''}</span>
          </div>

          <div className='auth-field'>
            <label htmlFor='login-password' className='sr-only'>Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'>
                <Lock size={16} />
              </span>
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
            <span className='auth-field-error'>{fieldErrors.password || ''}</span>
          </div>

          <button
            type='submit'
            className='auth-btn'
            disabled={loading}
          >
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