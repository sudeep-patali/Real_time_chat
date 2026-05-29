export const validateLogin = ({ email, password }) => {
  const errors = {}

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    errors.email = 'Enter a valid email address'
  }

  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  return errors
}

export const validateSignup = ({ name, email, password, confirmPassword }) => {
  const errors = validateLogin({ email, password })

  if (!name || name.trim().length === 0) {
    errors.name = 'Name is required'
  }

  if (!confirmPassword || confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return errors
}