import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, doc, query, orderBy, where, setDoc, deleteDoc } from 'firebase/firestore'
import { useCollection, useDocument } from 'react-firebase-hooks/firestore'
import type { Job } from '@/sections/job-discovery-matching/types'

/**
 * Hook to fetch jobs from Firestore
 * Collection: jobs (top-level, read-only for users)
 * Saved jobs: users/{userId}/savedJobs
 */
export function useJobs() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to jobs collection (sorted by match score descending)
  const jobsRef = query(collection(db, 'jobs'), orderBy('matchScore', 'desc'))

  // Subscribe to jobs collection
  const [snapshot, loading, error] = useCollection(jobsRef)

  const jobs: Job[] = snapshot
    ? snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Job))
    : []

  /**
   * Save/bookmark a job
   */
  const saveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'savedJobs', jobId)
    await setDoc(ref, {
      jobId,
      savedAt: new Date().toISOString(),
    })
  }

  /**
   * Unsave/unbookmark a job
   */
  const unsaveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')
    const ref = doc(db, 'users', userId, 'savedJobs', jobId)
    await deleteDoc(ref)
  }

  return {
    jobs,
    loading,
    error,
    saveJob,
    unsaveJob,
  }
}

/**
 * Hook to fetch a single job by ID
 */
export function useJob(jobId: string | undefined) {
  const jobRef = jobId ? doc(db, 'jobs', jobId) : null

  // Subscribe to job document
  const [snapshot, loading, error] = useDocument(jobRef)

  const job = snapshot?.exists() ? { id: snapshot.id, ...snapshot.data() } as Job : null

  return {
    job,
    loading,
    error,
  }
}

/**
 * Hook to fetch saved jobs
 */
export function useSavedJobs() {
  const { user } = useAuth()
  const userId = user?.uid

  // Get reference to saved jobs subcollection
  const savedJobsRef = userId
    ? query(collection(db, 'users', userId, 'savedJobs'), orderBy('savedAt', 'desc'))
    : null

  // Subscribe to saved jobs collection
  const [snapshot, loading, error] = useCollection(savedJobsRef)

  const savedJobIds = snapshot
    ? snapshot.docs.map((doc) => doc.data().jobId as string)
    : []

  return {
    savedJobIds,
    loading,
    error,
  }
}
