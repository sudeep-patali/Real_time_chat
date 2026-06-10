cat > /home/claude/Signup.jsx << 'EOF'
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { validateSignup } from '../utils/validateForm'
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

function Signup() {
  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors]   = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions]   = useState([])

  const emailRef    = useRef(null)
  const dropdownRef = useRef(null)
  const { signup, loading, error } = useAuth()

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
    const errors = validateSignup({ name, email, password, confirmPassword })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    saveEmail(email)
    setShowDropdown(false)
    await signup(name, email, password)
  }

  const handleSelect = (val) => {
    setEmail(val)
    setShowDropdown(false)
    document.getElementById('signup-password')?.focus()
  }

  const isOpen = showDropdown && suggestions.length > 0

  return (
    <div className='auth-shell'>
      <div className='auth-card'>

        <div className='auth-logo-wrap'>
          <div className='auth-logo-icon'>W</div>
          <span className='auth-logo'>Wheeltrix</span>
          <p className='auth-subtitle'>Create your account</p>
        </div>

        {error && (
          <div className='auth-error-banner'>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/*
          ── Full Name & Email live OUTSIDE the <form> ──────────────────────
          Chrome's autofill (both address and credential) only scans inputs
          that are descendants of a <form> element. Keeping these fields in
          React state means the submit handler still has their values; they
          just never get picked up by the browser's autofill heuristic.
        */}
        <div className='auth-form'>

          {/* ── Full Name ── */}
          <div className='auth-field'>
            <label htmlFor='signup-name' className='auth-label'>Full Name</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'><User size={16} /></span>
              <input
                id='signup-name'
                className={`auth-input${fieldErrors.name ? ' error' : ''}`}
                type='text'
                placeholder='Full Name'
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete='off'
              />
            </div>
            {fieldErrors.name && (
              <span className='auth-field-error'>{fieldErrors.name}</span>
            )}
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
            {fieldErrors.email && (
              <span className='auth-field-error'>{fieldErrors.email}</span>
            )}
          </div>

        </div>{/* end of out-of-form fields */}

        {/*
          ── Password fields are inside <form> so Enter/submit still works ──
          readOnly-on-mount + remove-on-focus prevents Chrome's password
          manager from attaching its popup to these fields.
        */}
        <form onSubmit={handleSubmit} noValidate autoComplete='off'>

          {/* ── Password ── */}
          <div className='auth-field'>
            <label htmlFor='signup-password' className='auth-label'>Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'><Lock size={16} /></span>
              <input
                id='signup-password'
                className={`auth-input has-toggle${fieldErrors.password ? ' error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete='off'
                readOnly
                onFocus={e => e.target.removeAttribute('readOnly')}
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

          {/* ── Confirm Password ── */}
          <div className='auth-field'>
            <label htmlFor='signup-confirm-password' className='auth-label'>Confirm Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'><Lock size={16} /></span>
              <input
                id='signup-confirm-password'
                className={`auth-input has-toggle${fieldErrors.confirmPassword ? ' error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                placeholder='Confirm Password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete='off'
                readOnly
                onFocus={e => e.target.removeAttribute('readOnly')}
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

          <button
            type='submit'
            className='auth-btn'
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>

        </form>

        <p className='auth-footer'>
          Already have an account?{' '}
          <Link to='/login'>Sign in</Link>
        </p>

      </div>
    </div>
  )
}

export default Signup