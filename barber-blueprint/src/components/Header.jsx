import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Scissors, Menu, X, User } from 'lucide-react'
import { useAuth } from '../firebase/AuthContext'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user } = useAuth()
  const rafRef = useRef(null)
  const menuButtonRef = useRef(null)
  const firstMenuItemRef = useRef(null)

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      // Throttle with requestAnimationFrame
      if (rafRef.current) return

      rafRef.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50)
        rafRef.current = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // Handle Escape key to close mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeMenu()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Focus first menu item when menu opens
    firstMenuItemRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileMenuOpen, closeMenu])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-dark/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2" aria-label="Barber Blueprint Home">
            <Scissors className="w-5 h-5 text-gold" aria-hidden="true" />
            <span className="font-semibold text-sm tracking-wide uppercase">Barber Blueprint</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8" role="navigation" aria-label="Main navigation">
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
                <User className="w-4 h-4" aria-hidden="true" />
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
            ref={menuButtonRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 focus:outline-none focus:ring-2 focus:ring-gold/50 rounded"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden pb-4"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <nav className="flex flex-col gap-4">
              <a ref={firstMenuItemRef} href="#modules" className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-gold" onClick={closeMenu}>
                Modules
              </a>
              <a href="#bonuses" className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-gold" onClick={closeMenu}>
                Bonuses
              </a>
              <a href="#about" className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-gold" onClick={closeMenu}>
                About
              </a>
              {user ? (
                <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-gold" onClick={closeMenu}>
                  Dashboard
                </Link>
              ) : (
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-gold" onClick={closeMenu}>
                  Sign In
                </Link>
              )}
              <a
                href="#get-access"
                className="bg-gold text-dark font-medium text-center px-5 py-3 rounded focus:outline-none focus:ring-2 focus:ring-gold/50"
                onClick={closeMenu}
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
