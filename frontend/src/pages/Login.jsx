import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth }          from '../hooks/useAuth'
import { validateLogin }    from '../utils/validateForm'
import GoogleSignInButton   from '../components/GoogleSignInButton'
import '../styles/auth.css'

const SAVED_EMAILS_KEY = 'wheeltrix_saved_emails'

function getSavedEmails() {
  try { return JSON.parse(localStorage.getItem(SAVED_EMAILS_KEY)) || [] }
  catch { return [] }
}
function saveEmail(email) {
  if (!email) return
  const updated = [email, ...getSavedEmails().filter(e => e !== email)].slice(0, 5)
  localStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(updated))
}

function Login() {
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [fieldErrors,   setFieldErrors]   = useState({})
  const [showPassword,  setShowPassword]  = useState(false)
  const [showDropdown,  setShowDropdown]  = useState(false)
  const [suggestions,   setSuggestions]   = useState([])
  const [googleError,   setGoogleError]   = useState(null)

  const emailRef    = useRef(null)
  const dropdownRef = useRef(null)
  const { login, loginWithGoogle, loading, error, setError } = useAuth()

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validateLogin({ email, password })
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return }
    setFieldErrors({})
    setGoogleError(null)
    saveEmail(email)
    setShowDropdown(false)
    await login(email, password)
  }

  const handleSelect = (val) => {
    setEmail(val)
    setShowDropdown(false)
    document.getElementById('login-password')?.focus()
  }

  const handleGoogleToken = async (idToken) => {
    setGoogleError(null)
    setError(null)
    const result = await loginWithGoogle(idToken)
    if (!result.success) setGoogleError(result.message)
  }

  const isOpen = showDropdown && suggestions.length > 0
  const displayError = error || googleError

  return (
    <div className='auth-shell'>
      <div className='auth-card'>

        <div className='auth-logo-wrap'>
          <div className='auth-logo-icon'>W</div>
          <span className='auth-logo'>Wheeltrix</span>
          <p className='auth-subtitle'>Connect. Message. Collaborate.</p>
        </div>

        {displayError && (
          <div className='auth-error-banner'>
            <AlertCircle size={14} />
            <span>{displayError}</span>
          </div>
        )}

        <form className='auth-form' onSubmit={handleSubmit} noValidate autoComplete='off'>

          {/* ── Email ── */}
          <div className='auth-field'>
            <label htmlFor='login-email' className='auth-label'>Email</label>
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
            {fieldErrors.email && <span className='auth-field-error'>{fieldErrors.email}</span>}
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
            {fieldErrors.password && <span className='auth-field-error'>{fieldErrors.password}</span>}
          </div>

          <button type='submit' className='auth-btn' disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
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
          Don&apos;t have an account?{' '}
          <Link to='/signup'>Sign up</Link>
        </p>

      </div>
    </div>
  )
}

export default Login