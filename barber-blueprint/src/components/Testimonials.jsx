import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'

const testimonials = [
  {
    name: 'Marcus J.',
    location: 'Atlanta, GA',
    rating: 5,
    text: "Bro I was so lost on what to even post. Like I'd film a cut and just stare at my phone not knowing what to do with it. The posting system alone made this worth it. Finally feel like I know what I'm doing.",
    highlight: 'Finally has a system',
  },
  {
    name: 'D. Williams',
    location: 'Houston, TX',
    rating: 5,
    text: "Not gonna lie I was skeptical cause there's so much bs out there. But this is actually from someone who cuts hair. You can tell. The angles section helped me see what I was doing wrong with my videos.",
    highlight: 'Improved video quality',
  },
  {
    name: 'Chris M.',
    location: 'Miami, FL',
    rating: 5,
    text: "I've been cutting for 8 years and always thought content wasn't for me. Tried this cause a homie recommended it. Simple stuff but it works. Getting way more engagement than before.",
    highlight: 'More engagement',
  },
  {
    name: 'Anthony D.',
    location: 'Chicago, IL',
    rating: 4,
    text: "Good info, wish there was more on TikTok specifically but the Instagram stuff is solid. The mindset part at the beginning was actually what I needed to hear. Started posting consistently for the first time.",
    highlight: 'Posting consistently now',
  },
]

// Accessible star rating component
function StarRating({ rating, max = 5 }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`${rating} out of ${max} stars`}>
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < rating ? 'fill-gold text-gold' : 'fill-gray-700 text-gray-700'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// Testimonial card component to reduce duplication
function TestimonialCard({ testimonial }) {
  return (
    <>
      <StarRating rating={testimonial.rating} />
      <blockquote className="text-gray-300 mb-6 leading-relaxed mt-4">
        "{testimonial.text}"
      </blockquote>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-sm font-medium" aria-hidden="true">
            {testimonial.name.split(' ')[0]?.[0]}{testimonial.name.split(' ')[1]?.[0] || ''}
          </div>
          <div>
            <p className="font-medium text-white">{testimonial.name}</p>
            <p className="text-sm text-gray-400">{testimonial.location}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
          {testimonial.highlight}
        </span>
      </div>
    </>
  )
}

export default function Testimonials() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [currentIndex, setCurrentIndex] = useState(0)

  const next = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  return (
    <section ref={ref} className="py-24 relative overflow-hidden" aria-labelledby="testimonials-heading">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">
            From The Community
          </span>
          <h2 id="testimonials-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            What Barbers Are Saying
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Real feedback from barbers who got the Blueprint.
          </p>
        </motion.div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.article
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-dark-tertiary border border-white/5 rounded-2xl p-6 hover:border-gold/20 transition-all"
              aria-label={`Review by ${testimonial.name}`}
            >
              <TestimonialCard testimonial={testimonial} />
            </motion.article>
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden" role="region" aria-label="Testimonials carousel">
          <motion.article
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="bg-dark-tertiary border border-white/5 rounded-2xl p-6"
            aria-label={`Review by ${testimonials[currentIndex].name}`}
            aria-live="polite"
          >
            <TestimonialCard testimonial={testimonials[currentIndex]} />
          </motion.article>

          {/* Carousel Controls */}
          <div className="flex items-center justify-center gap-4 mt-6" role="group" aria-label="Carousel navigation">
            <button
              onClick={prev}
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex gap-2" role="tablist" aria-label="Testimonial indicators">
              {testimonials.map((testimonial, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark ${
                    index === currentIndex ? 'bg-gold' : 'bg-white/20'
                  }`}
                  role="tab"
                  aria-selected={index === currentIndex}
                  aria-label={`Go to testimonial by ${testimonial.name}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Subtle note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Results vary. These reflect individual experiences.
        </p>
      </div>
    </section>
  )
}
