import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Scissors, Camera, Users, Quote, Instagram } from 'lucide-react'
import { usePublicContent } from '../hooks/useSiteContent'

const fallbackAbout = {
  headline: 'Built by a Barber,\nFor Barbers',
  paragraphs: [
    "This isn't theory from someone who read about barbering online. This is a system built from years behind the chair, figuring out what actually works to grow a following and create income beyond just cutting hair.",
    "Every module comes from real execution—what I've done to build my brand while still being a full-time barber and father. No fluff, no guru nonsense, just the exact playbook I use every single day.",
  ],
  quote: {
    text: 'Document the work. The results will follow.',
    attribution: 'Real execution, not theory',
  },
  instagram: 'ivan.m.rod',
}

const defaultCredentials = [
  { icon: Scissors, text: 'Working Barber' },
  { icon: Camera, text: 'Content Creator' },
  { icon: Users, text: 'Father' },
]

export default function About() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const { content, loading } = usePublicContent('landing')
  const about = content?.about || fallbackAbout
  const credentials = defaultCredentials

  // Parse headline for styling
  const renderHeadline = () => {
    const text = about.headline || fallbackAbout.headline
    const lines = text.split('\n')
    if (lines.length >= 2) {
      return (
        <>
          {lines[0]}
          <br />
          <span className="text-gold">{lines[1]}</span>
        </>
      )
    }
    return text
  }

  const paragraphs = about.paragraphs?.length > 0 ? about.paragraphs : fallbackAbout.paragraphs
  const quote = about.quote || fallbackAbout.quote
  const instagram = about.instagram || fallbackAbout.instagram

  return (
    <section id="about" ref={ref} className="py-24 relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/5] bg-dark-tertiary rounded-2xl border border-white/5 overflow-hidden" role="img" aria-label="Photo placeholder for the course creator">
              <div className="w-full h-full bg-dark-secondary flex items-center justify-center">
                <div className="text-center" aria-hidden="true">
                  <Scissors className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <span className="text-white/20 text-sm">Creator Photo</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">
              About The Creator
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              {renderHeadline()}
            </h2>

            <div className="flex flex-wrap gap-3 mb-6">
              {credentials.map((cred) => (
                <div
                  key={cred.text}
                  className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-full px-4 py-2"
                >
                  <cred.icon className="w-4 h-4 text-gold" />
                  <span className="text-sm text-gray-300">{cred.text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 text-gray-400 mb-8">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Quote */}
            <div className="bg-dark-tertiary border-l-2 border-gold rounded-r-xl p-6 mb-8">
              <Quote className="w-6 h-6 text-gold/50 mb-3" />
              <p className="text-lg text-white mb-2">
                "{quote.text}"
              </p>
              <span className="text-sm text-gray-400">— {quote.attribution}</span>
            </div>

            {/* Instagram Follow */}
            <a
              href={`https://www.instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 bg-dark-tertiary border border-white/5 hover:border-gold/30 rounded-xl p-4 transition-all"
            >
              <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                <Instagram className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white group-hover:text-gold transition-colors">@{instagram}</p>
                <p className="text-sm text-gray-400">Follow the journey on Instagram</p>
              </div>
              <span className="text-gold text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Follow →
              </span>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
