import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../firebase/AuthContext'
import {
  Scissors,
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  LogOut,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function Account() {
  const { user, userProfile, hasPurchased, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
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
                <span className="flex items-center gap-2 text-gray-500">
                  <XCircle className="w-5 h-5" />
                  Not Purchased
                </span>
              )}
            </div>
            {hasPurchased && userProfile?.purchaseDate && (
              <p className="text-sm text-gray-500 mt-2">
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
