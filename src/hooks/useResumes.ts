import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore'
import { useCollection } from 'react-firebase-hooks/firestore'
import type { Resume } from '@/sections/profile-resume-management/types'

/**
 * Hook to manage resumes in Firestore
 * Collection: users/{userId}/resumes
 */
export function useResumes() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to resumes subcollection
  const resumesRef = userId
    ? query(collection(db, 'users', userId, 'resumes'), orderBy('updatedAt', 'desc'))
    : null

  // Subscribe to resumes collection
  const [snapshot, loading, error] = useCollection(resumesRef)

  const resumes: Resume[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Resume))
    : []

  /**
   * Add new resume
   */
  const addResume = async (data: Omit<Resume, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = collection(db, 'users', userId, 'resumes')
    const now = new Date().toISOString()
    await addDoc(ref, {
      ...data,
      userId,
      createdAt: now,
      updatedAt: now,
    })
  }

  /**
   * Update existing resume
   */
  const updateResume = async (id: string, data: Partial<Omit<Resume, 'id' | 'userId' | 'createdAt'>>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'resumes', id)
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * Delete resume
   */
  const deleteResume = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'resumes', id)
    await deleteDoc(ref)
  }

  /**
   * Get master resume
   */
  const masterResume = resumes.find((r) => r.type === 'master')

  /**
   * Get tailored resumes
   */
  const tailoredResumes = resumes.filter((r) => r.type === 'tailored')

  return {
    resumes,
    masterResume,
    tailoredResumes,
    loading,
    error,
    addResume,
    updateResume,
    deleteResume,
  }
}
