/**
 * Client-side rate limiting utility with sessionStorage persistence
 * Prevents rapid-fire form submissions and brute force attempts
 * Persists across page refresh within the same session
 */

const STORAGE_KEY = 'rate_limit_data'

/**
 * Get rate limit data from sessionStorage
 */
function getStoredData() {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Save rate limit data to sessionStorage
 */
function saveData(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable - continue without persistence
  }
}

/**
 * Check if an action is rate limited
 * @param {string} key - Unique identifier for the action (e.g., 'login', 'signup', 'reset')
 * @param {number} maxAttempts - Maximum attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ limited: boolean, remainingMs: number, attemptsLeft: number }}
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now()
  const data = getStoredData()
  const record = data[key]

  if (!record || !record.timestamps) {
    return { limited: false, remainingMs: 0, attemptsLeft: maxAttempts }
  }

  // Clean up old attempts outside the window
  const recentAttempts = record.timestamps.filter(ts => now - ts < windowMs)

  // Update stored data with cleaned attempts
  if (recentAttempts.length !== record.timestamps.length) {
    data[key] = { timestamps: recentAttempts }
    saveData(data)
  }

  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts)
    const remainingMs = windowMs - (now - oldestAttempt)
    return {
      limited: true,
      remainingMs: Math.max(0, remainingMs),
      attemptsLeft: 0
    }
  }

  return {
    limited: false,
    remainingMs: 0,
    attemptsLeft: maxAttempts - recentAttempts.length
  }
}

/**
 * Record an attempt for rate limiting
 * @param {string} key - Unique identifier for the action
 */
export function recordAttempt(key) {
  const now = Date.now()
  const data = getStoredData()

  if (data[key] && Array.isArray(data[key].timestamps)) {
    data[key].timestamps.push(now)
    // Keep only last 20 attempts to prevent storage bloat
    if (data[key].timestamps.length > 20) {
      data[key].timestamps = data[key].timestamps.slice(-20)
    }
  } else {
    data[key] = { timestamps: [now] }
  }

  saveData(data)
}

/**
 * Clear rate limit for a key (e.g., after successful login)
 * @param {string} key - Unique identifier for the action
 */
export function clearRateLimit(key) {
  const data = getStoredData()
  delete data[key]
  saveData(data)
}

/**
 * Format remaining time for display
 * @param {number} ms - Milliseconds remaining
 * @returns {string} Human readable time
 */
export function formatRemainingTime(ms) {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}
