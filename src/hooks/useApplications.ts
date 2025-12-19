import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { useCollection, useDocument } from 'react-firebase-hooks/firestore'
import type { GeneratedApplication } from '@/sections/application-generator/types'

/**
 * Hook to manage generated applications in Firestore
 * Collection: users/{userId}/applications
 */
export function useApplications() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to applications subcollection
  const applicationsRef = userId
    ? query(collection(db, 'users', userId, 'applications'), orderBy('createdAt', 'desc'))
    : null

  // Subscribe to applications collection
  const [snapshot, loading, error] = useCollection(applicationsRef)

  const applications: GeneratedApplication[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as GeneratedApplication))
    : []

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
