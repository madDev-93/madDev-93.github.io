import { NavLink } from 'react-router-dom'
import {
  Scissors,
  LayoutDashboard,
  FileText,
  Users,
  HelpCircle,
  Gift,
  BookOpen,
  Image,
  Eye,
  X,
  Home,
  DollarSign,
  MessageSquareQuote
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, end: true },
  {
    name: 'Landing Page',
    items: [
      { name: 'Hero Section', href: '/admin/landing/hero', icon: Home },
      { name: 'About Section', href: '/admin/landing/about', icon: FileText },
      { name: 'Pricing', href: '/admin/landing/pricing', icon: DollarSign },
    ]
  },
  {
    name: 'Content',
    items: [
      { name: 'Testimonials', href: '/admin/testimonials', icon: MessageSquareQuote },
      { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
      { name: 'Bonuses', href: '/admin/bonuses', icon: Gift },
    ]
  },
  {
    name: 'Course',
    items: [
      { name: 'Modules', href: '/admin/modules', icon: BookOpen },
    ]
  },
  { name: 'Media Library', href: '/admin/media', icon: Image },
  { name: 'Preview Site', href: '/admin/preview', icon: Eye },
]

export default function AdminSidebar({ isOpen, onClose }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-secondary border-r border-white/5 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Admin navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-gold" aria-hidden="true" />
          <span className="font-semibold text-sm tracking-wide uppercase">Admin Panel</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
        {navigation.map((item) => (
          item.items ? (
            <div key={item.name} className="mb-4">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {item.name}
              </p>
              <div className="space-y-1">
                {item.items.map((subItem) => (
                  <NavLink
                    key={subItem.href}
                    to={subItem.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive
                          ? 'bg-gold/10 text-gold'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <subItem.icon className="w-4 h-4" aria-hidden="true" />
                    {subItem.name}
                  </NavLink>
                ))}
              </div>
            </div>
          ) : (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gold/10 text-gold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon className="w-4 h-4" aria-hidden="true" />
              {item.name}
            </NavLink>
          )
        ))}
      </nav>
    </aside>
  )
}
