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

export const getAuthErrorMessage = (errorCode, context = 'login') => {
  // Generic messages that don't leak user existence information
  const loginErrors = {
    'auth/user-not-found': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/invalid-email': 'Invalid email or password',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }

  const signupErrors = {
    'auth/email-already-in-use': 'Unable to create account. Try a different email or sign in.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/operation-not-allowed': 'Account creation is currently disabled.',
  }

  const resetErrors = {
    'auth/user-not-found': 'If an account exists, a reset email has been sent.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }

  const errorMaps = {
    login: loginErrors,
    signup: signupErrors,
    reset: resetErrors
  }

  const errorMap = errorMaps[context] || loginErrors
  return errorMap[errorCode] || 'Something went wrong. Please try again.'
}
