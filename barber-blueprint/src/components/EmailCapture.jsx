import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

export default function EmailCapture() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    setError('')

    try {
      // Store email in Firestore for later retrieval
      await addDoc(collection(db, 'email_subscribers'), {
        email: email.toLowerCase().trim(),
        subscribedAt: serverTimestamp(),
        source: 'landing_page'
      })
      setStatus('success')
      setEmail('')
    } catch (err) {
      // Fallback: store in localStorage if Firestore fails
      try {
        const stored = JSON.parse(localStorage.getItem('email_subscribers') || '[]')
        stored.push({ email: email.toLowerCase().trim(), date: new Date().toISOString() })
        localStorage.setItem('email_subscribers', JSON.stringify(stored))
        setStatus('success')
        setEmail('')
      } catch {
        setStatus('error')
        setError('Unable to subscribe. Please try again.')
      }
    }
  }

  return (
    <section ref={ref} className="py-24 relative overflow-hidden" aria-labelledby="email-capture-heading">
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="bg-dark-tertiary border border-gold/20 rounded-2xl p-8 sm:p-12 text-center"
        >
          <h3 id="email-capture-heading" className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
            Not Ready Yet?
          </h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Get free tips on building your barber brand. No spam, just value. Unsubscribe anytime.
          </p>

          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 text-gold"
              role="status"
              aria-live="polite"
            >
              <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center" aria-hidden="true">
                <Check className="w-5 h-5" />
              </div>
              <span className="font-medium">You're in. Check your inbox.</span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <label htmlFor="email-capture-input" className="sr-only">Email address</label>
              <input
                id="email-capture-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="email"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20 transition-colors"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-gold hover:bg-gold-dark text-dark font-semibold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-dark/30 border-t-dark rounded-full animate-spin" aria-label="Subscribing..." />
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-3">{error}</p>
          )}

          <p className="text-xs text-gray-400 mt-4">
            Join 500+ barbers getting weekly tips
          </p>
        </motion.div>
      </div>
    </section>
  )
}
