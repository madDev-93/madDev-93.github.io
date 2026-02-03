import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAdmin } from '../firebase/AdminContext'
import { fallbackContent } from '../constants/fallbackContent'

export function useSiteContent(section = 'landing') {
  const adminContext = useAdmin()
  const { adminUser, logAction } = adminContext || {}
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load content
  useEffect(() => {
    const loadContent = async () => {
      try {
        const docRef = doc(db, 'site_content', section)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          setContent(docSnap.data())
        } else {
          // Use fallback if no Firestore data
          setContent(fallbackContent[section] || null)
        }
      } catch (err) {
        console.error('Error loading content:', err)
        setError(err.message)
        // Graceful fallback
        setContent(fallbackContent[section] || null)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [section])

  // Save content (admin only)
  const saveContent = useCallback(async (newContent) => {
    if (!adminUser) {
      throw new Error('Admin access required')
    }

    setSaving(true)
    setError(null)

    // Optimistic update
    const previousContent = content
    setContent(newContent)

    try {
      const docRef = doc(db, 'site_content', section)
      await setDoc(docRef, {
        ...newContent,
        lastModifiedBy: adminUser.uid,
        lastModified: serverTimestamp()
      }, { merge: true })

      // Audit log
      await logAction?.('update', 'site_content', section, newContent)

      return true
    } catch (err) {
      // Revert optimistic update
      setContent(previousContent)
      setError(err.message)
      throw err
    } finally {
      setSaving(false)
    }
  }, [adminUser, content, section, logAction])

  // Save a specific section of the content
  const saveSection = useCallback(async (sectionKey, sectionData, status = null) => {
    // Guard against null content during initial load
    if (content === null) {
      throw new Error('Content not loaded yet. Please wait and try again.')
    }
    const updatedContent = {
      ...content,
      [sectionKey]: sectionData,
      status: status || content?.status || 'draft'
    }
    return saveContent(updatedContent)
  }, [content, saveContent])

  return {
    content,
    loading,
    error,
    saving,
    saveContent,
    saveSection
  }
}

// Hook for public site - reads only published content with fallback
// Supports preview mode via ?preview=true URL param
export function usePublicContent(section = 'landing') {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    const loadContent = async () => {
      // Check for preview mode
      const urlParams = new URLSearchParams(window.location.search)
      const previewMode = urlParams.get('preview') === 'true'
      setIsPreview(previewMode)

      // If preview mode, try to load from sessionStorage first
      if (previewMode) {
        const previewData = sessionStorage.getItem(`preview_${section}`)
        if (previewData) {
          try {
            const parsed = JSON.parse(previewData)
            // Validate parsed data is a plain object (not array, null, or primitive)
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              setContent(parsed)
              setLoading(false)
              return
            }
            // Invalid structure, fall through to normal load
          } catch {
            // Invalid JSON, fall through to normal load
          }
        }
      }

      // Normal load from Firestore
      try {
        const docRef = doc(db, 'site_content', section)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists() && docSnap.data().status === 'published') {
          setContent(docSnap.data())
        } else {
          // Use fallback for public site
          setContent(fallbackContent[section] || null)
        }
      } catch {
        // Silently fall back to default content
        setContent(fallbackContent[section] || null)
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [section])

  return { content, loading, isPreview }
}

// Helper to save preview data (used by admin editors)
export function savePreviewData(section, sectionKey, data) {
  try {
    // Get existing preview content or start fresh
    const existingData = sessionStorage.getItem(`preview_${section}`)
    let content = {}
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData)
        // Validate it's a plain object
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          content = parsed
        }
      } catch {
        // Invalid JSON, start fresh
      }
    }

    // Update the specific section
    content[sectionKey] = data
    content.status = 'published' // Treat preview as published for display

    sessionStorage.setItem(`preview_${section}`, JSON.stringify(content))
  } catch (err) {
    // Handle storage quota exceeded or other errors
    console.warn('Failed to save preview data:', err.message)
    // Clear old preview data and try again
    try {
      sessionStorage.removeItem(`preview_${section}`)
      const content = { [sectionKey]: data, status: 'published' }
      sessionStorage.setItem(`preview_${section}`, JSON.stringify(content))
    } catch {
      // Storage completely unavailable, preview will use saved data
    }
  }
}
