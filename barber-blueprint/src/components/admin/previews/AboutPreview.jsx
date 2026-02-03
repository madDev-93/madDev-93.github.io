import { motion } from 'framer-motion'
import { Instagram, Quote } from 'lucide-react'

export default function AboutPreview({ data }) {
  const { headline, paragraphs, quote, instagram } = data

  return (
    <section className="py-20 bg-dark">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="text-gold text-sm font-medium uppercase tracking-wider">About</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">
              {headline || 'Our Story'}
            </h2>
          </motion.div>

          {/* Content Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Paragraphs */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {paragraphs && paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-gray-400 leading-relaxed">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-gray-500 italic">No paragraphs added yet.</p>
              )}

              {/* Instagram Link */}
              {instagram && (
                <div className="pt-4">
                  <a
                    href={`https://instagram.com/${instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold hover:text-gold-dark transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                    <span>@{instagram}</span>
                  </a>
                </div>
              )}
            </motion.div>

            {/* Quote */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {quote?.text ? (
                <div className="bg-dark-secondary border border-white/5 rounded-2xl p-8 relative">
                  <Quote className="absolute top-4 left-4 w-8 h-8 text-gold/20" />
                  <blockquote className="relative z-10">
                    <p className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-4">
                      "{quote.text}"
                    </p>
                    {quote.attribution && (
                      <footer className="text-gray-500">
                        — {quote.attribution}
                      </footer>
                    )}
                  </blockquote>
                </div>
              ) : (
                <div className="bg-dark-secondary border border-white/5 rounded-2xl p-8 text-center">
                  <p className="text-gray-500 italic">No quote added yet.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
