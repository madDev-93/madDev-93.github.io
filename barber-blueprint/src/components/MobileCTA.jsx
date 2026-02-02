import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function MobileCTA({ price = '$47' }) {
  const [show, setShow] = useState(false)
  const rafRef = useRef(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      // Throttle with requestAnimationFrame
      if (rafRef.current) return

      rafRef.current = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        // Only update if scroll changed significantly (> 10px)
        if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
          const shouldShow = currentScrollY > window.innerHeight * 0.8
          setShow(shouldShow)
          lastScrollY.current = currentScrollY
        }
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

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-dark/95 backdrop-blur-md border-t border-white/10 px-4 py-3"
          role="complementary"
          aria-label="Quick purchase bar"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Get the Blueprint</p>
              <p className="text-xl font-bold text-white">{price}</p>
            </div>
            <a
              href="#get-access"
              className="flex-1 max-w-[200px] bg-gold hover:bg-gold-dark text-dark font-semibold text-center px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              aria-label={`Get access for ${price}`}
            >
              Get Access
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
