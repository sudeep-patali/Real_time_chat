import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { validateLogin } from '../utils/validateForm'
import '../styles/auth.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)

  const { login, loading, error } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validateLogin({ email, password })
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    await login(email, password)
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

          <div className='auth-field'>
            <label htmlFor='login-email' className='sr-only'>Email</label>
            <div className='auth-field-inner'>
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
                onChange={e => setEmail(e.target.value)}
                autoComplete='email'
              />
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