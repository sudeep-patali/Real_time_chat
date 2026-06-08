import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { validateSignup } from '../utils/validateForm'
import '../styles/auth.css'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { signup, loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validateSignup({ name, email, password, confirmPassword })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    await signup(name, email, password)
  }

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

        <form className='auth-form' onSubmit={handleSubmit} noValidate>

          <div className='auth-field'>
            <label htmlFor='signup-name' className='sr-only'>Full Name</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'>
                <User size={16} />
              </span>
              <input
                id='signup-name'
                name='name'
                className={`auth-input${fieldErrors.name ? ' error' : ''}`}
                type='text'
                placeholder='Full Name'
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete='name'
              />
            </div>
            <span className='auth-field-error'>{fieldErrors.name || ''}</span>
          </div>

          <div className='auth-field'>
            <label htmlFor='signup-email' className='sr-only'>Email</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'>
                <Mail size={16} />
              </span>
              <input
                id='signup-email'
                name='email'
                className={`auth-input${fieldErrors.email ? ' error' : ''}`}
                type='email'
                placeholder='Email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete='email'
              />
            </div>
            <span className='auth-field-error'>{fieldErrors.email || ''}</span>
          </div>

          <div className='auth-field'>
            <label htmlFor='signup-password' className='sr-only'>Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'>
                <Lock size={16} />
              </span>
              <input
                id='signup-password'
                name='password'
                className={`auth-input has-toggle${fieldErrors.password ? ' error' : ''}`}
                type={showPassword ? 'text' : 'password'}
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
            <span className='auth-field-error'>{fieldErrors.password || ''}</span>
          </div>

          <div className='auth-field'>
            <label htmlFor='signup-confirm-password' className='sr-only'>Confirm Password</label>
            <div className='auth-field-inner'>
              <span className='auth-field-icon'>
                <Lock size={16} />
              </span>
              <input
                id='signup-confirm-password'
                name='confirmPassword'
                className={`auth-input has-toggle${fieldErrors.confirmPassword ? ' error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
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
            <span className='auth-field-error'>{fieldErrors.confirmPassword || ''}</span>
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