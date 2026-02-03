import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  limit,
  startAfter,
  where
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAdmin } from '../firebase/AdminContext'

export function useAuditLog(options = {}) {
  const { pageSize = 20, filterCollection = null, filterAction = null } = options
  const adminContext = useAdmin()
  const { isAdmin } = adminContext || {}

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState(null)

  // Load initial logs
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }

    const loadLogs = async () => {
      try {
        // Build constraints in correct order: where -> orderBy -> limit
        const constraints = []

        if (filterCollection) {
          constraints.push(where('collection', '==', filterCollection))
        }

        if (filterAction) {
          constraints.push(where('action', '==', filterAction))
        }

        constraints.push(orderBy('timestamp', 'desc'))
        constraints.push(limit(pageSize))

        const q = query(collection(db, 'admin_audit_log'), ...constraints)
        const snapshot = await getDocs(q)

        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }))

        setLogs(items)
        setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null)
        setHasMore(snapshot.docs.length === pageSize)
      } catch (err) {
        console.error('Error loading audit log:', err)
        // Handle missing composite index error gracefully
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          setError('Audit log requires a database index. Please check Firebase console.')
        } else {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [isAdmin, pageSize, filterCollection, filterAction])

  // Load more logs (pagination)
  const loadMore = useCallback(async () => {
    if (!isAdmin || !lastDoc || !hasMore) return

    setLoading(true)
    setError(null)

    try {
      // Build constraints in correct order: where -> orderBy -> startAfter -> limit
      const constraints = []

      if (filterCollection) {
        constraints.push(where('collection', '==', filterCollection))
      }

      if (filterAction) {
        constraints.push(where('action', '==', filterAction))
      }

      constraints.push(orderBy('timestamp', 'desc'))
      constraints.push(startAfter(lastDoc))
      constraints.push(limit(pageSize))

      const q = query(collection(db, 'admin_audit_log'), ...constraints)
      const snapshot = await getDocs(q)

      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }))

      setLogs(prev => [...prev, ...items])
      setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null)
      setHasMore(snapshot.docs.length === pageSize)
    } catch (err) {
      console.error('Error loading more audit logs:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, lastDoc, hasMore, pageSize, filterCollection, filterAction])

  // Refresh logs
  const refresh = useCallback(async () => {
    if (!isAdmin) return

    setLoading(true)
    setError(null)
    setLastDoc(null)
    setHasMore(true)

    try {
      // Build constraints in correct order: where -> orderBy -> limit
      const constraints = []

      if (filterCollection) {
        constraints.push(where('collection', '==', filterCollection))
      }

      if (filterAction) {
        constraints.push(where('action', '==', filterAction))
      }

      constraints.push(orderBy('timestamp', 'desc'))
      constraints.push(limit(pageSize))

      const q = query(collection(db, 'admin_audit_log'), ...constraints)
      const snapshot = await getDocs(q)

      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }))

      setLogs(items)
      setLastDoc(snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null)
      setHasMore(snapshot.docs.length === pageSize)
    } catch (err) {
      console.error('Error refreshing audit log:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, pageSize, filterCollection, filterAction])

  return {
    logs,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  }
}
