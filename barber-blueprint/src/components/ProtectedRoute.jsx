import { Navigate } from 'react-router-dom'
import { useAuth } from '../firebase/AuthContext'

export default function ProtectedRoute({ children, requirePurchase = false }) {
  const { user, loading, hasPurchased } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center" role="status" aria-label="Loading">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requirePurchase && !hasPurchased) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
