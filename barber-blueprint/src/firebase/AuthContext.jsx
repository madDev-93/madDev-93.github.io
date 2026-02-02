import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './config'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

/**
 * Normalize email for consistent storage and lookup
 */
const normalizeEmail = (email) => email?.trim().toLowerCase()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Check if user has purchased
  const checkPurchaseStatus = async (uid, email) => {
    const normalizedEmail = normalizeEmail(email)

    try {
      // Check user document first
      const userDoc = await getDoc(doc(db, 'blueprint_users', uid))

      if (userDoc.exists()) {
        const data = userDoc.data()
        if (data.purchased) {
          return data
        }
        // User exists but hasn't purchased
        return { purchased: false }
      }

      // Check purchase by email (for webhook-created records)
      const emailDoc = await getDoc(doc(db, 'blueprint_purchases', normalizedEmail))

      if (emailDoc.exists()) {
        // Link purchase to user account
        const purchaseData = {
          email: normalizedEmail,
          purchased: true,
          purchaseDate: emailDoc.data().verifiedAt || new Date().toISOString(),
          linkedAt: new Date().toISOString()
        }

        await setDoc(doc(db, 'blueprint_users', uid), purchaseData, { merge: true })
        return { purchased: true, ...purchaseData }
      }

      return { purchased: false }
    } catch {
      // Silently fail - user will see unpurchased state
      return { purchased: false }
    }
  }

  useEffect(() => {
    let unsubscribe

    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user)
        if (user) {
          const profile = await checkPurchaseStatus(user.uid, user.email)
          setUserProfile(profile)
        } else {
          setUserProfile(null)
        }
        setLoading(false)
      })
    } catch (error) {
      setAuthError(error.message)
      setLoading(false)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const signup = async (email, password) => {
    const normalizedEmail = normalizeEmail(email)
    const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password)

    // Create user document
    await setDoc(doc(db, 'blueprint_users', result.user.uid), {
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
      purchased: false
    })

    return result
  }

  const login = (email, password) => {
    const normalizedEmail = normalizeEmail(email)
    return signInWithEmailAndPassword(auth, normalizedEmail, password)
  }

  const logout = () => {
    return signOut(auth)
  }

  const resetPassword = (email) => {
    const normalizedEmail = normalizeEmail(email)
    return sendPasswordResetEmail(auth, normalizedEmail)
  }

  // Show error state if Firebase initialization failed
  if (authError) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-dark-tertiary border border-red-500/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">
            Unable to connect to authentication service. Please check your connection and try again.
          </p>
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
    user,
    userProfile,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    hasPurchased: userProfile?.purchased || false
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
