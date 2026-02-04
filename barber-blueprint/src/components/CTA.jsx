import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Check, Zap, Shield, RefreshCw, Lock } from 'lucide-react'
import MagneticButton from './MagneticButton'
import { usePublicContent } from '../hooks/useSiteContent'

const fallbackIncluded = [
  '6 Core Modules',
  'Filming Angles Guide',
  'Equipment Setup Guide',
  'Content Strategy Templates',
  'Posting Schedule Framework',
  'Monetization Roadmap',
  'Weekly Filming Checklist',
  'Daily Posting Framework',
  'Mindset Rules',
  'Lifetime Updates',
]

const fallbackPricing = {
  currentPrice: 47,
  originalPrice: 97,
  discount: '50%',
  includedItems: fallbackIncluded,
}

export default function CTA() {
  const { content, loading } = usePublicContent('landing')
  const pricing = content?.pricing || fallbackPricing
  const included = pricing.includedItems?.length > 0 ? pricing.includedItems : fallbackIncluded
  const price = `$${pricing.currentPrice || 47}`
  const originalPrice = `$${pricing.originalPrice || 97}`
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="get-access" ref={ref} className="py-24 bg-dark-secondary relative overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">
            Get Started Today
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Ready to Build Your
            <br />
            <span className="text-gold">Barber Brand?</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Stop letting content creation overwhelm you. Get the exact system to turn your
            daily haircuts into income, influence, and freedom.
          </p>
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-dark-tertiary border border-gold/20 rounded-2xl p-8 sm:p-10"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">The Barber Blueprint</h3>

            {/* Price */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl sm:text-5xl font-bold text-white">{price}</span>
              <span className="text-xl text-gray-400 line-through">{originalPrice}</span>
            </div>
            <p className="text-sm text-gold">Save 50% — Limited Time</p>
          </div>

          {/* What's Included */}
          <ul className="grid sm:grid-cols-2 gap-3 mb-8" aria-label="What's included">
            {included.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <Check className="w-3 h-3 text-gold" />
                </div>
                <span className="text-sm text-gray-300">{item}</span>
              </li>
            ))}
          </ul>

          {/* Terms */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8 py-6 border-y border-white/5">
            {[
              { icon: Zap, text: 'Instant Access' },
              { icon: Shield, text: 'One-Time Payment' },
              { icon: RefreshCw, text: 'Lifetime Updates' },
            ].map((term) => (
              <div key={term.text} className="flex items-center gap-2 text-gray-400">
                <term.icon className="w-4 h-4 text-gold" aria-hidden="true" />
                <span className="text-sm">{term.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Button - Links to signup, payment integration can be added later */}
          <MagneticButton
            href="/signup"
            className="group w-full bg-gold hover:bg-gold-dark text-dark font-semibold text-lg px-8 py-5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Get Instant Access — {price}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </MagneticButton>

          {/* Guarantee */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              30-day money-back guarantee. No questions asked.
            </p>
          </div>

          {/* Secure Payment */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-4">
              <Lock className="w-4 h-4" />
              <span className="text-xs">Secure 256-bit SSL Encrypted Payment</span>
            </div>

            {/* Payment Methods */}
            <div className="flex items-center justify-center gap-3" aria-label="Accepted payment methods: Visa, Mastercard, AMEX, Apple Pay">
              <span className="text-xs font-medium text-gray-500 px-2 py-1 border border-white/10 rounded">Visa</span>
              <span className="text-xs font-medium text-gray-500 px-2 py-1 border border-white/10 rounded">Mastercard</span>
              <span className="text-xs font-medium text-gray-500 px-2 py-1 border border-white/10 rounded">AMEX</span>
              <span className="text-xs font-medium text-gray-500 px-2 py-1 border border-white/10 rounded">Apple Pay</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
