/**
 * Validation utilities for forms
 */

export const validateEmail = (email) => {
  if (!email) return 'Email is required'
  // More robust email regex - requires at least 2 char TLD, no consecutive dots
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
  if (!emailRegex.test(email)) return 'Invalid email address'
  if (/\.\./.test(email)) return 'Invalid email address'
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

  const passwordErrors = {
    'auth/wrong-password': 'Current password is incorrect',
    'auth/invalid-credential': 'Current password is incorrect',
    'auth/weak-password': 'New password is too weak',
    'auth/requires-recent-login': 'Please sign out and sign in again before changing your password',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }

  const emailErrors = {
    'auth/wrong-password': 'Password is incorrect',
    'auth/invalid-credential': 'Password is incorrect',
    'auth/email-already-in-use': 'This email is already in use',
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/requires-recent-login': 'Please sign out and sign in again before changing your email',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }

  const deleteErrors = {
    'auth/wrong-password': 'Password is incorrect',
    'auth/invalid-credential': 'Password is incorrect',
    'auth/requires-recent-login': 'Please sign out and sign in again before deleting your account',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }

  const errorMaps = {
    login: loginErrors,
    signup: signupErrors,
    reset: resetErrors,
    password: passwordErrors,
    email: emailErrors,
    delete: deleteErrors
  }

  const errorMap = errorMaps[context] || loginErrors
  return errorMap[errorCode] || 'Something went wrong. Please try again.'
}
