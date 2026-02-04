import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'

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
    <section className="relative min-h-[600px] flex items-center justify-center pt-20 pb-16 overflow-hidden bg-dark">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-gold/[0.02] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-gold/[0.015] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge - matches actual Hero.jsx */}
          {badge && (
            <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-2 mb-8">
              <span className="w-1.5 h-1.5 bg-gold rounded-full" />
              <span className="text-sm text-gray-400">{badge}</span>
            </div>
          )}

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight">
            {highlightKeywords(headline)}
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {subheadline}
          </p>

          {/* CTAs - matches actual Hero.jsx */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button className="group w-full sm:w-auto bg-gold hover:bg-gold-dark text-dark font-semibold text-lg px-8 py-4 rounded transition-colors flex items-center justify-center gap-2">
              {ctaText || 'Get The Barber Blueprint'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors px-6 py-4">
              <Play className="w-5 h-5" />
              See What's Inside
            </button>
          </div>
        </motion.div>

        {/* Stats - matches actual Hero.jsx */}
        {stats && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

    </section>
  )
}
