import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { useCollection } from 'react-firebase-hooks/firestore'
import type { WorkExperience } from '@/sections/profile-resume-management/types'

/**
 * Hook to manage work experience entries in Firestore
 * Collection: users/{userId}/workExperience
 */
export function useWorkExperience() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to work experience subcollection
  const workExperienceRef = userId
    ? query(collection(db, 'users', userId, 'workExperience'), orderBy('startDate', 'desc'))
    : null

  // Subscribe to work experience collection
  const [snapshot, loading, error] = useCollection(workExperienceRef)

  const workExperience: WorkExperience[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as WorkExperience))
    : []

  /**
   * Add new work experience entry
   */
  const addWorkExperience = async (data: Omit<WorkExperience, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = collection(db, 'users', userId, 'workExperience')
    await addDoc(ref, data)
  }

  /**
   * Update existing work experience entry
   */
  const updateWorkExperience = async (id: string, data: Partial<Omit<WorkExperience, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'workExperience', id)
    await updateDoc(ref, data)
  }

  /**
   * Delete work experience entry
   */
  const deleteWorkExperience = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'workExperience', id)
    await deleteDoc(ref)
  }

  return {
    workExperience,
    loading,
    error,
    addWorkExperience,
    updateWorkExperience,
    deleteWorkExperience,
  }
}
