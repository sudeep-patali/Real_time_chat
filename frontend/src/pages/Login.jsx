import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { validateLogin } from '../utils/validateForm'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>WHEELTRIX</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.form}>
          <div style={styles.field}>
            <input
              style={styles.input}
              type='email'
              placeholder='Email'
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {fieldErrors.email && <p style={styles.fieldError}>{fieldErrors.email}</p>}
          </div>

          <div style={styles.field}>
            <input
              style={styles.input}
              type='password'
              placeholder='Password'
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {fieldErrors.password && <p style={styles.fieldError}>{fieldErrors.password}</p>}
          </div>

          <button
            style={styles.button}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p style={styles.link}>
          Don't have an account? <Link to='/signup'>Sign up</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',          
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg)',
    padding: '16px',         
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    padding: '40px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid var(--color-border)',
  },
  title: {
    color: 'var(--color-primary)',
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--color-text-muted)',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    fontSize: '14px',
  },
  button: {
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    marginTop: '8px',
  },
  error: {
    color: 'var(--color-error)',
    marginBottom: '16px',
    fontSize: '13px',
  },
  fieldError: {
    color: 'var(--color-error)',
    fontSize: '12px',
  },
  link: {
    marginTop: '24px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13px',
  }
}

export default Login