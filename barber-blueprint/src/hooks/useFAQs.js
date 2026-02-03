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
import { fallbackFAQs } from '../constants/fallbackContent'

export function useFAQs(includeAll = false) {
  const adminContext = useAdmin()
  const { adminUser, logAction, isAdmin } = adminContext || {}
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load FAQs
  useEffect(() => {
    const loadFAQs = async () => {
      try {
        let q = query(
          collection(db, 'faqs'),
          orderBy('order', 'asc')
        )

        if (!isAdmin || !includeAll) {
          q = query(
            collection(db, 'faqs'),
            where('status', '==', 'published'),
            orderBy('order', 'asc')
          )
        }

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setFaqs(items.length > 0 ? items : fallbackFAQs)
      } catch (err) {
        console.error('Error loading FAQs:', err)
        setError(err.message)
        setFaqs(fallbackFAQs)
      } finally {
        setLoading(false)
      }
    }

    loadFAQs()
  }, [isAdmin, includeAll])

  // Add FAQ
  const addFAQ = useCallback(async (data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    try {
      const docRef = await addDoc(collection(db, 'faqs'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      const newItem = { id: docRef.id, ...data }
      setFaqs(prev => [...prev, newItem].sort((a, b) => a.order - b.order))

      await logAction?.('create', 'faqs', docRef.id, data)

      return docRef.id
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, logAction])

  // Update FAQ
  const updateFAQ = useCallback(async (id, data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousFaqs = [...faqs]
    setFaqs(prev =>
      prev.map(item => item.id === id ? { ...item, ...data } : item)
        .sort((a, b) => a.order - b.order)
    )

    try {
      await updateDoc(doc(db, 'faqs', id), {
        ...data,
        updatedAt: serverTimestamp()
      })

      await logAction?.('update', 'faqs', id, data)
    } catch (err) {
      setFaqs(previousFaqs)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, faqs, logAction])

  // Delete FAQ
  const deleteFAQ = useCallback(async (id) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousFaqs = [...faqs]
    setFaqs(prev => prev.filter(item => item.id !== id))

    try {
      await deleteDoc(doc(db, 'faqs', id))
      await logAction?.('delete', 'faqs', id, {})
    } catch (err) {
      setFaqs(previousFaqs)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, faqs, logAction])

  // Reorder FAQs
  const reorderFAQs = useCallback(async (reorderedItems) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousFaqs = [...faqs]
    setFaqs(reorderedItems)

    try {
      const results = await Promise.allSettled(
        reorderedItems.map((item, index) =>
          updateDoc(doc(db, 'faqs', item.id), {
            order: index + 1,
            updatedAt: serverTimestamp()
          })
        )
      )

      // Check for partial failures
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        setFaqs(previousFaqs)
        setError(`${failures.length} of ${reorderedItems.length} updates failed. Changes reverted.`)
        return
      }

      await logAction?.('update', 'faqs', 'reorder', { count: reorderedItems.length })
    } catch (err) {
      setFaqs(previousFaqs)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, faqs, logAction])

  return {
    faqs,
    loading,
    error,
    saving,
    addFAQ,
    updateFAQ,
    deleteFAQ,
    reorderFAQs
  }
}

// Hook for public site
export function usePublicFAQs() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFAQs = async () => {
      try {
        const q = query(
          collection(db, 'faqs'),
          where('status', '==', 'published'),
          orderBy('order', 'asc')
        )

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setFaqs(items.length > 0 ? items : fallbackFAQs)
      } catch {
        setFaqs(fallbackFAQs)
      } finally {
        setLoading(false)
      }
    }

    loadFAQs()
  }, [])

  return { faqs, loading }
}
