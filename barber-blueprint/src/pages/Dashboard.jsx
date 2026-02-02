import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../firebase/AuthContext'
import { Scissors, Lock, Play, LogOut, User, Gift } from 'lucide-react'
import { modules, bonuses } from '../constants/modules'

export default function Dashboard() {
  const { user, hasPurchased, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch {
      // Silently fail - user can retry
    }
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="border-b border-white/5" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-gold" />
              <span className="font-semibold text-sm tracking-wide uppercase">Barber Blueprint</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/account"
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 rounded"
                aria-label="Account settings"
              >
                <User className="w-5 h-5" aria-hidden="true" />
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 rounded"
                aria-label="Sign out"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-400">
            {hasPurchased
              ? 'Continue where you left off.'
              : 'Purchase the Blueprint to unlock all content.'}
          </p>
        </motion.div>

        {/* Not Purchased Banner */}
        {!hasPurchased && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gold/10 border border-gold/20 rounded-2xl p-6 mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h3 className="font-semibold text-gold mb-1">Unlock Full Access</h3>
              <p className="text-gray-400 text-sm">Get instant access to all 6 modules and bonuses.</p>
            </div>
            <Link
              to="/#get-access"
              className="bg-gold hover:bg-gold-dark text-dark font-semibold px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
            >
              Get Access — $47
            </Link>
          </motion.div>
        )}

        {/* Modules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold mb-6">Modules</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Course modules">
            {modules.map((module) => (
              <Link
                key={module.id}
                to={hasPurchased ? `/modules/${module.id}` : '#'}
                className={`group bg-dark-tertiary border border-white/5 rounded-xl p-5 transition-all focus:outline-none focus:ring-2 focus:ring-gold/50 ${
                  hasPurchased
                    ? 'hover:border-gold/30 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                role="listitem"
                aria-label={`${module.title}${!hasPurchased ? ' (locked)' : ''}`}
                aria-disabled={!hasPurchased}
                onClick={(e) => !hasPurchased && e.preventDefault()}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                    <module.icon className={`w-5 h-5 ${hasPurchased ? 'text-gray-400 group-hover:text-gold' : 'text-gray-400'} transition-colors`} aria-hidden="true" />
                  </div>
                  {hasPurchased ? (
                    <Play className="w-5 h-5 text-gold opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-400" aria-label="Locked" />
                  )}
                </div>
                <h3 className="font-semibold mb-1">{module.title}</h3>
                <p className="text-sm text-gray-400 mb-3">{module.shortDescription}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{module.lessons} lessons</span>
                  <span aria-hidden="true">•</span>
                  <span>{module.duration}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Bonuses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Gift className="w-5 h-5 text-gold" aria-hidden="true" />
            Bonuses
          </h2>
          <div className="grid sm:grid-cols-3 gap-4" role="list" aria-label="Bonus materials">
            {bonuses.map((bonus) => (
              <div
                key={bonus.title}
                className={`bg-dark-tertiary border border-white/5 rounded-xl p-5 ${
                  !hasPurchased && 'opacity-60'
                }`}
                role="listitem"
                aria-label={`${bonus.title}${!hasPurchased ? ' (locked)' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs bg-gold/10 text-gold px-2 py-1 rounded">{bonus.type}</span>
                  {!hasPurchased && <Lock className="w-4 h-4 text-gray-600" aria-label="Locked" />}
                </div>
                <h3 className="font-medium">{bonus.title}</h3>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
