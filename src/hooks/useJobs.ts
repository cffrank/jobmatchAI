import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Job, CompatibilityBreakdown } from '@/sections/job-discovery-matching/types'
import { rankJobs } from '@/lib/jobMatching'
import { analyzeJobWithAI } from '@/lib/aiJobMatching'
import { useProfile } from './useProfile'
import { useSkills } from './useSkills'
import { useWorkExperience } from './useWorkExperience'
import type { Database } from '@/types/supabase'

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
  const { workExperience, loading: workExpLoading } = useWorkExperience()

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
        companyLogo: row.company_logo || '',
        location: row.location || '',
        workArrangement: (row.work_arrangement as 'Remote' | 'Hybrid' | 'On-site' | 'Unknown') || 'Unknown',
        salaryMin: row.salary_min || 0,
        salaryMax: row.salary_max || 0,
        postedDate: row.added_at || row.created_at,
        description: row.description || '',
        url: row.url || undefined,
        source: row.source as 'linkedin' | 'indeed' | 'manual' || 'manual',
        matchScore: row.match_score || undefined,
        isSaved: false, // Will be set below
        // Read from database instead of hardcoding empty arrays
        requiredSkills: row.required_skills || [],
        missingSkills: row.missing_skills || [],
        recommendations: row.recommendations || [],
        // Use placeholder - will be recalculated by rankJobs with real data
        compatibilityBreakdown: {
          skillMatch: 0,
          experienceMatch: 0,
          industryMatch: 0,
          locationMatch: 0,
        },
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

    // Wait for work experience to load before calculating compatibility
    // This prevents showing 0% scores when workExperience is still empty
    if (workExpLoading) {
      // Return jobs with placeholder compatibility while loading
      return jobs.map(job => ({
        ...job,
        isSaved: savedJobIds.includes(job.id),
      }))
    }

    // Rank jobs using matching algorithm with loaded profile data
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
  }, [jobs, profile, skills, workExperience, workExpLoading, savedJobIds])

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

  const { savedJobIds } = useSavedJobs()

  // State management
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
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

        // Parse compatibility_breakdown from JSON if it exists
        let compatibilityBreakdown: CompatibilityBreakdown = {
          skillMatch: 0,
          experienceMatch: 0,
          industryMatch: 0,
          locationMatch: 0,
        }

        if (data.compatibility_breakdown) {
          try {
            compatibilityBreakdown = typeof data.compatibility_breakdown === 'string'
              ? JSON.parse(data.compatibility_breakdown)
              : data.compatibility_breakdown
          } catch (e) {
            console.warn('[useJob] Failed to parse compatibility_breakdown:', e)
          }
        }

        // Convert to Job type
        const rawJob: Job = {
          id: data.id,
          title: data.title,
          company: data.company,
          companyLogo: data.company_logo || '',
          location: data.location || '',
          workArrangement: (data.work_arrangement as 'Remote' | 'Hybrid' | 'On-site' | 'Unknown') || 'Unknown',
          salaryMin: data.salary_min || 0,
          salaryMax: data.salary_max || 0,
          postedDate: data.added_at || data.created_at,
          description: data.description || '',
          url: data.url || undefined,
          source: data.source as 'linkedin' | 'indeed' | 'manual' || 'manual',
          matchScore: data.match_score || undefined,
          isSaved: savedJobIds.includes(data.id),
          requiredSkills: data.required_skills || [],
          missingSkills: data.missing_skills || [],
          recommendations: data.recommendations || [],
          compatibilityBreakdown,
        }

        setJob(rawJob)
        setLoading(false)

        // Trigger AI analysis if job doesn't have a match score OR if it hasn't been analyzed with AI
        // Old keyword-based scores won't have compatibility_breakdown with all fields populated
        const breakdown = data.compatibility_breakdown as any
        const hasAIAnalysis = data.match_score &&
                             breakdown &&
                             typeof breakdown === 'object' &&
                             (breakdown.skillMatch !== undefined)

        if (!hasAIAnalysis) {
          console.log('[useJob] No AI analysis found, triggering AI matching...')
          setAnalyzing(true)

          try {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.access_token) {
              const result = await analyzeJobWithAI(jobId, session.access_token)

              // Update job with AI analysis results
              const updatedJob: Job = {
                ...rawJob,
                matchScore: result.analysis.matchScore,
                compatibilityBreakdown: result.analysis.compatibilityBreakdown,
                missingSkills: result.analysis.missingSkills,
                recommendations: result.analysis.recommendations,
              }

              setJob(updatedJob)
              console.log(`[useJob] AI analysis complete: ${result.analysis.matchScore}% match`)
            }
          } catch (err) {
            console.error('[useJob] AI analysis failed:', err)
            // Don't show error to user, just log it
          } finally {
            setAnalyzing(false)
          }
        }
      } catch (err) {
        console.error('[useJob] Error fetching job:', err)
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId, userId, savedJobIds])

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
      setJob({ ...job, isSaved: true })
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
      setJob({ ...job, isSaved: false })
    }
  }

  return {
    job,
    loading,
    analyzing,
    error,
    saveJob,
    unsaveJob,
  }
}

/**
 * Create a new job manually
 */
export async function createJob(jobData: {
  title: string
  company: string
  location?: string
  description?: string
  url?: string
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary' | 'remote'
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  salaryMin?: number
  salaryMax?: number
  userId: string
}): Promise<string> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: jobData.userId,
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      description: jobData.description,
      url: jobData.url,
      source: 'manual',
      job_type: jobData.jobType,
      experience_level: jobData.experienceLevel,
      salary_min: jobData.salaryMin,
      salary_max: jobData.salaryMax,
      saved: false,
      archived: false,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
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
