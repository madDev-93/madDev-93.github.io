import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAdmin } from '../firebase/AdminContext'
import { fallbackTestimonials } from '../constants/fallbackContent'

export function useTestimonials(includeAll = false) {
  const adminContext = useAdmin()
  const { adminUser, logAction, isAdmin } = adminContext || {}
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load testimonials
  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        let q = query(
          collection(db, 'testimonials'),
          orderBy('order', 'asc')
        )

        // If not admin or not including all, only get published
        if (!isAdmin || !includeAll) {
          q = query(
            collection(db, 'testimonials'),
            where('status', '==', 'published'),
            orderBy('order', 'asc')
          )
        }

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setTestimonials(items.length > 0 ? items : fallbackTestimonials)
      } catch (err) {
        console.error('Error loading testimonials:', err)
        setError(err.message)
        setTestimonials(fallbackTestimonials)
      } finally {
        setLoading(false)
      }
    }

    loadTestimonials()
  }, [isAdmin, includeAll])

  // Add testimonial
  const addTestimonial = useCallback(async (data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    try {
      const docRef = await addDoc(collection(db, 'testimonials'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      const newItem = { id: docRef.id, ...data }
      setTestimonials(prev => [...prev, newItem].sort((a, b) => a.order - b.order))

      await logAction?.('create', 'testimonials', docRef.id, data)

      return docRef.id
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, logAction])

  // Update testimonial
  const updateTestimonial = useCallback(async (id, data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    // Optimistic update
    const previousTestimonials = [...testimonials]
    setTestimonials(prev =>
      prev.map(item => item.id === id ? { ...item, ...data } : item)
        .sort((a, b) => a.order - b.order)
    )

    try {
      await updateDoc(doc(db, 'testimonials', id), {
        ...data,
        updatedAt: serverTimestamp()
      })

      await logAction?.('update', 'testimonials', id, data)
    } catch (err) {
      setTestimonials(previousTestimonials)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, testimonials, logAction])

  // Delete testimonial
  const deleteTestimonial = useCallback(async (id) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    // Optimistic update
    const previousTestimonials = [...testimonials]
    setTestimonials(prev => prev.filter(item => item.id !== id))

    try {
      await deleteDoc(doc(db, 'testimonials', id))
      await logAction?.('delete', 'testimonials', id, {})
    } catch (err) {
      setTestimonials(previousTestimonials)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, testimonials, logAction])

  // Reorder testimonials
  const reorderTestimonials = useCallback(async (reorderedItems) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    // Optimistic update
    const previousTestimonials = [...testimonials]
    setTestimonials(reorderedItems)

    try {
      // Update each item's order in Firestore
      const results = await Promise.allSettled(
        reorderedItems.map((item, index) =>
          updateDoc(doc(db, 'testimonials', item.id), {
            order: index + 1,
            updatedAt: serverTimestamp()
          })
        )
      )

      // Check for partial failures
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        setTestimonials(previousTestimonials)
        setError(`${failures.length} of ${reorderedItems.length} updates failed. Changes reverted.`)
        return
      }

      await logAction?.('update', 'testimonials', 'reorder', { count: reorderedItems.length })
    } catch (err) {
      setTestimonials(previousTestimonials)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, testimonials, logAction])

  return {
    testimonials,
    loading,
    error,
    saving,
    addTestimonial,
    updateTestimonial,
    deleteTestimonial,
    reorderTestimonials
  }
}

// Hook for public site - only published testimonials
export function usePublicTestimonials() {
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const q = query(
          collection(db, 'testimonials'),
          where('status', '==', 'published'),
          orderBy('order', 'asc')
        )

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setTestimonials(items.length > 0 ? items : fallbackTestimonials)
      } catch {
        setTestimonials(fallbackTestimonials)
      } finally {
        setLoading(false)
      }
    }

    loadTestimonials()
  }, [])

  return { testimonials, loading }
}
