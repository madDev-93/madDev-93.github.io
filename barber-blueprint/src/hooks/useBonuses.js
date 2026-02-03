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
import { fallbackBonuses } from '../constants/fallbackContent'

export function useBonuses(includeAll = false) {
  const adminContext = useAdmin()
  const { adminUser, logAction, isAdmin } = adminContext || {}
  const [bonuses, setBonuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load bonuses
  useEffect(() => {
    const loadBonuses = async () => {
      try {
        let q = query(
          collection(db, 'bonuses'),
          orderBy('order', 'asc')
        )

        if (!isAdmin || !includeAll) {
          q = query(
            collection(db, 'bonuses'),
            where('status', '==', 'published'),
            orderBy('order', 'asc')
          )
        }

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setBonuses(items.length > 0 ? items : fallbackBonuses)
      } catch (err) {
        console.error('Error loading bonuses:', err)
        setError(err.message)
        setBonuses(fallbackBonuses)
      } finally {
        setLoading(false)
      }
    }

    loadBonuses()
  }, [isAdmin, includeAll])

  // Add bonus
  const addBonus = useCallback(async (data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    try {
      const docRef = await addDoc(collection(db, 'bonuses'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      const newItem = { id: docRef.id, ...data }
      setBonuses(prev => [...prev, newItem].sort((a, b) => a.order - b.order))

      await logAction?.('create', 'bonuses', docRef.id, data)

      return docRef.id
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, logAction])

  // Update bonus
  const updateBonus = useCallback(async (id, data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousBonuses = [...bonuses]
    setBonuses(prev =>
      prev.map(item => item.id === id ? { ...item, ...data } : item)
        .sort((a, b) => a.order - b.order)
    )

    try {
      await updateDoc(doc(db, 'bonuses', id), {
        ...data,
        updatedAt: serverTimestamp()
      })

      await logAction?.('update', 'bonuses', id, data)
    } catch (err) {
      setBonuses(previousBonuses)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, bonuses, logAction])

  // Delete bonus
  const deleteBonus = useCallback(async (id) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousBonuses = [...bonuses]
    setBonuses(prev => prev.filter(item => item.id !== id))

    try {
      await deleteDoc(doc(db, 'bonuses', id))
      await logAction?.('delete', 'bonuses', id, {})
    } catch (err) {
      setBonuses(previousBonuses)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, bonuses, logAction])

  // Reorder bonuses
  const reorderBonuses = useCallback(async (reorderedItems) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousBonuses = [...bonuses]
    setBonuses(reorderedItems)

    try {
      const results = await Promise.allSettled(
        reorderedItems.map((item, index) =>
          updateDoc(doc(db, 'bonuses', item.id), {
            order: index + 1,
            updatedAt: serverTimestamp()
          })
        )
      )

      // Check for partial failures
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        setBonuses(previousBonuses)
        setError(`${failures.length} of ${reorderedItems.length} updates failed. Changes reverted.`)
        return
      }

      await logAction?.('update', 'bonuses', 'reorder', { count: reorderedItems.length })
    } catch (err) {
      setBonuses(previousBonuses)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, bonuses, logAction])

  return {
    bonuses,
    loading,
    error,
    saving,
    addBonus,
    updateBonus,
    deleteBonus,
    reorderBonuses
  }
}

// Hook for public site
export function usePublicBonuses() {
  const [bonuses, setBonuses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBonuses = async () => {
      try {
        const q = query(
          collection(db, 'bonuses'),
          where('status', '==', 'published'),
          orderBy('order', 'asc')
        )

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setBonuses(items.length > 0 ? items : fallbackBonuses)
      } catch {
        setBonuses(fallbackBonuses)
      } finally {
        setLoading(false)
      }
    }

    loadBonuses()
  }, [])

  return { bonuses, loading }
}
