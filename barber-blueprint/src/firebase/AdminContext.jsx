import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'

const AdminContext = createContext()

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}

export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check admin status
  const checkAdminStatus = async (uid) => {
    try {
      console.log('[AdminContext] Checking admin status for UID:', uid)
      const adminDoc = await getDoc(doc(db, 'blueprint_admins', uid))
      const exists = adminDoc.exists()
      console.log('[AdminContext] Admin doc exists:', exists)
      return exists
    } catch (err) {
      console.error('[AdminContext] Error checking admin status:', err)
      return false
    }
  }

  // Log admin action (audit trail)
  const logAction = async (action, collectionName, documentId, changes = {}) => {
    if (!adminUser) return

    try {
      await addDoc(collection(db, 'admin_audit_log'), {
        action,
        collection: collectionName,
        documentId,
        adminUid: adminUser.uid,
        adminEmail: adminUser.email,
        changes,
        timestamp: serverTimestamp()
      })
    } catch (err) {
      console.error('Audit log error:', err)
      // Non-blocking - continue even if audit fails
    }
  }

  useEffect(() => {
    let unsubscribe

    unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const adminStatus = await checkAdminStatus(user.uid)
          setAdminUser(adminStatus ? user : null)
          setIsAdmin(adminStatus)
        } else {
          setAdminUser(null)
          setIsAdmin(false)
        }
      } catch (err) {
        console.error('Admin status check error:', err)
        setError(err.message)
        setAdminUser(null)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  // Error display (matching AuthContext pattern)
  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-dark-tertiary border border-red-500/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">Unable to verify admin status.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gold hover:bg-gold-dark text-dark font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const value = {
    adminUser,
    isAdmin,
    loading,
    logAction
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}
