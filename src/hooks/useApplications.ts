import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { GeneratedApplication, ApplicationVariant } from '@/sections/application-generator/types'

type DbApplication = Database['public']['Tables']['applications']['Row']

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Hook to manage generated applications via Workers API
 *
 * All database operations go through the Workers API endpoints.
 * Only supabase.auth.* calls are allowed for authentication.
 *
 * PERFORMANCE: Uses offset-based pagination (20 items per page)
 */
export function useApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.id

  // Pagination state
  const [offset, setOffset] = useState(0)
  const [allApplications, setAllApplications] = useState<GeneratedApplication[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch applications with pagination
  useEffect(() => {
    if (!userId) {
      setAllApplications([])
      setLoading(false)
      return
    }

    let subscribed = true

    const fetchApplications = async () => {
      try {
        setLoading(true)

        // Get JWT token from Supabase auth
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        if (!token) {
          throw new Error('Not authenticated')
        }

        // Calculate page from offset
        const page = Math.floor(offset / pageSize) + 1

        // Fetch paginated applications from Workers API
        const response = await fetch(
          `${BACKEND_URL}/api/applications?page=${page}&limit=${pageSize}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch applications' }))
          throw new Error(errorData.message || 'Failed to fetch applications')
        }

        const data = await response.json()

        if (subscribed && data.applications) {
          const mappedApps = data.applications.map(mapApiApplication)

          if (offset === 0) {
            // First page - replace all applications
            setAllApplications(mappedApps)
          } else {
            // Append to existing applications
            setAllApplications(prev => [...prev, ...mappedApps])
          }

          setTotalCount(data.total || 0)
          setHasMore(data.hasMore || false)
          setError(null)
        }
      } catch (err) {
        if (subscribed) {
          setError(err as Error)
        }
      } finally {
        if (subscribed) {
          setLoading(false)
        }
      }
    }

    fetchApplications()

    return () => {
      subscribed = false
    }
  }, [userId, offset, pageSize])

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`applications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllApplications(current => [mapDbApplication(payload.new as DbApplication), ...current])
            setTotalCount(c => c + 1)
          } else if (payload.eventType === 'UPDATE') {
            setAllApplications(current =>
              current.map(app =>
                app.id === payload.new.id ? mapDbApplication(payload.new as DbApplication) : app
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setAllApplications(current => current.filter(app => app.id !== payload.old.id))
            setTotalCount(c => Math.max(0, c - 1))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [userId])

  const applications: GeneratedApplication[] = allApplications

  // Load more callback
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setOffset(prev => prev + pageSize)
    }
  }, [hasMore, loading, pageSize])

  // Reset pagination
  const reset = useCallback(() => {
    setOffset(0)
    setAllApplications([])
    setHasMore(true)
  }, [])

  /**
   * Add new generated application
   */
  const addApplication = async (data: Omit<GeneratedApplication, 'id' | 'createdAt'>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get JWT token from Supabase auth
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      throw new Error('Not authenticated')
    }

    // Create application via Workers API
    const response = await fetch(`${BACKEND_URL}/api/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: data.jobId || null,
        jobTitle: data.jobTitle || '',
        company: data.company || '',
        status: data.status,
        selectedVariantId: data.selectedVariantId,
        variants: data.variants,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create application' }))
      throw new Error(errorData.message || 'Failed to create application')
    }
  }

  /**
   * Update existing application
   */
  const updateApplication = async (id: string, data: Partial<Omit<GeneratedApplication, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    // Get JWT token from Supabase auth
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      throw new Error('Not authenticated')
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {}

    if (data.status !== undefined) {
      updatePayload.status = data.status
    }

    if (data.selectedVariantId !== undefined) {
      updatePayload.selectedVariantId = data.selectedVariantId
    }

    if (data.variants !== undefined) {
      updatePayload.variants = data.variants
    }

    // Update application via Workers API
    const response = await fetch(`${BACKEND_URL}/api/applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update application' }))
      throw new Error(errorData.message || 'Failed to update application')
    }
  }

  /**
   * Delete application
   */
  const deleteApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    // Get JWT token from Supabase auth
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    if (!token) {
      throw new Error('Not authenticated')
    }

    // Delete application via Workers API
    const response = await fetch(`${BACKEND_URL}/api/applications/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete application' }))
      throw new Error(errorData.message || 'Failed to delete application')
    }
  }

  return {
    applications,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
    addApplication,
    updateApplication,
    deleteApplication,
    totalCount,
  }
}

/**
 * Hook to fetch a single application by ID via Workers API
 */
export function useApplication(applicationId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id

  const [application, setApplication] = useState<GeneratedApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId || !applicationId) {
      setApplication(null)
      setLoading(false)
      return
    }

    let subscribed = true

    const fetchApplication = async () => {
      try {
        setLoading(true)

        // Get JWT token from Supabase auth
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        if (!token) {
          throw new Error('Not authenticated')
        }

        // Fetch application from Workers API
        const response = await fetch(`${BACKEND_URL}/api/applications/${applicationId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch application' }))
          throw new Error(errorData.message || 'Failed to fetch application')
        }

        const data = await response.json()

        if (subscribed && data) {
          setApplication(mapApiApplication(data))
          setError(null)
        }
      } catch (err) {
        if (subscribed) {
          setError(err as Error)
          setApplication(null)
        }
      } finally {
        if (subscribed) {
          setLoading(false)
        }
      }
    }

    fetchApplication()

    // Set up real-time subscription
    const channel = supabase
      .channel(`application:${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `id=eq.${applicationId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setApplication(mapDbApplication(payload.new as DbApplication))
          } else if (payload.eventType === 'DELETE') {
            setApplication(null)
          }
        }
      )
      .subscribe()

    return () => {
      subscribed = false
      channel.unsubscribe()
    }
  }, [userId, applicationId])

  return {
    application,
    loading,
    error,
  }
}

