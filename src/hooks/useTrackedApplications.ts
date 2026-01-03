import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/lib/config'
import type { Database } from '@/types/supabase'
import type { TrackedApplication, ActivityLogEntry } from '@/sections/application-tracker/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type DbTrackedApplication = Database['public']['Tables']['tracked_applications']['Row']
type TrackedApplicationPayload = RealtimePostgresChangesPayload<DbTrackedApplication>

/**
 * Hook to manage tracked applications via Workers/Express API
 *
 * Uses Workers/Express API for all data operations:
 * - GET /api/tracked-applications - List all tracked applications
 * - GET /api/tracked-applications/active - List non-archived applications
 * - GET /api/tracked-applications/:id - Get single application
 * - POST /api/tracked-applications - Create application
 * - PATCH /api/tracked-applications/:id - Update application
 * - PATCH /api/tracked-applications/:id/archive - Archive application
 * - PATCH /api/tracked-applications/:id/unarchive - Unarchive application
 * - DELETE /api/tracked-applications/:id - Delete application
 *
 * Real-time subscriptions still use Supabase (read-only).
 *
 * PERFORMANCE: Uses offset-based pagination (20 items per page)
 */
export function useTrackedApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.id

  // Pagination state
  const [page, setPage] = useState(1)
  const [allApplications, setAllApplications] = useState<TrackedApplication[]>([])
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

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No session found')
        }

        const response = await fetch(
          `${API_URL}/api/tracked-applications?page=${page}&limit=${pageSize}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch tracked applications' }))
          throw new Error(errorData.message || 'Failed to fetch tracked applications')
        }

        const data = await response.json()

        if (subscribed) {
          if (page === 1) {
            setAllApplications(data.trackedApplications || [])
          } else {
            setAllApplications(prev => [...prev, ...(data.trackedApplications || [])])
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
  }, [userId, page, pageSize])

  // Set up real-time subscription (read-only)
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`tracked_applications:${userId}`)
      .on<DbTrackedApplication>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracked_applications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: TrackedApplicationPayload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setAllApplications(current => [mapDbTrackedApplication(payload.new), ...current])
            setTotalCount(c => c + 1)
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setAllApplications(current =>
              current.map(app =>
                app.id === payload.new.id ? mapDbTrackedApplication(payload.new) : app
              )
            )
          } else if (payload.eventType === 'DELETE' && payload.old) {
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

  const trackedApplications: TrackedApplication[] = allApplications

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
    }
  }, [hasMore, loading])

  const reset = useCallback(() => {
    setPage(1)
    setAllApplications([])
    setHasMore(true)
  }, [])

  const addTrackedApplication = async (data: Omit<TrackedApplication, 'id' | 'lastUpdated'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session found')

    const response = await fetch(`${API_URL}/api/tracked-applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to create tracked application' }))
      throw new Error(errorData.message || 'Failed to create tracked application')
    }

    return response.json()
  }

  const updateTrackedApplication = async (id: string, data: Partial<Omit<TrackedApplication, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session found')

    const response = await fetch(`${API_URL}/api/tracked-applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to update tracked application' }))
      throw new Error(errorData.message || 'Failed to update tracked application')
    }

    return response.json()
  }

  const deleteTrackedApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session found')

    const response = await fetch(`${API_URL}/api/tracked-applications/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to delete tracked application' }))
      throw new Error(errorData.message || 'Failed to delete tracked application')
    }
  }

  const archiveTrackedApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session found')

    const response = await fetch(`${API_URL}/api/tracked-applications/${id}/archive`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to archive tracked application' }))
      throw new Error(errorData.message || 'Failed to archive tracked application')
    }

    return response.json()
  }

  const unarchiveTrackedApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No session found')

    const response = await fetch(`${API_URL}/api/tracked-applications/${id}/unarchive`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to unarchive tracked application' }))
      throw new Error(errorData.message || 'Failed to unarchive tracked application')
    }

    return response.json()
  }

  return {
    trackedApplications,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
    totalCount,
    addTrackedApplication,
    updateTrackedApplication,
    deleteTrackedApplication,
    archiveTrackedApplication,
    unarchiveTrackedApplication,
  }
}

