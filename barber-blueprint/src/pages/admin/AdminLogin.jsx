import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { useAdmin } from '../../firebase/AdminContext'
import { validateEmail, getAuthErrorMessage } from '../../utils/validation'
import { checkRateLimit, recordAttempt, clearRateLimit, formatRemainingTime } from '../../utils/rateLimit'
import { Scissors, Mail, Lock, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const { isAdmin, loading: adminLoading } = useAdmin()
  const navigate = useNavigate()

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!adminLoading && isAdmin) {
      navigate('/admin')
    }
  }, [isAdmin, adminLoading, navigate])

  const RATE_LIMIT_KEY = 'admin_login_attempts'

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

    const rateCheck = checkRateLimit(RATE_LIMIT_KEY, 5, 60000)
    if (rateCheck.limited) {
      setError(`Too many login attempts. Please try again in ${formatRemainingTime(rateCheck.remainingMs)}.`)
      return
    }

    if (!validateForm()) return

    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = await signInWithEmailAndPassword(auth, normalizedEmail, password)

      // Check if user is an admin
      const adminDoc = await getDoc(doc(db, 'blueprint_admins', result.user.uid))

      if (!adminDoc.exists()) {
        // Not an admin - sign out and show error
        await auth.signOut()
        recordAttempt(RATE_LIMIT_KEY)
        if (mountedRef.current) {
          setError('Access denied. Admin privileges required.')
        }
        return
      }

      clearRateLimit(RATE_LIMIT_KEY)
      if (mountedRef.current) {
        navigate('/admin')
      }
    } catch (err) {
      recordAttempt(RATE_LIMIT_KEY)
      if (mountedRef.current) {
        setError(getAuthErrorMessage(err.code, 'login'))
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
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
          <Scissors className="w-6 h-6 text-gold" aria-hidden="true" />
          <span className="font-semibold tracking-wide uppercase">Barber Blueprint</span>
        </Link>

        {/* Card */}
        <div className="bg-dark-tertiary border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="w-6 h-6 text-gold" aria-hidden="true" />
            <h1 className="text-2xl font-bold">Admin Access</h1>
          </div>
          <p className="text-gray-400 text-center mb-8">Sign in with your admin credentials</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  className={`w-full bg-white/5 border rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/20 transition-colors disabled:opacity-50 ${
                    fieldErrors.email ? 'border-red-500' : 'border-white/10 focus:border-gold/50'
                  }`}
                  placeholder="admin@example.com"
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  className={`w-full bg-white/5 border rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/20 transition-colors disabled:opacity-50 ${
                    fieldErrors.password ? 'border-red-500' : 'border-white/10 focus:border-gold/50'
                  }`}
                  placeholder="••••••••"
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="text-red-400 text-xs mt-1" role="alert">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-dark text-dark font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark/30 border-t-dark rounded-full animate-spin" aria-label="Signing in..." />
              ) : (
                <>
                  Access Admin Panel
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          <Link to="/" className="hover:text-white transition-colors focus:outline-none focus:underline">
            Back to main site
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
