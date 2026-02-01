import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Brain, Video, Smartphone, TrendingUp, Calendar, Banknote } from 'lucide-react'
import TiltCard from './TiltCard'

const modules = [
  {
    number: '01',
    icon: Brain,
    title: 'The Barber-to-Brand Mindset',
    description: 'Shift from "just a barber" to a content creator with a business. The mental frameworks that separate hobbyists from professionals.',
  },
  {
    number: '02',
    icon: Video,
    title: 'Filming Haircuts',
    description: 'Exact angles for fades, tapers, and beards. Learn which shots get views and how to capture them without disrupting your workflow.',
  },
  {
    number: '03',
    icon: Smartphone,
    title: 'Simple Equipment Setup',
    description: 'Minimal phone setup that looks professional. No expensive gear required—just strategic positioning and natural lighting.',
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Content That Grows',
    description: 'Before/afters that convert, lifestyle content that builds connection, and the content pillars that attract followers who become clients.',
  },
  {
    number: '05',
    icon: Calendar,
    title: 'Posting System',
    description: 'Complete Instagram and TikTok strategy. When to post, how often, hashtags, captions, and the algorithm hacks that actually work.',
  },
  {
    number: '06',
    icon: Banknote,
    title: 'Monetization',
    description: 'Turn followers into income through brand deals, education products, and partnerships. The roadmap from content to cash.',
  },
]

export default function Modules() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="modules" ref={ref} className="py-24 relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">
            What's Inside
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            6 Modules to Transform Your Game
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A complete system built by a working barber. No fluff, no theory—just what actually works.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={module.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <TiltCard className="group relative bg-dark-tertiary border border-white/5 rounded-2xl p-6 hover:border-gold/20 transition-all duration-300 h-full">
                {/* Module Number */}
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gold text-dark rounded-lg flex items-center justify-center font-semibold text-sm">
                  {module.number}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gold/10 transition-colors">
                  <module.icon className="w-6 h-6 text-gray-400 group-hover:text-gold transition-colors" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2">
                  {module.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {module.description}
                </p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
