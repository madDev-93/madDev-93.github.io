import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function HeroPreview({ data }) {
  const { badge, headline, subheadline, ctaText, stats } = data

  // Highlight specific keywords in gold
  const highlightKeywords = (text) => {
    if (!text) return ''
    const keywords = ['Income', 'Influence', 'Freedom', 'Blueprint', 'Brand']
    let result = text

    keywords.forEach(keyword => {
      if (result.includes(keyword)) {
        result = result.replace(
          new RegExp(`(${keyword})`, 'g'),
          '<GOLD>$1</GOLD>'
        )
      }
    })

    const parts = result.split(/(<GOLD>.*?<\/GOLD>)/g)
    return parts.map((part, i) => {
      if (part.startsWith('<GOLD>')) {
        const content = part.replace(/<\/?GOLD>/g, '')
        return <span key={i} className="text-gold">{content}</span>
      }
      return part
    })
  }

  return (
    <section className="relative min-h-[600px] flex items-center pt-20 pb-16 overflow-hidden bg-dark">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-gold/3 rounded-full blur-[80px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6"
            >
              <span className="text-gold text-sm font-medium">{badge}</span>
            </motion.div>
          )}

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            {highlightKeywords(headline)}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto"
          >
            {subheadline}
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-gold hover:bg-gold-dark text-dark font-semibold rounded-xl transition-colors">
              {ctaText || 'Get Started'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Stats */}
          {stats && stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-8 md:gap-12"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gold">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
