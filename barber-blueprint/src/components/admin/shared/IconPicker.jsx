import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { Search, X } from 'lucide-react'

// Curated list of relevant icons for the barber blueprint
const ICON_LIST = [
  'Brain', 'Video', 'Smartphone', 'TrendingUp', 'Calendar', 'Banknote',
  'Scissors', 'Camera', 'Play', 'BookOpen', 'Lightbulb', 'Target',
  'Users', 'Star', 'Award', 'Zap', 'Clock', 'CheckCircle',
  'Gift', 'FileText', 'Download', 'Upload', 'Heart', 'ThumbsUp',
  'MessageCircle', 'Share2', 'Instagram', 'Youtube', 'Music', 'Mic',
  'Image', 'Film', 'Sparkles', 'Crown', 'Trophy', 'Medal',
  'Gem', 'DollarSign', 'CreditCard', 'Wallet', 'PiggyBank', 'TrendingDown',
  'BarChart', 'PieChart', 'Activity', 'LineChart', 'Gauge', 'Settings',
  'Sliders', 'Palette', 'Brush', 'Pencil', 'PenTool', 'Wand2',
  'Layers', 'Layout', 'Grid', 'List', 'Map', 'Compass',
  'Navigation', 'ArrowRight', 'ArrowUp', 'ChevronRight', 'ChevronUp', 'ExternalLink'
]

export default function IconPicker({
  value,
  onChange,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredIcons = ICON_LIST.filter(name =>
    name.toLowerCase().includes(search.toLowerCase())
  )

  const SelectedIcon = value && LucideIcons[value] ? LucideIcons[value] : null

  const handleSelect = (iconName) => {
    onChange(iconName)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-[42px] flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 text-left transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
        }`}
      >
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
          {SelectedIcon ? (
            <SelectedIcon className="w-5 h-5 text-gold" />
          ) : (
            <span className="text-gray-500 text-xs">?</span>
          )}
        </div>
        <span className="flex-1 text-sm truncate">
          {value || 'Select icon'}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-50 mt-2 w-full bg-dark-tertiary border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-gold/50"
                  autoFocus
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Icon grid */}
            <div className="max-h-64 overflow-y-auto p-3">
              {filteredIcons.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">
                  No icons found
                </p>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {filteredIcons.map((iconName) => {
                    const Icon = LucideIcons[iconName]
                    if (!Icon) return null
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => handleSelect(iconName)}
                        title={iconName}
                        className={`p-2 rounded-lg transition-colors ${
                          value === iconName
                            ? 'bg-gold/20 text-gold'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
