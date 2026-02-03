import { Link, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAdmin } from '../../firebase/AdminContext'
import { Menu, LogOut, ExternalLink, Eye } from 'lucide-react'

export default function AdminHeader({ onMenuClick }) {
  const { adminUser } = useAdmin()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/admin/login')
    } catch {
      // Silently fail - user can retry
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-dark/80 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold hidden sm:block">Barber Blueprint Admin</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Preview button */}
          <Link
            to="/admin/preview"
            className="flex items-center gap-2 text-sm bg-gold/10 text-gold hover:bg-gold/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
          </Link>

          {/* View live site link */}
          <Link
            to="/"
            target="_blank"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <span className="hidden sm:inline">View Site</span>
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* User info */}
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <span className="text-sm text-gray-400 hidden sm:block">
              {adminUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
