import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAdmin } from '../firebase/AdminContext'
import { deleteFile } from '../firebase/storage'
import { modules as fallbackModules } from '../constants/modules'

// Convert fallback modules to the expected format
const convertedFallbackModules = fallbackModules.map((m, index) => ({
  id: String(m.id),
  number: m.number,
  icon: m.icon.name || 'BookOpen',
  title: m.title,
  shortDescription: m.shortDescription,
  fullDescription: m.fullDescription,
  duration: m.duration,
  lessonCount: m.lessons,
  order: index + 1,
  status: 'published'
}))

export function useModules(includeAll = false) {
  const adminContext = useAdmin()
  const { adminUser, logAction, isAdmin } = adminContext || {}
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load modules
  useEffect(() => {
    const loadModules = async () => {
      try {
        let q = query(
          collection(db, 'modules'),
          orderBy('order', 'asc')
        )

        if (!isAdmin || !includeAll) {
          q = query(
            collection(db, 'modules'),
            where('status', '==', 'published'),
            orderBy('order', 'asc')
          )
        }

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setModules(items.length > 0 ? items : convertedFallbackModules)
      } catch (err) {
        console.error('Error loading modules:', err)
        setError(err.message)
        setModules(convertedFallbackModules)
      } finally {
        setLoading(false)
      }
    }

    loadModules()
  }, [isAdmin, includeAll])

  // Add module
  const addModule = useCallback(async (data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    try {
      const docRef = await addDoc(collection(db, 'modules'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      const newItem = { id: docRef.id, ...data }
      setModules(prev => [...prev, newItem].sort((a, b) => a.order - b.order))

      await logAction?.('create', 'modules', docRef.id, data)

      return docRef.id
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, logAction])

  // Update module
  const updateModule = useCallback(async (id, data) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousModules = [...modules]
    setModules(prev =>
      prev.map(item => item.id === id ? { ...item, ...data } : item)
        .sort((a, b) => a.order - b.order)
    )

    try {
      await updateDoc(doc(db, 'modules', id), {
        ...data,
        updatedAt: serverTimestamp()
      })

      await logAction?.('update', 'modules', id, data)
    } catch (err) {
      setModules(previousModules)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, modules, logAction])

  // Delete module
  const deleteModule = useCallback(async (id) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousModules = [...modules]
    setModules(prev => prev.filter(item => item.id !== id))

    try {
      // First, delete all lessons in the subcollection
      const lessonsSnapshot = await getDocs(collection(db, 'modules', id, 'lessons'))
      for (const lessonDoc of lessonsSnapshot.docs) {
        await deleteDoc(doc(db, 'modules', id, 'lessons', lessonDoc.id))
      }

      // Then delete the module document
      await deleteDoc(doc(db, 'modules', id))
      await logAction?.('delete', 'modules', id, { deletedLessons: lessonsSnapshot.size })
    } catch (err) {
      setModules(previousModules)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, modules, logAction])

  // Reorder modules
  const reorderModules = useCallback(async (reorderedItems) => {
    if (!adminUser || !isAdmin) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousModules = [...modules]
    setModules(reorderedItems)

    try {
      const results = await Promise.allSettled(
        reorderedItems.map((item, index) =>
          updateDoc(doc(db, 'modules', item.id), {
            order: index + 1,
            number: String(index + 1).padStart(2, '0'),
            updatedAt: serverTimestamp()
          })
        )
      )

      // Check for partial failures
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        // Some updates failed - revert to be safe
        setModules(previousModules)
        setError(`${failures.length} of ${reorderedItems.length} updates failed. Changes reverted.`)
        return
      }

      await logAction?.('update', 'modules', 'reorder', { count: reorderedItems.length })
    } catch (err) {
      setModules(previousModules)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, modules, logAction])

  return {
    modules,
    loading,
    error,
    saving,
    addModule,
    updateModule,
    deleteModule,
    reorderModules
  }
}

// Hook for lessons within a module
export function useLessons(moduleId) {
  const adminContext = useAdmin()
  const { adminUser, logAction, isAdmin } = adminContext || {}
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load lessons
  useEffect(() => {
    if (!moduleId) {
      setLoading(false)
      return
    }

    const loadLessons = async () => {
      try {
        const q = query(
          collection(db, 'modules', moduleId, 'lessons'),
          orderBy('order', 'asc')
        )

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setLessons(items)
      } catch (err) {
        console.error('Error loading lessons:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadLessons()
  }, [moduleId])

  // Add lesson
  const addLesson = useCallback(async (data) => {
    if (!adminUser || !isAdmin || !moduleId) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    try {
      const docRef = await addDoc(collection(db, 'modules', moduleId, 'lessons'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })

      const newItem = { id: docRef.id, ...data }
      setLessons(prev => [...prev, newItem].sort((a, b) => a.order - b.order))

      await logAction?.('create', `modules/${moduleId}/lessons`, docRef.id, data)

      return docRef.id
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, moduleId, logAction])

  // Update lesson
  const updateLesson = useCallback(async (lessonId, data) => {
    if (!adminUser || !isAdmin || !moduleId) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousLessons = [...lessons]
    setLessons(prev =>
      prev.map(item => item.id === lessonId ? { ...item, ...data } : item)
        .sort((a, b) => a.order - b.order)
    )

    try {
      await updateDoc(doc(db, 'modules', moduleId, 'lessons', lessonId), {
        ...data,
        updatedAt: serverTimestamp()
      })

      await logAction?.('update', `modules/${moduleId}/lessons`, lessonId, data)
    } catch (err) {
      setLessons(previousLessons)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, moduleId, lessons, logAction])

  // Delete lesson
  const deleteLesson = useCallback(async (lessonId) => {
    if (!adminUser || !isAdmin || !moduleId) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    // Find the lesson to get its video URL before removing from state
    const lesson = lessons.find(l => l.id === lessonId)
    const previousLessons = [...lessons]
    setLessons(prev => prev.filter(item => item.id !== lessonId))

    try {
      // Delete associated video file first (non-blocking on failure)
      if (lesson?.videoUrl) {
        try {
          await deleteFile(lesson.videoUrl)
        } catch (videoErr) {
          console.warn('Failed to delete video file:', videoErr)
          // Continue with lesson deletion even if video deletion fails
        }
      }

      await deleteDoc(doc(db, 'modules', moduleId, 'lessons', lessonId))
      await logAction?.('delete', `modules/${moduleId}/lessons`, lessonId, { hadVideo: !!lesson?.videoUrl })
    } catch (err) {
      setLessons(previousLessons)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, moduleId, lessons, logAction])

  // Reorder lessons
  const reorderLessons = useCallback(async (reorderedItems) => {
    if (!adminUser || !isAdmin || !moduleId) throw new Error('Admin access required')

    setSaving(true)
    setError(null)

    const previousLessons = [...lessons]
    setLessons(reorderedItems)

    try {
      const results = await Promise.allSettled(
        reorderedItems.map((item, index) =>
          updateDoc(doc(db, 'modules', moduleId, 'lessons', item.id), {
            order: index + 1,
            updatedAt: serverTimestamp()
          })
        )
      )

      // Check for partial failures
      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        setLessons(previousLessons)
        setError(`${failures.length} of ${reorderedItems.length} updates failed. Changes reverted.`)
        return
      }

      await logAction?.('update', `modules/${moduleId}/lessons`, 'reorder', { count: reorderedItems.length })
    } catch (err) {
      setLessons(previousLessons)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, isAdmin, moduleId, lessons, logAction])

  return {
    lessons,
    loading,
    error,
    saving,
    addLesson,
    updateLesson,
    deleteLesson,
    reorderLessons
  }
}

// Hook for public site - only published modules
export function usePublicModules() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadModules = async () => {
      try {
        const q = query(
          collection(db, 'modules'),
          where('status', '==', 'published'),
          orderBy('order', 'asc')
        )

        const snapshot = await getDocs(q)
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setModules(items.length > 0 ? items : convertedFallbackModules)
      } catch {
        setModules(convertedFallbackModules)
      } finally {
        setLoading(false)
      }
    }

    loadModules()
  }, [])

  return { modules, loading }
}

// Hook to get a single module with its lessons
export function useModuleWithLessons(moduleId) {
  const [module, setModule] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!moduleId) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        // Load module
        const moduleDoc = await getDoc(doc(db, 'modules', moduleId))
        if (!moduleDoc.exists()) {
          // Try to find in fallback
          const fallbackModule = convertedFallbackModules.find(m => m.id === moduleId || String(m.id) === moduleId)
          if (fallbackModule) {
            setModule(fallbackModule)
            setLessons([])
          } else {
            setError('Module not found')
          }
          setLoading(false)
          return
        }

        setModule({ id: moduleDoc.id, ...moduleDoc.data() })

        // Load lessons
        const lessonsQuery = query(
          collection(db, 'modules', moduleId, 'lessons'),
          where('status', '==', 'published'),
          orderBy('order', 'asc')
        )
        const lessonsSnapshot = await getDocs(lessonsQuery)
        const lessonsData = lessonsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        setLessons(lessonsData)
      } catch (err) {
        console.error('Error loading module:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [moduleId])

  return { module, lessons, loading, error }
}
