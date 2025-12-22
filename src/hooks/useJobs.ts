import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Job } from '@/sections/job-discovery-matching/types'
import { rankJobs } from '@/lib/jobMatching'
import { useProfile } from './useProfile'
import { useSkills } from './useSkills'
import { useWorkExperience } from './useWorkExperience'
import type { Database } from '@/lib/database.types'

type JobRow = Database['public']['Tables']['jobs']['Row']

/**
 * Hook to fetch and rank jobs from Supabase based on user profile
 *
 * Jobs are stored per-user and ranked based on:
 * - Skills match
 * - Experience level
 * - Industry alignment
 * - Location compatibility
 *
 * Table: jobs (with user_id RLS policy for data isolation)
 *
 * @architecture
 * Each user has their own isolated jobs via RLS policies.
 * This ensures complete data isolation - users only see jobs they've searched for.
 *
 * PERFORMANCE: Uses offset-based pagination (20 jobs per page) to reduce database reads
 */
export function useJobs(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.id

  // Fetch user profile data for matching
  const { profile } = useProfile()
  const { skills } = useSkills()
  const { workExperience } = useWorkExperience()

  // Fetch saved jobs to mark them in the list
  const { savedJobIds } = useSavedJobs()

  // State management
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  // Fetch jobs with pagination
  const fetchJobs = useCallback(async (currentOffset: number, append: boolean = false) => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch jobs with count
      const { data, error: queryError, count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('archived', false)
        .order('match_score', { ascending: false, nullsFirst: false })
        .order('added_at', { ascending: false })
        .range(currentOffset, currentOffset + pageSize - 1)

      if (queryError) throw queryError

      // Convert database rows to Job type
      const fetchedJobs: Job[] = (data || []).map((row: JobRow) => ({
        id: row.id,
        title: row.title,
        company: row.company,
        location: row.location || undefined,
        remoteType: row.remote_type || undefined,
        description: row.description || undefined,
        requirements: row.requirements || undefined,
        salaryMin: row.salary_min || undefined,
        salaryMax: row.salary_max || undefined,
        sourceUrl: row.source_url || undefined,
        sourcePlatform: row.source_platform || undefined,
        matchScore: row.match_score || undefined,
        skillsMatch: row.skills_match || undefined,
        missingSkills: row.missing_skills || undefined,
        experienceMatch: row.experience_match || undefined,
        locationMatch: row.location_match || undefined,
        saved: row.saved,
        archived: row.archived,
        addedAt: row.added_at,
        isSaved: false, // Will be set below
      }))

      // Update state
      if (append) {
        setJobs(prev => [...prev, ...fetchedJobs])
      } else {
        setJobs(fetchedJobs)
      }

      setTotalCount(count)
      setHasMore((count ?? 0) > currentOffset + pageSize)
      setLoading(false)
    } catch (err) {
      console.error('[useJobs] Error fetching jobs:', err)
      setError(err as Error)
      setLoading(false)
    }
  }, [userId, pageSize])

  // Initial fetch
  useEffect(() => {
    fetchJobs(0, false)
  }, [fetchJobs])

  // Rank jobs based on user profile match
  const rankedJobs = useMemo(() => {
    if (jobs.length === 0) return []

    // Rank jobs using matching algorithm
    const ranked = rankJobs(jobs, {
      user: profile,
      skills,
      workExperience,
    })

    // Mark saved jobs
    return ranked.map(job => ({
      ...job,
      isSaved: savedJobIds.includes(job.id),
    }))
  }, [jobs, profile, skills, workExperience, savedJobIds])

  // Load more callback
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextOffset = offset + pageSize
      setOffset(nextOffset)
      fetchJobs(nextOffset, true)
    }
  }, [loading, hasMore, offset, pageSize, fetchJobs])

  // Reset pagination
  const reset = useCallback(() => {
    setOffset(0)
    setJobs([])
    setHasMore(true)
    fetchJobs(0, false)
  }, [fetchJobs])

  /**
   * Save/bookmark a job
   */
  const saveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('jobs')
      .update({ saved: true })
      .eq('id', jobId)
      .eq('user_id', userId)

    if (error) throw error

    // Update local state
    setJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, saved: true, isSaved: true } : job
    ))
  }

  /**
   * Unsave/unbookmark a job
   */
  const unsaveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('jobs')
      .update({ saved: false })
      .eq('id', jobId)
      .eq('user_id', userId)

    if (error) throw error

    // Update local state
    setJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, saved: false, isSaved: false } : job
    ))
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
    totalCount,
  }
}

