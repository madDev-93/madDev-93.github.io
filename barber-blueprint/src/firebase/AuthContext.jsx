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
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if user has purchased
  const checkPurchaseStatus = async (uid, email) => {
    try {
      // Check by UID first
      const userDoc = await getDoc(doc(db, 'blueprint_users', uid))
      if (userDoc.exists() && userDoc.data().purchased) {
        return userDoc.data()
      }

      // Check by email (for webhook-created records)
      const emailDoc = await getDoc(doc(db, 'blueprint_purchases', email.toLowerCase()))
      if (emailDoc.exists()) {
        // Link purchase to user account
        await setDoc(doc(db, 'blueprint_users', uid), {
          email: email.toLowerCase(),
          purchased: true,
          purchaseDate: emailDoc.data().purchaseDate,
          linkedAt: new Date().toISOString()
        }, { merge: true })
        return { purchased: true, ...emailDoc.data() }
      }

      return { purchased: false }
    } catch (error) {
      console.error('Error checking purchase status:', error)
      return { purchased: false }
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      if (user) {
        const profile = await checkPurchaseStatus(user.uid, user.email)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signup = async (email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    // Create user document
    await setDoc(doc(db, 'blueprint_users', result.user.uid), {
      email: email.toLowerCase(),
      createdAt: new Date().toISOString(),
      purchased: false
    })
    return result
  }

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const logout = () => {
    return signOut(auth)
  }

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email)
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
