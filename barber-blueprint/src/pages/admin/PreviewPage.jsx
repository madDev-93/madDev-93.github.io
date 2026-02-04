import { useState } from 'react'
import { motion } from 'framer-motion'
import { useModules } from '../../hooks/useModules'
import { useBonuses } from '../../hooks/useBonuses'
import {
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Layout,
  LayoutDashboard,
  RefreshCw,
  Lock,
  Play,
  Gift,
  User,
  LogOut,
  Scissors,
  Check
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'

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
  const [simulatePurchased, setSimulatePurchased] = useState(true)

  const { modules = [], loading: modulesLoading } = useModules(true)
  const { bonuses = [], loading: bonusesLoading } = useBonuses(true)

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
            {activeTab === 'landing' && (
              <button
                onClick={refreshIframe}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}
            {activeTab === 'dashboard' && (
              <button
                onClick={() => setSimulatePurchased(!simulatePurchased)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  simulatePurchased
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}
              >
                {simulatePurchased ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {simulatePurchased ? 'Purchased User' : 'Non-Purchased User'}
              </button>
            )}
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
            maxWidth: DEVICE_SIZES[device].width
          }}
        >
          {/* Preview Mode Banner */}
          <div className="bg-gold text-dark px-4 py-2 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-dark rounded-full animate-pulse" />
            <span className="text-sm font-semibold uppercase tracking-wide">Preview Mode</span>
            <span className="text-sm">— {currentTab.label} ({DEVICE_SIZES[device].label})</span>
          </div>

          {/* Landing Page - Live Iframe */}
          {activeTab === 'landing' && (
            <iframe
              key={iframeKey}
              src={baseUrl + '/'}
              className="w-full border-0"
              style={{ height: DEVICE_SIZES[device].height }}
              title="Preview - Landing Page"
            />
          )}

          {/* Dashboard - Simulated Preview */}
          {activeTab === 'dashboard' && (
            <div
              className="bg-dark overflow-y-auto"
              style={{ height: DEVICE_SIZES[device].height }}
            >
              {/* Dashboard Header */}
              <header className="border-b border-white/5 px-6 py-4 sticky top-0 bg-dark z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-gold" />
                    <span className="font-semibold text-sm tracking-wide uppercase">Barber Blueprint</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <User className="w-5 h-5 text-gray-400" />
                    <LogOut className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </header>

              <div className="p-6">
                {/* Welcome */}
                <div className="mb-8">
                  <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
                  <p className="text-gray-400">
                    {simulatePurchased
                      ? 'Continue where you left off.'
                      : 'Purchase the Blueprint to unlock all content.'}
                  </p>
                </div>

                {/* Not Purchased Banner */}
                {!simulatePurchased && (
                  <div className="bg-gold/10 border border-gold/20 rounded-xl p-4 mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gold mb-1">Unlock Full Access</h3>
                        <p className="text-gray-400 text-sm">Get instant access to all modules and bonuses.</p>
                      </div>
                      <button className="bg-gold text-dark font-semibold px-4 py-2 rounded-lg text-sm whitespace-nowrap">
                        Get Access — $47
                      </button>
                    </div>
                  </div>
                )}

                {/* Modules */}
                <div className="mb-8">
                  <h2 className="text-lg font-bold mb-4">Modules</h2>
                  {modulesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {modules.filter(m => m.status === 'published').map((module, index) => {
                        const Icon = LucideIcons[module.icon] || LucideIcons.BookOpen
                        const mockProgress = simulatePurchased ? Math.min(100, index * 20) : 0
                        return (
                          <div
                            key={module.id}
                            className={`bg-dark-tertiary border border-white/5 rounded-xl p-4 ${
                              !simulatePurchased ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                                  <span className="text-gold font-bold text-sm">{module.number}</span>
                                </div>
                                <div>
                                  <h3 className="font-semibold">{module.title}</h3>
                                  <p className="text-sm text-gray-400">{module.shortDescription}</p>
                                </div>
                              </div>
                              {simulatePurchased ? (
                                <Play className="w-5 h-5 text-gold flex-shrink-0" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                              <span>{module.lessonCount || 4} lessons</span>
                              <span>•</span>
                              <span>{module.duration || '15 min'}</span>
                            </div>
                            {simulatePurchased && (
                              <div>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                  <span>{mockProgress}% complete</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gold rounded-full transition-all"
                                    style={{ width: `${mockProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Bonuses */}
                <div>
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-gold" />
                    Bonuses
                  </h2>
                  {bonusesLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {bonuses.filter(b => b.status === 'published').map(bonus => {
                        const Icon = LucideIcons[bonus.icon] || LucideIcons.Gift
                        return (
                          <div
                            key={bonus.id}
                            className={`bg-dark-tertiary border border-white/5 rounded-xl p-4 ${
                              !simulatePurchased ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                                  <Icon className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded">{bonus.type}</span>
                                  </div>
                                  <h3 className="font-medium">{bonus.title}</h3>
                                </div>
                              </div>
                              {!simulatePurchased && <Lock className="w-4 h-4 text-gray-500" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Helper text */}
        <p className="text-center text-gray-500 text-sm mt-4">
          {activeTab === 'landing'
            ? 'This is a live preview of the actual landing page.'
            : 'This is a simulated preview of the user dashboard (requires login on live site).'}
        </p>
      </motion.div>
    </div>
  )
}
