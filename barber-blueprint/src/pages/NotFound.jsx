import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Scissors, Home, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../firebase/AuthContext'

export default function NotFound() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <Scissors className="w-16 h-16 text-gold mx-auto mb-6" />
        </motion.div>

        <h1 className="text-6xl font-bold text-gold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
          >
            <Home className="w-5 h-5" aria-hidden="true" />
            Go Home
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 border border-white/20 hover:border-gold/50 text-white px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
            >
              <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
              Dashboard
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  )
}
