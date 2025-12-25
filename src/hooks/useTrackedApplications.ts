import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'
import type { TrackedApplication, ActivityLogEntry } from '@/sections/application-tracker/types'

type DbTrackedApplication = Database['public']['Tables']['tracked_applications']['Row']

/**
 * Hook to manage tracked applications in Supabase
 *
 * ⚠️ NOTE: This table does not exist in the current schema.
 * A database migration is required to create the tracked_applications table.
 *
 * Required schema:
 * - id (UUID, primary key)
 * - user_id (UUID, foreign key to users)
 * - job_id (UUID, nullable, foreign key to jobs)
 * - application_id (UUID, nullable, foreign key to applications)
 * - company (TEXT)
 * - job_title (TEXT)
 * - location (TEXT, nullable)
 * - match_score (NUMERIC, nullable)
 * - status (ENUM: applied, screening, interview_scheduled, etc.)
 * - applied_date (TIMESTAMPTZ, nullable)
 * - last_updated (TIMESTAMPTZ, default NOW())
 * - status_history (JSONB, default '[]')
 * - interviews (JSONB, default '[]')
 * - recruiter (JSONB, nullable)
 * - hiring_manager (JSONB, nullable)
 * - follow_up_actions (JSONB, default '[]')
 * - next_action (TEXT, nullable)
 * - next_action_date (TIMESTAMPTZ, nullable)
 * - next_interview_date (TIMESTAMPTZ, nullable)
 * - offer_details (JSONB, nullable)
 * - activity_log (JSONB, default '[]')
 * - archived (BOOLEAN, default FALSE)
 * - notes (TEXT, nullable)
 * - created_at (TIMESTAMPTZ, default NOW())
 * - updated_at (TIMESTAMPTZ, default NOW())
 *
 * PERFORMANCE: Uses offset-based pagination (20 items per page)
 */
