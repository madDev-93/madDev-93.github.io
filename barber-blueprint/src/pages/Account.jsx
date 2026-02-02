import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../firebase/AuthContext'
import { validateEmail, validatePassword, getAuthErrorMessage } from '../utils/validation'
import { checkRateLimit, recordAttempt, formatRemainingTime } from '../utils/rateLimit'
import {
  Scissors,
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  LogOut,
  CheckCircle,
  XCircle,
  Lock,
  Trash2,
  AlertCircle,
  Eye,
  EyeOff,
  X
} from 'lucide-react'

// PasswordInput component defined outside to prevent recreation on every render
function PasswordInput({ value, onChange, placeholder, name, disabled, showPassword, onToggle, id }) {
  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-12 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
        placeholder={placeholder}
        autoComplete="current-password"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none focus:text-gold"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        aria-pressed={showPassword}
      >
        {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
      </button>
    </div>
  )
}

// Rate limit keys
const RATE_LIMIT_KEYS = {
  password: 'account_password_change',
  email: 'account_email_change',
  delete: 'account_delete'
}

export default function Account() {
  const { user, userProfile, hasPurchased, logout, updatePassword, updateEmail, deleteAccount } = useAuth()
  const navigate = useNavigate()

  // UI State
  const [activeSection, setActiveSection] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [emailForm, setEmailForm] = useState({
    currentPassword: '',
    newEmail: ''
  })
  const [deleteForm, setDeleteForm] = useState({
    currentPassword: '',
    confirmText: ''
  })

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (err) {
      setError('Failed to sign out. Please try again.')
    }
  }

  const resetForms = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setEmailForm({ currentPassword: '', newEmail: '' })
    setDeleteForm({ currentPassword: '', confirmText: '' })
    setError('')
    setSuccess('')
    setShowPassword({})
  }

  const handleSectionToggle = (section) => {
    if (activeSection === section) {
      setActiveSection(null)
      resetForms()
    } else {
      setActiveSection(section)
      resetForms()
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Rate limit check (5 attempts per 5 minutes)
    const rateCheck = checkRateLimit(RATE_LIMIT_KEYS.password, 5, 300000)
    if (rateCheck.limited) {
      setError(`Too many attempts. Please try again in ${formatRemainingTime(rateCheck.remainingMs)}.`)
      return
    }

    // Validation
    if (!passwordForm.currentPassword) {
      setError('Current password is required')
      return
    }
    const passwordError = validatePassword(passwordForm.newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)
    try {
      await updatePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setSuccess('Password updated successfully')
      resetForms()
      setActiveSection(null)
    } catch (err) {
      recordAttempt(RATE_LIMIT_KEYS.password)
      setError(getAuthErrorMessage(err.code, 'password'))
    } finally {
      setLoading(false)
    }
  }

  const handleEmailChange = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Rate limit check (3 attempts per 5 minutes)
    const rateCheck = checkRateLimit(RATE_LIMIT_KEYS.email, 3, 300000)
    if (rateCheck.limited) {
      setError(`Too many attempts. Please try again in ${formatRemainingTime(rateCheck.remainingMs)}.`)
      return
    }

    // Validation
    if (!emailForm.currentPassword) {
      setError('Password is required')
      return
    }
    const emailError = validateEmail(emailForm.newEmail)
    if (emailError) {
      setError(emailError)
      return
    }
    if (emailForm.newEmail.toLowerCase() === user?.email?.toLowerCase()) {
      setError('New email must be different from current email')
      return
    }

    setLoading(true)
    try {
      await updateEmail(emailForm.currentPassword, emailForm.newEmail)
      setSuccess('Verification email sent to your new address. Please check your inbox and click the link to confirm the change.')
      resetForms()
      setActiveSection(null)
    } catch (err) {
      recordAttempt(RATE_LIMIT_KEYS.email)
      setError(getAuthErrorMessage(err.code, 'email'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async (e) => {
    e.preventDefault()
    setError('')

    // Rate limit check (3 attempts per 10 minutes)
    const rateCheck = checkRateLimit(RATE_LIMIT_KEYS.delete, 3, 600000)
    if (rateCheck.limited) {
      setError(`Too many attempts. Please try again in ${formatRemainingTime(rateCheck.remainingMs)}.`)
      return
    }

    if (!deleteForm.currentPassword) {
      setError('Password is required')
      return
    }
    if (deleteForm.confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setLoading(true)
    try {
      await deleteAccount(deleteForm.currentPassword)
      navigate('/')
    } catch (err) {
      recordAttempt(RATE_LIMIT_KEYS.delete)
      setError(getAuthErrorMessage(err.code, 'delete'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteToggle = () => {
    setShowDeleteConfirm(!showDeleteConfirm)
    if (!showDeleteConfirm) {
      // Opening delete section - clear any previous errors
      setError('')
      setDeleteForm({ currentPassword: '', confirmText: '' })
    }
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-gold" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-8">Account</h1>

          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
              <button onClick={() => setSuccess('')} className="ml-auto" aria-label="Dismiss message">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-dark-tertiary border border-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gold" />
              Profile
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/5">
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail className="w-5 h-5" />
                  <span>Email</span>
                </div>
                <span className="text-white">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 text-gray-400">
                  <Calendar className="w-5 h-5" />
                  <span>Member Since</span>
                </div>
                <span className="text-white">
                  {user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Access Status */}
          <div className="bg-dark-tertiary border border-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-gold" />
              Access Status
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Blueprint Access</span>
              {hasPurchased ? (
                <span className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-2 text-gray-400">
                  <XCircle className="w-5 h-5" />
                  Not Purchased
                </span>
              )}
            </div>
            {hasPurchased && userProfile?.purchaseDate && (
              <p className="text-sm text-gray-400 mt-2">
                Purchased on {new Date(userProfile.purchaseDate).toLocaleDateString()}
              </p>
            )}
            {!hasPurchased && (
              <Link
                to="/#get-access"
                className="inline-block mt-4 bg-gold hover:bg-gold-dark text-dark font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Get Access — $47
              </Link>
            )}
          </div>

          {/* Account Settings */}
          <div className="bg-dark-tertiary border border-white/5 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gold" />
              Account Settings
            </h2>

            {/* Change Password */}
            <div className="border-b border-white/5 pb-4 mb-4">
              <button
                onClick={() => handleSectionToggle('password')}
                className="w-full flex items-center justify-between py-2 text-left"
                aria-expanded={activeSection === 'password'}
              >
                <span className="text-gray-300">Change Password</span>
                <span className="text-gold text-sm">
                  {activeSection === 'password' ? 'Cancel' : 'Edit'}
                </span>
              </button>
              {activeSection === 'password' && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handlePasswordChange}
                  className="mt-4 space-y-4"
                >
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2" role="alert">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="current-password" className="block text-sm text-gray-400 mb-2">Current Password</label>
                    <PasswordInput
                      id="current-password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      name="currentPassword"
                      disabled={loading}
                      showPassword={showPassword.currentPassword}
                      onToggle={() => togglePasswordVisibility('currentPassword')}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="block text-sm text-gray-400 mb-2">New Password</label>
                    <PasswordInput
                      id="new-password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      name="newPassword"
                      disabled={loading}
                      showPassword={showPassword.newPassword}
                      onToggle={() => togglePasswordVisibility('newPassword')}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Min 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                    <PasswordInput
                      id="confirm-password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      name="confirmPassword"
                      disabled={loading}
                      showPassword={showPassword.confirmPassword}
                      onToggle={() => togglePasswordVisibility('confirmPassword')}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold hover:bg-gold-dark text-dark font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </motion.form>
              )}
            </div>

            {/* Change Email */}
            <div className="border-b border-white/5 pb-4 mb-4">
              <button
                onClick={() => handleSectionToggle('email')}
                className="w-full flex items-center justify-between py-2 text-left"
                aria-expanded={activeSection === 'email'}
              >
                <span className="text-gray-300">Change Email</span>
                <span className="text-gold text-sm">
                  {activeSection === 'email' ? 'Cancel' : 'Edit'}
                </span>
              </button>
              {activeSection === 'email' && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleEmailChange}
                  className="mt-4 space-y-4"
                >
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2" role="alert">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm">{error}</span>
                    </div>
                  )}
                  <div>
                    <label htmlFor="email-current-password" className="block text-sm text-gray-400 mb-2">Current Password</label>
                    <PasswordInput
                      id="email-current-password"
                      value={emailForm.currentPassword}
                      onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                      placeholder="Enter your password"
                      name="emailCurrentPassword"
                      disabled={loading}
                      showPassword={showPassword.emailCurrentPassword}
                      onToggle={() => togglePasswordVisibility('emailCurrentPassword')}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-email" className="block text-sm text-gray-400 mb-2">New Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" aria-hidden="true" />
                      <input
                        id="new-email"
                        type="email"
                        value={emailForm.newEmail}
                        onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                        disabled={loading}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-50"
                        placeholder="Enter new email"
                        autoComplete="email"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      A verification link will be sent to your new email
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gold hover:bg-gold-dark text-dark font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
                  >
                    {loading ? 'Sending verification...' : 'Send Verification Email'}
                  </button>
                </motion.form>
              )}
            </div>

            {/* Delete Account */}
            <div>
              <button
                onClick={handleDeleteToggle}
                className="w-full flex items-center justify-between py-2 text-left"
                aria-expanded={showDeleteConfirm}
              >
                <span className="text-red-400">Delete Account</span>
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="delete-dialog-title"
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                    <h3 id="delete-dialog-title" className="text-red-400 font-semibold mb-2">Warning: This cannot be undone</h3>
                    <p className="text-gray-400 text-sm">
                      Deleting your account will permanently remove all your data, including any course progress.
                      {hasPurchased && ' Your purchase will not be refunded.'}
                    </p>
                  </div>
                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2" role="alert">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                      </div>
                    )}
                    <div>
                      <label htmlFor="delete-password" className="block text-sm text-gray-400 mb-2">Password</label>
                      <PasswordInput
                        id="delete-password"
                        value={deleteForm.currentPassword}
                        onChange={(e) => setDeleteForm({ ...deleteForm, currentPassword: e.target.value })}
                        placeholder="Enter your password"
                        name="deletePassword"
                        disabled={loading}
                        showPassword={showPassword.deletePassword}
                        onToggle={() => togglePasswordVisibility('deletePassword')}
                      />
                    </div>
                    <div>
                      <label htmlFor="delete-confirm" className="block text-sm text-gray-400 mb-2">Type DELETE to confirm</label>
                      <input
                        id="delete-confirm"
                        type="text"
                        value={deleteForm.confirmText}
                        onChange={(e) => setDeleteForm({ ...deleteForm, confirmText: e.target.value })}
                        disabled={loading}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 transition-colors disabled:opacity-50"
                        placeholder="DELETE"
                        autoComplete="off"
                        spellCheck="false"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteForm({ currentPassword: '', confirmText: '' })
                          setError('')
                        }}
                        disabled={loading}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-dark"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-dark"
                      >
                        {loading ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </div>
          </div>

          {/* Support */}
          <div className="bg-dark-tertiary border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Need Help?</h2>
            <p className="text-gray-400 text-sm mb-4">
              If you have questions about your account or need support, reach out to us.
            </p>
            <a
              href="mailto:support@barberblueprint.com"
              className="text-gold hover:text-gold-dark transition-colors text-sm"
            >
              support@barberblueprint.com
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