/**
 * Hook to fetch a single tracked application by ID
 */
export function useTrackedApplication(id: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id

  const [trackedApplication, setTrackedApplication] = useState<TrackedApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId || !id) {
      setTrackedApplication(null)
      setLoading(false)
      return
    }

    let subscribed = true

    const fetchApplication = async () => {
      try {
        setLoading(true)

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No session found')
        }

        const response = await fetch(`${API_URL}/api/tracked-applications/${id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch tracked application' }))
          throw new Error(errorData.message || 'Failed to fetch tracked application')
        }

        const data = await response.json()

        if (subscribed) {
          setTrackedApplication(data)
          setError(null)
        }
      } catch (err) {
        if (subscribed) {
          setError(err as Error)
          setTrackedApplication(null)
        }
      } finally {
        if (subscribed) {
          setLoading(false)
        }
      }
    }

    fetchApplication()

    // Set up real-time subscription (read-only)
    const channel = supabase
      .channel(`tracked_application:${id}`)
      .on<DbTrackedApplication>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracked_applications',
          filter: `id=eq.${id}`,
        },
        (payload: TrackedApplicationPayload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            setTrackedApplication(mapDbTrackedApplication(payload.new))
          } else if (payload.eventType === 'DELETE') {
            setTrackedApplication(null)
          }
        }
      )
      .subscribe()

    return () => {
      subscribed = false
      channel.unsubscribe()
    }
  }, [userId, id])

  return {
    trackedApplication,
    loading,
    error,
  }
}

/**
 * Hook to fetch active (non-archived) tracked applications
 */
export function useActiveTrackedApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.id

  const [page, setPage] = useState(1)
  const [allApplications, setAllApplications] = useState<TrackedApplication[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

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

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No session found')
        }

        const response = await fetch(
          `${API_URL}/api/tracked-applications/active?page=${page}&limit=${pageSize}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to fetch active tracked applications' }))
          throw new Error(errorData.message || 'Failed to fetch active tracked applications')
        }

        const data = await response.json()

        if (subscribed) {
          if (page === 1) {
            setAllApplications(data.activeApplications || [])
          } else {
            setAllApplications(prev => [...prev, ...(data.activeApplications || [])])
          }

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
  }, [userId, page, pageSize])

  const activeApplications: TrackedApplication[] = allApplications

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1)
    }
  }, [hasMore, loading])

  const reset = useCallback(() => {
    setPage(1)
    setAllApplications([])
    setHasMore(true)
  }, [])

  return {
    activeApplications,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
  }
}

/**
 * Map database tracked application to app TrackedApplication type
 * Used by real-time subscriptions (read-only)
 */
function mapDbTrackedApplication(dbApp: DbTrackedApplication): TrackedApplication {
  return {
    id: dbApp.id,
    jobId: dbApp.job_id || '',
    applicationId: dbApp.application_id || '',
    company: dbApp.company,
    jobTitle: dbApp.job_title,
    location: dbApp.location || '',
    matchScore: dbApp.match_score || 0,
    status: dbApp.status as TrackedApplication['status'],
    appliedDate: dbApp.applied_date || '',
    lastUpdated: dbApp.last_updated,
    statusChangedAt: undefined, // Not stored in database, could be computed from statusHistory
    statusHistory: (dbApp.status_history as unknown as TrackedApplication['statusHistory']) || [],
    interviews: (dbApp.interviews as unknown as TrackedApplication['interviews']) || [],
    recruiter: (dbApp.recruiter as unknown as TrackedApplication['recruiter']) || undefined,
    hiringManager: (dbApp.hiring_manager as unknown as TrackedApplication['hiringManager']) || undefined,
    followUpActions: (dbApp.follow_up_actions as unknown as TrackedApplication['followUpActions']) || [],
    nextAction: dbApp.next_action || undefined,
    nextActionDate: dbApp.next_action_date || undefined,
    nextInterviewDate: dbApp.next_interview_date || undefined,
    offerDetails: (dbApp.offer_details as unknown as TrackedApplication['offerDetails']) || undefined,
    activityLog: (dbApp.activity_log as unknown as ActivityLogEntry[]) || [],
    archived: dbApp.archived || false,
    notes: dbApp.notes || '',
  }
}