export function useTrackedApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.id

  // Pagination state
  const [offset, setOffset] = useState(0)
  const [allApplications, setAllApplications] = useState<TrackedApplication[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  // Internal state to track total count - updated by realtime subscriptions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_totalCount, setTotalCount] = useState(0)

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

        // ⚠️ This will fail until the table is created
        const { data, error: fetchError, count } = await supabase
          .from('tracked_applications')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('last_updated', { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (fetchError) throw fetchError

        if (subscribed && data) {
          const mappedApps = data.map(mapDbTrackedApplication)

          if (offset === 0) {
            setAllApplications(mappedApps)
          } else {
            setAllApplications(prev => [...prev, ...mappedApps])
          }

          setTotalCount(count || 0)
          setHasMore(data.length === pageSize && (offset + pageSize) < (count || 0))
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
      .channel(`tracked_applications:${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'tracked_applications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setAllApplications(current => [mapDbTrackedApplication(payload.new as DbTrackedApplication), ...current])
            setTotalCount(c => c + 1)
          } else if (payload.eventType === 'UPDATE') {
            setAllApplications(current =>
              current.map(app =>
                app.id === (payload.new as DbTrackedApplication).id ? mapDbTrackedApplication(payload.new as DbTrackedApplication) : app
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

  const trackedApplications: TrackedApplication[] = allApplications

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setOffset(prev => prev + pageSize)
    }
  }, [hasMore, loading, pageSize])

  const reset = useCallback(() => {
    setOffset(0)
    setAllApplications([])
    setHasMore(true)
  }, [])

  const addTrackedApplication = async (data: Omit<TrackedApplication, 'id' | 'lastUpdated'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: insertError } = await supabase.from('tracked_applications').insert({
      user_id: userId,
      job_id: data.jobId || null,
      application_id: data.applicationId || null,
      company: data.company,
      job_title: data.jobTitle,
      location: data.location || null,
      match_score: data.matchScore || null,
      status: data.status,
      applied_date: data.appliedDate || null,
      last_updated: new Date().toISOString(),
      status_history: data.statusHistory as unknown as Json,
      interviews: data.interviews as unknown as Json,
      recruiter: (data.recruiter || null) as unknown as Json,
      hiring_manager: (data.hiringManager || null) as unknown as Json,
      follow_up_actions: data.followUpActions as unknown as Json,
      activity_log: (data.activityLog || []) as unknown as Json,
      offer_details: (data.offerDetails || null) as unknown as Json,
      next_action: data.nextAction || null,
      next_action_date: data.nextActionDate || null,
      next_interview_date: data.nextInterviewDate || null,
      notes: data.notes || null,
      archived: data.archived || false,
    })

    if (insertError) throw insertError
  }

  const updateTrackedApplication = async (id: string, data: Partial<Omit<TrackedApplication, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Partial<Database['public']['Tables']['tracked_applications']['Update']> = {
      last_updated: new Date().toISOString(),
    }

    if (data.jobId !== undefined) updateData.job_id = data.jobId || null
    if (data.applicationId !== undefined) updateData.application_id = data.applicationId || null
    if (data.company !== undefined) updateData.company = data.company
    if (data.jobTitle !== undefined) updateData.job_title = data.jobTitle
    if (data.location !== undefined) updateData.location = data.location || null
    if (data.matchScore !== undefined) updateData.match_score = data.matchScore || null
    if (data.status !== undefined) updateData.status = data.status
    if (data.appliedDate !== undefined) updateData.applied_date = data.appliedDate || null
    if (data.statusHistory !== undefined) updateData.status_history = data.statusHistory as unknown as Json
    if (data.interviews !== undefined) updateData.interviews = data.interviews as unknown as Json
    if (data.recruiter !== undefined) updateData.recruiter = (data.recruiter || null) as unknown as Json
    if (data.hiringManager !== undefined) updateData.hiring_manager = (data.hiringManager || null) as unknown as Json
    if (data.followUpActions !== undefined) updateData.follow_up_actions = data.followUpActions as unknown as Json
    if (data.activityLog !== undefined) updateData.activity_log = data.activityLog as unknown as Json
    if (data.offerDetails !== undefined) updateData.offer_details = (data.offerDetails || null) as unknown as Json
    if (data.nextAction !== undefined) updateData.next_action = data.nextAction || null
    if (data.nextActionDate !== undefined) updateData.next_action_date = data.nextActionDate || null
    if (data.nextInterviewDate !== undefined) updateData.next_interview_date = data.nextInterviewDate || null
    if (data.notes !== undefined) updateData.notes = data.notes || null
    if (data.archived !== undefined) updateData.archived = data.archived

    const { error: updateError } = await supabase
      .from('tracked_applications')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

  const deleteTrackedApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('tracked_applications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
  }

  const archiveTrackedApplication = async (id: string) => {
    await updateTrackedApplication(id, { archived: true })
  }

  const unarchiveTrackedApplication = async (id: string) => {
    await updateTrackedApplication(id, { archived: false })
  }

  return {
    trackedApplications,
    loading,
    error,
    loadMore,
    hasMore,
    reset,
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
        const { data, error: fetchError } = await supabase
          .from('tracked_applications')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single()

        if (fetchError) throw fetchError

        if (subscribed && data) {
          setTrackedApplication(mapDbTrackedApplication(data))
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

    // Set up real-time subscription
    const channel = supabase
      .channel(`tracked_application:${id}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'tracked_applications',
          filter: `id=eq.${id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            setTrackedApplication(mapDbTrackedApplication(payload.new as DbTrackedApplication))
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

  const [offset, setOffset] = useState(0)
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

        const { data, error: fetchError, count } = await supabase
          .from('tracked_applications')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .eq('archived', false)
          .order('last_updated', { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (fetchError) throw fetchError

        if (subscribed && data) {
          const mappedApps = data.map(mapDbTrackedApplication)

          if (offset === 0) {
            setAllApplications(mappedApps)
          } else {
            setAllApplications(prev => [...prev, ...mappedApps])
          }

          setHasMore(data.length === pageSize && (offset + pageSize) < (count || 0))
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

  const activeApplications: TrackedApplication[] = allApplications

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setOffset(prev => prev + pageSize)
    }
  }, [hasMore, loading, pageSize])

  const reset = useCallback(() => {
    setOffset(0)
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
