import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { useCollection } from 'react-firebase-hooks/firestore'
import type { Skill } from '@/sections/profile-resume-management/types'

/**
 * Hook to manage skills in Firestore
 * Collection: users/{userId}/skills
 */
export function useSkills() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to skills subcollection
  const skillsRef = userId
    ? query(collection(db, 'users', userId, 'skills'), orderBy('endorsements', 'desc'))
    : null

  // Subscribe to skills collection
  const [snapshot, loading, error] = useCollection(skillsRef)

  const skills: Skill[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Skill))
    : []

  /**
   * Add new skill
   */
  const addSkill = async (data: Omit<Skill, 'id'>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = collection(db, 'users', userId, 'skills')
    await addDoc(ref, data)
  }

  /**
   * Update existing skill
   */
  const updateSkill = async (id: string, data: Partial<Omit<Skill, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'skills', id)
    await updateDoc(ref, data)
  }

  /**
   * Delete skill
   */
  const deleteSkill = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'skills', id)
    await deleteDoc(ref)
  }

  return {
    skills,
    loading,
    error,
    addSkill,
    updateSkill,
    deleteSkill,
  }
}
