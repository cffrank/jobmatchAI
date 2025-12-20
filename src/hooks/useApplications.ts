import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, startAfter, QueryConstraint, DocumentSnapshot } from 'firebase/firestore'
import { useCollection, useDocument } from 'react-firebase-hooks/firestore'
import type { GeneratedApplication } from '@/sections/application-generator/types'

/**
 * Hook to manage generated applications in Firestore
 * Collection: users/{userId}/applications
 *
 * PERFORMANCE: Uses cursor-based pagination (20 items per page) to reduce Firestore reads
 */
export function useApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.uid

  // Pagination state
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [allApplications, setAllApplications] = useState<GeneratedApplication[]>([])
  const [hasMore, setHasMore] = useState(true)

  // Build paginated query
  const applicationsRef = useMemo(() => {
    if (!userId) return null

    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    ]

    // Add pagination cursor
    if (lastDoc) {
      constraints.push(startAfter(lastDoc))
    }

    return query(collection(db, 'users', userId, 'applications'), ...constraints)
  }, [userId, lastDoc, pageSize])

  // Subscribe to current page
  const [snapshot, loading, error] = useCollection(applicationsRef)

  // Accumulate applications across pages
  useEffect(() => {
    if (!snapshot) return

    const newApplications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as GeneratedApplication))

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

  const applications: GeneratedApplication[] = allApplications

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
   * Add new generated application
   */
  const addApplication = async (data: Omit<GeneratedApplication, 'id' | 'createdAt'>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = collection(db, 'users', userId, 'applications')
    await addDoc(ref, {
      ...data,
      createdAt: new Date().toISOString(),
    })
  }

  /**
   * Update existing application
   */
  const updateApplication = async (id: string, data: Partial<Omit<GeneratedApplication, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'applications', id)
    await updateDoc(ref, data)
  }

  /**
   * Delete application
   */
  const deleteApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'applications', id)
    await deleteDoc(ref)
  }

  return {
    applications,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
    addApplication,
    updateApplication,
    deleteApplication,
  }
}

/**
 * Hook to fetch a single application by ID
 * This will be used to fix the ApplicationEditorPage bug
 */
export function useApplication(applicationId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.uid

  const applicationRef = userId && applicationId
    ? doc(db, 'users', userId, 'applications', applicationId)
    : null

  // Subscribe to application document
  const [snapshot, loading, error] = useDocument(applicationRef)

  const application = snapshot?.exists()
    ? { id: snapshot.id, ...snapshot.data() } as GeneratedApplication
    : null

  return {
    application,
    loading,
    error,
  }
}
