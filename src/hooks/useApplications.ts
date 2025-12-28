import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'
import type { GeneratedApplication, ApplicationVariant } from '@/sections/application-generator/types'

type DbApplication = Database['public']['Tables']['applications']['Row']

/**
 * Hook to manage generated applications in Supabase
 * Table: applications
 *
 * PERFORMANCE: Uses offset-based pagination (20 items per page) to reduce Supabase reads
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

        // Fetch paginated applications
        const { data, error: fetchError, count } = await supabase
          .from('applications')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (fetchError) throw fetchError

        if (subscribed && data) {
          const mappedApps = data.map(mapDbApplication)

          if (offset === 0) {
            // First page - replace all applications
            setAllApplications(mappedApps)
          } else {
            // Append to existing applications
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

    const { error: insertError } = await supabase.from('applications').insert({
      user_id: userId,
      job_id: data.jobId || null,
      cover_letter: data.variants[0]?.coverLetter || null,
      custom_resume: JSON.stringify(data.variants[0]?.resume) || null,
      status: mapStatusToDb(data.status),
      variants: data.variants as unknown as Json, // JSONB field
    })

    if (insertError) throw insertError
  }

  /**
   * Update existing application
   */
  const updateApplication = async (id: string, data: Partial<Omit<GeneratedApplication, 'id'>>) => {
    if (!userId) throw new Error('User not authenticated')

    const updateData: Partial<Database['public']['Tables']['applications']['Update']> = {}

    if (data.jobId !== undefined) updateData.job_id = data.jobId || null
    if (data.status !== undefined) updateData.status = mapStatusToDb(data.status)
    if (data.variants !== undefined) updateData.variants = data.variants as unknown as Json

    // Update cover_letter if variants changed
    if (data.variants && data.variants[0]) {
      updateData.cover_letter = data.variants[0].coverLetter
      updateData.custom_resume = JSON.stringify(data.variants[0].resume)
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) throw updateError
  }

  /**
   * Delete application
   */
  const deleteApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) throw deleteError
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
 * Hook to fetch a single application by ID
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
        const { data, error: fetchError } = await supabase
          .from('applications')
          .select('*')
          .eq('id', applicationId)
          .eq('user_id', userId)
          .single()

        if (fetchError) throw fetchError

        if (subscribed && data) {
          setApplication(mapDbApplication(data))
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
 * Map app status to database status enum
 */
function mapStatusToDb(status: 'draft' | 'in_progress' | 'submitted'): Database['public']['Enums']['application_status'] {
  const statusMap: Record<string, Database['public']['Enums']['application_status']> = {
    'draft': 'draft',
    'in_progress': 'draft', // Map to draft as in_progress doesn't exist in schema
    'submitted': 'submitted',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map database status to app status
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
