import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../firebase/AuthContext'
import { validateEmail, getAuthErrorMessage } from '../utils/validation'
import { checkRateLimit, recordAttempt, clearRateLimit, formatRemainingTime } from '../utils/rateLimit'
import { Scissors, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()

  const RATE_LIMIT_KEY = 'login_attempts'

  const validateForm = () => {
    const errors = {}
    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError
    if (!password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Check rate limit before proceeding
    const rateCheck = checkRateLimit(RATE_LIMIT_KEY, 5, 60000)
    if (rateCheck.limited) {
      setError(`Too many login attempts. Please try again in ${formatRemainingTime(rateCheck.remainingMs)}.`)
      return
    }

    if (!validateForm()) return

    setLoading(true)

    try {
      await login(email.trim().toLowerCase(), password)
      clearRateLimit(RATE_LIMIT_KEY)
      navigate('/dashboard')
    } catch (err) {
      recordAttempt(RATE_LIMIT_KEY)
      // Show actual error code for debugging
      const errorMsg = getAuthErrorMessage(err.code, 'login')
      setError(`${errorMsg} (Code: ${err.code || 'unknown'})`)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    const emailError = validateEmail(email)
    if (emailError) {
      setFieldErrors({ email: emailError })
      return
    }

    // Check rate limit for reset attempts
    const rateCheck = checkRateLimit('reset_attempts', 3, 300000) // 3 attempts per 5 minutes
    if (rateCheck.limited) {
      setError(`Too many reset attempts. Please try again in ${formatRemainingTime(rateCheck.remainingMs)}.`)
      return
    }

    setError('')
    setFieldErrors({})

    try {
      recordAttempt('reset_attempts')
      await resetPassword(email.trim().toLowerCase())
      // Always show success to prevent email enumeration
      setResetSent(true)
    } catch (err) {
      // Show success message even on error to prevent email enumeration
      // Only show actual error for non-user-related errors
      if (err.code === 'auth/network-request-failed' || err.code === 'auth/too-many-requests') {
        setError(getAuthErrorMessage(err.code, 'reset'))
      } else {
        setResetSent(true)
      }
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Scissors className="w-6 h-6 text-gold" />
          <span className="font-semibold tracking-wide uppercase">Barber Blueprint</span>
        </Link>

        {/* Card */}
        <div className="bg-dark-tertiary border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Welcome Back</h1>
          <p className="text-gray-400 text-center mb-8">Sign in to access your content</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {resetSent && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">
              Password reset email sent. Check your inbox.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className={`w-full bg-white/5 border rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none transition-colors disabled:opacity-50 ${
                    fieldErrors.email ? 'border-red-500' : 'border-white/10 focus:border-gold/50'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={`w-full bg-white/5 border rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none transition-colors disabled:opacity-50 ${
                    fieldErrors.password ? 'border-red-500' : 'border-white/10 focus:border-gold/50'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {fieldErrors.password && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="text-sm text-gold hover:text-gold-dark transition-colors disabled:opacity-50"
            >
              Forgot password?
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-dark font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-gold hover:text-gold-dark transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          <Link to="/" className="hover:text-gray-400 transition-colors">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
