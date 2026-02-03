import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import * as LucideIcons from 'lucide-react'
import { Gift, ClipboardList, Calendar, Flame, Zap, Shield, RefreshCw } from 'lucide-react'
import { usePublicBonuses } from '../hooks/useBonuses'

const fallbackBonuses = [
  {
    id: '1',
    icon: 'ClipboardList',
    title: 'Weekly Filming Checklist',
    description: 'Never wonder what to film again. A printable checklist to ensure you capture everything you need each week.',
  },
  {
    id: '2',
    icon: 'Calendar',
    title: 'Daily Posting Framework',
    description: 'The exact posting schedule for maximum reach. Know what to post and when across Instagram and TikTok.',
  },
  {
    id: '3',
    icon: 'Flame',
    title: 'Mindset Rules',
    description: 'The mental game that separates those who make it from those who quit. Daily disciplines for content creators.',
  },
]

const terms = [
  { icon: Zap, text: 'Instant Access' },
  { icon: Shield, text: 'One-Time Payment' },
  { icon: RefreshCw, text: 'Lifetime Updates' },
]

// Get icon component from string name
function getIcon(iconName) {
  return LucideIcons[iconName] || Gift
}

export default function Bonuses() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const { bonuses: firestoreBonuses, loading } = usePublicBonuses()
  const bonuses = firestoreBonuses.length > 0 ? firestoreBonuses : fallbackBonuses

  return (
    <section id="bonuses" ref={ref} className="py-24 bg-dark-secondary relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 border border-gold/20 rounded-full px-4 py-2 mb-6">
            <Gift className="w-4 h-4 text-gold" />
            <span className="text-sm text-gray-400">Included Bonuses</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Plus These <span className="text-gold">Bonuses</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Extra tools to accelerate your growth and keep you consistent.
          </p>
        </motion.div>

        {/* Bonus Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {bonuses.map((bonus, index) => {
            const IconComponent = getIcon(bonus.icon)
            return (
              <motion.div
                key={bonus.id || bonus.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative bg-dark-tertiary border border-white/5 rounded-2xl p-6 hover:border-gold/20 transition-all duration-300"
              >
                <div className="absolute top-4 right-4 text-xs font-medium text-gold">
                  Included
                </div>
                <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center mb-4">
                  <IconComponent className="w-5 h-5 text-gold" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{bonus.title}</h3>
                <p className="text-sm text-gray-400">{bonus.description}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Terms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4 sm:gap-8"
        >
          {terms.map((term) => (
            <div key={term.text} className="flex items-center gap-2 text-gray-400">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                <term.icon className="w-4 h-4 text-gold" />
              </div>
              <span className="text-sm">{term.text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
