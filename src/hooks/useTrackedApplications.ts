import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, limit, startAfter, QueryConstraint, DocumentSnapshot } from 'firebase/firestore'
import { useCollection, useDocument } from 'react-firebase-hooks/firestore'
import type { TrackedApplication } from '@/sections/application-tracker/types'

/**
 * Hook to manage tracked applications in Firestore
 * Collection: users/{userId}/trackedApplications
 *
 * PERFORMANCE: Uses cursor-based pagination (20 items per page) to reduce Firestore reads
 */
export function useTrackedApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.uid

  // Pagination state
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [allApplications, setAllApplications] = useState<TrackedApplication[]>([])
  const [hasMore, setHasMore] = useState(true)

  // Build paginated query
  const trackedApplicationsRef = useMemo(() => {
    if (!userId) return null

    const constraints: QueryConstraint[] = [
      orderBy('lastUpdated', 'desc'),
      limit(pageSize)
    ]

    // Add pagination cursor
    if (lastDoc) {
      constraints.push(startAfter(lastDoc))
    }

    return query(collection(db, 'users', userId, 'trackedApplications'), ...constraints)
  }, [userId, lastDoc, pageSize])

  // Subscribe to current page
  const [snapshot, loading, error] = useCollection(trackedApplicationsRef)

  // Accumulate applications across pages
  useEffect(() => {
    if (!snapshot) return

    const newApplications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as TrackedApplication))

    // Check if there are more results
    setHasMore(newApplications.length === pageSize)

    if (lastDoc) {
      // Append to existing applications
      setAllApplications(prev => [...prev, ...newApplications])
    } else {
      // First page - replace all applications
      setAllApplications(newApplications)
    }
  }, [snapshot, lastDoc, pageSize])

  const trackedApplications: TrackedApplication[] = allApplications

  // Load more callback
  const loadMore = useCallback(() => {
    if (snapshot && snapshot.docs.length > 0 && hasMore) {
      const last = snapshot.docs[snapshot.docs.length - 1]
      setLastDoc(last)
    }
  }, [snapshot, hasMore])

  // Reset pagination
  const reset = useCallback(() => {
    setLastDoc(null)
    setAllApplications([])
    setHasMore(true)
  }, [])

  /**
   * Add new tracked application
   */
  const addTrackedApplication = async (data: Omit<TrackedApplication, 'id' | 'lastUpdated'>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = collection(db, 'users', userId, 'trackedApplications')
    await addDoc(ref, {
      ...data,
      lastUpdated: new Date().toISOString(),
    })
  }

  /**
   * Update existing tracked application
   */
  const updateTrackedApplication = async (id: string, data: Partial<Omit<TrackedApplication, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'trackedApplications', id)
    await updateDoc(ref, {
      ...data,
      lastUpdated: new Date().toISOString(),
    })
  }

  /**
   * Delete tracked application
   */
  const deleteTrackedApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'trackedApplications', id)
    await deleteDoc(ref)
  }

  /**
   * Archive tracked application
   */
  const archiveTrackedApplication = async (id: string) => {
    await updateTrackedApplication(id, { archived: true })
  }

  /**
   * Unarchive tracked application
   */
  const unarchiveTrackedApplication = async (id: string) => {
    await updateTrackedApplication(id, { archived: false })
  }

  return {
    trackedApplications,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
    addTrackedApplication,
    updateTrackedApplication,
    deleteTrackedApplication,
    archiveTrackedApplication,
    unarchiveTrackedApplication,
  }
}

/**
 * Hook to fetch a single tracked application by ID
 */
export function useTrackedApplication(id: string | undefined) {
  const { user } = useAuth()
  const userId = user?.uid

  const applicationRef = userId && id
    ? doc(db, 'users', userId, 'trackedApplications', id)
    : null

  // Subscribe to tracked application document
  const [snapshot, loading, error] = useDocument(applicationRef)

  const trackedApplication = snapshot?.exists()
    ? { id: snapshot.id, ...snapshot.data() } as TrackedApplication
    : null

  return {
    trackedApplication,
    loading,
    error,
  }
}

/**
 * Hook to fetch active (non-archived) tracked applications
 *
 * PERFORMANCE: Uses cursor-based pagination (20 items per page) to reduce Firestore reads
 */
export function useActiveTrackedApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.uid

  // Pagination state
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [allApplications, setAllApplications] = useState<TrackedApplication[]>([])
  const [hasMore, setHasMore] = useState(true)

  // Build paginated query with archived filter
  const activeApplicationsRef = useMemo(() => {
    if (!userId) return null

    const constraints: QueryConstraint[] = [
      where('archived', '==', false),
      orderBy('lastUpdated', 'desc'),
      limit(pageSize)
    ]

    // Add pagination cursor
    if (lastDoc) {
      constraints.push(startAfter(lastDoc))
    }

    return query(collection(db, 'users', userId, 'trackedApplications'), ...constraints)
  }, [userId, lastDoc, pageSize])

  // Subscribe to current page
  const [snapshot, loading, error] = useCollection(activeApplicationsRef)

  // Accumulate applications across pages
  useEffect(() => {
    if (!snapshot) return

    const newApplications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as TrackedApplication))

    // Check if there are more results
    setHasMore(newApplications.length === pageSize)

    if (lastDoc) {
      // Append to existing applications
      setAllApplications(prev => [...prev, ...newApplications])
    } else {
      // First page - replace all applications
      setAllApplications(newApplications)
    }
  }, [snapshot, lastDoc, pageSize])

  const activeApplications: TrackedApplication[] = allApplications

  // Load more callback
  const loadMore = useCallback(() => {
    if (snapshot && snapshot.docs.length > 0 && hasMore) {
      const last = snapshot.docs[snapshot.docs.length - 1]
      setLastDoc(last)
    }
  }, [snapshot, hasMore])

  // Reset pagination
  const reset = useCallback(() => {
    setLastDoc(null)
    setAllApplications([])
    setHasMore(true)
  }, [])

  return {
    activeApplications,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
  }
}