/**
 * Validate if a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Hook to fetch a single job by ID with user-specific matching
 *
 * @architecture
 * Fetches from the jobs table with RLS to maintain data isolation.
 * If a jobId is provided but the user doesn't have access, returns null.
 */
export function useJob(jobId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id

  // Fetch user profile data for matching
  const { profile } = useProfile()
  const { skills } = useSkills()
  const { workExperience } = useWorkExperience()
  const { savedJobIds } = useSavedJobs()

  // State management
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch job
  useEffect(() => {
    // Skip if no jobId, no user, or invalid UUID format
    if (!jobId || !userId || !isValidUUID(jobId)) {
      setJob(null)
      setLoading(false)
      return
    }

    const fetchJob = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', userId)
          .single()

        if (queryError) {
          if (queryError.code === 'PGRST116') {
            // Not found
            setJob(null)
          } else {
            throw queryError
          }
          setLoading(false)
          return
        }

        // Convert to Job type
        const rawJob: Job = {
          id: data.id,
          title: data.title,
          company: data.company,
          location: data.location || undefined,
          remoteType: data.remote_type || undefined,
          description: data.description || undefined,
          requirements: data.requirements || undefined,
          salaryMin: data.salary_min || undefined,
          salaryMax: data.salary_max || undefined,
          sourceUrl: data.source_url || undefined,
          sourcePlatform: data.source_platform || undefined,
          matchScore: data.match_score || undefined,
          skillsMatch: data.skills_match || undefined,
          missingSkills: data.missing_skills || undefined,
          experienceMatch: data.experience_match || undefined,
          locationMatch: data.location_match || undefined,
          saved: data.saved,
          archived: data.archived,
          addedAt: data.added_at,
          isSaved: false,
        }

        // Rank this single job to get match score
        const [rankedJob] = rankJobs([rawJob], {
          user: profile,
          skills,
          workExperience,
        })

        setJob({
          ...rankedJob,
          isSaved: savedJobIds.includes(rawJob.id),
        })
        setLoading(false)
      } catch (err) {
        console.error('[useJob] Error fetching job:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId, userId, profile, skills, workExperience, savedJobIds])

  /**
   * Save/bookmark a job
   */
  const saveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('jobs')
      .update({ saved: true })
      .eq('id', jobId)
      .eq('user_id', userId)

    if (error) throw error

    // Update local state
    if (job && job.id === jobId) {
      setJob({ ...job, saved: true, isSaved: true })
    }
  }

  /**
   * Unsave/unbookmark a job
   */
  const unsaveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('jobs')
      .update({ saved: false })
      .eq('id', jobId)
      .eq('user_id', userId)

    if (error) throw error

    // Update local state
    if (job && job.id === jobId) {
      setJob({ ...job, saved: false, isSaved: false })
    }
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
  const userId = user?.id

  const [savedJobIds, setSavedJobIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setSavedJobIds([])
      setLoading(false)
      return
    }

    const fetchSavedJobs = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('jobs')
          .select('id')
          .eq('user_id', userId)
          .eq('saved', true)
          .order('added_at', { ascending: false })

        if (queryError) throw queryError

        setSavedJobIds((data || []).map(job => job.id))
        setLoading(false)
      } catch (err) {
        console.error('[useSavedJobs] Error fetching saved jobs:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchSavedJobs()
  }, [userId])

  return {
    savedJobIds,
    loading,
    error,
  }
}
