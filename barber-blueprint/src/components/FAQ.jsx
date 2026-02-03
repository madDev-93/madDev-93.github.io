import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { usePublicFAQs } from '../hooks/useFAQs'

const fallbackFaqs = [
  {
    id: '1',
    question: "I'm not good on camera. Will this still work for me?",
    answer: "Absolutely. The Blueprint focuses on filming your work, not you talking to camera. Most viral barber content is just clean footage of haircuts with good angles. You don't need to be an entertainer—you need to document your skill.",
  },
  {
    id: '2',
    question: "What equipment do I need?",
    answer: "Just your phone. Module 3 covers the exact setup—it's literally a $20 phone holder and natural lighting from your shop window. No ring lights, no expensive cameras. The barbers blowing up right now are using the same phone in their pocket.",
  },
  {
    id: '3',
    question: "How long until I see results?",
    answer: "Most barbers start seeing increased engagement within 2-3 weeks of consistent posting. Your first viral moment could come anytime—some hit it in week one, others in month two. The system works, but you have to actually post.",
  },
  {
    id: '4',
    question: "I barely have time to cut hair. How do I find time for content?",
    answer: "That's exactly why this system exists. You're not creating extra content—you're documenting cuts you're already doing. Set up your phone, hit record, cut hair, done. The posting system takes 15 minutes a day max.",
  },
  {
    id: '5',
    question: "Is this just for fades and tapers?",
    answer: "The principles work for any style—fades, tapers, beards, shears work, textured cuts, even braids and locs. Module 2 covers angles for different cut types. If you're cutting hair, this applies to you.",
  },
  {
    id: '6',
    question: "What if I'm already posting but not growing?",
    answer: "Then you need the system. Random posting doesn't work. The Blueprint covers what content actually performs, when to post for your audience, and how to structure videos that hold attention. Strategy beats volume.",
  },
  {
    id: '7',
    question: "Do I get lifetime access?",
    answer: "Yes. One payment, lifetime access, and every future update included. When we add new modules or strategies, you get them automatically at no extra cost.",
  },
]

function FAQItem({ faq, isOpen, onToggle, index }) {
  const questionId = `faq-question-${index}`
  const answerId = `faq-answer-${index}`

  return (
    <div className="border-b border-white/5" role="listitem">
      <button
        id={questionId}
        onClick={onToggle}
        className="w-full py-6 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-inset rounded"
        aria-expanded={isOpen}
        aria-controls={answerId}
      >
        <span className="font-medium text-white pr-8">{faq.question}</span>
        <div className="flex-shrink-0 w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
          {isOpen ? (
            <Minus className="w-4 h-4 text-gold" aria-hidden="true" />
          ) : (
            <Plus className="w-4 h-4 text-gray-400" aria-hidden="true" />
          )}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={answerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            role="region"
            aria-labelledby={questionId}
          >
            <p className="pb-6 text-gray-400 leading-relaxed">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [openIndex, setOpenIndex] = useState(0)

  const { faqs: firestoreFaqs, loading } = usePublicFAQs()
  const faqs = firestoreFaqs.length > 0 ? firestoreFaqs : fallbackFaqs

  return (
    <section id="faq" ref={ref} className="py-24 bg-dark-secondary relative overflow-hidden">
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-gold text-sm font-medium tracking-widest uppercase mb-4 block">
            Questions
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Frequently Asked
          </h2>
          <p className="text-gray-400">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-dark-tertiary border border-white/5 rounded-2xl px-6 sm:px-8"
          role="list"
          aria-label="Frequently asked questions"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.id || `faq-${index}`}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
