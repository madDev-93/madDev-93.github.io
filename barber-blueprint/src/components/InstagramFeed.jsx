import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Instagram } from 'lucide-react'

/**
 * Instagram Feed component that renders embedded Instagram posts
 * Uses Instagram's official embed.js script
 *
 * @param {Object} props
 * @param {string[]} props.postUrls - Array of Instagram post URLs to embed
 * @param {string} props.profileUrl - Instagram profile URL for the follow button
 * @param {string} props.username - Instagram username for display
 */
export default function InstagramFeed({
  postUrls = [],
  profileUrl = 'https://instagram.com',
  username = 'barberblueprint'
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const embedsProcessed = useRef(false)

  // Process Instagram embeds when component mounts or posts change
  useEffect(() => {
    if (!isInView || embedsProcessed.current || postUrls.length === 0) return

    // Check if Instagram embed script is loaded
    if (window.instgrm) {
      window.instgrm.Embeds.process()
      embedsProcessed.current = true
    } else {
      // Wait for script to load
      const checkScript = setInterval(() => {
        if (window.instgrm) {
          window.instgrm.Embeds.process()
          embedsProcessed.current = true
          clearInterval(checkScript)
        }
      }, 100)

      // Cleanup after 5 seconds if script never loads
      setTimeout(() => clearInterval(checkScript), 5000)

      return () => clearInterval(checkScript)
    }
  }, [isInView, postUrls])

  // If no posts provided, show simple follow CTA
  if (postUrls.length === 0) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="mt-8"
      >
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 bg-dark-tertiary border border-white/5 hover:border-gold/30 rounded-xl p-4 transition-all"
        >
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-gold/10 transition-colors">
            <Instagram className="w-6 h-6 text-gold" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white group-hover:text-gold transition-colors">@{username}</p>
            <p className="text-sm text-gray-400">Follow the journey on Instagram</p>
          </div>
          <span className="text-gold text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Follow →
          </span>
        </a>
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Instagram className="w-6 h-6 text-gold" aria-hidden="true" />
          <h3 className="text-xl font-semibold">Follow the Journey</h3>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gold hover:text-gold-dark transition-colors"
        >
          @{username}
        </a>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {postUrls.map((url, index) => (
          <div key={index} className="instagram-embed-container">
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={url}
              data-instgrm-version="14"
              style={{
                background: '#1A1A1A',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                margin: '0',
                maxWidth: '100%',
                minWidth: '280px',
                padding: '0'
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-dark"
        >
          <Instagram className="w-5 h-5" aria-hidden="true" />
          Follow @{username}
        </a>
      </div>
    </motion.div>
  )
}
