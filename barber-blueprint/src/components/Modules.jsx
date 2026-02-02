import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import TiltCard from './TiltCard'
import { modules } from '../constants/modules'

export default function Modules() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="modules" ref={ref} className="py-24 relative overflow-hidden" aria-labelledby="modules-heading">
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
          <h2 id="modules-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            6 Modules to Transform Your Game
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A complete system built by a working barber. No fluff, no theory—just what actually works.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Course modules">
          {modules.map((module, index) => (
            <motion.article
              key={module.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              role="listitem"
              aria-label={`Module ${module.number}: ${module.title}`}
            >
              <TiltCard className="group relative bg-dark-tertiary border border-white/5 rounded-2xl p-6 hover:border-gold/20 transition-all duration-300 h-full">
                {/* Module Number */}
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gold text-dark rounded-lg flex items-center justify-center font-semibold text-sm" aria-hidden="true">
                  {module.number}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gold/10 transition-colors" aria-hidden="true">
                  <module.icon className="w-6 h-6 text-gray-400 group-hover:text-gold transition-colors" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold mb-2">
                  {module.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {module.fullDescription}
                </p>
              </TiltCard>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
