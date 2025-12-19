import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore'
import { useDocument } from 'react-firebase-hooks/firestore'
import type { User } from '@/sections/profile-resume-management/types'

/**
 * Hook to manage user profile data in Firestore
 * Collection: users/{userId}
 */
export function useProfile() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to user's profile document
  const profileRef = userId ? doc(db, 'users', userId) : null

  // Subscribe to profile document
  const [snapshot, loading, error] = useDocument(profileRef)

  const profile = snapshot?.exists() ? { id: snapshot.id, ...snapshot.data() } as User : null

  /**
   * Create or update user profile
   */
  const updateProfile = async (data: Partial<Omit<User, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const profileRef = doc(db, 'users', userId)
    const profileDoc = await getDoc(profileRef)

    if (profileDoc.exists()) {
      // Update existing profile
      await updateDoc(profileRef, data)
    } else {
      // Create new profile
      await setDoc(profileRef, {
        ...data,
        id: userId,
        createdAt: new Date().toISOString(),
      })
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
  }
}
