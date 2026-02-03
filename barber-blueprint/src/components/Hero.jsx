import { motion } from 'framer-motion'
import { ArrowRight, Play } from 'lucide-react'
import MagneticButton from './MagneticButton'
import { usePublicContent } from '../hooks/useSiteContent'

// Fallback content if Firestore is unavailable
const fallbackHero = {
  badge: 'For Barbers Ready to Level Up',
  headline: 'Turn Haircuts Into Income, Influence, and Freedom',
  subheadline: 'A step-by-step blueprint for barbers who want to grow income, build a personal brand, and stop relying only on chair time.',
  ctaText: 'Get The Barber Blueprint',
  stats: [
    { value: '6', label: 'Modules' },
    { value: '3', label: 'Bonuses' },
    { value: '∞', label: 'Updates' },
  ]
}

export default function Hero() {
  const { content, loading } = usePublicContent('landing')
  const hero = content?.hero || fallbackHero

  // Parse headline - highlight words wrapped in * or specific keywords
  const renderHeadline = () => {
    const text = hero.headline || fallbackHero.headline

    // If headline contains newlines, render with line breaks
    if (text.includes('\n')) {
      return text.split('\n').map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {highlightKeywords(line)}
        </span>
      ))
    }

    // Otherwise highlight known keywords
    return highlightKeywords(text)
  }

  // Highlight specific keywords in gold
  const highlightKeywords = (text) => {
    const keywords = ['Income', 'Influence', 'Freedom', 'Blueprint', 'Brand']
    let result = text

    // Find keywords and wrap them
    keywords.forEach(keyword => {
      if (result.includes(keyword)) {
        result = result.replace(
          new RegExp(`(${keyword})`, 'g'),
          '<GOLD>$1</GOLD>'
        )
      }
    })

    // Split by markers and render
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-dark" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-2 mb-8">
            <span className="w-1.5 h-1.5 bg-gold rounded-full" />
            <span className="text-sm text-gray-400">{hero.badge || fallbackHero.badge}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 tracking-tight">
            {renderHeadline()}
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {hero.subheadline || fallbackHero.subheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <MagneticButton
              href="#get-access"
              className="group w-full sm:w-auto bg-gold hover:bg-gold-dark text-dark font-semibold text-lg px-8 py-4 rounded transition-colors flex items-center justify-center gap-2"
            >
              {hero.ctaText || fallbackHero.ctaText}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
            <a
              href="#modules"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors px-6 py-4"
            >
              <Play className="w-5 h-5" />
              See What's Inside
            </a>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto"
        >
          {(hero.stats || fallbackHero.stats).map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border border-white/20 rounded-full flex justify-center">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-1 bg-white/40 rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  )
}
