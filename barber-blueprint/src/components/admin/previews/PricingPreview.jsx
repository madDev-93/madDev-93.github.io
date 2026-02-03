import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'

export default function PricingPreview({ data }) {
  const { currentPrice, originalPrice, discount, includedItems } = data

  const calculatedDiscount = originalPrice > 0
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0

  return (
    <section className="py-20 bg-dark">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium uppercase tracking-wider">Get Access</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">
              Start Your Journey Today
            </h2>
          </motion.div>

          {/* Pricing Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-secondary border border-gold/20 rounded-2xl p-8 relative overflow-hidden"
          >
            {/* Discount Badge */}
            {calculatedDiscount > 0 && (
              <div className="absolute top-4 right-4 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                {discount || `${calculatedDiscount}% OFF`}
              </div>
            )}

            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-5xl md:text-6xl font-bold text-gold">
                  ${currentPrice}
                </span>
                {originalPrice > currentPrice && (
                  <span className="text-2xl text-gray-500 line-through">
                    ${originalPrice}
                  </span>
                )}
              </div>
              <p className="text-gray-400">One-time payment, lifetime access</p>
            </div>

            {/* Included Items */}
            {includedItems && includedItems.length > 0 && (
              <div className="space-y-3 mb-8">
                {includedItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-gold" />
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            )}

            {includedItems?.length === 0 && (
              <p className="text-gray-500 italic text-center mb-8">
                No included items added yet.
              </p>
            )}

            {/* CTA Button */}
            <button className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-dark font-semibold rounded-xl transition-colors">
              Get Instant Access
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Trust badges */}
            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>Secure checkout</span>
              <span>Instant access</span>
              <span>Lifetime updates</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
