import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface UsageMetrics {
  applicationsTracked: number
  resumeVariantsCreated: number
  jobSearchesPerformed: number
  emailsSent: number
}

/**
 * Hook to calculate real usage metrics from database
 */
export function useUsageMetrics() {
  const { user } = useAuth()
  const userId = user?.id

  const [metrics, setMetrics] = useState<UsageMetrics>({
    applicationsTracked: 0,
    resumeVariantsCreated: 0,
    jobSearchesPerformed: 0,
    emailsSent: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let mounted = true

    const fetchMetrics = async () => {
      try {
        setLoading(true)

        // Fetch tracked applications count
        const { count: applicationsCount, error: appsError } = await supabase
          .from('tracked_applications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        if (appsError) throw appsError

        // Fetch resume variants count (tailored resumes only)
        const { count: resumesCount, error: resumesError } = await supabase
          .from('resumes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'tailored')

        if (resumesError) throw resumesError

        // Fetch job searches count from usage_limits table
        const { data: usageLimits, error: usageError } = await supabase
          .from('usage_limits')
          .select('job_searches_used, emails_sent_used')
          .eq('user_id', userId)
          .single()

        if (usageError && usageError.code !== 'PGRST116') {
          throw usageError
        }

        if (mounted) {
          setMetrics({
            applicationsTracked: applicationsCount || 0,
            resumeVariantsCreated: resumesCount || 0,
            jobSearchesPerformed: usageLimits?.job_searches_used || 0,
            emailsSent: usageLimits?.emails_sent_used || 0,
          })
          setError(null)
        }
      } catch (err) {
        if (mounted) {
          console.error('Error fetching usage metrics:', err)
          setError(err as Error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchMetrics()

    // Set up realtime subscriptions for tracked_applications
    const appsChannel = supabase
      .channel('tracked-apps-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracked_applications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (mounted) fetchMetrics()
        }
      )
      .subscribe()

    // Set up realtime subscriptions for resumes
    const resumesChannel = supabase
      .channel('resumes-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resumes',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (mounted) fetchMetrics()
        }
      )
      .subscribe()

    // Set up realtime subscriptions for usage_limits
    const usageChannel = supabase
      .channel('usage-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_limits',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (mounted) fetchMetrics()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      appsChannel.unsubscribe()
      resumesChannel.unsubscribe()
      usageChannel.unsubscribe()
    }
  }, [userId])

  return {
    metrics,
    loading,
    error,
  }
}
