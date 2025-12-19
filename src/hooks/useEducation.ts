import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { useCollection } from 'react-firebase-hooks/firestore'
import type { Education } from '@/sections/profile-resume-management/types'

/**
 * Hook to manage education entries in Firestore
 * Collection: users/{userId}/education
 */
export function useEducation() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to education subcollection
  const educationRef = userId
    ? query(collection(db, 'users', userId, 'education'), orderBy('startDate', 'desc'))
    : null

  // Subscribe to education collection
  const [snapshot, loading, error] = useCollection(educationRef)

  const education: Education[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Education))
    : []

  /**
   * Add new education entry
   */
  const addEducation = async (data: Omit<Education, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = collection(db, 'users', userId, 'education')
    await addDoc(ref, data)
  }

  /**
   * Update existing education entry
   */
  const updateEducation = async (id: string, data: Partial<Omit<Education, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'education', id)
    await updateDoc(ref, data)
  }

  /**
   * Delete education entry
   */
  const deleteEducation = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'education', id)
    await deleteDoc(ref)
  }

  return {
    education,
    loading,
    error,
    addEducation,
    updateEducation,
    deleteEducation,
  }
}
