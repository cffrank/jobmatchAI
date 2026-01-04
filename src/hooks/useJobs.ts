import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Job } from '@/sections/job-discovery-matching/types'
import { rankJobs } from '@/lib/jobMatching'
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

      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Call Workers API to fetch jobs
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
      const page = Math.floor(currentOffset / pageSize) + 1
      const response = await fetch(
        `${API_URL}/api/jobs?page=${page}&limit=${pageSize}&archived=false`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch jobs' }))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      const data = result.jobs
      const count = result.total

      // Convert database rows to Job type
      const fetchedJobs: Job[] = (data || []).map((row: JobRow) => ({
        id: row.id,
        title: row.title,
        company: row.company,
        companyLogo: '', // Default empty logo
        location: row.location || '',
        workArrangement: 'Unknown',
        salaryMin: row.salary_min || 0,
        salaryMax: row.salary_max || 0,
        postedDate: row.added_at || row.created_at,
        description: row.description || '',
        url: row.url || undefined,
        source: row.source as 'linkedin' | 'indeed' | 'manual' || 'manual',
        matchScore: row.match_score || undefined,
        isSaved: row.saved || false,
        // Expiration tracking - not stored in database
        savedAt: undefined,
        expiresAt: undefined,
        // Initialize arrays to prevent .map() errors
        requiredSkills: [],
        missingSkills: [],
        recommendations: [],
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

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    // Call Workers API to save job
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isSaved: true }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to save job' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    // Update local state
    setJobs(prev => prev.map(job =>
      job.id === jobId ? {
        ...job,
        saved: true,
        isSaved: true,
        savedAt: undefined,
        expiresAt: undefined,
      } : job
    ))
  }

  /**
   * Unsave/unbookmark a job
   */
  const unsaveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    // Call Workers API to unsave job
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isSaved: false }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to unsave job' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    // Update local state
    setJobs(prev => prev.map(job =>
      job.id === jobId ? {
        ...job,
        saved: false,
        isSaved: false,
        savedAt: undefined,
        expiresAt: undefined,
      } : job
    ))
  }

  /**
   * Update job details (title, company, description, etc.)
   */
  const updateJob = async (jobId: string, updates: Partial<{
    title: string
    company: string
    location: string
    description: string
    url: string
    salaryMin: number
    salaryMax: number
  }>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    // Call Workers API to update job
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update job' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    // Update local state
    setJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, ...updates } : job
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
    updateJob,
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

        // Get authentication token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        // Call Workers API to fetch single job
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
        const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            // Not found
            setJob(null)
            setLoading(false)
            return
          }
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch job' }))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const data = await response.json()

        // Convert to Job type
        const rawJob: Job = {
          id: data.id,
          title: data.title,
          company: data.company,
          companyLogo: '', // Default empty logo
          location: data.location || '',
          workArrangement: 'Unknown',
          salaryMin: data.salary_min || 0,
          salaryMax: data.salary_max || 0,
          postedDate: data.added_at || data.created_at,
          description: data.description || '',
          url: data.url || undefined,
          source: data.source as 'linkedin' | 'indeed' | 'manual' || 'manual',
          matchScore: data.match_score || undefined,
          isSaved: data.saved || false,
          // Expiration tracking - not stored in database
          savedAt: undefined,
          expiresAt: undefined,
          // Initialize arrays to prevent .map() errors
          requiredSkills: [],
          missingSkills: [],
          recommendations: [],
          compatibilityBreakdown: {
            skillMatch: 0,
            experienceMatch: 0,
            industryMatch: 0,
            locationMatch: 0,
          },
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

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    // Call Workers API to save job
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isSaved: true }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to save job' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    // Update local state
    if (job && job.id === jobId) {
      setJob({
        ...job,
        isSaved: true,
        savedAt: undefined,
        expiresAt: undefined,
      })
    }
  }

  /**
   * Unsave/unbookmark a job
   */
  const unsaveJob = async (jobId: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    // Call Workers API to unsave job
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isSaved: false }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to unsave job' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    // Update local state
    if (job && job.id === jobId) {
      setJob({
        ...job,
        isSaved: false,
        savedAt: undefined,
        expiresAt: undefined,
      })
    }
  }

  /**
   * Update job details (title, company, description, etc.)
   */
  const updateJob = async (jobId: string, updates: Partial<{
    title: string
    company: string
    location: string
    description: string
    url: string
    salaryMin: number
    salaryMax: number
  }>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No active session')
    }

    // Call Workers API to update job
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update job' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    // Update local state
    if (job && job.id === jobId) {
      setJob({ ...job, ...updates })
    }
  }

  return {
    job,
    loading,
    error,
    saveJob,
    unsaveJob,
    updateJob,
  }
}

/**
 * Create a new job manually via Workers API
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
  // Get auth token
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('No active session')
  }

  // Call Workers API to create job in D1 database
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
  const response = await fetch(`${API_URL}/api/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      title: jobData.title,
      company: jobData.company,
      location: jobData.location,
      description: jobData.description,
      url: jobData.url,
      jobType: jobData.jobType,
      experienceLevel: jobData.experienceLevel,
      salaryMin: jobData.salaryMin,
      salaryMax: jobData.salaryMax,
      source: 'manual',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create job' }))
    throw new Error(errorData.message || `HTTP ${response.status}`)
  }

  const { id } = await response.json()
  console.log('[useJobs] Created job via Workers API:', id)
  return id
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

        // Get authentication token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        // Call Workers API to fetch saved jobs
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
        const response = await fetch(`${API_URL}/api/jobs?saved=true&limit=1000`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch saved jobs' }))
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const result = await response.json()
        const jobs = result.jobs || []

        setSavedJobIds(jobs.map((job: { id: string }) => job.id))
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
