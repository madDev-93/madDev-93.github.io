/**
 * Client-side rate limiting utility
 * Prevents rapid-fire form submissions and brute force attempts
 */

const attempts = new Map()

/**
 * Check if an action is rate limited
 * @param {string} key - Unique identifier for the action (e.g., 'login', 'signup', 'reset')
 * @param {number} maxAttempts - Maximum attempts allowed in the window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ limited: boolean, remainingMs: number, attemptsLeft: number }}
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record) {
    return { limited: false, remainingMs: 0, attemptsLeft: maxAttempts }
  }

  // Clean up old attempts outside the window
  const recentAttempts = record.timestamps.filter(ts => now - ts < windowMs)

  if (recentAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...recentAttempts)
    const remainingMs = windowMs - (now - oldestAttempt)
    return {
      limited: true,
      remainingMs,
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
  const record = attempts.get(key)

  if (record) {
    record.timestamps.push(now)
    // Keep only last 20 attempts to prevent memory bloat
    if (record.timestamps.length > 20) {
      record.timestamps = record.timestamps.slice(-20)
    }
  } else {
    attempts.set(key, { timestamps: [now] })
  }
}

/**
 * Clear rate limit for a key (e.g., after successful login)
 * @param {string} key - Unique identifier for the action
 */
export function clearRateLimit(key) {
  attempts.delete(key)
}

/**
 * Format remaining time for display
 * @param {number} ms - Milliseconds remaining
 * @returns {string} Human readable time
 */
export function formatRemainingTime(ms) {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}
