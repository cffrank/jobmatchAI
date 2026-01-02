import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Get backend URL from environment
const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

interface UsageMetrics {
  applicationsTracked: number
  resumeVariantsCreated: number
  jobSearchesPerformed: number
  emailsSent: number
}

/**
 * Hook to fetch real usage metrics from backend API
 *
 * Metrics are calculated server-side to prevent manipulation and ensure accuracy.
 * Real-time subscriptions trigger refetches when data changes.
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

        // Get JWT token for authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No authentication token available')
        }

        // Fetch metrics from backend API
        const response = await fetch(`${BACKEND_URL}/api/usage/metrics`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch usage metrics: ${response.statusText}`)
        }

        const { metrics: fetchedMetrics } = await response.json()

        if (mounted) {
          setMetrics(fetchedMetrics)
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
    // These are read-only subscriptions that trigger refetches
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
