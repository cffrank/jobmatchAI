import { useMemo, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase'
import { collection, doc, query, orderBy, setDoc, deleteDoc, limit, startAfter, QueryConstraint, DocumentSnapshot } from 'firebase/firestore'
import { useCollection, useDocument } from 'react-firebase-hooks/firestore'
import type { Job } from '@/sections/job-discovery-matching/types'
import { rankJobs } from '@/lib/jobMatching'
import { useProfile } from './useProfile'
import { useSkills } from './useSkills'
import { useWorkExperience } from './useWorkExperience'

/**
 * Hook to fetch and rank jobs from Firestore based on user profile
 *
 * Jobs are stored per-user and ranked based on:
 * - Skills match
 * - Experience level
 * - Industry alignment
 * - Location compatibility
 *
 * Collection: users/{userId}/jobs (user-specific jobs from searches)
 * Saved jobs: users/{userId}/savedJobs (bookmarked jobs)
 *
 * @architecture
 * Each user has their own isolated jobs collection populated by the scrapeJobs Cloud Function.
 * This ensures complete data isolation - users only see jobs they've searched for.
 *
 * PERFORMANCE: Uses cursor-based pagination (20 jobs per page) to reduce Firestore reads by 80-90%
 */
export function useJobs(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.uid

  // Fetch user profile data for matching
  const { profile } = useProfile()
  const { skills } = useSkills()
  const { workExperience } = useWorkExperience()

  // Fetch saved jobs to mark them in the list
  const { savedJobIds } = useSavedJobs()

  // Pagination state
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [hasMore, setHasMore] = useState(true)

  // Build paginated query
  const jobsRef = useMemo(() => {
    if (!userId) return null

    const constraints: QueryConstraint[] = [
      orderBy('matchScore', 'desc'),  // Order by pre-calculated match score
      orderBy('addedAt', 'desc'),     // Tie-breaker for equal scores
      limit(pageSize)
    ]

    // Add pagination cursor
    if (lastDoc) {
      constraints.push(startAfter(lastDoc))
    }

    return query(collection(db, 'users', userId, 'jobs'), ...constraints)
  }, [userId, lastDoc, pageSize])

  // Subscribe to current page
  const [snapshot, loading, error] = useCollection(jobsRef)

  // Accumulate jobs across pages
  useEffect(() => {
    if (!snapshot) return

    const newJobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      isSaved: false, // Will be set below
    } as Job))

    // Check if there are more results
    setHasMore(newJobs.length === pageSize)

    if (lastDoc) {
      // Append to existing jobs
      setAllJobs(prev => [...prev, ...newJobs])
    } else {
      // First page - replace all jobs
      setAllJobs(newJobs)
    }
  }, [snapshot, lastDoc, pageSize])

  // Get raw jobs from accumulated list
  const rawJobs: Job[] = allJobs

  // Rank jobs based on user profile match
  const rankedJobs = useMemo(() => {
    if (rawJobs.length === 0) return []

    // Rank jobs using matching algorithm
    const ranked = rankJobs(rawJobs, {
      user: profile,
      skills,
      workExperience,
    })

    // Mark saved jobs
    return ranked.map(job => ({
      ...job,
      isSaved: savedJobIds.includes(job.id),
    }))
  }, [rawJobs, profile, skills, workExperience, savedJobIds])

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
    setAllJobs([])
    setHasMore(true)
  }, [])

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
    jobs: rankedJobs,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
    saveJob,
    unsaveJob,
  }
}

/**
 * Hook to fetch a single job by ID with user-specific matching
 *
 * @architecture
 * Fetches from the user's personal jobs collection to maintain data isolation.
 * If a jobId is provided but the user doesn't have access, returns null.
 */
export function useJob(jobId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.uid
  const jobRef = jobId && userId ? doc(db, 'users', userId, 'jobs', jobId) : null

  // Fetch user profile data for matching
  const { profile } = useProfile()
  const { skills } = useSkills()
  const { workExperience } = useWorkExperience()
  const { savedJobIds } = useSavedJobs()

  // Subscribe to job document
  const [snapshot, loading, error] = useDocument(jobRef)

  // Calculate match score for this job
  const job = useMemo(() => {
    if (!snapshot?.exists()) return null

    const rawJob = { id: snapshot.id, ...snapshot.data() } as Job

    // Rank this single job to get match score
    const [rankedJob] = rankJobs([rawJob], {
      user: profile,
      skills,
      workExperience,
    })

    return {
      ...rankedJob,
      isSaved: savedJobIds.includes(rawJob.id),
    }
  }, [snapshot, profile, skills, workExperience, savedJobIds])

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
    job,
    loading,
    error,
    saveJob,
    unsaveJob,
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
