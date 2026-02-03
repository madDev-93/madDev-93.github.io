import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { collection, getDocs, doc, getDoc, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAdmin } from '../../firebase/AdminContext'
import {
  FileText,
  MessageSquareQuote,
  HelpCircle,
  Gift,
  BookOpen,
  Image,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react'

const quickLinks = [
  { name: 'Edit Hero', href: '/admin/landing/hero', icon: FileText, color: 'bg-blue-500/10 text-blue-400' },
  { name: 'Testimonials', href: '/admin/testimonials', icon: MessageSquareQuote, color: 'bg-green-500/10 text-green-400' },
  { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle, color: 'bg-purple-500/10 text-purple-400' },
  { name: 'Bonuses', href: '/admin/bonuses', icon: Gift, color: 'bg-yellow-500/10 text-yellow-400' },
  { name: 'Modules', href: '/admin/modules', icon: BookOpen, color: 'bg-red-500/10 text-red-400' },
  { name: 'Media', href: '/admin/media', icon: Image, color: 'bg-pink-500/10 text-pink-400' },
]

export default function AdminDashboard() {
  const { adminUser, isAdmin } = useAdmin()
  const [stats, setStats] = useState({
    testimonials: { total: 0, published: 0 },
    faqs: { total: 0, published: 0 },
    bonuses: { total: 0, published: 0 },
    modules: { total: 0, published: 0 },
  })
  const [landingStatus, setLandingStatus] = useState({
    status: 'draft',
    hasHero: false,
    hasAbout: false,
    hasPricing: false
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Mounted ref to prevent state updates after unmount
  const mountedRef = useRef(true)
  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const loadDashboardData = async () => {
      let hasErrors = false

      try {
        // Load stats for each collection with individual error handling
        const collections = ['testimonials', 'faqs', 'bonuses', 'modules']
        const newStats = {}

        for (const collName of collections) {
          try {
            const allDocs = await getDocs(collection(db, collName))
            if (!mountedRef.current) return
            const publishedDocs = await getDocs(
              query(collection(db, collName), where('status', '==', 'published'))
            )
            if (!mountedRef.current) return
            newStats[collName] = {
              total: allDocs.size,
              published: publishedDocs.size
            }
          } catch (err) {
            console.error(`[Dashboard] Error loading ${collName}:`, err)
            newStats[collName] = { total: 0, published: 0 }
            hasErrors = true
          }
        }

        if (mountedRef.current) {
          setStats(newStats)
        }

        // Load landing page content status
        try {
          const landingDoc = await getDoc(doc(db, 'site_content', 'landing'))
          if (!mountedRef.current) return
          if (landingDoc.exists()) {
            const data = landingDoc.data()
            setLandingStatus({
              status: data.status || 'draft',
              hasHero: !!data.hero,
              hasAbout: !!data.about,
              hasPricing: !!data.pricing
            })
          }
        } catch (err) {
          console.error('Error loading landing status:', err)
          hasErrors = true
        }

        // Load recent activity from audit log
        try {
          const activityQuery = query(
            collection(db, 'admin_audit_log'),
            orderBy('timestamp', 'desc'),
            limit(5)
          )
          const activityDocs = await getDocs(activityQuery)
          if (!mountedRef.current) return
          const activities = activityDocs.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
          }))
          setRecentActivity(activities)
        } catch (err) {
          console.error('Error loading recent activity:', err)
          // Activity errors are less critical, don't set hasErrors
        }

        if (mountedRef.current && hasErrors) {
          setError('Some data could not be loaded. Displayed values may be incomplete.')
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        if (mountedRef.current) {
          setError('Failed to load dashboard data. Please refresh the page.')
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    loadDashboardData()
  }, [])

  const formatTimeAgo = (date) => {
    if (!date) return 'Just now'
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'text-green-400'
      case 'update': return 'text-blue-400'
      case 'delete': return 'text-red-400'
      case 'publish': return 'text-gold'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
        <p className="text-gray-400">
          Manage your Barber Blueprint content from here.
        </p>
      </motion.div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Landing Page Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`p-4 rounded-xl border ${
          landingStatus.status === 'published'
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-yellow-500/10 border-yellow-500/20'
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {landingStatus.status === 'published' ? (
              <Eye className="w-5 h-5 text-green-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-yellow-400" />
            )}
            <div>
              <p className={`font-semibold ${landingStatus.status === 'published' ? 'text-green-400' : 'text-yellow-400'}`}>
                Landing Page: {landingStatus.status === 'published' ? 'Published' : 'Draft'}
              </p>
              <p className="text-xs text-gray-400">
                {landingStatus.status === 'published'
                  ? 'Your changes are live on the public site'
                  : 'Changes are saved but NOT visible to the public'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Site
            </a>
            <Link
              to="/admin/landing/hero"
              className="text-sm text-gold hover:text-gold-dark px-3 py-1.5 bg-gold/10 rounded-lg transition-colors"
            >
              Edit Content
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {Object.entries(stats).map(([key, value]) => (
          <div
            key={key}
            className="bg-dark-tertiary border border-white/5 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400 capitalize">{key}</span>
              <TrendingUp className="w-4 h-4 text-gold" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold">
              {loading ? '-' : value.published}
              <span className="text-sm text-gray-500 font-normal ml-1">
                / {loading ? '-' : value.total}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">published / total</p>
          </div>
        ))}
      </motion.div>

      {/* Quick links and recent activity */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-gold" aria-hidden="true" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="group bg-dark-tertiary border border-white/5 rounded-xl p-4 hover:border-gold/30 transition-all"
              >
                <div className={`w-10 h-10 rounded-lg ${link.color} flex items-center justify-center mb-3`}>
                  <link.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium group-hover:text-gold transition-colors">
                  {link.name}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gold" aria-hidden="true" />
            Recent Activity
          </h2>
          <div className="bg-dark-tertiary border border-white/5 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No recent activity</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className={`font-medium capitalize ${getActionColor(activity.action)}`}>
                          {activity.action}
                        </span>
                        {' '}
                        <span className="text-gray-400">
                          {activity.collection}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {activity.adminEmail}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </div>

      {/* Help section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gold/5 border border-gold/20 rounded-xl p-6"
      >
        <h3 className="font-semibold text-gold mb-2">Getting Started</h3>
        <p className="text-sm text-gray-400 mb-4">
          Use the sidebar navigation to manage different sections of your site.
          Changes to published content will appear on the live site immediately.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/landing/hero"
            className="text-sm bg-gold/10 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-colors"
          >
            Edit landing page
          </Link>
          <Link
            to="/admin/modules"
            className="text-sm bg-gold/10 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-colors"
          >
            Manage course
          </Link>
          <Link
            to="/admin/preview"
            className="text-sm bg-gold/10 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/20 transition-colors"
          >
            Preview site
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
