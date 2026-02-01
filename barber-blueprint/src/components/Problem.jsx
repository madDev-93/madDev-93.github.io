import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { X, Check, Clock, DollarSign, TrendingUp, Camera } from 'lucide-react'

export default function Problem() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const problems = [
    {
      icon: Clock,
      title: 'Trading Time for Money',
      description: 'Your income is capped by the hours you can physically work. Miss a day? You miss the money.',
    },
    {
      icon: DollarSign,
      title: 'The Income Ceiling',
      description: 'No matter how skilled you get, there\'s only so many heads you can cut in a day.',
    },
    {
      icon: Camera,
      title: 'Don\'t Know What to Film',
      description: 'You see other barbers blowing up online but have no idea where to start or what content works.',
    },
  ]

  const solutions = [
    {
      icon: TrendingUp,
      title: 'Multiple Income Streams',
      description: 'Turn your daily work into content that generates income while you sleep.',
    },
    {
      icon: Camera,
      title: 'Simple Filming System',
      description: 'No fancy equipment needed. Just your phone and a proven system that documents your normal workday.',
    },
    {
      icon: Check,
      title: 'Clear Posting Strategy',
      description: 'Know exactly what to post, when to post, and how to grow on IG and TikTok.',
    },
  ]

  return (
    <section ref={ref} className="py-24 bg-dark-secondary relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            The Problem & The Solution
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Most barbers are stuck in the same cycle. Here's how to break out.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Problems */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-dark-tertiary border border-white/5 rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                <X className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold">The Struggle</h3>
            </div>
            <div className="space-y-6">
              {problems.map((problem, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                    <problem.icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{problem.title}</h4>
                    <p className="text-sm text-gray-500">{problem.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Solutions */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-dark-tertiary border border-gold/20 rounded-2xl p-6 sm:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-xl font-semibold">The Blueprint</h3>
            </div>
            <div className="space-y-6">
              {solutions.map((solution, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center">
                    <solution.icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">{solution.title}</h4>
                    <p className="text-sm text-gray-500">{solution.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
