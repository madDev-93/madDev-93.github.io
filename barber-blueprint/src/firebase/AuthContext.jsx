import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  verifyBeforeUpdateEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth'
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
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
 * @param {string} email - Email to normalize
 * @returns {string|null} Normalized email or null if invalid
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null
  const trimmed = email.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Check if user has purchased (with timeout to prevent hanging)
  const checkPurchaseStatus = async (uid, email) => {
    const normalizedEmail = normalizeEmail(email)

    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Purchase check timeout')), 10000)
    )

    try {
      const checkPromise = async () => {
        // Check user document first
        const userDoc = await getDoc(doc(db, 'blueprint_users', uid))

        if (userDoc.exists()) {
          const data = userDoc.data()
          if (data.purchased) {
            return data
          }
        }

        // Check purchase by email (for webhook-created records)
        if (!normalizedEmail) {
          return { purchased: false }
        }

        const emailDoc = await getDoc(doc(db, 'blueprint_purchases', normalizedEmail))

        if (emailDoc.exists() && emailDoc.data().verified) {
          // Purchase verified via webhook - return purchased state
          // Note: We don't write to blueprint_users from client to prevent tampering
          return {
            purchased: true,
            purchaseDate: emailDoc.data().verifiedAt || new Date().toISOString()
          }
        }

        return { purchased: false, verified: true }
      }

      return await Promise.race([checkPromise(), timeoutPromise])
    } catch (err) {
      // Log error for debugging but don't expose to user
      console.error('Error checking purchase status:', err)
      // Return unverified state so UI can distinguish between "no purchase" and "check failed"
      return { purchased: false, verified: false, error: err.message }
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

  // Reauthenticate user (required for sensitive operations)
  const reauthenticate = async (currentPassword) => {
    if (!auth.currentUser) throw new Error('No user logged in')
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    )
    return reauthenticateWithCredential(auth.currentUser, credential)
  }

  // Update password (requires recent authentication)
  const updatePassword = async (currentPassword, newPassword) => {
    await reauthenticate(currentPassword)
    return firebaseUpdatePassword(auth.currentUser, newPassword)
  }

  // Update email (requires recent authentication)
  // Uses verifyBeforeUpdateEmail - sends verification to new email before updating
  const updateEmail = async (currentPassword, newEmail) => {
    const normalizedEmail = normalizeEmail(newEmail)
    await reauthenticate(currentPassword)

    // Send verification email to new address
    await verifyBeforeUpdateEmail(auth.currentUser, normalizedEmail)

    // Update email in Firestore user document
    try {
      await updateDoc(doc(db, 'blueprint_users', auth.currentUser.uid), {
        pendingEmail: normalizedEmail,
        emailChangeRequestedAt: new Date().toISOString()
      })
    } catch {
      // Non-critical - continue even if Firestore update fails
    }
  }

  // Delete account (requires recent authentication)
  // Cleans up Firestore data before deleting auth account
  const deleteAccount = async (currentPassword) => {
    await reauthenticate(currentPassword)

    // Delete user's Firestore document first
    const uid = auth.currentUser.uid
    try {
      await deleteDoc(doc(db, 'blueprint_users', uid))
    } catch {
      // Continue with account deletion even if Firestore cleanup fails
    }

    return deleteUser(auth.currentUser)
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
    updatePassword,
    updateEmail,
    deleteAccount,
    hasPurchased: userProfile?.purchased || false
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
