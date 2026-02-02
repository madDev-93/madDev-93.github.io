/**
 * Validation utilities for forms
 */

export const validateEmail = (email) => {
  if (!email) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Invalid email address'
  return null
}

export const validatePassword = (password) => {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain a number'
  return null
}

export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) return 'Passwords do not match'
  return null
}

export const getAuthErrorMessage = (errorCode) => {
  const errorMap = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password is too weak',
    'auth/invalid-email': 'Invalid email address',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/user-disabled': 'This account has been disabled',
    'auth/operation-not-allowed': 'Operation not allowed',
  }

  return errorMap[errorCode] || 'Something went wrong. Please try again.'
}
