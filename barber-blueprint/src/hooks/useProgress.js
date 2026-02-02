import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../firebase/AuthContext'

/**
 * Hook for managing module progress in Firestore
 * @param {number} moduleId - The module ID (1-6)
 * @returns {Object} Progress state and functions
 */
export function useProgress(moduleId) {
  const { user } = useAuth()
  const [completedLessons, setCompletedLessons] = useState([])
  const [lastLessonId, setLastLessonId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load progress from Firestore
  useEffect(() => {
    if (!user || !moduleId) {
      setLoading(false)
      return
    }

    const loadProgress = async () => {
      try {
        const progressRef = doc(db, 'blueprint_users', user.uid, 'progress', String(moduleId))
        const progressDoc = await getDoc(progressRef)

        if (progressDoc.exists()) {
          const data = progressDoc.data()
          setCompletedLessons(data.completedLessons || [])
          setLastLessonId(data.lastLessonId || null)
        } else {
          setCompletedLessons([])
          setLastLessonId(null)
        }
      } catch (err) {
        console.error('Error loading progress:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [user, moduleId])

  // Mark a lesson as complete
  const markLessonComplete = useCallback(async (lessonId) => {
    if (!user || !moduleId) return

    const progressRef = doc(db, 'blueprint_users', user.uid, 'progress', String(moduleId))

    try {
      // Optimistic update
      setCompletedLessons(prev => {
        if (prev.includes(lessonId)) return prev
        return [...prev, lessonId]
      })
      setLastLessonId(lessonId)

      // Check if document exists
      const progressDoc = await getDoc(progressRef)

      if (progressDoc.exists()) {
        // Update existing document
        const currentCompleted = progressDoc.data().completedLessons || []
        if (!currentCompleted.includes(lessonId)) {
          await updateDoc(progressRef, {
            completedLessons: [...currentCompleted, lessonId],
            lastLessonId: lessonId,
            lastUpdated: serverTimestamp()
          })
        }
      } else {
        // Create new document
        await setDoc(progressRef, {
          moduleId,
          completedLessons: [lessonId],
          lastLessonId: lessonId,
          startedAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        })
      }
    } catch (err) {
      console.error('Error marking lesson complete:', err)
      setError(err.message)
      // Revert optimistic update
      setCompletedLessons(prev => prev.filter(id => id !== lessonId))
    }
  }, [user, moduleId])

  // Check if a lesson is completed
  const isLessonComplete = useCallback((lessonId) => {
    return completedLessons.includes(lessonId)
  }, [completedLessons])

  // Calculate progress percentage
  const getProgressPercentage = useCallback((totalLessons) => {
    if (totalLessons === 0) return 0
    return Math.round((completedLessons.length / totalLessons) * 100)
  }, [completedLessons])

  return {
    completedLessons,
    lastLessonId,
    loading,
    error,
    markLessonComplete,
    isLessonComplete,
    getProgressPercentage
  }
}

/**
 * Hook for getting progress across all modules (for Dashboard)
 * @returns {Object} All modules progress
 */
export function useAllProgress() {
  const { user } = useAuth()
  const [allProgress, setAllProgress] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadAllProgress = async () => {
      try {
        const progress = {}

        // Load progress for all 6 modules
        for (let moduleId = 1; moduleId <= 6; moduleId++) {
          const progressRef = doc(db, 'blueprint_users', user.uid, 'progress', String(moduleId))
          const progressDoc = await getDoc(progressRef)

          if (progressDoc.exists()) {
            progress[moduleId] = progressDoc.data()
          } else {
            progress[moduleId] = { completedLessons: [], lastLessonId: null }
          }
        }

        setAllProgress(progress)
      } catch (err) {
        console.error('Error loading all progress:', err)
      } finally {
        setLoading(false)
      }
    }

    loadAllProgress()
  }, [user])

  return { allProgress, loading }
}
