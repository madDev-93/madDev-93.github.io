import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSiteContent } from '../../hooks/useSiteContent'
import { useTestimonials } from '../../hooks/useTestimonials'
import { useFAQs } from '../../hooks/useFAQs'
import { useBonuses } from '../../hooks/useBonuses'
import { useModules } from '../../hooks/useModules'
import {
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Monitor,
  Smartphone,
  Tablet,
  Check,
  X,
  Star,
  AlertCircle
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'

const DEVICE_SIZES = {
  desktop: { width: '100%', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobile', icon: Smartphone }
}

export default function PreviewPage() {
  const [device, setDevice] = useState('desktop')
  const [showDrafts, setShowDrafts] = useState(true)

  const { content, loading: contentLoading, error: contentError } = useSiteContent('landing')
  const { testimonials: rawTestimonials, loading: testimonialsLoading, error: testimonialsError } = useTestimonials(showDrafts)
  const { faqs: rawFaqs, loading: faqsLoading, error: faqsError } = useFAQs(showDrafts)
  const { bonuses: rawBonuses, loading: bonusesLoading, error: bonusesError } = useBonuses(showDrafts)
  const { modules: rawModules, loading: modulesLoading, error: modulesError } = useModules(showDrafts)

  // Default to empty arrays to prevent crashes on undefined
  const testimonials = rawTestimonials || []
  const faqs = rawFaqs || []
  const bonuses = rawBonuses || []
  const modules = rawModules || []

  const loading = contentLoading || testimonialsLoading || faqsLoading || bonusesLoading || modulesLoading
  const error = contentError || testimonialsError || faqsError || bonusesError || modulesError

  const publishedCount = {
    testimonials: testimonials.filter(t => t.status === 'published').length,
    faqs: faqs.filter(f => f.status === 'published').length,
    bonuses: bonuses.filter(b => b.status === 'published').length,
    modules: modules.filter(m => m.status === 'published').length
  }

  const totalCount = {
    testimonials: testimonials.length,
    faqs: faqs.length,
    bonuses: bonuses.length,
    modules: modules.length
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Preview Site</h1>
            <p className="text-gray-400 text-sm mt-1">
              Preview how content will appear on the live site
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showDrafts
                  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}
            >
              {showDrafts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDrafts ? 'Including Drafts' : 'Published Only'}
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Live Site
            </a>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Some data could not be loaded: {error}</span>
          </div>
        )}

        {/* Status overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(publishedCount).map(([key, published]) => (
            <div
              key={key}
              className="bg-dark-tertiary border border-white/5 rounded-xl p-4"
            >
              <p className="text-sm text-gray-400 capitalize mb-1">{key}</p>
              <p className="text-xl font-bold">
                <span className="text-green-400">{published}</span>
                <span className="text-gray-500"> / {totalCount[key]}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">published</p>
            </div>
          ))}
        </div>

        {/* Device selector */}
        <div className="flex items-center gap-2 mb-6">
          {Object.entries(DEVICE_SIZES).map(([key, { label, icon: Icon }]) => (
            <button
              key={key}
              onClick={() => setDevice(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                device === key
                  ? 'bg-gold/10 text-gold'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <div
            className="bg-dark-secondary border border-white/5 rounded-xl overflow-hidden mx-auto transition-all duration-300"
            style={{ maxWidth: DEVICE_SIZES[device].width }}
          >
            {/* Hero Preview */}
            <section className="p-8 border-b border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold">Hero Section</h2>
                {content?.status === 'published' ? (
                  <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                    <Check className="w-3 h-3" /> Published
                  </span>
                ) : (
                  <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Draft
                  </span>
                )}
              </div>
              {content?.hero && (
                <div className="space-y-4">
                  {content.hero.badge && (
                    <span className="inline-block bg-gold/10 text-gold text-xs px-3 py-1 rounded-full">
                      {content.hero.badge}
                    </span>
                  )}
                  <h1 className="text-2xl md:text-3xl font-bold">{content.hero.headline}</h1>
                  <p className="text-gray-400">{content.hero.subheadline}</p>
                  <button className="bg-gold text-dark font-semibold px-6 py-3 rounded-lg">
                    {content.hero.ctaText}
                  </button>
                  {content.hero.stats && content.hero.stats.length > 0 && (
                    <div className="flex flex-wrap gap-4 pt-4">
                      {content.hero.stats.map((stat, i) => (
                        <div key={i} className="text-center">
                          <p className="text-xl font-bold text-gold">{stat.value}</p>
                          <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Modules Preview */}
            <section className="p-8 border-b border-white/5">
              <h2 className="text-lg font-semibold mb-4">Modules ({modules.length})</h2>
              <div className="space-y-3">
                {modules.slice(0, 3).map(module => {
                  const Icon = LucideIcons[module.icon] || LucideIcons.BookOpen
                  return (
                    <div
                      key={module.id}
                      className={`flex items-center gap-3 p-3 bg-white/5 rounded-lg ${
                        module.status === 'draft' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                        <span className="text-gold font-bold text-sm">{module.number}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{module.title}</p>
                        <p className="text-xs text-gray-500 truncate">{module.shortDescription}</p>
                      </div>
                      {module.status === 'draft' && (
                        <span className="text-xs text-yellow-400">Draft</span>
                      )}
                    </div>
                  )
                })}
                {modules.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{modules.length - 3} more modules
                  </p>
                )}
              </div>
            </section>

            {/* Testimonials Preview */}
            <section className="p-8 border-b border-white/5">
              <h2 className="text-lg font-semibold mb-4">Testimonials ({testimonials.length})</h2>
              <div className="space-y-3">
                {testimonials.slice(0, 2).map(testimonial => (
                  <div
                    key={testimonial.id}
                    className={`p-4 bg-white/5 rounded-lg ${
                      testimonial.status === 'draft' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < testimonial.rating ? 'text-gold fill-gold' : 'text-gray-600'
                          }`}
                        />
                      ))}
                      {testimonial.status === 'draft' && (
                        <span className="text-xs text-yellow-400 ml-2">Draft</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 mb-2 line-clamp-2">{testimonial.text}</p>
                    <p className="text-xs text-gray-500">
                      — {testimonial.name}{testimonial.location && `, ${testimonial.location}`}
                    </p>
                  </div>
                ))}
                {testimonials.length > 2 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{testimonials.length - 2} more testimonials
                  </p>
                )}
              </div>
            </section>

            {/* FAQs Preview */}
            <section className="p-8 border-b border-white/5">
              <h2 className="text-lg font-semibold mb-4">FAQs ({faqs.length})</h2>
              <div className="space-y-2">
                {faqs.slice(0, 3).map(faq => (
                  <div
                    key={faq.id}
                    className={`p-3 bg-white/5 rounded-lg ${
                      faq.status === 'draft' ? 'opacity-60' : ''
                    }`}
                  >
                    <p className="font-medium text-sm">{faq.question}</p>
                    {faq.status === 'draft' && (
                      <span className="text-xs text-yellow-400">Draft</span>
                    )}
                  </div>
                ))}
                {faqs.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{faqs.length - 3} more FAQs
                  </p>
                )}
              </div>
            </section>

            {/* Bonuses Preview */}
            <section className="p-8">
              <h2 className="text-lg font-semibold mb-4">Bonuses ({bonuses.length})</h2>
              <div className="grid gap-3">
                {bonuses.map(bonus => {
                  const Icon = LucideIcons[bonus.icon] || LucideIcons.Gift
                  return (
                    <div
                      key={bonus.id}
                      className={`flex items-center gap-3 p-3 bg-white/5 rounded-lg ${
                        bonus.status === 'draft' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{bonus.title}</p>
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                            {bonus.type}
                          </span>
                          {bonus.status === 'draft' && (
                            <span className="text-xs text-yellow-400">Draft</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </motion.div>
    </div>
  )
}
