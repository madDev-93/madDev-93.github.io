import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'
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
  // Use ref for synchronous pending check to prevent race conditions
  const pendingLessonsRef = useRef(new Set())

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

    // Synchronous check using ref to prevent race conditions from rapid clicks
    if (completedLessons.includes(lessonId) || pendingLessonsRef.current.has(lessonId)) {
      return
    }

    // Mark as pending immediately (synchronous)
    pendingLessonsRef.current.add(lessonId)

    const progressRef = doc(db, 'blueprint_users', user.uid, 'progress', String(moduleId))

    try {
      // Optimistic update
      setCompletedLessons(prev => [...prev, lessonId])
      setLastLessonId(lessonId)

      // Use arrayUnion for atomic update - prevents race conditions across tabs/windows
      // setDoc with merge:true will create doc if it doesn't exist
      await setDoc(progressRef, {
        moduleId,
        completedLessons: arrayUnion(lessonId),
        lastLessonId: lessonId,
        lastUpdated: serverTimestamp()
      }, { merge: true })

      // If doc was just created, add startedAt
      const progressDoc = await getDoc(progressRef)
      if (progressDoc.exists() && !progressDoc.data().startedAt) {
        await updateDoc(progressRef, { startedAt: serverTimestamp() })
      }
    } catch (err) {
      console.error('Error marking lesson complete:', err)
      setError(err.message)
      // Revert optimistic update
      setCompletedLessons(prev => prev.filter(id => id !== lessonId))
    } finally {
      // Remove from pending
      pendingLessonsRef.current.delete(lessonId)
    }
  }, [user, moduleId, completedLessons])

  // Check if a lesson is completed
  const isLessonComplete = useCallback((lessonId) => {
    return completedLessons.includes(lessonId)
  }, [completedLessons])

  // Calculate progress percentage
  const getProgressPercentage = useCallback((totalLessons) => {
    if (!totalLessons || totalLessons <= 0) return 0
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
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const loadAllProgress = async () => {
      try {
        setError(null)
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
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadAllProgress()
  }, [user])

  return { allProgress, loading, error }
}
