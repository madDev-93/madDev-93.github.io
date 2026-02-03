import { Navigate } from 'react-router-dom'
import { useAdmin } from '../../firebase/AdminContext'

export default function AdminProtectedRoute({ children }) {
  const { adminUser, isAdmin, loading } = useAdmin()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center" role="status" aria-label="Verifying admin access">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-400 text-sm">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!adminUser || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
