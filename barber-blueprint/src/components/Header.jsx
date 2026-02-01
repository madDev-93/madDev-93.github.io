import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Scissors, Menu, X, User } from 'lucide-react'
import { useAuth } from '../firebase/AuthContext'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-dark/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-gold" />
            <span className="font-semibold text-sm tracking-wide uppercase">Barber Blueprint</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#modules" className="text-sm text-gray-400 hover:text-white transition-colors">
              Modules
            </a>
            <a href="#bonuses" className="text-sm text-gray-400 hover:text-white transition-colors">
              Bonuses
            </a>
            <a href="#about" className="text-sm text-gray-400 hover:text-white transition-colors">
              About
            </a>
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <User className="w-4 h-4" />
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
            )}
            <a
              href="#get-access"
              className="bg-gold hover:bg-gold-dark text-dark font-medium text-sm px-5 py-2.5 rounded transition-colors"
            >
              Get Access
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden pb-4"
          >
            <nav className="flex flex-col gap-4">
              <a href="#modules" className="text-gray-400 hover:text-white transition-colors">
                Modules
              </a>
              <a href="#bonuses" className="text-gray-400 hover:text-white transition-colors">
                Bonuses
              </a>
              <a href="#about" className="text-gray-400 hover:text-white transition-colors">
                About
              </a>
              {user ? (
                <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Dashboard
                </Link>
              ) : (
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
              )}
              <a
                href="#get-access"
                className="bg-gold text-dark font-medium text-center px-5 py-3 rounded"
              >
                Get Access
              </a>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  )
}
