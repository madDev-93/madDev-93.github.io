import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Layout,
  LayoutDashboard,
  RefreshCw
} from 'lucide-react'

const DEVICE_SIZES = {
  desktop: { width: '100%', height: '800px', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', height: '1024px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', height: '667px', label: 'Mobile', icon: Smartphone }
}

const PREVIEW_TABS = [
  { id: 'landing', label: 'Landing Page', icon: Layout, path: '/' },
  { id: 'dashboard', label: 'User Dashboard', icon: LayoutDashboard, path: '/dashboard' }
]

export default function PreviewPage() {
  const [activeTab, setActiveTab] = useState('landing')
  const [device, setDevice] = useState('desktop')
  const [iframeKey, setIframeKey] = useState(0)

  const currentTab = PREVIEW_TABS.find(t => t.id === activeTab)
  const baseUrl = window.location.origin + '/barber-blueprint'

  const refreshIframe = () => {
    setIframeKey(prev => prev + 1)
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
              Live preview of how the site appears to users
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshIframe}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <a
              href={baseUrl + currentTab.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-dark font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          {PREVIEW_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
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

        {/* Preview Frame */}
        <div
          className="bg-dark-secondary border border-white/10 rounded-xl overflow-hidden mx-auto transition-all duration-300"
          style={{
            maxWidth: DEVICE_SIZES[device].width,
            height: DEVICE_SIZES[device].height
          }}
        >
          <iframe
            key={iframeKey}
            src={baseUrl + currentTab.path}
            className="w-full h-full border-0"
            title={`Preview - ${currentTab.label}`}
          />
        </div>

        {/* Helper text */}
        <p className="text-center text-gray-500 text-sm mt-4">
          This is a live preview of the actual site. Changes you make in the admin panel will appear here after saving.
        </p>
      </motion.div>
    </div>
  )
}
