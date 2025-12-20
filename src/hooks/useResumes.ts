import { useMemo } from 'react'
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

  // Memoize resumes array to prevent infinite loops
  const resumes: Resume[] = useMemo(() => {
    return snapshot
      ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Resume))
      : []
  }, [snapshot])

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
   * Get master resume - memoized to prevent infinite loops
   */
  const masterResume = useMemo(() => {
    return resumes.find((r) => r.type === 'master')
  }, [resumes])

  /**
   * Get tailored resumes - memoized to prevent infinite loops
   */
  const tailoredResumes = useMemo(() => {
    return resumes.filter((r) => r.type === 'tailored')
  }, [resumes])

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