/**
 * Map database application to app GeneratedApplication type
 * Used for real-time subscriptions only
 */
function mapDbApplication(dbApp: DbApplication): GeneratedApplication {
  // Ensure variants is always an array (fixes crash when dbApp.variants is {} or null)
  let variants: ApplicationVariant[] = []
  if (Array.isArray(dbApp.variants)) {
    variants = dbApp.variants as unknown as ApplicationVariant[]
  }

  return {
    id: dbApp.id,
    jobId: dbApp.job_id || '',
    jobTitle: dbApp.job_title || '', // Now in schema after migration 015
    company: dbApp.company || '', // Now in schema after migration 015
    status: mapStatusFromDb(dbApp.status),
    createdAt: dbApp.created_at,
    submittedAt: null, // Not in schema
    selectedVariantId: dbApp.selected_variant_id || variants[0]?.id || null,
    variants: variants,
    editHistory: [], // Not in schema
    lastEmailSentAt: undefined,
  }
}

/**
 * Map Workers API response to app GeneratedApplication type
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function mapApiApplication(apiApp: any): GeneratedApplication {
  // Handle variants from API response
  let variants: ApplicationVariant[] = []
  if (Array.isArray(apiApp.variants)) {
    variants = apiApp.variants
  }

  return {
    id: apiApp.id,
    jobId: apiApp.job_id || apiApp.jobId || '',
    jobTitle: apiApp.job_title || apiApp.jobTitle || '',
    company: apiApp.company || '',
    status: mapStatusFromApi(apiApp.status),
    createdAt: apiApp.created_at || apiApp.createdAt,
    submittedAt: apiApp.submitted_at || apiApp.submittedAt || null,
    selectedVariantId: apiApp.selected_variant_id || apiApp.selectedVariantId || variants[0]?.id || null,
    variants: variants,
    editHistory: [], // Not in schema
    lastEmailSentAt: undefined,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Map database status to app status
 * Used for real-time subscriptions only
 */
function mapStatusFromDb(status: Database['public']['Enums']['application_status'] | null): 'draft' | 'in_progress' | 'submitted' {
  if (!status) return 'draft'

  const statusMap: Record<string, 'draft' | 'in_progress' | 'submitted'> = {
    'draft': 'draft',
    'ready': 'in_progress',
    'submitted': 'submitted',
    'interviewing': 'submitted',
    'offered': 'submitted',
    'accepted': 'submitted',
    'rejected': 'submitted',
    'withdrawn': 'submitted',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map API status to app status
 */
function mapStatusFromApi(status: string | null | undefined): 'draft' | 'in_progress' | 'submitted' {
  if (!status) return 'draft'

  const statusMap: Record<string, 'draft' | 'in_progress' | 'submitted'> = {
    'draft': 'draft',
    'ready': 'in_progress',
    'submitted': 'submitted',
    'interviewing': 'submitted',
    'offered': 'submitted',
    'accepted': 'submitted',
    'rejected': 'submitted',
    'withdrawn': 'submitted',
    'viewed': 'submitted',
  }
  return statusMap[status] || 'draft'
}
