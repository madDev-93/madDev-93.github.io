import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Users, X } from 'lucide-react'

export default function LiveActivity() {
  const [viewers, setViewers] = useState(0)
  const [recentPurchase, setRecentPurchase] = useState(null)
  const [showPurchase, setShowPurchase] = useState(false)
  const [showViewers, setShowViewers] = useState(true)
  const [notificationCount, setNotificationCount] = useState(0)
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false)

  const maxNotifications = 3

  const names = [
    'Marcus from Atlanta',
    'Darius from Houston',
    'James from Chicago',
    'Anthony from LA',
    'Chris from Miami',
    'Devon from NYC',
    'Tyler from Phoenix',
    'Brandon from Dallas',
    'Malik from Detroit',
    'Jamal from Oakland',
  ]

  const times = ['just now', '1 minute ago', '2 minutes ago', '3 minutes ago']

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight * 0.7) {
        setHasScrolledPastHero(true)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Initialize viewers after short delay
    const initTimer = setTimeout(() => {
      setViewers(Math.floor(Math.random() * 6) + 11)
    }, 2000)

    // Fluctuate viewers occasionally
    const viewerInterval = setInterval(() => {
      if (Math.random() > 0.4) { // 60% chance to change
        setViewers(prev => {
          const change = Math.random() > 0.5 ? 1 : -1
          const newValue = prev + change
          return Math.max(8, Math.min(20, newValue))
        })
      }
    }, 8000)

    return () => {
      clearTimeout(initTimer)
      clearInterval(viewerInterval)
    }
  }, [])

  // Purchase notifications - random intervals, limited count, only after scroll
  useEffect(() => {
    if (!hasScrolledPastHero || notificationCount >= maxNotifications) return

    const getRandomInterval = () => {
      // Random between 45-120 seconds
      return Math.floor(Math.random() * 75000) + 45000
    }

    // First notification after 20-35 seconds of scrolling past hero
    const initialDelay = Math.floor(Math.random() * 15000) + 20000

    const showNotification = () => {
      // 20% chance to skip this cycle entirely (quiet period)
      if (Math.random() < 0.2) {
        scheduleNext()
        return
      }

      const randomName = names[Math.floor(Math.random() * names.length)]
      const randomTime = times[Math.floor(Math.random() * times.length)]
      setRecentPurchase({ name: randomName, time: randomTime })
      setShowPurchase(true)
      setNotificationCount(prev => prev + 1)

      // Hide after 5 seconds
      setTimeout(() => setShowPurchase(false), 5000)
    }

    const scheduleNext = () => {
      if (notificationCount < maxNotifications - 1) {
        setTimeout(showNotification, getRandomInterval())
      }
    }

    const initialTimer = setTimeout(() => {
      showNotification()
      scheduleNext()
    }, initialDelay)

    return () => clearTimeout(initialTimer)
  }, [hasScrolledPastHero, notificationCount])

  const dismissViewers = () => setShowViewers(false)

  return (
    <>
      {/* Viewers Counter */}
      <AnimatePresence>
        {showViewers && viewers > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: 2.5 }}
            className="fixed bottom-4 left-4 z-50 bg-dark-tertiary/90 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              <span className="font-medium text-white">{viewers}</span> viewing
            </span>
            <button
              onClick={dismissViewers}
              className="ml-1 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchase Notification */}
      <AnimatePresence>
        {showPurchase && recentPurchase && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-4 right-4 z-50 bg-dark-tertiary/90 backdrop-blur-sm border border-gold/20 rounded-lg px-4 py-3 max-w-xs"
          >
            <button
              onClick={() => setShowPurchase(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-start gap-3 pr-4">
              <div className="w-8 h-8 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-gold" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{recentPurchase.name}</p>
                <p className="text-xs text-gray-400">purchased The Barber Blueprint</p>
                <p className="text-xs text-gray-500 mt-1">{recentPurchase.time}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
