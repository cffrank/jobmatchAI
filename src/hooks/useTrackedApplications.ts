import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore'
import { useCollection, useDocument } from 'react-firebase-hooks/firestore'
import type { TrackedApplication } from '@/sections/application-tracker/types'

/**
 * Hook to manage tracked applications in Firestore
 * Collection: users/{userId}/trackedApplications
 */
export function useTrackedApplications() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to tracked applications subcollection
  const trackedApplicationsRef = userId
    ? query(collection(db, 'users', userId, 'trackedApplications'), orderBy('lastUpdated', 'desc'))
    : null

  // Subscribe to tracked applications collection
  const [snapshot, loading, error] = useCollection(trackedApplicationsRef)

  const trackedApplications: TrackedApplication[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TrackedApplication))
    : []

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
 */
export function useActiveTrackedApplications() {
  const { user } = useAuth()
  const userId = user?.uid

  const activeApplicationsRef = userId
    ? query(
        collection(db, 'users', userId, 'trackedApplications'),
        where('archived', '==', false),
        orderBy('lastUpdated', 'desc')
      )
    : null

  const [snapshot, loading, error] = useCollection(activeApplicationsRef)

  const activeApplications: TrackedApplication[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TrackedApplication))
    : []

  return {
    activeApplications,
    loading,
    error,
  }
}
