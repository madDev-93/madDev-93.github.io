import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../firebase/AuthContext'
import { validateEmail, validatePassword, validatePasswordMatch, getAuthErrorMessage } from '../utils/validation'
import { checkRateLimit, recordAttempt, clearRateLimit, formatRemainingTime } from '../utils/rateLimit'
import { Scissors, Mail, Lock, ArrowRight, AlertCircle, Check } from 'lucide-react'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const navigate = useNavigate()

  const RATE_LIMIT_KEY = 'signup_attempts'

  const validateForm = () => {
    const errors = {}

    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError

    const passwordError = validatePassword(password)
    if (passwordError) errors.password = passwordError

    const matchError = validatePasswordMatch(password, confirmPassword)
    if (matchError) errors.confirmPassword = matchError

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
      setError(`Too many signup attempts. Please try again in ${formatRemainingTime(rateCheck.remainingMs)}.`)
      return
    }

    if (!validateForm()) return

    setLoading(true)

    try {
      await signup(email.trim().toLowerCase(), password)
      clearRateLimit(RATE_LIMIT_KEY)
      navigate('/dashboard')
    } catch (err) {
      recordAttempt(RATE_LIMIT_KEY)
      setError(getAuthErrorMessage(err.code, 'signup'))
    } finally {
      setLoading(false)
    }
  }

  // Password strength indicators
  const passwordChecks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
  ]

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-8">
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
          <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
          <p className="text-gray-400 text-center mb-8">Join the Blueprint community</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
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

              {/* Password strength indicators */}
              {password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {passwordChecks.map((check) => (
                    <div
                      key={check.label}
                      className={`flex items-center gap-1 text-xs ${
                        check.met ? 'text-green-400' : 'text-gray-500'
                      }`}
                    >
                      <Check className={`w-3 h-3 ${check.met ? 'opacity-100' : 'opacity-30'}`} />
                      {check.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className={`w-full bg-white/5 border rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none transition-colors disabled:opacity-50 ${
                    fieldErrors.confirmPassword ? 'border-red-500' : 'border-white/10 focus:border-gold/50'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-dark font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:text-gold-dark transition-colors">
              Sign in
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
